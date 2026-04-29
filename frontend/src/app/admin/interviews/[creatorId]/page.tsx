"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { CREATORS } from "@/lib/data/creators";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { getRubricById } from "@/lib/data/rubrics";

type CheatingLevel = "none" | "low" | "medium" | "high";

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}
interface InterviewFrameScore {
  confidence: number; // 0..1
  engagement: number; // 0..1
  cheating: CheatingLevel;
  reason: string;
  ts: string;
}
interface RubricCriterionScore {
  id: string;
  label: string;
  score: number; // 0..5
  rationale: string;
  weight: number;
}
interface ServerInterviewSummary {
  confidence: number;
  engagement: number;
  cheating: CheatingLevel;
  summary: string;
  worstFrame: InterviewFrameScore | null;
  rubricId?: string;
  rubricLabel?: string;
  rubricOverall?: number;
  criteria?: RubricCriterionScore[];
}
interface CachedInterview {
  transcript?: InterviewMessage[];
  scores?: InterviewFrameScore[];
  summary?: string;
  finishedAt?: string;
  campaignId?: string;
  campaignTitle?: string;
  rubricId?: string;
  // Full server-side record (added after the per-campaign storage refactor)
  record?: {
    creatorId: string;
    campaignId: string;
    campaignTitle: string;
    transcript: InterviewMessage[];
    scores: InterviewFrameScore[];
    summary: ServerInterviewSummary;
    finishedAt: string;
  };
}

interface SubmissionListItem {
  campaignId: string;
  campaignTitle: string;
  finishedAt: string;
  rubricId?: string;
  rubricLabel?: string;
  rubricOverall?: number;
  cached: CachedInterview;
}

const STORAGE_PREFIX = "mercor.interview.";
const STORAGE_VERSION = "v1";

function loadAllSubmissions(creatorId: string): SubmissionListItem[] {
  if (typeof window === "undefined") return [];
  const out: SubmissionListItem[] = [];
  const seen = new Set<string>();
  // 1. Walk the per-candidate index built by VideoInterviewStep on finalize.
  try {
    const indexKey = `${STORAGE_PREFIX}${creatorId}.index.${STORAGE_VERSION}`;
    const raw = window.localStorage.getItem(indexKey);
    if (raw) {
      const ids = JSON.parse(raw) as string[];
      for (const cId of ids) {
        if (seen.has(cId)) continue;
        const cached = readPerCampaign(creatorId, cId);
        if (!cached) continue;
        out.push(toListItem(cId, cached));
        seen.add(cId);
      }
    }
  } catch {
    // index corrupt — fall through to scanning all keys
  }
  // 2. Scan localStorage for any per-campaign keys the index missed (legacy
  //    or cross-tab writes). Covers the bootstrap case where the index
  //    didn't exist yet.
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const prefix = `${STORAGE_PREFIX}${creatorId}.`;
      if (!key.startsWith(prefix)) continue;
      // skip the legacy single-key + index entry
      const tail = key.slice(prefix.length);
      if (tail === STORAGE_VERSION || tail === `index.${STORAGE_VERSION}`) continue;
      // expect: <campaignId>.<version>
      const dot = tail.lastIndexOf(".");
      if (dot < 0) continue;
      const cId = tail.slice(0, dot);
      const ver = tail.slice(dot + 1);
      if (ver !== STORAGE_VERSION) continue;
      if (seen.has(cId)) continue;
      const cached = readPerCampaign(creatorId, cId);
      if (!cached) continue;
      out.push(toListItem(cId, cached));
      seen.add(cId);
    }
  } catch {
    // ignore
  }
  // 3. Last-resort: legacy per-creator key. We only treat it as a submission
  //    when it has a campaignId we haven't already seen.
  if (out.length === 0) {
    try {
      const raw = window.localStorage.getItem(
        `${STORAGE_PREFIX}${creatorId}.${STORAGE_VERSION}`,
      );
      if (raw) {
        const cached = JSON.parse(raw) as CachedInterview;
        if (cached.campaignId && !seen.has(cached.campaignId)) {
          out.push(toListItem(cached.campaignId, cached));
        }
      }
    } catch {
      // ignore
    }
  }
  // newest first
  out.sort((a, b) => (a.finishedAt > b.finishedAt ? -1 : 1));
  return out;
}

function readPerCampaign(creatorId: string, campaignId: string): CachedInterview | null {
  try {
    const raw = window.localStorage.getItem(
      `${STORAGE_PREFIX}${creatorId}.${campaignId}.${STORAGE_VERSION}`,
    );
    if (!raw) return null;
    return JSON.parse(raw) as CachedInterview;
  } catch {
    return null;
  }
}

function toListItem(campaignId: string, cached: CachedInterview): SubmissionListItem {
  const summary = cached.record?.summary;
  return {
    campaignId,
    campaignTitle:
      cached.campaignTitle ?? cached.record?.campaignTitle ?? campaignId,
    finishedAt: cached.finishedAt ?? cached.record?.finishedAt ?? "",
    rubricId: cached.rubricId ?? summary?.rubricId,
    rubricLabel: summary?.rubricLabel,
    rubricOverall: summary?.rubricOverall,
    cached,
  };
}

export default function AdminInterviewPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = use(params);
  return (
    <Suspense fallback={null}>
      <AdminInterviewInner creatorId={creatorId} />
    </Suspense>
  );
}

function AdminInterviewInner({ creatorId }: { creatorId: string }) {
  const search = useSearchParams();
  const queryCampaign = search.get("campaign") ?? null;

  const creator = useMemo(() => CREATORS.find((c) => c.id === creatorId), [creatorId]);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [framesOpen, setFramesOpen] = useState(false);

  useEffect(() => {
    setSubmissions(loadAllSubmissions(creatorId));
    setLoaded(true);
  }, [creatorId]);

  // Selected submission: ?campaign=… wins, else most recent.
  const selected: SubmissionListItem | null = useMemo(() => {
    if (submissions.length === 0) return null;
    if (queryCampaign) {
      const hit = submissions.find((s) => s.campaignId === queryCampaign);
      if (hit) return hit;
    }
    return submissions[0];
  }, [submissions, queryCampaign]);

  if (!creator) {
    return (
      <div className="px-8 py-10">
        <Link href="/admin/creators" className="text-[13px] text-[var(--accent)] hover:underline">
          ← Back to creators
        </Link>
        <h1 className="mt-4 text-[24px] font-semibold tracking-tight">Creator not found</h1>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        <ArrowLeft size={13} /> All creators
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">
            {creator.name}{" "}
            <span className="text-[var(--fg-muted)] font-medium">— interview review</span>
          </h1>
          <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
            {creator.handle} · {creator.followers.toLocaleString()} followers
          </p>
        </div>
      </div>

      {!loaded ? (
        <div className="mt-6 text-[13px] text-[var(--fg-muted)]">Loading interviews…</div>
      ) : submissions.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-[13px] text-[var(--fg-muted)]">
          No interviews on file for {creator.name}. Once the candidate completes the AI
          interview from <code className="text-[12px]">/interview/&lt;slug&gt;</code>,
          this view will populate with the transcript, rubric grades, and AI summary.
        </div>
      ) : (
        <>
          {/* Submissions list — one row per role this candidate interviewed for */}
          <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="border-b border-[var(--border)] px-5 py-3 text-[13px] font-semibold">
              Submissions ({submissions.length})
            </div>
            <ul>
              {submissions.map((s) => {
                const isActive = selected?.campaignId === s.campaignId;
                const camp = CAMPAIGNS_BY_ID[s.campaignId];
                const date = s.finishedAt
                  ? new Date(s.finishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—";
                const overallPct =
                  s.rubricOverall != null ? `${Math.round(s.rubricOverall * 100)}%` : "—";
                return (
                  <li key={s.campaignId} className="border-t border-[var(--border)] first:border-t-0">
                    <Link
                      href={`/admin/interviews/${creatorId}?campaign=${s.campaignId}`}
                      className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--bg-hover)] ${
                        isActive ? "bg-[var(--accent-soft)]" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                          {s.campaignTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                          <span>{date}</span>
                          {s.rubricLabel ? (
                            <>
                              <span>·</span>
                              <span>{s.rubricLabel}</span>
                            </>
                          ) : null}
                          {camp?.brand_id ? (
                            <>
                              <span>·</span>
                              <span>{camp.brand_id}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">
                          Rubric
                        </div>
                        <div className="text-[14px] font-semibold tabular-nums">
                          {overallPct}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Selected submission detail */}
          {selected ? (
            <SubmissionDetail
              submission={selected}
              creatorName={creator.name}
              transcriptOpen={transcriptOpen}
              setTranscriptOpen={setTranscriptOpen}
              framesOpen={framesOpen}
              setFramesOpen={setFramesOpen}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SubmissionDetail({
  submission: s,
  creatorName,
  transcriptOpen,
  setTranscriptOpen,
  framesOpen,
  setFramesOpen,
}: {
  submission: SubmissionListItem;
  creatorName: string;
  transcriptOpen: boolean;
  setTranscriptOpen: (v: boolean) => void;
  framesOpen: boolean;
  setFramesOpen: (v: boolean) => void;
}) {
  const cached = s.cached;
  const summaryObj = cached.record?.summary;
  const transcript = cached.transcript ?? cached.record?.transcript ?? [];
  const scores = cached.scores ?? cached.record?.scores ?? [];
  const summaryText = summaryObj?.summary ?? cached.summary ?? "";
  const criteria = summaryObj?.criteria;
  const rubric = getRubricById(s.rubricId);
  const overallPct = s.rubricOverall != null ? Math.round(s.rubricOverall * 100) : null;

  const meanConfidence = scores.length
    ? Math.round((scores.reduce((a, x) => a + x.confidence, 0) / scores.length) * 100)
    : summaryObj
      ? Math.round(summaryObj.confidence * 100)
      : null;
  const meanEngagement = scores.length
    ? Math.round((scores.reduce((a, x) => a + x.engagement, 0) / scores.length) * 100)
    : summaryObj
      ? Math.round(summaryObj.engagement * 100)
      : null;
  const cheatRank: Record<CheatingLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
  const worstCheat: CheatingLevel = scores.length
    ? scores.reduce<CheatingLevel>(
        (acc, x) => (cheatRank[x.cheating] > cheatRank[acc] ? x.cheating : acc),
        "none",
      )
    : (summaryObj?.cheating ?? "none");
  const worstFrame =
    summaryObj?.worstFrame ??
    scores
      .slice()
      .sort(
        (a, b) =>
          cheatRank[b.cheating] - cheatRank[a.cheating] || a.confidence - b.confidence,
      )[0] ??
    null;
  const turns = transcript.length;
  const userTurns = transcript.filter((m) => m.role === "user").length;
  const date = s.finishedAt
    ? new Date(s.finishedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[18px] font-semibold tracking-tight">{s.campaignTitle}</h2>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--fg-muted)]">
          {rubric.label}
        </span>
        {date ? (
          <span className="text-[12px] text-[var(--fg-muted)]">submitted {date}</span>
        ) : null}
      </div>

      {/* KPI strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Rubric grade" value={overallPct != null ? `${overallPct}%` : "—"} sub={rubric.label} tone={overallPct != null && overallPct < 60 ? "warn" : "ok"} />
        <KPI label="Confidence" value={meanConfidence != null ? `${meanConfidence}%` : "—"} sub="Speech + frames" tone={meanConfidence != null && meanConfidence < 50 ? "warn" : "ok"} />
        <KPI label="Engagement" value={meanEngagement != null ? `${meanEngagement}%` : "—"} sub="Speech + frames" tone={meanEngagement != null && meanEngagement < 40 ? "warn" : "ok"} />
        <KPI label="Integrity" value={worstCheat === "none" ? "Clean" : worstCheat} sub={worstCheat === "none" ? "No cheating signals" : "Worst frame flagged"} tone={worstCheat === "none" ? "ok" : "warn"} />
      </div>

      {/* AI summary */}
      {summaryText ? (
        <section className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="label-cap">AI summary</div>
          <p className="mt-2 text-[14px] leading-[1.55] text-[var(--fg)]">{summaryText}</p>
        </section>
      ) : null}

      {/* Rubric breakdown */}
      {criteria && criteria.length > 0 ? (
        <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-cap">Rubric breakdown</div>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                {rubric.label} — {rubric.description}
              </p>
            </div>
            {overallPct != null ? (
              <div className="text-right">
                <div className="label-cap">Overall</div>
                <div className="text-[20px] font-semibold tabular-nums">{overallPct}%</div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {criteria.map((c) => {
              const pct = (c.score / 5) * 100;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-medium">{c.label}</div>
                    <div className="text-[12px] text-[var(--fg-muted)] tabular-nums">
                      {c.score.toFixed(1)} / 5
                      <span className="ml-2 text-[var(--fg-subtle)]">
                        weight {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <div
                      className={`h-full ${pct < 40 ? "bg-[var(--warning)]" : "bg-[var(--accent)]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.45] text-[var(--fg-muted)]">
                    {c.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Worst frame callout */}
      {worstFrame && worstCheat !== "none" ? (
        <section className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--warning-soft,#fef3c7)] p-4 text-[13px] text-[var(--fg)]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 text-[var(--warning)]" />
            <div>
              <div className="font-semibold">Integrity flag</div>
              <p className="mt-1 text-[var(--fg-muted)]">
                Worst frame at {new Date(worstFrame.ts).toLocaleTimeString()} —{" "}
                {worstFrame.cheating} cheating signal,{" "}
                {Math.round(worstFrame.confidence * 100)}% confidence. {worstFrame.reason}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Transcript */}
      <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
        <button
          type="button"
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-[14px] font-semibold">
            Transcript ({turns} turns · {userTurns} from candidate)
          </span>
          {transcriptOpen ? (
            <ChevronUp size={15} className="text-[var(--fg-muted)]" />
          ) : (
            <ChevronDown size={15} className="text-[var(--fg-muted)]" />
          )}
        </button>
        {transcriptOpen ? (
          <ol className="space-y-3 border-t border-[var(--border)] px-5 py-4">
            {transcript.map((m, i) => (
              <li key={i} className="text-[13px]">
                <span
                  className={
                    m.role === "assistant"
                      ? "font-semibold text-[var(--accent)]"
                      : "font-semibold text-[var(--fg-muted)]"
                  }
                >
                  {m.role === "assistant" ? "Interviewer" : creatorName}:{" "}
                </span>
                <span className="text-[var(--fg)]">{m.content}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {/* Frame scores */}
      {scores.length > 0 ? (
        <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setFramesOpen(!framesOpen)}
            className="flex w-full items-center justify-between px-5 py-3 text-left"
          >
            <span className="text-[14px] font-semibold">Frame scores ({scores.length})</span>
            {framesOpen ? (
              <ChevronUp size={15} className="text-[var(--fg-muted)]" />
            ) : (
              <ChevronDown size={15} className="text-[var(--fg-muted)]" />
            )}
          </button>
          {framesOpen ? (
            <table className="w-full border-collapse border-t border-[var(--border)] text-[12px]">
              <thead className="bg-[var(--bg-elev)] text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Time</th>
                  <th className="px-5 py-2 text-left font-medium">Confidence</th>
                  <th className="px-5 py-2 text-left font-medium">Engagement</th>
                  <th className="px-5 py-2 text-left font-medium">Cheating</th>
                  <th className="px-5 py-2 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((sc, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-5 py-2 text-[var(--fg-muted)]">
                      {new Date(sc.ts).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-2">{Math.round(sc.confidence * 100)}%</td>
                    <td className="px-5 py-2">{Math.round(sc.engagement * 100)}%</td>
                    <td className="px-5 py-2 capitalize">
                      <span
                        className={
                          sc.cheating === "none"
                            ? "text-[var(--fg-muted)]"
                            : "font-medium text-[var(--warning)]"
                        }
                      >
                        {sc.cheating}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-[var(--fg-muted)]">{sc.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  tone = "ok",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="label-cap">{label}</div>
      <div
        className={`mt-1 text-[20px] font-semibold tracking-tight ${
          tone === "warn" ? "text-[var(--warning)]" : "text-[var(--fg)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}
