import { NextRequest, NextResponse } from "next/server";
import type { CheatingLevel } from "@/app/api/interview/observe/route";
import {
  CHEATING_RANK,
  aggregateCheating,
} from "@/lib/interview/aggregate";

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

function aggregate(
  scores: InterviewFrameScore[],
  transcript: InterviewMessage[],
): InterviewSummary {
  if (scores.length === 0) {
    const candidateAnswers = transcript.filter((m) => m.role === "user").length;
    return {
      confidence: 0.5,
      engagement: 0.5,
      cheating: "none",
      summary:
        candidateAnswers > 0
          ? `Candidate answered ${candidateAnswers} question${candidateAnswers === 1 ? "" : "s"}; no video frames captured.`
          : "Interview ended without recorded frames or answers.",
      worstFrame: null,
    };
  }

  const meanConf =
    scores.reduce((acc, s) => acc + s.confidence, 0) / scores.length;
  const meanEng =
    scores.reduce((acc, s) => acc + s.engagement, 0) / scores.length;

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

  const summary = aggregate(body.scores, body.transcript);

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
