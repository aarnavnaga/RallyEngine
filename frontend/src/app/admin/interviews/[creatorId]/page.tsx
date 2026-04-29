"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { CREATORS } from "@/lib/data/creators";

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
interface CachedInterview {
  transcript?: InterviewMessage[];
  scores?: InterviewFrameScore[];
  summary?: string;
  finishedAt?: string;
  campaignId?: string;
  campaignTitle?: string;
}

/**
 * Admin view of a creator's interview submission. Reads the cached record
 * the candidate's browser persisted on finalize (mercor.interview.<id>.v1)
 * and renders the AI-graded summary, aggregate confidence/engagement,
 * worst-frame cheating signal, and the full transcript. This is the page
 * Aaron clicks into from /admin or /admin/match to see what Logan said.
 *
 * Data lives in localStorage for the demo. In prod this would hit
 * /api/interview/finalize's persisted record (Supabase) keyed by creatorId.
 */
export default function AdminInterviewPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = use(params);
  const creator = useMemo(() => CREATORS.find((c) => c.id === creatorId), [creatorId]);
  const [cached, setCached] = useState<CachedInterview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [framesOpen, setFramesOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(`mercor.interview.${creatorId}.v1`);
      if (raw) setCached(JSON.parse(raw));
    } catch {
      // ignore corrupt JSON
    } finally {
      setLoaded(true);
    }
  }, [creatorId]);

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

  const meanConfidence = cached?.scores?.length
    ? Math.round((cached.scores.reduce((a, s) => a + s.confidence, 0) / cached.scores.length) * 100)
    : null;
  const meanEngagement = cached?.scores?.length
    ? Math.round((cached.scores.reduce((a, s) => a + s.engagement, 0) / cached.scores.length) * 100)
    : null;
  const cheatRank: Record<CheatingLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
  const worstCheat: CheatingLevel = cached?.scores?.length
    ? (cached.scores.reduce<CheatingLevel>(
        (acc, s) => (cheatRank[s.cheating] > cheatRank[acc] ? s.cheating : acc),
        "none",
      ))
    : "none";
  const worstFrame = cached?.scores
    ?.slice()
    .sort((a, b) => cheatRank[b.cheating] - cheatRank[a.cheating] || a.confidence - b.confidence)[0];
  const turns = cached?.transcript?.length ?? 0;
  const userTurns = cached?.transcript?.filter((m) => m.role === "user").length ?? 0;
  const date = cached?.finishedAt
    ? new Date(cached.finishedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

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
            {date ? ` · submitted ${date}` : ""}
            {cached?.campaignTitle ? ` · ${cached.campaignTitle}` : ""}
          </p>
        </div>
      </div>

      {!loaded ? (
        <div className="mt-6 text-[13px] text-[var(--fg-muted)]">Loading interview…</div>
      ) : !cached ? (
        <div className="mt-6 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-[13px] text-[var(--fg-muted)]">
          No interview on file for {creator.name}. Once the candidate completes the AI
          interview from <code className="text-[12px]">/interview/&lt;slug&gt;</code>,
          this view will populate with the transcript, scores, and AI summary.
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI label="Turns" value={String(turns)} sub={`${userTurns} from candidate`} />
            <KPI
              label="Confidence"
              value={meanConfidence != null ? `${meanConfidence}%` : "—"}
              sub="Mean across frames"
              tone={meanConfidence != null && meanConfidence < 50 ? "warn" : "ok"}
            />
            <KPI
              label="Engagement"
              value={meanEngagement != null ? `${meanEngagement}%` : "—"}
              sub="Mean across frames"
              tone={meanEngagement != null && meanEngagement < 40 ? "warn" : "ok"}
            />
            <KPI
              label="Integrity"
              value={worstCheat === "none" ? "Clean" : worstCheat}
              sub={worstCheat === "none" ? "No cheating signals" : "Worst frame flagged"}
              tone={worstCheat === "none" ? "ok" : "warn"}
            />
          </div>

          {/* AI summary */}
          {cached.summary ? (
            <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="label-cap">AI summary</div>
              <p className="mt-2 text-[14px] leading-[1.55] text-[var(--fg)]">
                {cached.summary}
              </p>
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
                    {worstFrame.cheating} cheating signal, {Math.round(worstFrame.confidence * 100)}%
                    confidence. {worstFrame.reason}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Transcript */}
          <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-3 text-left"
            >
              <span className="text-[14px] font-semibold">Transcript ({turns} turns)</span>
              {transcriptOpen ? (
                <ChevronUp size={15} className="text-[var(--fg-muted)]" />
              ) : (
                <ChevronDown size={15} className="text-[var(--fg-muted)]" />
              )}
            </button>
            {transcriptOpen ? (
              <ol className="space-y-3 border-t border-[var(--border)] px-5 py-4">
                {cached.transcript?.map((m, i) => (
                  <li key={i} className="text-[13px]">
                    <span
                      className={
                        m.role === "assistant"
                          ? "font-semibold text-[var(--accent)]"
                          : "font-semibold text-[var(--fg-muted)]"
                      }
                    >
                      {m.role === "assistant" ? "Interviewer" : creator.name}:{" "}
                    </span>
                    <span className="text-[var(--fg)]">{m.content}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          {/* Frame scores */}
          {cached.scores && cached.scores.length > 0 ? (
            <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
              <button
                type="button"
                onClick={() => setFramesOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-left"
              >
                <span className="text-[14px] font-semibold">
                  Frame scores ({cached.scores.length})
                </span>
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
                    {cached.scores.map((s, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="px-5 py-2 text-[var(--fg-muted)]">
                          {new Date(s.ts).toLocaleTimeString()}
                        </td>
                        <td className="px-5 py-2">{Math.round(s.confidence * 100)}%</td>
                        <td className="px-5 py-2">{Math.round(s.engagement * 100)}%</td>
                        <td className="px-5 py-2 capitalize">
                          <span
                            className={
                              s.cheating === "none"
                                ? "text-[var(--fg-muted)]"
                                : "font-medium text-[var(--warning)]"
                            }
                          >
                            {s.cheating}
                          </span>
                        </td>
                        <td className="px-5 py-2 text-[var(--fg-muted)]">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </section>
          ) : null}
        </>
      )}
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
