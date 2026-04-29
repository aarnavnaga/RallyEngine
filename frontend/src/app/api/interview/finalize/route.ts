import { NextRequest, NextResponse } from "next/server";
import type { CheatingLevel } from "@/app/api/interview/observe/route";
import {
  getRubricById,
  IDEAS_RUBRIC,
  brandContextForCampaign,
  type Rubric,
  type IdeaSubmission,
  type IdeaScore,
  type ProposedKpi,
} from "@/lib/data/rubrics";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface InterviewFrameScore {
  confidence: number;
  engagement: number;
  cheating: CheatingLevel;
  reason: string;
  ts: string;
}

export interface InterviewFinalizeBody {
  creatorId: string;
  campaignId: string;
  campaignTitle: string;
  transcript: InterviewMessage[];
  scores: InterviewFrameScore[];
  finishedAt: string;
  // Optional — picks the brand-customized core rubric used to grade the
  // interview. Falls back to a generic creator rubric when missing.
  rubricId?: string;
}

export interface RubricCriterionScore {
  id: string;
  label: string;
  /** 0..5 from the LLM grader */
  score: number;
  /** One-clause justification quoting the candidate when possible. */
  rationale: string;
  /** weight inherited from the rubric so the UI can render the breakdown. */
  weight: number;
}

/**
 * Insight-based payout structure. The contract overhaul moves us off
 * "X posts → $Y" volume pricing toward a small base retainer plus
 * per-KPI bonuses tied to outcomes the creator self-proposed in their
 * ideas section. This keeps creators incentivized for QUALITY (engagement
 * rate, save rate, conversion lift) instead of grinding out 10 posts that
 * each get 200 views ("slop").
 */
export interface InsightPayout {
  /** Human-readable metric name (e.g. "Save rate"). */
  metric: string;
  /** Threshold the creator must beat. */
  threshold: string;
  /** USD bonus if the threshold is hit. */
  bonus_usd: number;
  /** Source — either pulled from a creator-proposed KPI or a Mercor default. */
  source: "creator-proposed" | "mercor-default";
}

export interface ContractRecommendation {
  /** Small base retainer paid on completion regardless of metrics. */
  base_retainer_usd: number;
  /** Capped total opportunity if every bonus tier hits. */
  cap_usd: number;
  /** Per-KPI bonuses; each one fires independently when its threshold lands. */
  bonuses: InsightPayout[];
  /** "Slop tax" — discount applied if the post under-performs the creator's
   *  own historical median. Encourages quality, not raw posting volume. */
  slop_tax_pct: number;
  /** One-line headline summarizing the structure. */
  rationale: string;
}

export interface InterviewSummary {
  // Aggregate confidence (mean over frames, 0..1).
  confidence: number;
  // Aggregate engagement (mean over frames, 0..1).
  engagement: number;
  // Worst cheating signal observed during the interview.
  cheating: CheatingLevel;
  // Brief one-sentence summary of the candidate's interview.
  summary: string;
  // The single worst frame (highest cheating signal, then lowest confidence).
  worstFrame: InterviewFrameScore | null;
  // Brand-customized core rubric grade. 4 fixed criteria.
  rubricId?: string;
  rubricLabel?: string;
  rubricOverall?: number;
  criteria?: RubricCriterionScore[];
  // Ideas section — extracted from the transcript + graded separately.
  ideas?: IdeaSubmission[];
  ideaScores?: IdeaScore[];
  ideasOverall?: number;
  // Combined verdict: blends core (60%) + ideas (40%) into one 0..1 figure.
  combinedScore?: number;
  // Insight-based contract recommendation derived from creator-proposed KPIs.
  contractRecommendation?: ContractRecommendation;
}

export interface InterviewRecord {
  creatorId: string;
  campaignId: string;
  campaignTitle: string;
  transcript: InterviewMessage[];
  scores: InterviewFrameScore[];
  summary: InterviewSummary;
  finishedAt: string;
}

interface FinalizeResponse {
  ok: true;
  record: InterviewRecord;
}

interface ErrorResponse {
  error: string;
}

// Hard total-payload cap — transcript + scores arrays are bounded by client
// limits (≤ MAX_FRAMES + a small chat history) so 1MB is generous and well
// above any legitimate payload.
const MAX_BYTES = 1_000_000;

// Validators for IDs that flow into the in-memory store key. Permissive
// alphanumeric + dash/underscore, capped at 64 chars. Prevents prototype
// pollution, key collisions with reserved fields, and absurdly long keys
// that could OOM the Map.
const ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_TITLE_LEN = 200;

// Track whether we've already warned about an unset ADMIN_TOKEN this process.
// Avoids log-flooding when admins poll the GET endpoint.
let warnedMissingAdminToken = false;

// Module-scoped store survives across requests in dev/standalone server.
// Demo-only - swap for Supabase/Postgres in production.
type GlobalWithStore = typeof globalThis & {
  __mercorInterviewStore?: Map<string, InterviewRecord>;
};

function store(): Map<string, InterviewRecord> {
  const g = globalThis as GlobalWithStore;
  if (!g.__mercorInterviewStore) {
    g.__mercorInterviewStore = new Map<string, InterviewRecord>();
  }
  return g.__mercorInterviewStore;
}

const CHEATING_RANK: Record<CheatingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

// Frames below this confidence threshold are too noisy for the integrity
// tally — the vision model itself is unsure what it saw, so a single
// "high" flag with confidence ~0.1 is not enough to flip the badge.
const CHEATING_CONFIDENCE_FLOOR = 0.3;

// Debounced cheating aggregator. A single noisy frame must NOT flip the
// integrity badge to "high" (hiring-decision risk). We require ≥2 *consecutive*
// frames at a given level before promoting the badge.
function aggregateCheating(scores: InterviewFrameScore[]): CheatingLevel {
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

// Gemini summary generation. Uses the same key + endpoint pattern as
// /api/interview/turn so we don't add a second integration. We pass the
// full transcript + score aggregates and ask for a verifiable, recruiter-
// facing summary that quotes specific candidate phrases. On any failure
// we fall back to the deterministic synthetic summary in `aggregate`.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// LLM rubric grader for the 4 brand-customized core criteria. Returns
// per-criterion 0-5 scores + rationales. Falls back to null on any failure
// so the synthetic aggregate still works.
async function geminiCoreRubric(
  transcript: InterviewMessage[],
  rubric: Rubric,
  campaignTitle: string,
): Promise<RubricCriterionScore[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const userTurns = transcript.filter((m) => m.role === "user");
  if (userTurns.length === 0) return null;

  const transcriptText = transcript
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");

  const criterionLines = rubric.criteria
    .map((c, i) => `${i + 1}. ${c.id} ("${c.label}"): ${c.prompt}`)
    .join("\n");
  const idsForJson = rubric.criteria.map((c) => `"${c.id}"`).join(" | ");

  const systemText = [
    `You are grading a Mercor AI interview against the "${rubric.label}" rubric for the role: ${campaignTitle}.`,
    `Rubric description: ${rubric.description}`,
    "",
    "Criteria:",
    criterionLines,
    "",
    "Output STRICT JSON ONLY. Schema:",
    `{"criteria":[{"id":${idsForJson},"score":0..5,"rationale":"<short, quotes a candidate phrase>"} ...]}`,
    "Rules:",
    "- Score each criterion an integer 0..5. 0 = absent, 3 = adequate, 5 = excellent.",
    "- Each rationale must be one short sentence (under 30 words) and quote a phrase the candidate actually said when possible.",
    "- Be strict — do not give 5 unless the candidate clearly nailed that criterion against THIS brand.",
    "- Do not include any other fields, prose, or markdown. JSON only.",
  ].join("\n");

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: transcriptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
          topP: 0.9,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    interface RubricResp {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
    const data = (await resp.json()) as RubricResp;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = (parsed as { criteria?: unknown }).criteria;
    if (!Array.isArray(candidate)) return null;
    const out: RubricCriterionScore[] = rubric.criteria.map((c) => {
      const match = candidate.find(
        (x) => typeof x === "object" && x !== null && (x as { id?: unknown }).id === c.id,
      ) as { score?: unknown; rationale?: unknown } | undefined;
      const rawScore = typeof match?.score === "number" ? match.score : 2.5;
      const score = Math.max(0, Math.min(5, rawScore));
      const rationale =
        typeof match?.rationale === "string" && match.rationale.length > 0
          ? match.rationale.slice(0, 280)
          : "No clear evidence in transcript.";
      return {
        id: c.id,
        label: c.label,
        weight: c.weight,
        score,
        rationale,
      };
    });
    return out;
  } catch {
    return null;
  }
}

// Extract structured ideas from the transcript. Looks for any place the
// candidate pitched a specific concept and pulls out idea/hook/punch/
// origin/why-it-works/proposed-KPIs. Returns up to 3 ideas. Falls back to
// null when no Gemini key is set.
async function geminiExtractIdeas(
  transcript: InterviewMessage[],
  campaignTitle: string,
  brandName: string,
): Promise<IdeaSubmission[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (transcript.filter((m) => m.role === "user").length === 0) return null;

  const transcriptText = transcript
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");

  const systemText = [
    `You are extracting concrete content ideas a creator pitched during a Mercor interview for the "${campaignTitle}" role with ${brandName}.`,
    "",
    "Pull up to 3 ideas the candidate ACTUALLY pitched (not generic ideas you imagine on their behalf).",
    "For each idea, return its components AS STATED OR CLEARLY IMPLIED by the candidate.",
    "If the candidate didn't pitch any concrete ideas, return an empty array.",
    "",
    "Output STRICT JSON ONLY. Schema:",
    `{"ideas":[{`,
    `  "id":"idea-1",`,
    `  "idea":"<1-2 sentence summary>",`,
    `  "hook":"<first 3s hook the candidate described, or '' if not stated>",`,
    `  "punch":"<closing payoff/CTA, or '' if not stated>",`,
    `  "origin":"<how the candidate said they came up with it, or '' if not stated>",`,
    `  "why_works":"<candidate's reasoning for why it lands>",`,
    `  "proposed_kpis":[{"metric":"engagement-rate","target":">8%","bonus":"$300"}],`,
    `  "rebuttal":"<optional: candidate's response if AI critiqued the idea>"`,
    `}]}`,
    "",
    "Rules:",
    "- Quote the candidate's words where possible.",
    "- proposed_kpis can be an empty array if no KPIs were mentioned.",
    "- Each KPI metric should be a real performance lever (engagement-rate, save-rate, comment-relevance, conversion, brand-search-lift, video-completion). Avoid vanity metrics like 'follower count'.",
    "- If only 0 ideas were pitched, return {\"ideas\":[]}.",
    "- No prose outside the JSON.",
  ].join("\n");

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: transcriptText }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 900,
          topP: 0.9,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!resp.ok) return null;
    interface IdeasResp {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
    const data = (await resp.json()) as IdeasResp;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const arr = (parsed as { ideas?: unknown }).ideas;
    if (!Array.isArray(arr)) return null;
    const out: IdeaSubmission[] = [];
    for (let i = 0; i < arr.length && out.length < 3; i += 1) {
      const v = arr[i];
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const idea = typeof o.idea === "string" ? o.idea.slice(0, 400) : "";
      if (!idea.trim()) continue;
      const kpis = Array.isArray(o.proposed_kpis)
        ? (o.proposed_kpis
            .map((k) => {
              if (!k || typeof k !== "object") return null;
              const ko = k as Record<string, unknown>;
              const metric = typeof ko.metric === "string" ? ko.metric.slice(0, 80) : "";
              const target = typeof ko.target === "string" ? ko.target.slice(0, 80) : "";
              const bonus = typeof ko.bonus === "string" ? ko.bonus.slice(0, 80) : "";
              if (!metric || !target) return null;
              return { metric, target, bonus } satisfies ProposedKpi;
            })
            .filter(Boolean) as ProposedKpi[])
        : [];
      out.push({
        id: typeof o.id === "string" ? o.id.slice(0, 40) : `idea-${out.length + 1}`,
        idea,
        hook: typeof o.hook === "string" ? o.hook.slice(0, 240) : "",
        punch: typeof o.punch === "string" ? o.punch.slice(0, 240) : "",
        origin: typeof o.origin === "string" ? o.origin.slice(0, 240) : "",
        why_works: typeof o.why_works === "string" ? o.why_works.slice(0, 320) : "",
        proposed_kpis: kpis,
        rebuttal:
          typeof o.rebuttal === "string" && o.rebuttal.length > 0
            ? o.rebuttal.slice(0, 320)
            : undefined,
      });
    }
    return out;
  } catch {
    return null;
  }
}

// Score each extracted idea on the 3 ideas-rubric criteria. Returns one
// IdeaScore per IdeaSubmission in input order. Returns null on any LLM
// failure so the rest of the summary can still ship.
async function geminiGradeIdeas(
  ideas: IdeaSubmission[],
  brandName: string,
  campaignTitle: string,
): Promise<IdeaScore[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || ideas.length === 0) return null;

  const ideasText = ideas
    .map(
      (i, idx) =>
        `IDEA ${idx + 1} (id=${i.id}):\n` +
        `  pitch: ${i.idea}\n` +
        `  hook: ${i.hook}\n` +
        `  punch: ${i.punch}\n` +
        `  origin: ${i.origin}\n` +
        `  why_works: ${i.why_works}\n` +
        `  KPIs: ${i.proposed_kpis
          .map((k) => `${k.metric} ${k.target} → ${k.bonus}`)
          .join("; ") || "(none)"}\n` +
        (i.rebuttal ? `  rebuttal: ${i.rebuttal}` : ""),
    )
    .join("\n\n");

  const systemText = [
    `You are grading concrete content ideas a creator pitched for the "${campaignTitle}" campaign with ${brandName}.`,
    "Score each idea independently on three axes (0..5 integer):",
    "- novelty: original vs. stock UGC pitch.",
    "- brand_creator_fit: lives at the intersection of THIS brand's voice/ICP and THIS creator's actual content.",
    "- potential: plausible reach + conversion upside on real levers (not vanity metrics).",
    "",
    "Output STRICT JSON ONLY. Schema:",
    `{"scores":[{"idea_id":"idea-1","novelty":0..5,"brand_creator_fit":0..5,"potential":0..5,"rationale":"<one short sentence quoting the idea>"}]}`,
    "Rules:",
    "- 0..5 integers. Be strict; 5 only when a brand strategist would steal this idea.",
    "- One score row per idea, idea_id matching the input.",
    "- No prose outside the JSON.",
  ].join("\n");

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: ideasText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600,
          topP: 0.9,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return null;
    interface IdeasGradeResp {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
    const data = (await resp.json()) as IdeasGradeResp;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return null;
    }
    if (!parsed || typeof parsed !== "object") return null;
    const arr = (parsed as { scores?: unknown }).scores;
    if (!Array.isArray(arr)) return null;
    const clamp = (n: unknown): number =>
      typeof n === "number" ? Math.max(0, Math.min(5, n)) : 2.5;
    const out: IdeaScore[] = ideas.map((idea) => {
      const match = arr.find(
        (x) => typeof x === "object" && x !== null && (x as { idea_id?: unknown }).idea_id === idea.id,
      ) as { novelty?: unknown; brand_creator_fit?: unknown; potential?: unknown; rationale?: unknown } | undefined;
      return {
        idea_id: idea.id,
        novelty: clamp(match?.novelty),
        brand_creator_fit: clamp(match?.brand_creator_fit),
        potential: clamp(match?.potential),
        rationale:
          typeof match?.rationale === "string" && match.rationale.length > 0
            ? match.rationale.slice(0, 280)
            : "No clear evidence to score this idea.",
      };
    });
    return out;
  } catch {
    return null;
  }
}

// Derive an insight-based contract recommendation from the creator's
// proposed KPIs (preferred) plus brand defaults (fallback). The structure
// is base retainer + per-KPI bonuses; the cap is bounded by the brand's
// budget range so we don't overpromise. Slop tax is fixed at 25% of the
// per-post bonus pool when the creator under-performs their own median.
function deriveInsightPayouts(
  ideas: IdeaSubmission[],
  campaignId: string,
): ContractRecommendation {
  const campaign = CAMPAIGNS_BY_ID[campaignId];
  const ctx = campaign ? brandContextForCampaign(campaign) : null;
  const low = ctx?.budget_range.low ?? 600;
  const high = ctx?.budget_range.high ?? 1200;
  const brandName = ctx?.brand_name ?? "this brand";

  // Base retainer: 25-30% of the bottom of the budget range. Floor $200.
  const baseRetainer = Math.max(200, Math.round(low * 0.28));
  // Cap = top of brand range. Bonuses can stack up to (cap - base).
  const cap = high;
  const bonusPool = Math.max(0, cap - baseRetainer);

  // Roll up creator-proposed KPIs. Limit to 4 distinct metrics to keep the
  // contract scannable. Parse the bonus string the LLM extracted; fall back
  // to a fair fraction of the pool when no number was given.
  const seen = new Set<string>();
  const proposed: InsightPayout[] = [];
  for (const idea of ideas) {
    for (const kpi of idea.proposed_kpis) {
      const key = kpi.metric.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const parsedBonus = parseUsd(kpi.bonus);
      proposed.push({
        metric: humanizeMetric(kpi.metric),
        threshold: kpi.target,
        bonus_usd: parsedBonus ?? 0, // backfilled below
        source: "creator-proposed",
      });
      if (proposed.length >= 4) break;
    }
    if (proposed.length >= 4) break;
  }

  // Mercor defaults that round out the bonus stack when the creator only
  // proposed 1-2 KPIs. These are the levers brand managers ALWAYS care
  // about, regardless of whether the creator surfaced them.
  const defaults: InsightPayout[] = [
    {
      metric: "Engagement rate (likes + comments / 1k views)",
      threshold: ">8%",
      bonus_usd: 0,
      source: "mercor-default",
    },
    {
      metric: "Save rate",
      threshold: ">3%",
      bonus_usd: 0,
      source: "mercor-default",
    },
    {
      metric: "Brand search lift (7-day window)",
      threshold: ">15%",
      bonus_usd: 0,
      source: "mercor-default",
    },
    {
      metric: "Comment-relevance score (Rally semantic match)",
      threshold: ">0.6",
      bonus_usd: 0,
      source: "mercor-default",
    },
  ];

  // Combine, deduping default metrics that overlap with proposed ones.
  const combined: InsightPayout[] = [...proposed];
  for (const d of defaults) {
    if (combined.length >= 4) break;
    if (combined.some((p) => p.metric.toLowerCase().includes(d.metric.toLowerCase().split(" ")[0] ?? ""))) continue;
    combined.push(d);
  }

  // Distribute the bonus pool proportionally. Creator-proposed KPIs get a
  // slight premium (each one is treated as 1.25 weight) since they're the
  // ones the creator has skin in the game on; defaults are 1.0.
  if (combined.length > 0 && bonusPool > 0) {
    const weights: number[] = combined.map((p) =>
      p.source === "creator-proposed" ? 1.25 : 1.0,
    );
    // totalWeight isn't used downstream — bonus distribution is governed by
    // remainingWeight after we honor explicit creator-proposed amounts.
    void weights.reduce((acc: number, w: number) => acc + w, 0);
    let allocated = 0;
    for (let i = 0; i < combined.length; i += 1) {
      // Honor explicit creator-proposed dollar amounts first; remainder of
      // the pool is split proportionally.
      const explicit = combined[i].bonus_usd;
      if (explicit > 0) {
        allocated += explicit;
      }
    }
    const remaining = Math.max(0, bonusPool - allocated);
    const remainingWeight: number = combined
      .map((p, i): number => (p.bonus_usd > 0 ? 0 : weights[i]))
      .reduce((acc: number, w: number) => acc + w, 0);
    if (remainingWeight > 0) {
      for (let i = 0; i < combined.length; i += 1) {
        if (combined[i].bonus_usd > 0) continue;
        const share = (weights[i] / remainingWeight) * remaining;
        combined[i].bonus_usd = Math.round(share / 25) * 25; // round to $25
      }
    }
    // Make sure no bonus is below $50 (otherwise it reads as a noise tier).
    for (let i = 0; i < combined.length; i += 1) {
      if (combined[i].bonus_usd > 0 && combined[i].bonus_usd < 50) {
        combined[i].bonus_usd = 50;
      }
    }
    // Sanity check: total can't exceed bonusPool. Trim from the smallest.
    let total = combined.reduce((a, p) => a + p.bonus_usd, 0);
    while (total > bonusPool && combined.length > 0) {
      const smallestIdx = combined
        .map((p, i) => ({ i, b: p.bonus_usd }))
        .sort((a, b) => a.b - b.b)[0].i;
      combined[smallestIdx].bonus_usd = Math.max(50, combined[smallestIdx].bonus_usd - 25);
      const newTotal = combined.reduce((a, p) => a + p.bonus_usd, 0);
      if (newTotal === total) break;
      total = newTotal;
    }
  }

  const proposedCount = combined.filter((p) => p.source === "creator-proposed").length;
  const rationale =
    proposedCount > 0
      ? `Quality-first contract for ${brandName}. ${proposedCount} bonus${proposedCount === 1 ? "" : "es"} tied to KPIs the creator proposed; the rest are Mercor's standard outcome levers.`
      : `Quality-first contract for ${brandName}. Creator did not propose explicit KPIs, so all bonuses are Mercor's standard outcome levers.`;

  return {
    base_retainer_usd: baseRetainer,
    cap_usd: cap,
    bonuses: combined,
    slop_tax_pct: 25,
    rationale,
  };
}

function parseUsd(raw: string): number | null {
  const m = raw.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|K)?/);
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (Number.isNaN(base)) return null;
  return Math.round(base * (m[2] ? 1000 : 1));
}

function humanizeMetric(raw: string): string {
  const v = raw.trim();
  if (!v) return "Custom KPI";
  // Map well-known short forms to nicer labels.
  const map: Record<string, string> = {
    "engagement-rate": "Engagement rate",
    "engagement_rate": "Engagement rate",
    "save-rate": "Save rate",
    "save_rate": "Save rate",
    "comment-relevance": "Comment relevance score",
    "conversion": "Conversion rate",
    "brand-search-lift": "Brand search lift",
    "brand_search_lift": "Brand search lift",
    "video-completion": "Video completion rate",
  };
  const key = v.toLowerCase();
  if (map[key]) return map[key];
  // Otherwise capitalize each space/dash/underscore-separated word.
  return v
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

async function geminiSummary(
  transcript: InterviewMessage[],
  meanConf: number,
  meanEng: number,
  cheating: CheatingLevel,
  campaignTitle: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (transcript.filter((m) => m.role === "user").length === 0) return null;

  const transcriptText = transcript
    .map((m) => `${m.role === "assistant" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");

  const systemText = [
    `You are a Mercor recruiting analyst summarizing an AI video interview for the "${campaignTitle}" creator-economy role.`,
    "Write a 3-4 sentence verifiable summary aimed at a hiring manager (Aaron, Strategic Ops at Mercor).",
    "Rules:",
    "- Quote one short phrase the candidate actually said in the transcript (use double quotes).",
    "- Reference at least one specific detail they shared: a brand, a number, a platform, an audience demo.",
    "- Note where they were specific vs. vague.",
    "- End with a one-line recommendation: 'Advance', 'Borderline', or 'Pass', followed by a one-clause why.",
    "- Plain English, no corporate jargon, no preamble like 'In summary'.",
    "Tone: how Aaron's debate kids talked when they had a clean case. No hedging.",
  ].join("\n");

  const ctxLine = `Aggregate scores — confidence ${(meanConf * 100).toFixed(0)}%, engagement ${(meanEng * 100).toFixed(0)}%, integrity flag: ${cheating}.`;
  const userText = [ctxLine, "", "Transcript:", transcriptText].join("\n");

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 320, topP: 0.9 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return null;
    interface GeminiResp {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
    const data = (await resp.json()) as GeminiResp;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join(" ")
      .trim();
    return text && text.length > 20 ? text : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Transcript-derived scoring rubric (vision-fallback signals)
// ---------------------------------------------------------------------------

const FILLER_WORDS = new Set([
  "um", "uh", "uhh", "umm", "ah", "ahh", "er", "hmm", "hm",
  "like", "yeah", "y'know", "yknow", "kinda", "sorta",
  "basically", "literally", "honestly", "ok", "okay", "right", "so",
]);

const BRAND_VOCAB = [
  "celsius", "alani", "alani nu", "bucked up", "ghost", "ghost energy",
  "bloom", "bloom nutrition", "ryse", "gorgie", "c4", "optimum nutrition",
  "magic mind", "liquid death", "olipop", "create wellness",
  "gymshark", "lululemon", "nike", "athleta", "alphalete",
  "vital proteins", "athletic greens", "ag1",
];

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

interface TranscriptSignals {
  confidence: number;
  engagement: number;
  meanWords: number;
  fillerRatio: number;
  uniqueWordRatio: number;
  numbersCited: number;
  brandsMentioned: string[];
  postUrlsCited: number;
}

function transcriptSignals(transcript: InterviewMessage[]): TranscriptSignals {
  const userTurns = transcript.filter((m) => m.role === "user");
  if (userTurns.length === 0) {
    return {
      confidence: 0.5,
      engagement: 0.4,
      meanWords: 0,
      fillerRatio: 0,
      uniqueWordRatio: 0,
      numbersCited: 0,
      brandsMentioned: [],
      postUrlsCited: 0,
    };
  }

  const allTokens = userTurns.flatMap((t) =>
    t.content
      .toLowerCase()
      .replace(/[^\p{L}\p{N}'$%./@-]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0),
  );

  const meanWords = allTokens.length / userTurns.length;
  const lengthBoost = clamp01((meanWords - 8) / 60);

  const fillerCount = allTokens.filter((w) => FILLER_WORDS.has(w)).length;
  const fillerRatio = allTokens.length > 0 ? fillerCount / allTokens.length : 0;
  const fillerPenalty = clamp01((fillerRatio - 0.04) / 0.16);

  const sample = allTokens.slice(0, 200);
  const unique = new Set(sample);
  const uniqueWordRatio = sample.length > 0 ? unique.size / sample.length : 0;
  const diversityBoost = clamp01((uniqueWordRatio - 0.35) / 0.45);

  const numbersCited = userTurns.reduce((acc, t) => {
    const matches = t.content.match(/\b\d[\d,]*(?:\.\d+)?(?:%|k|m|usd|\$)?/gi);
    return acc + (matches?.length ?? 0);
  }, 0);
  const numbersBoost = Math.min(0.25, numbersCited * 0.05);

  const lowerJoined = userTurns.map((t) => t.content.toLowerCase()).join(" ");
  const brandsMentioned = BRAND_VOCAB.filter((b) => lowerJoined.includes(b));
  const brandsBoost = Math.min(0.25, brandsMentioned.length * 0.08);

  const postUrlsCited = (lowerJoined.match(/tiktok\.com|instagram\.com|youtube\.com\/shorts/g) ?? [])
    .length;
  const urlsBoost = Math.min(0.15, postUrlsCited * 0.05);

  const aiTurns = transcript.filter((m) => m.role === "assistant").length;
  const substantiveAnswers = userTurns.filter(
    (t) =>
      t.content
        .split(/\s+/)
        .filter((w) => w.length > 0).length >= 6,
  ).length;
  const reactivity = aiTurns > 0 ? substantiveAnswers / aiTurns : 0;
  const reactivityBoost = clamp01(reactivity);

  const confidence = clamp01(
    0.45 +
      0.18 * diversityBoost +
      0.18 * numbersBoost * 4 +
      0.14 * brandsBoost * 4 +
      0.10 * urlsBoost * 6 +
      0.10 * lengthBoost -
      0.32 * fillerPenalty,
  );

  const engagement = clamp01(
    0.40 +
      0.30 * reactivityBoost +
      0.20 * lengthBoost +
      0.10 * (urlsBoost > 0 ? 1 : 0) -
      0.20 * (meanWords < 4 ? 1 : 0) -
      0.15 * fillerPenalty,
  );

  return {
    confidence,
    engagement,
    meanWords,
    fillerRatio,
    uniqueWordRatio,
    numbersCited,
    brandsMentioned,
    postUrlsCited,
  };
}

function blend(transcriptScore: number, visionScore: number | null): number {
  if (visionScore == null) return transcriptScore;
  return clamp01(0.65 * transcriptScore + 0.35 * visionScore);
}

function aggregate(
  scores: InterviewFrameScore[],
  transcript: InterviewMessage[],
): InterviewSummary {
  const sig = transcriptSignals(transcript);

  if (scores.length === 0) {
    const candidateAnswers = transcript.filter((m) => m.role === "user").length;
    if (candidateAnswers === 0) {
      return {
        confidence: 0.0,
        engagement: 0.0,
        cheating: "none",
        summary: "Interview ended without recorded frames or answers.",
        worstFrame: null,
      };
    }
    const evidence: string[] = [];
    if (sig.brandsMentioned.length > 0) {
      evidence.push(`named ${sig.brandsMentioned.length} brand${sig.brandsMentioned.length === 1 ? "" : "s"}`);
    }
    if (sig.numbersCited > 0) {
      evidence.push(`cited ${sig.numbersCited} number${sig.numbersCited === 1 ? "" : "s"}`);
    }
    if (sig.fillerRatio > 0.12) {
      evidence.push(`high filler density (${(sig.fillerRatio * 100).toFixed(0)}%)`);
    }
    const evidenceLine = evidence.length > 0 ? `; ${evidence.join(", ")}` : "";
    return {
      confidence: Number(sig.confidence.toFixed(3)),
      engagement: Number(sig.engagement.toFixed(3)),
      cheating: "none",
      summary:
        `Candidate answered ${candidateAnswers} question${candidateAnswers === 1 ? "" : "s"}; ` +
        `~${Math.round(sig.meanWords)} words/answer${evidenceLine}; ` +
        `no video frames recorded.`,
      worstFrame: null,
    };
  }

  const visionConf =
    scores.reduce((acc, s) => acc + s.confidence, 0) / scores.length;
  const visionEng =
    scores.reduce((acc, s) => acc + s.engagement, 0) / scores.length;

  const meanConf = blend(sig.confidence, visionConf);
  const meanEng = blend(sig.engagement, visionEng);

  const worstCheating = aggregateCheating(scores);

  const worstFrame = scores
    .slice()
    .sort((a, b) => {
      const dr = CHEATING_RANK[b.cheating] - CHEATING_RANK[a.cheating];
      if (dr !== 0) return dr;
      return a.confidence - b.confidence;
    })[0] ?? null;

  const candidateAnswers = transcript.filter((m) => m.role === "user").length;
  const confLabel = meanConf >= 0.7 ? "confident" : meanConf >= 0.4 ? "steady" : "tentative";
  const engLabel = meanEng >= 0.7 ? "engaged" : meanEng >= 0.4 ? "attentive" : "distracted";
  const cheatNote =
    worstCheating === "none"
      ? "no integrity flags"
      : `integrity flag: ${worstCheating}`;

  const summary = `Candidate answered ${candidateAnswers} question${candidateAnswers === 1 ? "" : "s"}; appeared ${confLabel} and ${engLabel}; ${cheatNote}.`;

  return {
    confidence: Number(meanConf.toFixed(3)),
    engagement: Number(meanEng.toFixed(3)),
    cheating: worstCheating,
    summary,
    worstFrame,
  };
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function isInterviewMessage(v: unknown): v is InterviewMessage {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.role !== "user" && o.role !== "assistant") return false;
  if (typeof o.content !== "string") return false;
  if (typeof o.ts !== "string") return false;
  return true;
}

function isCheatingLevel(v: unknown): v is CheatingLevel {
  return v === "none" || v === "low" || v === "medium" || v === "high";
}

function isInterviewFrameScore(v: unknown): v is InterviewFrameScore {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (typeof o.confidence !== "number" || Number.isNaN(o.confidence)) return false;
  if (typeof o.engagement !== "number" || Number.isNaN(o.engagement)) return false;
  if (!isCheatingLevel(o.cheating)) return false;
  if (typeof o.reason !== "string") return false;
  if (typeof o.ts !== "string") return false;
  return true;
}

function isValidBody(b: unknown): b is InterviewFinalizeBody {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  if (
    typeof o.creatorId !== "string" ||
    typeof o.campaignId !== "string" ||
    typeof o.campaignTitle !== "string" ||
    !Array.isArray(o.transcript) ||
    !Array.isArray(o.scores) ||
    typeof o.finishedAt !== "string"
  ) {
    return false;
  }
  if (!ID_REGEX.test(o.creatorId)) return false;
  if (!ID_REGEX.test(o.campaignId)) return false;
  if (o.rubricId !== undefined) {
    if (typeof o.rubricId !== "string") return false;
    if (!ID_REGEX.test(o.rubricId.replace(/^core-/, ""))) return false;
  }
  if (o.campaignTitle.length > MAX_TITLE_LEN) return false;
  if (!o.transcript.every(isInterviewMessage)) return false;
  if (!o.scores.every(isInterviewFrameScore)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
): Promise<NextResponse<FinalizeResponse | ErrorResponse>> {
  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const stats = aggregate(body.scores, body.transcript);

  // Resolve the brand-customized core rubric. If the body specifies a
  // rubricId, prefer that (covers re-grading scenarios). Otherwise default
  // to the campaign's brand-derived rubric.
  const campaign = CAMPAIGNS_BY_ID[body.campaignId];
  const rubric = body.rubricId
    ? getRubricById(body.rubricId)
    : campaign
      ? getRubricById(`core-${campaign.brand_id}`)
      : getRubricById(undefined);

  const brandName = campaign ? brandContextForCampaign(campaign).brand_name : "the brand";

  // Run the three LLM calls in parallel: free-text summary, core rubric
  // grading, structured ideas extraction. Only after ideas-extraction returns
  // can we grade the ideas (depends on the extracted set).
  const [llmSummary, criteria, ideas] = await Promise.all([
    geminiSummary(
      body.transcript,
      stats.confidence,
      stats.engagement,
      stats.cheating,
      body.campaignTitle,
    ),
    geminiCoreRubric(body.transcript, rubric, body.campaignTitle),
    geminiExtractIdeas(body.transcript, body.campaignTitle, brandName),
  ]);

  const ideaScores =
    ideas && ideas.length > 0
      ? await geminiGradeIdeas(ideas, brandName, body.campaignTitle)
      : null;

  // Compute the overall core rubric grade.
  let rubricOverall: number | undefined;
  if (criteria && criteria.length > 0) {
    const totalWeight = criteria.reduce((acc, c) => acc + c.weight, 0);
    if (totalWeight > 0) {
      const weighted = criteria.reduce(
        (acc, c) => acc + (c.score / 5) * c.weight,
        0,
      );
      rubricOverall = Number((weighted / totalWeight).toFixed(3));
    }
  }

  // Compute the ideas-bucket overall score (mean of (novelty/5*w1 +
  // brand_creator_fit/5*w2 + potential/5*w3) over all ideas).
  let ideasOverall: number | undefined;
  if (ideaScores && ideaScores.length > 0) {
    const w = IDEAS_RUBRIC.criteria;
    const sum = ideaScores.reduce(
      (acc, s) =>
        acc +
        (s.novelty / 5) * (w[0]?.weight ?? 0.35) +
        (s.brand_creator_fit / 5) * (w[1]?.weight ?? 0.35) +
        (s.potential / 5) * (w[2]?.weight ?? 0.30),
      0,
    );
    ideasOverall = Number((sum / ideaScores.length).toFixed(3));
  }

  // Combined verdict — 60% core fit, 40% idea quality. Both must be
  // present for the combined number to render; otherwise we leave it
  // undefined and the UI falls back to whichever is available.
  let combinedScore: number | undefined;
  if (typeof rubricOverall === "number" && typeof ideasOverall === "number") {
    combinedScore = Number((0.6 * rubricOverall + 0.4 * ideasOverall).toFixed(3));
  } else if (typeof rubricOverall === "number") {
    combinedScore = rubricOverall;
  } else if (typeof ideasOverall === "number") {
    combinedScore = ideasOverall;
  }

  // Insight-based contract recommendation derived from the creator's KPIs.
  const contractRecommendation = deriveInsightPayouts(
    ideas ?? [],
    body.campaignId,
  );

  const summary: InterviewSummary = {
    ...stats,
    summary: llmSummary ?? stats.summary,
    rubricId: rubric.id,
    rubricLabel: rubric.label,
    rubricOverall,
    criteria: criteria ?? undefined,
    ideas: ideas ?? undefined,
    ideaScores: ideaScores ?? undefined,
    ideasOverall,
    combinedScore,
    contractRecommendation,
  };

  const record: InterviewRecord = {
    creatorId: body.creatorId,
    campaignId: body.campaignId,
    campaignTitle: body.campaignTitle,
    transcript: body.transcript,
    scores: body.scores,
    summary,
    finishedAt: body.finishedAt,
  };

  store().set(`${body.creatorId}:${body.campaignId}`, record);
  store().set(body.creatorId, record);
  return NextResponse.json({ ok: true, record });
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<InterviewRecord | ErrorResponse>> {
  const expected = process.env.ADMIN_TOKEN;
  const presented = req.headers.get("x-admin-token");
  if (expected) {
    if (!presented || presented !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (!warnedMissingAdminToken) {
    warnedMissingAdminToken = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[interview/finalize] ADMIN_TOKEN is unset — GET endpoint is open. " +
        "Set ADMIN_TOKEN before deploying to production.",
    );
  }

  const { searchParams } = new URL(req.url);
  const creatorId = searchParams.get("creatorId");
  if (!creatorId) {
    return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  }
  if (!ID_REGEX.test(creatorId)) {
    return NextResponse.json({ error: "invalid creatorId" }, { status: 400 });
  }
  const record = store().get(creatorId);
  if (!record) {
    return NextResponse.json({ error: "no interview on file" }, { status: 404 });
  }
  return NextResponse.json(record);
}
