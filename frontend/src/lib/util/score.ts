// Impact score + relevant-eyes pricing math, transparent and reproducible.
// Mirrors agent/impact.py + agent/relevance.py shapes.

import type { Creator } from "@/lib/data/creators";
import type { Brand } from "@/lib/data/brands";

export type ImpactBreakdown = {
  followers_factor: number; // sqrt(followers) / 100
  niche_relevance: number; // 0..1
  cadence: number; // posts_per_week_last_4w
  interactions: number; // log10(median_interactions+1)
  authenticity: number; // 0..1
  geo_match: number; // 1.0 or 1.2
  composite: number; // product
  rounded: number; // 0..100
};

export function computeImpact(creator: Creator, brand?: Brand): ImpactBreakdown {
  const followers_factor = Math.sqrt(creator.followers) / 100;
  const niche_relevance = brand
    ? estimateNicheRelevance(creator.niche_tags, brand.target_personas, brand.ad_themes)
    : 0.7;
  const cadence = creator.posts_per_week;
  const interactions = Math.log10(creator.median_interactions + 1);
  const authenticity = creator.authenticity_modifier;
  const geo_match = brand
    ? brand.target_geo.some((t) => creator.geo_match_targets.some((g) => g.toLowerCase().includes(t.toLowerCase())))
      ? 1.2
      : 1.0
    : 1.0;
  const composite =
    followers_factor *
    niche_relevance *
    cadence *
    interactions *
    authenticity *
    geo_match;
  return {
    followers_factor: round(followers_factor, 2),
    niche_relevance: round(niche_relevance, 2),
    cadence,
    interactions: round(interactions, 2),
    authenticity,
    geo_match,
    composite: round(composite, 2),
    rounded: Math.min(99, Math.round(composite)),
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
  return creator.cited_posts.slice(0, 2).map((p) => ({
    cited_post_url: p.url,
    caption: p.caption,
    hashtags: p.hashtags,
    reason: makeReason(creator, brand, p.caption, p.hashtags),
  }));
}

function makeReason(
  creator: Creator,
  brand: Brand,
  caption: string,
  hashtags: string[],
): string {
  const tagOverlap = hashtags.find((h) =>
    brand.ad_themes.some((t) => t.toLowerCase().includes(h.replace("#", "").toLowerCase())),
  );
  if (creator.niche_tags.includes("ucsb") && brand.target_geo.some((g) => g.includes("UCSB"))) {
    return `UCSB on ${brand.name}'s target list. "${caption}" hits ${
      hashtags.slice(0, 3).join(" ")
    } - same audience ${brand.name} runs ads to.`;
  }
  if (tagOverlap) {
    return `${tagOverlap} overlaps directly with ${brand.name}'s ad themes (${
      brand.ad_themes.slice(0, 3).join(", ")
    }).`;
  }
  return `${creator.niche} content overlaps with ${brand.name}'s ${
    brand.ad_themes[0] ?? "brand voice"
  }; "${caption}" sets the tone.`;
}

export function similarity(creator: Creator, brand: Brand): number {
  const overlap = estimateNicheRelevance(
    creator.niche_tags,
    brand.target_personas,
    brand.ad_themes,
  );
  const geoBoost = brand.target_geo.some((t) =>
    creator.geo_match_targets.some((g) => g.toLowerCase().includes(t.toLowerCase())),
  )
    ? 0.07
    : 0;
  const cadenceBoost = Math.min(0.05, creator.posts_per_week * 0.01);
  return Math.min(0.99, overlap + geoBoost + cadenceBoost);
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
