"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Sparkles, MessageSquare } from "lucide-react";
import type {
  InterviewFrameScore,
  InterviewMessage,
} from "@/app/api/interview/finalize/route";
import type { CheatingLevel } from "@/app/api/interview/observe/route";

const STORAGE_KEY_PREFIX = "mercor.interview.";
const STORAGE_VERSION = "v1";
// Frames below this confidence threshold are too noisy to count toward the
// integrity tally (the vision model itself is unsure what it saw).
const CHEATING_CONFIDENCE_FLOOR = 0.3;

interface StoredInterview {
  transcript: InterviewMessage[];
  scores: InterviewFrameScore[];
  summary: string;
  finishedAt: string;
  campaignId: string;
  campaignTitle: string;
}

interface InterviewNotesCardProps {
  creatorId: string;
}

const CHEATING_RANK: Record<CheatingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const CHEATING_PILL: Record<CheatingLevel, string> = {
  none: "pill-success",
  low: "pill-accent",
  medium: "pill-warning",
  high: "pill-danger",
};

// Debounced aggregator: a single noisy frame should not flip the integrity
// badge. We require ≥2 *consecutive* frames at a given level before promoting
// the badge to that level. Frames whose confidence is below the floor are
// skipped from the tally entirely.
function aggregateCheating(scores: InterviewFrameScore[]): CheatingLevel {
  let highRun = 0;
  let mediumRun = 0;
  let sawAnyLow = false;
  let badge: CheatingLevel = "none";
  for (const s of scores) {
    if (s.confidence < CHEATING_CONFIDENCE_FLOOR) {
      // Reset both runs — this frame is too noisy to count either way.
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

function computeAggregate(scores: InterviewFrameScore[]): {
  confidence: number;
  engagement: number;
  cheating: CheatingLevel;
} {
  if (scores.length === 0) {
    return { confidence: 0.5, engagement: 0.5, cheating: "none" };
  }
  const meanConf = scores.reduce((acc, s) => acc + s.confidence, 0) / scores.length;
  const meanEng = scores.reduce((acc, s) => acc + s.engagement, 0) / scores.length;
  return {
    confidence: meanConf,
    engagement: meanEng,
    cheating: aggregateCheating(scores),
  };
}

function flaggedFrames(scores: InterviewFrameScore[]): InterviewFrameScore[] {
  return scores
    .filter((s) => (CHEATING_RANK[s.cheating] ?? 0) > 0 || s.confidence < 0.4)
    .slice()
    .sort((a, b) => {
      const dr = (CHEATING_RANK[b.cheating] ?? 0) - (CHEATING_RANK[a.cheating] ?? 0);
      if (dr !== 0) return dr;
      return a.confidence - b.confidence;
    })
    .slice(0, 3);
}

export function InterviewNotesCard({ creatorId }: InterviewNotesCardProps): React.JSX.Element | null {
  const [data, setData] = useState<StoredInterview | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${creatorId}.${STORAGE_VERSION}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredInterview;
      if (parsed && Array.isArray(parsed.transcript) && Array.isArray(parsed.scores)) {
        setData(parsed);
      }
    } catch {
      // ignore corrupt entries
    }
  }, [creatorId]);

  if (!hydrated) return null;
  if (!data) return null;

  const agg = computeAggregate(data.scores);
  const worstFrames = flaggedFrames(data.scores);
  const finishedAt = new Date(data.finishedAt);

  return (
    <section
      className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-5"
      data-test-id={`interview-notes-${creatorId}`}
    >
      <header className="flex items-center gap-2">
        <Sparkles size={16} className="text-[var(--accent)]" />
        <h3 className="text-[15px] font-semibold tracking-tight">Video Interview Notes</h3>
        <span className="ml-auto text-[11px] text-[var(--fg-muted)]">
          {finishedAt.toLocaleString()}
        </span>
      </header>

      <p className="mt-2 text-[13px] text-[var(--fg-muted)]">{data.summary || "Interview complete."}</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat
          label="Confidence"
          value={`${Math.round(agg.confidence * 100)}%`}
          tone={agg.confidence >= 0.7 ? "good" : agg.confidence >= 0.4 ? "neutral" : "warn"}
          icon={<CheckCircle2 size={14} />}
        />
        <Stat
          label="Engagement"
          value={`${Math.round(agg.engagement * 100)}%`}
          tone={agg.engagement >= 0.7 ? "good" : agg.engagement >= 0.4 ? "neutral" : "warn"}
          icon={<Eye size={14} />}
        />
        <Stat
          label="Integrity"
          value={agg.cheating}
          tone={agg.cheating === "none" ? "good" : agg.cheating === "low" ? "neutral" : "warn"}
          icon={<AlertTriangle size={14} />}
          pillCls={CHEATING_PILL[agg.cheating] ?? ""}
        />
      </div>

      {worstFrames.length > 0 ? (
        <div className="mt-4">
          <div className="label-cap">Flagged moments</div>
          <ul className="mt-2 space-y-2">
            {worstFrames.map((f, i) => (
              <li
                key={i}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-[12px]"
                data-test-id={`interview-flagged-${i}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`pill text-[10px] ${CHEATING_PILL[f.cheating] ?? ""}`}>
                    {f.cheating}
                  </span>
                  <span className="text-[var(--fg-muted)]">
                    confidence {Math.round(f.confidence * 100)}% · engagement{" "}
                    {Math.round(f.engagement * 100)}%
                  </span>
                  <span className="ml-auto text-[var(--fg-subtle)]">
                    {new Date(f.ts).toLocaleTimeString()}
                  </span>
                </div>
                {f.reason ? (
                  <div className="mt-1 text-[var(--fg-muted)]">{f.reason}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-[12px] text-[var(--fg-muted)]">
          <MessageSquare size={12} className="mr-1 inline align-text-top" />
          Show transcript ({data.transcript.length} turn
          {data.transcript.length === 1 ? "" : "s"})
        </summary>
        <ol className="mt-2 space-y-2 text-[12px]">
          {data.transcript.map((m, i) => (
            <li key={i}>
              <span
                className={
                  m.role === "assistant"
                    ? "font-medium text-[var(--accent)]"
                    : "font-medium text-[var(--fg-muted)]"
                }
              >
                {m.role === "assistant" ? "Interviewer" : "Candidate"}:{" "}
              </span>
              <span>{m.content}</span>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  pillCls,
}: {
  label: string;
  value: string;
  tone: "good" | "neutral" | "warn";
  icon: React.ReactNode;
  pillCls?: string;
}): React.JSX.Element {
  const toneCls =
    tone === "good"
      ? "text-[var(--success)]"
      : tone === "warn"
      ? "text-[var(--warning)]"
      : "text-[var(--fg)]";
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      {pillCls ? (
        <span className={`mt-1 inline-block pill text-[11px] ${pillCls}`}>{value}</span>
      ) : (
        <div className={`mt-1 text-[16px] font-semibold tabular-nums ${toneCls}`}>{value}</div>
      )}
    </div>
  );
}
