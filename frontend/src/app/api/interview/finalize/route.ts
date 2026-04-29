import { NextRequest, NextResponse } from "next/server";
import type { CheatingLevel } from "@/app/api/interview/observe/route";

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
// frames at a given level before promoting the badge:
//   high   → 2 consecutive frames at high
//   medium → 2 consecutive frames at ≥ medium
//   low    → any single frame at ≥ low
//   none   → otherwise
// Frames whose confidence is below the floor reset both consecutive runs.
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
// Transcript-derived scoring rubric
// ---------------------------------------------------------------------------
// When vision frames are missing OR consistently neutral, scoring used to
// pin to 50/50 across the board. That made every candidate look identical
// in the admin view. Real interviewers can derive a lot of signal from the
// transcript alone — specific numbers, named brands, post URLs, vocabulary
// breadth, filler-word density, response-length consistency. We compute
// those here and blend with the vision mean (when available) so confidence
// and engagement actually move based on what the candidate said.

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "uhh",
  "umm",
  "ah",
  "ahh",
  "er",
  "hmm",
  "hm",
  "like",
  "yeah",
  "y'know",
  "yknow",
  "kinda",
  "sorta",
  "basically",
  "literally",
  "honestly",
  "ok",
  "okay",
  "right",
  "so",
]);

// Brand names we know recur in this domain. Hits boost confidence because
// they signal the candidate has concrete reference points, not platitudes.
const BRAND_VOCAB = [
  "celsius",
  "alani",
  "alani nu",
  "bucked up",
  "ghost",
  "ghost energy",
  "bloom",
  "bloom nutrition",
  "ryse",
  "gorgie",
  "c4",
  "optimum nutrition",
  "magic mind",
  "liquid death",
  "olipop",
  "create wellness",
  "gymshark",
  "lululemon",
  "nike",
  "athleta",
  "alphalete",
  "vital proteins",
  "athletic greens",
  "ag1",
];

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

interface TranscriptSignals {
  // 0..1 score from speech patterns (specifics, vocabulary, filler density)
  confidence: number;
  // 0..1 score from response depth + reactivity to questions
  engagement: number;
  // breakdown so the AI summary can quote real numbers
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

  // Tokenize every candidate turn into lowercase words for shared analysis.
  const allTokens = userTurns.flatMap((t) =>
    t.content
      .toLowerCase()
      .replace(/[^\p{L}\p{N}'$%./@-]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0),
  );

  // Mean words per answer. Short, terse answers tank engagement; verbose
  // ones move it up but with diminishing returns past ~50 words.
  const meanWords = allTokens.length / userTurns.length;
  const lengthBoost = clamp01((meanWords - 8) / 60); // 8 words = floor, 68 words = ceiling

  // Filler density. Anything > 12% reads as nervous; < 4% reads as composed.
  const fillerCount = allTokens.filter((w) => FILLER_WORDS.has(w)).length;
  const fillerRatio = allTokens.length > 0 ? fillerCount / allTokens.length : 0;
  const fillerPenalty = clamp01((fillerRatio - 0.04) / 0.16); // 4% → 0, 20% → 1

  // Vocabulary diversity. Type-token ratio across all answers (capped at
  // 200 tokens because TTR drops naturally as length grows).
  const sample = allTokens.slice(0, 200);
  const unique = new Set(sample);
  const uniqueWordRatio = sample.length > 0 ? unique.size / sample.length : 0;
  const diversityBoost = clamp01((uniqueWordRatio - 0.35) / 0.45);

  // Specifics: numbers, dollar amounts, percentages, named brands, post
  // URLs. Each of these is direct evidence the candidate had a real
  // reference point in mind.
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

  // Reactivity: of the AI questions, what fraction did the candidate
  // actually answer with a substantive turn (>= 6 tokens)?
  const aiTurns = transcript.filter((m) => m.role === "assistant").length;
  const substantiveAnswers = userTurns.filter(
    (t) =>
      t.content
        .split(/\s+/)
        .filter((w) => w.length > 0).length >= 6,
  ).length;
  const reactivity = aiTurns > 0 ? substantiveAnswers / aiTurns : 0;
  const reactivityBoost = clamp01(reactivity); // already 0..1

  // ── Compose final scores ────────────────────────────────────────────
  // Center each at 0.55 (slightly above neutral so a fully-prepared
  // candidate can pin to 1.0 without needing every signal).
  const confidence = clamp01(
    0.45 +
      0.18 * diversityBoost +
      0.18 * numbersBoost * 4 + // weighted because numbersBoost is small
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
      0.20 * (meanWords < 4 ? 1 : 0) - // single-word "yeah" / "no" answers tank engagement
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

// Combine transcript-derived score with vision-derived mean. Weighting
// reflects which signal is more reliable when both are present.
function blend(transcriptScore: number, visionScore: number | null): number {
  if (visionScore == null) return transcriptScore;
  // Vision is noisy on a single frame; weight it 35% so a confident speaker
  // who happened to look down at notes once isn't dragged to 50%.
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
    // Emit transcript-derived scores when vision is unavailable so the
    // admin view shows real differentiation per candidate.
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

  // Blend transcript signals with vision signals so neither path can pin
  // the score to a flat 50%.
  const meanConf = blend(sig.confidence, visionConf);
  const meanEng = blend(sig.engagement, visionEng);

  const worstCheating = aggregateCheating(scores);

  // Worst frame = highest cheating rank, breaking ties by lowest confidence.
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

// Per-element validators — without these, a malicious or buggy client could
// send `transcript: [42, "bad"]` and the aggregator would happily produce
// NaN values. Validate the shape of every element before we trust it.

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
  // Strict ID format — prevents path traversal, key-collision, and oversized
  // map keys.
  if (!ID_REGEX.test(o.creatorId)) return false;
  if (!ID_REGEX.test(o.campaignId)) return false;
  // Cap the human-readable title at a sane length.
  if (o.campaignTitle.length > MAX_TITLE_LEN) return false;
  // Reject malformed elements rather than letting NaN propagate downstream.
  if (!o.transcript.every(isInterviewMessage)) return false;
  if (!o.scores.every(isInterviewFrameScore)) return false;
  return true;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<FinalizeResponse | ErrorResponse>> {
  // Pre-parse content-length cap — reject oversized payloads early.
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

  // Try to upgrade the synthetic summary with a real Gemini-generated one
  // that quotes the candidate. Falls back to the deterministic synthetic
  // text on any failure (no key, timeout, empty response).
  const llm = await geminiSummary(
    body.transcript,
    stats.confidence,
    stats.engagement,
    stats.cheating,
    body.campaignTitle,
  );
  const summary: InterviewSummary = llm ? { ...stats, summary: llm } : stats;

  const record: InterviewRecord = {
    creatorId: body.creatorId,
    campaignId: body.campaignId,
    campaignTitle: body.campaignTitle,
    transcript: body.transcript,
    scores: body.scores,
    summary,
    finishedAt: body.finishedAt,
  };

  store().set(body.creatorId, record);
  return NextResponse.json({ ok: true, record });
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<InterviewRecord | ErrorResponse>> {
  // Auth gate — full transcripts and integrity scores are sensitive.
  // In production, set ADMIN_TOKEN to a strong random value. In dev (token
  // unset) we allow access but log a single warning so the operator notices.
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
  // Same regex check as POST — rejects malformed lookup keys before they hit
  // the store.
  if (!ID_REGEX.test(creatorId)) {
    return NextResponse.json({ error: "invalid creatorId" }, { status: 400 });
  }
  const record = store().get(creatorId);
  if (!record) {
    return NextResponse.json({ error: "no interview on file" }, { status: 404 });
  }
  return NextResponse.json(record);
}
