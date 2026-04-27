// Impact score + relevant-eyes pricing math, transparent and reproducible.
// Mirrors agent/impact.py + agent/relevance.py shapes.
//
// Similarity blends a real semantic cosine (Gemini gemini-embedding-001, 768d,
// pre-baked at build time into embeddings.json — 100% free, zero runtime cost)
// with the deterministic keyword-fuzz heuristic. The blend gives the demo
// real RAG-style matching while preserving hand-tuned persona rules so the
// Logan x Celsius "wow moment" stays reproducible on stage.

import type { Creator } from "@/lib/data/creators";
import type { Brand } from "@/lib/data/brands";
import EMBEDDINGS from "@/lib/data/embeddings.json";

type EmbedIndex = {
  schema_version: number;
  model: string;
  dim: number;
  built_at: string;
  brands: Record<string, number[]>;
  creators: Record<string, number[]>;
  posts: Record<string, number[]>;
};

const IDX = EMBEDDINGS as EmbedIndex;

function cosineSim(a: number[] | undefined, b: number[] | undefined): number | null {
  if (!a || !b || a.length !== b.length || a.length === 0) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : null;
}

export function embeddingSimilarity(creatorId: string, brandId: string): number | null {
  return cosineSim(IDX.creators[creatorId], IDX.brands[brandId]);
}

export function bestCitedPost(
  creator: Creator,
  brand: Brand,
): { url: string; caption: string; hashtags: string[]; cosine: number } | null {
  const brandVec = IDX.brands[brand.id];
  if (!brandVec || !creator.cited_posts?.length) return null;
  let best: { url: string; caption: string; hashtags: string[]; cosine: number } | null = null;
  for (const p of creator.cited_posts) {
    const v = IDX.posts[p.url];
    const cos = cosineSim(v, brandVec);
    if (cos == null) continue;
    if (!best || cos > best.cosine) {
      best = { url: p.url, caption: p.caption, hashtags: p.hashtags, cosine: cos };
    }
  }
  return best;
}

export type ImpactBreakdown = {
  followers_factor: number; // 0..1 contribution
  niche_relevance: number; // 0..1
  cadence: number; // 0..1 contribution
  interactions: number; // 0..1 contribution (engagement quality)
  authenticity: number; // 0..1
  geo_match: number; // 0 or 1 (bonus only when brand provided + geo overlaps)
  composite: number; // weighted 0..100
  rounded: number; // 0..100, integer
};

const W = {
  followers: 22,
  engagement: 28,
  cadence: 12,
  niche: 26,
  authenticity: 7,
  geo: 5,
};

export function computeImpact(creator: Creator, brand?: Brand): ImpactBreakdown {
  // Normalised 0..1 sub-scores. log scales keep outliers from saturating.
  // 10M followers ≈ 1.0 ; 10k ≈ 0.57 ; 1k ≈ 0.43
  const followersNorm = clamp(Math.log10(creator.followers + 1) / 7, 0, 1);
  // 100k median engagement ≈ 1.0 ; 10k ≈ 0.8 ; 1k ≈ 0.6 ; 100 ≈ 0.4
  const engagementNorm = clamp(Math.log10(creator.median_interactions + 1) / 5, 0, 1);
  // 7 posts/wk = 1.0 ; 1 post/wk ≈ 0.14
  const cadenceNorm = clamp(creator.posts_per_week / 7, 0, 1);
  // Niche relevance vs the focus brand (defaults to a neutral 0.55 if no brand context)
  const nicheNorm = brand
    ? estimateNicheRelevance(creator.niche_tags, brand.target_personas, brand.ad_themes)
    : 0.55;
  const authenticityNorm = clamp(creator.authenticity_modifier, 0, 1);
  const geoNorm = brand
    ? brand.target_geo.some((t) => creator.geo_match_targets.some((g) => g.toLowerCase().includes(t.toLowerCase())))
      ? 1
      : 0
    : 0;

  const composite =
    followersNorm * W.followers +
    engagementNorm * W.engagement +
    cadenceNorm * W.cadence +
    nicheNorm * W.niche +
    authenticityNorm * W.authenticity +
    geoNorm * W.geo;

  return {
    followers_factor: round(followersNorm, 2),
    niche_relevance: round(nicheNorm, 2),
    cadence: round(cadenceNorm, 2),
    interactions: round(engagementNorm, 2),
    authenticity: round(authenticityNorm, 2),
    geo_match: geoNorm,
    composite: round(composite, 1),
    rounded: clamp(Math.round(composite), 0, 99),
  };
}

export type CitationMatch = {
  cited_post_url: string;
  caption: string;
  reason: string; // one-line rationale citing brand
  hashtags: string[];
};

export function buildCitations(creator: Creator, brand: Brand): CitationMatch[] {
  if (!creator.cited_posts) return [];
  // Rank cited posts by cosine vs brand vector when both vectors exist.
  // Falls back to file order when embeddings are missing for either side.
  const brandVec = IDX.brands[brand.id];
  const ranked = [...creator.cited_posts].sort((a, b) => {
    if (!brandVec) return 0;
    const ca = cosineSim(IDX.posts[a.url], brandVec) ?? -1;
    const cb = cosineSim(IDX.posts[b.url], brandVec) ?? -1;
    return cb - ca;
  });
  return ranked.slice(0, 2).map((p) => {
    const cos = brandVec ? cosineSim(IDX.posts[p.url], brandVec) : null;
    return {
      cited_post_url: p.url,
      caption: p.caption,
      hashtags: p.hashtags,
      reason: makeReason(creator, brand, p.caption, p.hashtags, cos),
    };
  });
}

function makeReason(
  creator: Creator,
  brand: Brand,
  caption: string,
  hashtags: string[],
  postCosine: number | null,
): string {
  const tagOverlap = hashtags.find((h) =>
    brand.ad_themes.some((t) => t.toLowerCase().includes(h.replace("#", "").toLowerCase())),
  );
  const cosNote = postCosine != null ? ` Cosine sim ${postCosine.toFixed(2)}.` : "";
  if (creator.niche_tags.includes("ucsb") && brand.target_geo.some((g) => g.includes("UCSB"))) {
    return `UCSB on ${brand.name}'s target list. "${caption}" hits ${
      hashtags.slice(0, 3).join(" ")
    } - same audience ${brand.name} runs ads to.${cosNote}`;
  }
  if (tagOverlap) {
    return `${tagOverlap} overlaps directly with ${brand.name}'s ad themes (${
      brand.ad_themes.slice(0, 3).join(", ")
    }).${cosNote}`;
  }
  return `${creator.niche} content overlaps with ${brand.name}'s ${
    brand.ad_themes[0] ?? "brand voice"
  }; "${caption}" sets the tone.${cosNote}`;
}

export function similarity(creator: Creator, brand: Brand): number {
  // Real semantic cosine from Gemini embeddings (768d) when both sides indexed.
  const cos = cosineSim(IDX.creators[creator.id], IDX.brands[brand.id]);
  // Keyword/persona fuzz layer (deterministic, encodes hand-tuned rules).
  const overlap = estimateNicheRelevance(
    creator.niche_tags,
    brand.target_personas,
    brand.ad_themes,
  );
  // Cosines from gemini-embedding-001 cluster around 0.55-0.78 for mixed-niche
  // pairs and 0.78+ for tight matches. We rescale [0.55, 0.85] -> [0, 1] so the
  // demo's headline number stays in the 0.4-0.95 band the UI is calibrated for.
  const cosScaled = cos != null ? clamp((cos - 0.55) / 0.30, 0, 1) : null;
  const semantic = cosScaled != null ? cosScaled * 0.55 + overlap * 0.45 : overlap;
  const geoBoost = brand.target_geo.some((t) =>
    creator.geo_match_targets.some((g) => g.toLowerCase().includes(t.toLowerCase())),
  )
    ? 0.07
    : 0;
  const cadenceBoost = Math.min(0.05, creator.posts_per_week * 0.01);
  return Math.min(0.99, semantic + geoBoost + cadenceBoost);
}

function estimateNicheRelevance(
  creator_tags: string[],
  brand_personas: string[],
  brand_themes: string[],
): number {
  const personaHits = brand_personas.filter((p) =>
    creator_tags.some((t) => personaMatches(t, p)),
  ).length;
  const themeHits = brand_themes.filter((th) =>
    creator_tags.some((t) => th.toLowerCase().includes(t.toLowerCase())),
  ).length;
  const score =
    personaHits / Math.max(1, brand_personas.length) * 0.7 +
    themeHits / Math.max(1, brand_themes.length) * 0.3;
  return clamp(score + 0.45, 0.4, 0.97);
}

function personaMatches(tag: string, persona: string): boolean {
  const t = tag.toLowerCase();
  const p = persona.toLowerCase();
  if (p.includes("gym") && (t.includes("gym") || t.includes("physique") || t.includes("fitness"))) return true;
  if (p.includes("women") && (t.includes("women") || t.includes("aesthetic") || t.includes("lifestyle"))) return true;
  if (p.includes("college") && (t.includes("ucsb") || t.includes("college") || t.includes("ucla") || t.includes("usc"))) return true;
  if (p.includes("stem") && (t.includes("stem") || t.includes("quant") || t.includes("ucsb"))) return true;
  if (p.includes("athlete") && (t.includes("training") || t.includes("athletic") || t.includes("sport"))) return true;
  if (p.includes("wellness") && (t.includes("yoga") || t.includes("wellness") || t.includes("mobility") || t.includes("recipes"))) return true;
  if (p.includes("outdoor") && (t.includes("outdoor") || t.includes("climber") || t.includes("hiking"))) return true;
  if (p.includes("lifestyle") && (t.includes("lifestyle") || t.includes("aesthetic"))) return true;
  return t === p;
}

export type PaybackBreakdown = {
  base_floor: number;
  impact_term: number; // impact_score * 0.15
  relevant_eyes_bonus: number;
  total_low: number;
  total_high: number;
  recommended: number;
};

export function computeSuggestedPay(
  creator: Creator,
  brand: Brand,
  impact: ImpactBreakdown,
): PaybackBreakdown {
  const tier =
    creator.followers >= 250_000 ? "mid" : creator.followers >= 25_000 ? "micro" : "nano";
  const base_floor = tier === "mid" ? 1500 : tier === "micro" ? 500 : 200;
  const impact_term = impact.composite * 0.15;
  // Relevant-eyes bonus: a synthetic estimate based on similarity * sqrt(median views)
  const sim = similarity(creator, brand);
  const relevant_eyes_bonus = sim * Math.sqrt(creator.median_views) * 0.05;
  const recommended = Math.max(base_floor, impact_term) + relevant_eyes_bonus;
  return {
    base_floor: round(base_floor, 0),
    impact_term: round(impact_term, 0),
    relevant_eyes_bonus: round(relevant_eyes_bonus, 0),
    total_low: round(Math.max(brand.budget_per_post_low, recommended * 0.85), 0),
    total_high: round(Math.max(brand.budget_per_post_high, recommended * 1.15), 0),
    recommended: round(recommended, 0),
  };
}

function round(n: number, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// Format helpers (Mercor-style numeric microcopy)
export function fmtFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
