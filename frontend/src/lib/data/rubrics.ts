// Interview grading rubric.
//
// Two parts:
//
//   1. CORE rubric — 4 fixed criteria, every interview is graded against them.
//      Their grading prompts are *brand-customized* per campaign so the LLM
//      knows whose product the candidate is being measured against. The four:
//
//        a) brand_fit          — voice + audience overlap with this brand's ICP
//        b) past_performance   — prior promos, similarity to this brand,
//                                outcomes (views, sells, conversions)
//        c) learning           — growth plan, recent personal/audience growth,
//                                self-awareness about what's working
//        d) motivation_passion — what they actually know about THIS brand,
//                                product fluency, why they care
//
//   2. IDEAS rubric — separately scored bucket. The candidate is asked late
//      in the interview to pitch concrete ideas. Each idea is broken down
//      into idea / hook / punch / origin / why_works / proposed_kpis (the
//      KPIs the creator wants Mercor to monitor for bonus payouts) /
//      optional rebuttal. Each idea is then scored on:
//
//        a) novelty           — does this feel original vs. a stock UGC pitch
//        b) brand_creator_fit — does the idea actually live at the brand ∩
//                               creator overlap, not just creator vanity
//        c) potential         — does it have plausible reach + conversion
//                               upside given the brand's funnel
//
// Both rubric sections feed the admin summary so Aaron can see core fit
// AND idea quality. Shipping decisions favor candidates who score well on
// BOTH — high core / low ideas = polished but generic; low core / high
// ideas = creative but off-brand.

import type { Campaign } from "./campaigns";
import { BRANDS_BY_ID, type Brand } from "./brands";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RubricCriterion {
  /** Stable id used as a JSON key in scoring output. */
  id: string;
  /** Short human label rendered in the admin KPI grid. */
  label: string;
  /** Sentence the LLM uses to decide what to score. */
  prompt: string;
  /** Weight 0..1 — used to compute the overall rubric grade. */
  weight: number;
}

export interface Rubric {
  id: string;
  label: string;
  description: string;
  criteria: RubricCriterion[];
}

/**
 * Brand context surfaced to the LLM grader. Built from the campaign + the
 * resolved Brand record so the prompt can quote real brand language.
 */
export interface BrandContext {
  brand_id: string;
  brand_name: string;
  category: string;
  audience: string;
  voice: string[];
  ad_themes: string[];
  target_personas: string[];
  campaign_brief: string;
  campaign_title: string;
  budget_range: { low: number; high: number };
}

/** Structured idea pulled out of the transcript. */
export interface IdeaSubmission {
  /** Stable id assigned by the extractor (idea-1, idea-2, ...). */
  id: string;
  /** 1-2 sentence summary of the pitch. */
  idea: string;
  /** First-3-seconds hook the creator described. */
  hook: string;
  /** Closing payoff / call-to-action. */
  punch: string;
  /** How the creator says they came up with it. */
  origin: string;
  /** Creator's own reasoning for why it lands. */
  why_works: string;
  /** KPIs the creator wants monitored for bonus payouts. */
  proposed_kpis: ProposedKpi[];
  /** Optional rebuttal to AI critique surfaced mid-interview. */
  rebuttal?: string;
}

export interface ProposedKpi {
  /** Metric name (e.g. "engagement-rate", "save-rate", "brand-search-lift"). */
  metric: string;
  /** Threshold the creator wants to beat for the bonus to fire. */
  target: string;
  /** Bonus the creator suggested for clearing the threshold. */
  bonus: string;
}

/** LLM grade for a single idea. */
export interface IdeaScore {
  idea_id: string;
  /** 0..5 from the LLM grader on each axis. */
  novelty: number;
  brand_creator_fit: number;
  potential: number;
  /** One short sentence explaining the trio. */
  rationale: string;
}

// ---------------------------------------------------------------------------
// Core rubric — same 4 criteria for every interview, *prompts* are brand-built
// ---------------------------------------------------------------------------

export const CORE_CRITERIA_IDS = [
  "brand_fit",
  "past_performance",
  "learning",
  "motivation_passion",
] as const;

export type CoreCriterionId = (typeof CORE_CRITERIA_IDS)[number];

const CORE_LABEL: Record<CoreCriterionId, string> = {
  brand_fit: "Brand fit",
  past_performance: "Past performance",
  learning: "Learning & growth",
  motivation_passion: "Motivation & passion",
};

const CORE_WEIGHT: Record<CoreCriterionId, number> = {
  brand_fit: 0.30,
  past_performance: 0.25,
  learning: 0.20,
  motivation_passion: 0.25,
};

/**
 * Pull the brand record + campaign brief into a single grading context. If
 * the campaign points at a brand we don't have curated data for, we still
 * return a usable context so the rubric falls back to creator-economy
 * defaults rather than failing the call.
 */
export function brandContextForCampaign(c: Campaign): BrandContext {
  const brand = BRANDS_BY_ID[c.brand_id] ?? FALLBACK_BRAND;
  return {
    brand_id: brand.id,
    brand_name: brand.name,
    category: brand.category,
    audience: brand.audience,
    voice: brand.brand_voice,
    ad_themes: brand.ad_themes,
    target_personas: brand.target_personas,
    campaign_brief: c.brief,
    campaign_title: c.title,
    budget_range: { low: brand.budget_per_post_low, high: brand.budget_per_post_high },
  };
}

const FALLBACK_BRAND: Brand = {
  id: "unknown-brand",
  name: "this brand",
  category: "wellness",
  website: "https://example.com",
  hq: "",
  audience: "general creator-economy audience",
  brand_voice: ["authentic", "specific"],
  active_ads_seen: 0,
  ad_themes: [],
  target_geo: [],
  target_personas: [],
  budget_per_post_low: 500,
  budget_per_post_high: 1500,
  color: "#7857ff",
};

/**
 * Build the brand-customized core rubric for a given campaign. The structure
 * (4 criteria, weights, ids) is fixed; the prompts are rewritten with
 * brand-specific language so the LLM grades the candidate AGAINST THIS BRAND
 * rather than against a generic creator template.
 */
export function getCoreRubricForCampaign(c: Campaign): Rubric {
  const ctx = brandContextForCampaign(c);
  const voiceList = ctx.voice.length > 0 ? ctx.voice.join(", ") : "the brand's tone";
  const themesList =
    ctx.ad_themes.length > 0 ? ctx.ad_themes.join(", ") : "their typical campaign themes";
  const personasList =
    ctx.target_personas.length > 0 ? ctx.target_personas.join(", ") : "their ICP";

  const criteria: RubricCriterion[] = [
    {
      id: "brand_fit",
      label: CORE_LABEL.brand_fit,
      weight: CORE_WEIGHT.brand_fit,
      prompt:
        `Does the candidate's audience and voice overlap ${ctx.brand_name}'s ICP (${ctx.audience}; personas: ${personasList})? ` +
        `Does their delivery sit naturally inside ${ctx.brand_name}'s voice (${voiceList})? ` +
        `Higher = direct overlap with named demos AND tonal fit; lower = generic creator who could match any brand.`,
    },
    {
      id: "past_performance",
      label: CORE_LABEL.past_performance,
      weight: CORE_WEIGHT.past_performance,
      prompt:
        `Did the candidate cite previous brand promos they've run? ` +
        `Were any of those promos similar to ${ctx.brand_name} (${ctx.category}, themes: ${themesList})? ` +
        `Did they share concrete outcomes (views, save rate, comments, conversion, code redemptions)? ` +
        `Higher = named brands + similar category + numeric outcomes; lower = vague claims.`,
    },
    {
      id: "learning",
      label: CORE_LABEL.learning,
      weight: CORE_WEIGHT.learning,
      prompt:
        "How does the candidate plan to grow their content quality and audience from here? " +
        "Have they recently changed format, posting cadence, hook style, or storytelling and shown receipts? " +
        "Look for self-awareness about what's working AND a forward plan, not just past wins. " +
        "Higher = explicit before/after + concrete next experiment; lower = static or growth-by-luck story.",
    },
    {
      id: "motivation_passion",
      label: CORE_LABEL.motivation_passion,
      weight: CORE_WEIGHT.motivation_passion,
      prompt:
        `What does the candidate actually know about ${ctx.brand_name}? ` +
        `Can they name product variants, recent launches, the ad themes (${themesList}), or the brand's positioning vs. competitors? ` +
        `Why do they personally care about this product (not just "I drink it")? ` +
        `Higher = product fluency + specific personal stake; lower = "I think it's cool".`,
    },
  ];

  return {
    id: `core-${ctx.brand_id}`,
    label: `Core fit — ${ctx.brand_name}`,
    description:
      `Brand-customized core rubric for ${ctx.campaign_title}. Grades the candidate against ` +
      `${ctx.brand_name}'s audience, voice, and product story.`,
    criteria,
  };
}

// ---------------------------------------------------------------------------
// Ideas rubric — separate bucket, applied per-idea
// ---------------------------------------------------------------------------

export const IDEAS_CRITERIA_IDS = [
  "novelty",
  "brand_creator_fit",
  "potential",
] as const;

export type IdeasCriterionId = (typeof IDEAS_CRITERIA_IDS)[number];

export const IDEAS_RUBRIC: Rubric = {
  id: "ideas-default",
  label: "Idea quality",
  description:
    "Per-idea grading. The same three axes apply to every idea the candidate pitched — novelty, " +
    "creator-brand fit, potential. Average across ideas gives the candidate's idea-bucket score.",
  criteria: [
    {
      id: "novelty",
      label: "Novelty",
      weight: 0.35,
      prompt:
        "Is this idea original, or a stock UGC pitch (haul, GRWM, day-in-the-life with no twist)? Higher = a hook or angle the brand probably hasn't seen this quarter.",
    },
    {
      id: "brand_creator_fit",
      label: "Brand × creator fit",
      weight: 0.35,
      prompt:
        "Does the idea live at the intersection of THIS brand's voice/ICP and THIS creator's actual content? Higher = both brand and creator are visibly there; lower = creator is vain about an idea that doesn't fit the brand, or the brand is forced into a creator's existing format with no edit.",
    },
    {
      id: "potential",
      label: "Potential",
      weight: 0.30,
      prompt:
        "Plausible reach + conversion upside given the brand's funnel. Does the proposed KPI structure target a real lever (engagement, save-rate, conversion lift, brand search) and not vanity (raw view count)? Higher = clean upside on metrics that actually move the brand's revenue.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Returns the core rubric for the given campaign. Always 4 criteria, weights
 * fixed, prompts brand-customized.
 */
export function getRubricForCampaign(c: Campaign): Rubric {
  return getCoreRubricForCampaign(c);
}

/**
 * Stable id for the brand-customized rubric. Used for storage / cache keys.
 * Uses the brand id rather than a campaign-specific id so two campaigns from
 * the same brand share the same rubric id.
 */
export function getRubricIdForCampaign(c: Campaign): string {
  return `core-${c.brand_id}`;
}

/**
 * Reverse lookup. Falls back to a generic creator-economy rubric (using the
 * fallback brand) when the id isn't recognized — happens when an admin
 * fetches an old record stored against a deprecated rubric id.
 */
export function getRubricById(id: string | undefined | null): Rubric {
  if (!id) return GENERIC_CORE_RUBRIC;
  if (id.startsWith("core-")) {
    const brandId = id.slice("core-".length);
    const brand = BRANDS_BY_ID[brandId];
    if (!brand) return GENERIC_CORE_RUBRIC;
    // Synthesize a campaign-shaped wrapper so the prompt builder works.
    return getCoreRubricForCampaign({
      id: `${brand.id}-rubric-resolve`,
      brand_id: brand.id,
      title: `${brand.name} campaign`,
      rate_low: brand.budget_per_post_low,
      rate_high: brand.budget_per_post_high,
      rate_unit: "post",
      oneclick_apply: false,
      hires_this_month: 0,
      paid_this_month: 0,
      brief: "",
      deliverables: [],
      target_personas: brand.target_personas,
      active: true,
    });
  }
  return GENERIC_CORE_RUBRIC;
}

/**
 * The fully-generic creator-economy rubric used when neither campaign nor
 * brand context is available (e.g. legacy interviews persisted before this
 * file existed). Same 4 ids, same weights, neutral prompt copy.
 */
const GENERIC_CORE_RUBRIC: Rubric = {
  id: "core-generic",
  label: "Core fit — generic",
  description:
    "Generic 4-criteria fallback used when the campaign context is missing.",
  criteria: [
    {
      id: "brand_fit",
      label: CORE_LABEL.brand_fit,
      weight: CORE_WEIGHT.brand_fit,
      prompt:
        "Does the candidate's audience and voice overlap a typical brand's ICP for their lane? Higher = direct overlap; lower = generic.",
    },
    {
      id: "past_performance",
      label: CORE_LABEL.past_performance,
      weight: CORE_WEIGHT.past_performance,
      prompt:
        "Did the candidate cite previous brand promos with concrete outcomes (views, save rate, comment quality, conversion)? Higher = named brands + numeric outcomes.",
    },
    {
      id: "learning",
      label: CORE_LABEL.learning,
      weight: CORE_WEIGHT.learning,
      prompt:
        "Growth plan + recent shifts in format/cadence/hook style with receipts. Higher = explicit before/after + concrete next experiment.",
    },
    {
      id: "motivation_passion",
      label: CORE_LABEL.motivation_passion,
      weight: CORE_WEIGHT.motivation_passion,
      prompt:
        "Product fluency + personal stake in the brand's category. Higher = specific knowledge + a real reason to care.",
    },
  ],
};
