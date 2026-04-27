import type { CheatingLevel } from "@/app/api/interview/observe/route";

// Frames below this confidence threshold are too noisy for the integrity
// tally — the vision model itself is unsure what it saw, so a single
// "high" flag with confidence ~0.1 is not enough to flip the badge.
export const CHEATING_CONFIDENCE_FLOOR = 0.3;

export const CHEATING_RANK: Record<CheatingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

// Minimal shape required by the cheating aggregator — both the admin UI's
// stored InterviewFrameScore and the server-side InterviewFrameScore satisfy
// this, so the same helper can be used in both places without coupling them
// to each other's full record type.
export interface CheatingFrame {
  confidence: number;
  cheating: CheatingLevel;
}

// Debounced cheating aggregator. A single noisy frame must NOT flip the
// integrity badge to "high" (hiring-decision risk). We require ≥2 *consecutive*
// frames at a given level before promoting the badge:
//   high   → 2 consecutive frames at high
//   medium → 2 consecutive frames at ≥ medium
//   low    → any single frame at ≥ low
//   none   → otherwise
// Frames whose confidence is below the floor reset both consecutive runs.
export function aggregateCheating(scores: readonly CheatingFrame[]): CheatingLevel {
  let highRun = 0;
  let mediumRun = 0;
  let sawAnyLow = false;
  let badge: CheatingLevel = "none";
  for (const s of scores) {
    if (s.confidence < CHEATING_CONFIDENCE_FLOOR) {
      highRun = 0;
      mediumRun = 0;
      continue;
    }
    const rank = CHEATING_RANK[s.cheating];
    if (rank >= CHEATING_RANK.high) {
      highRun += 1;
      mediumRun += 1;
    } else if (rank >= CHEATING_RANK.medium) {
      highRun = 0;
      mediumRun += 1;
    } else if (rank >= CHEATING_RANK.low) {
      highRun = 0;
      mediumRun = 0;
      sawAnyLow = true;
    } else {
      highRun = 0;
      mediumRun = 0;
    }
    if (highRun >= 2) {
      badge = "high";
    } else if (mediumRun >= 2 && badge !== "high") {
      badge = "medium";
    }
  }
  if (badge === "high" || badge === "medium") return badge;
  return sawAnyLow ? "low" : "none";
}
