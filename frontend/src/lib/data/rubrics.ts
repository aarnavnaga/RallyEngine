// Role-specific evaluation rubrics for the AI interview grader.
// Each rubric is a list of named criteria the LLM scores 0-5, plus a
// short description used in the Gemini system prompt so it knows
// exactly what to look for.
//
// The mapping from campaign → rubric is computed in `getRubricForCampaign`
// based on target_personas / title keywords so we don't have to hand-tag
// every campaign in /lib/data/campaigns.ts.

import type { Campaign } from "./campaigns";

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

// Default — creator-economy interview, used when nothing more specific fits.
const CREATOR_DEFAULT: Rubric = {
  id: "creator-default",
  label: "Creator economy — generalist",
  description:
    "General-purpose creator interview. Used when the campaign doesn't lean heavily into college, lifestyle, or pricing-first signals.",
  criteria: [
    {
      id: "specificity",
      label: "Specificity",
      weight: 0.25,
      prompt:
        "Did the candidate cite specific posts, numbers, brands, or audience demos rather than vague platitudes? Higher = more concrete references.",
    },
    {
      id: "audience-fluency",
      label: "Audience fluency",
      weight: 0.25,
      prompt:
        "How well does the candidate know who actually watches them? Age, geo, intent, what they post — direct answers vs. hand-waving.",
    },
    {
      id: "brand-judgment",
      label: "Brand judgment",
      weight: 0.20,
      prompt:
        "Quality of reasoning about brand fit — names a clear non-fit AND a clean fit, with a why grounded in audience and content style.",
    },
    {
      id: "pricing-rigor",
      label: "Pricing rigor",
      weight: 0.15,
      prompt:
        "Did the candidate articulate HOW they price a post — math, levers (followers, engagement, exclusivity, deliverables) — not just a flat number?",
    },
    {
      id: "communication",
      label: "Communication",
      weight: 0.15,
      prompt:
        "Composure, vocabulary breadth, low filler density, full sentences. Higher = recruiter-ready presentation.",
    },
  ],
};

// College ambassador campaigns — Celsius, college-tier energy, etc.
const COLLEGE_AMBASSADOR: Rubric = {
  id: "college-ambassador",
  label: "College ambassador",
  description:
    "Campus-tier campaigns where the buyer cares about a specific school, GPA-coded peer access, and authentic dual-use (study + lifestyle).",
  criteria: [
    {
      id: "campus-fit",
      label: "Campus fit",
      weight: 0.30,
      prompt:
        "Does the candidate's audience overlap the target campus list (UCSB, UCLA, USC, Berkeley, ASU, UMich, UF, GTech)? Higher = direct campus mention or in-network signal.",
    },
    {
      id: "stem-credibility",
      label: "STEM credibility",
      weight: 0.20,
      prompt:
        "Tags like #janestreet #math #quant #ucsb #stanford or named professors / research / internships. Higher = signals real proximity to the STEM-grind audience the brand pays for.",
    },
    {
      id: "specificity",
      label: "Specificity",
      weight: 0.20,
      prompt:
        "Specific posts, numbers, audience demos cited rather than vague platitudes.",
    },
    {
      id: "brand-judgment",
      label: "Brand judgment",
      weight: 0.15,
      prompt:
        "Names a clear non-fit AND a clean fit with reasoning grounded in audience.",
    },
    {
      id: "communication",
      label: "Communication",
      weight: 0.15,
      prompt: "Composure, vocabulary, low filler density.",
    },
  ],
};

// Lifestyle / aesthetic / women-led drops — Alani, Bloom, Gorgie.
const LIFESTYLE_AESTHETIC: Rubric = {
  id: "lifestyle-aesthetic",
  label: "Lifestyle / aesthetic",
  description:
    "Soft-sell wellness and lifestyle drops where the buyer cares about taste, authenticity, and a non-hard-sell tone.",
  criteria: [
    {
      id: "aesthetic-taste",
      label: "Aesthetic taste",
      weight: 0.25,
      prompt:
        "Does the candidate articulate a coherent visual / tonal point of view? Higher = clear mood-board fluency, lower = generic 'pretty' talk.",
    },
    {
      id: "audience-fluency",
      label: "Audience fluency",
      weight: 0.25,
      prompt: "Knows who actually watches — age, geo, intent.",
    },
    {
      id: "soft-sell-fluency",
      label: "Soft-sell fluency",
      weight: 0.20,
      prompt:
        "Comfort with non-hard-sell formats: GRWM, morning-routine, wellness-stack. Avoids pre-workout pump cues.",
    },
    {
      id: "brand-judgment",
      label: "Brand judgment",
      weight: 0.15,
      prompt: "Clean fit reasoning grounded in audience.",
    },
    {
      id: "communication",
      label: "Communication",
      weight: 0.15,
      prompt: "Composure, vocabulary, low filler density.",
    },
  ],
};

// Performance / pre-workout / aesthetic-physique — Bucked Up, Ghost, Ryse, Gymshark.
const PERFORMANCE_PHYSIQUE: Rubric = {
  id: "performance-physique",
  label: "Performance / physique",
  description:
    "Aesthetic-physique creators for pre-workout, supplement, and gym apparel brands. Buyer cares about training credibility + post performance.",
  criteria: [
    {
      id: "training-credibility",
      label: "Training credibility",
      weight: 0.25,
      prompt:
        "Does the candidate sound like they actually train? References to lifts, splits, programs, gym-talk vocab. Higher = credibly in-lane.",
    },
    {
      id: "post-performance",
      label: "Post performance",
      weight: 0.20,
      prompt:
        "Did the candidate cite real performance numbers (views, likes, save rate, comment quality) on their own posts?",
    },
    {
      id: "specificity",
      label: "Specificity",
      weight: 0.20,
      prompt: "Specific posts / numbers / brand names cited.",
    },
    {
      id: "pricing-rigor",
      label: "Pricing rigor",
      weight: 0.20,
      prompt:
        "Articulates HOW they price — followers, engagement, exclusivity — not just a flat number.",
    },
    {
      id: "communication",
      label: "Communication",
      weight: 0.15,
      prompt: "Composure, vocabulary, low filler density.",
    },
  ],
};

export const RUBRICS: Record<string, Rubric> = {
  [CREATOR_DEFAULT.id]: CREATOR_DEFAULT,
  [COLLEGE_AMBASSADOR.id]: COLLEGE_AMBASSADOR,
  [LIFESTYLE_AESTHETIC.id]: LIFESTYLE_AESTHETIC,
  [PERFORMANCE_PHYSIQUE.id]: PERFORMANCE_PHYSIQUE,
};

// Pick the best-fit rubric for a campaign without forcing every campaign
// to hand-tag itself. Lookup order: explicit personas → title keywords →
// deliverable keywords → default.
export function getRubricIdForCampaign(c: Campaign): string {
  const haystack = [
    c.title,
    c.brief,
    ...(c.deliverables ?? []),
    ...(c.target_personas ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (
    /college|campus|ambassador|ucsb|ucla|usc|berkeley|asu|umich|stanford/.test(haystack) ||
    haystack.includes("college-stem")
  ) {
    return COLLEGE_AMBASSADOR.id;
  }
  if (
    /grwm|get.ready.with.me|aesthetic|lifestyle|morning routine|wellness/.test(haystack) ||
    /women|female|it.girl|alani|bloom|gorgie/.test(haystack)
  ) {
    return LIFESTYLE_AESTHETIC.id;
  }
  if (
    /pre.workout|pre-workout|gym|physique|bodybuilding|supplement|protein|shred/.test(haystack) ||
    /bucked.up|ghost|ryse|c4|gymshark|alphalete|optimum/.test(haystack)
  ) {
    return PERFORMANCE_PHYSIQUE.id;
  }
  return CREATOR_DEFAULT.id;
}

export function getRubricForCampaign(c: Campaign): Rubric {
  return RUBRICS[getRubricIdForCampaign(c)] ?? CREATOR_DEFAULT;
}

export function getRubricById(id: string | undefined | null): Rubric {
  if (!id) return CREATOR_DEFAULT;
  return RUBRICS[id] ?? CREATOR_DEFAULT;
}
