// Canonical day-1 revenue + cross-cutting copy for Aaron iteration v3.
// Spec: /docs/specs/source-of-truth.md
// Workers MUST import from this module — never hardcode dollar
// amounts, percentages, or anchor copy on demo surfaces.

export const PLACEMENT_FEE_PCT = 0.2 as const;
export const PERFORMANCE_KICKER_PCT = 0.05 as const;

export const LOGAN_CELSIUS_BASE_USD = 850 as const;
export const LOGAN_CELSIUS_PLACEMENT_USD = 170 as const; // 0.20 × 850
export const LOGAN_CELSIUS_KICKER_RANGE_USD = [0, 50] as const;

/** Path-to-$1M unit math for the growth-team slide #9. */
export const GROWTH_PATH_DEALS_PER_MONTH = 60 as const;
export const GROWTH_PATH_AVG_DEAL_USD = 850 as const;
export const GROWTH_PATH_MONTHS = 12 as const;
export const GROWTH_PATH_TOTAL_USD =
  PLACEMENT_FEE_PCT *
  GROWTH_PATH_DEALS_PER_MONTH *
  GROWTH_PATH_AVG_DEAL_USD *
  GROWTH_PATH_MONTHS; // = 1_224_000

export const GROWTH_PATH_TOTAL_LABEL = "$1.22M" as const;

/** Headline phrase used verbatim in deck slide 6 + RL Studio header + outreach contract. */
export const DAY1_REVENUE_HEADLINE =
  "Logan × Celsius signed: $170 placement + $0–$50 perf kicker + per-task RL revenue when this becomes a Mercor world.";

/** Outreach contract revenue micro-strip. */
export const OUTREACH_CONTRACT_REVENUE_STRIP =
  "Placement fee on close: $170 · Per-post performance kicker: $0–$50.";

/** /admin overview 3-tile flywheel strip. */
export const ADMIN_OVERVIEW_TILES = [
  {
    title: "Campaigns run",
    value: "47",
    subtitle: "brand-side outcomes feed the model",
  },
  {
    title: "Outcomes recorded",
    value: "31",
    subtitle: "predictor delta vs follower-baseline +18% (last 90d)",
  },
  {
    title: "RL tasks graded",
    value: "312",
    subtitle: "expert-rated rubric pairs licensed to AI labs",
  },
] as const;

/** /admin overview pipeline footer. Six nodes. */
export const ADMIN_OVERVIEW_PIPELINE = [
  "Source",
  "Verify",
  "Match",
  "Outreach",
  "Evaluate",
  "ROI",
] as const;

/** RL Studio empty-state copy — verbatim from studio.mercor.com/start/. */
export const RL_STUDIO_EMPTY_STATE =
  "Welcome to Studio. No projects assigned yet. Contact the Mercor team to get started.";

/** RL Studio worlds for the creator vertical. */
export const RL_STUDIO_WORLDS = [
  "Beauty",
  "Fitness",
  "Gaming",
  "Food",
  "Fashion",
] as const;

/** RL Studio status pill vocabulary. */
export const RL_STUDIO_STATUSES = [
  "Pending",
  "In Review",
  "Approved",
  "Needs Edits",
  "Discarded",
] as const;

/** Outreach automation counter. */
export const OUTREACH_AUTOMATION_COUNTER =
  "47 of 50 outreach drafts sent without edits";
