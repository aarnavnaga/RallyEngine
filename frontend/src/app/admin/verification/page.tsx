"use client";

import { useEffect, useState } from "react";

// Persists per-row expanded state across page loads. Bumped to v1 — first
// release of this surface. Future schema changes should namespace v2/v3 etc.
const STORAGE_KEY = "mercor.verification.v1";

type StepState = "pass" | "fail" | "warn";

type VerificationStep = {
  id: 1 | 2 | 3 | 4;
  state: StepState;
  /** Short cell text — what shows in the table cell next to the step number. */
  cellText: string;
  /** Long-form explanation surfaced when the row is expanded. */
  detail: string;
};

type VerificationRow = {
  id: string;
  creator: string;
  handle: string;
  status: "verified" | "rejected" | "held";
  steps: [VerificationStep, VerificationStep, VerificationStep, VerificationStep];
};

const STATS = [
  {
    title: "Verified",
    value: "412",
    subtitle: "across last 30 days",
  },
  {
    title: "Held for review",
    value: "7",
    subtitle: "awaiting manual audience-truth check",
  },
  {
    title: "Rejected",
    value: "19",
    subtitle: "failed step 1 or 2",
  },
] as const;

const ROWS: VerificationRow[] = [
  {
    id: "loganmann32",
    creator: "Logan Mann",
    handle: "@loganmann32",
    status: "verified",
    steps: [
      {
        id: 1,
        state: "pass",
        cellText: "Pass",
        detail:
          "Handle ownership confirmed via TikTok API public lookup. The OAuth-style consent screen returned uid 6857221143 matching the self-claimed handle.",
      },
      {
        id: 2,
        state: "pass",
        cellText: "Pass",
        detail:
          "Last 30 posts: median caption length 47 chars, posting cadence 4.2/wk, no botnet markers. Engagement curve consistent with organic growth.",
      },
      {
        id: 3,
        state: "pass",
        cellText: "Pass",
        detail:
          "Self-declared niche: fitness. Scraped from last 30 post hashtags: #fitness #gymtok #college #ucsb #lift. Overlap with declared niche: 78%.",
      },
      {
        id: 4,
        state: "pass",
        cellText: "Pass",
        detail:
          "Audience demographics: 60% US, 18-24, female-skewed (matches stated audience for fitness/college creators). Manual review for v1 — not yet automated.",
      },
    ],
  },
  {
    id: "bot_acct_2901",
    creator: "Unknown",
    handle: "@bot_acct_2901",
    status: "rejected",
    steps: [
      {
        id: 1,
        state: "pass",
        cellText: "Pass",
        detail:
          "Handle ownership confirmed via TikTok API public lookup. Account exists.",
      },
      {
        id: 2,
        state: "fail",
        cellText: "Fail",
        detail:
          "Cadence anomaly: 0 posts in 60d, then 200 posts in 5d. Median caption length 6 chars, 94% of captions are emoji-only. Botnet fingerprint matched (IP cluster shared with 41 other freshly-spun handles).",
      },
      {
        id: 3,
        state: "fail",
        cellText: "—",
        detail:
          "Skipped: step 2 failed. Niche overlap not computed for accounts that fail fingerprint screen.",
      },
      {
        id: 4,
        state: "fail",
        cellText: "—",
        detail:
          "Skipped: earlier step failed.",
      },
    ],
  },
  {
    id: "nutrition_pro_xx",
    creator: "Sam Reeves",
    handle: "@nutrition_pro_xx",
    status: "held",
    steps: [
      {
        id: 1,
        state: "pass",
        cellText: "Pass",
        detail:
          "Handle ownership confirmed via TikTok API public lookup.",
      },
      {
        id: 2,
        state: "pass",
        cellText: "Pass",
        detail:
          "Last 30 posts: median caption length 91 chars, posting cadence 3.1/wk, no botnet markers.",
      },
      {
        id: 3,
        state: "pass",
        cellText: "Pass",
        detail:
          "Self-declared niche: nutrition. Scraped from last 30 post hashtags: #nutrition #wholefoods #macros #protein. Overlap with declared niche: 71%.",
      },
      {
        id: 4,
        state: "warn",
        cellText: "Hold",
        detail:
          "Audience demographics suggest 35-44 skew (declared audience: 18-24). Discrepancy flagged — needs manual audience review. Manual review for v1 — not yet automated.",
      },
    ],
  },
];

const STATUS_META: Record<
  VerificationRow["status"],
  { label: string; cls: string; cellTitle: string }
> = {
  verified: {
    label: "Verified",
    cls: "pill-success",
    cellTitle: "All four steps passed",
  },
  rejected: {
    label: "Rejected",
    cls: "pill",
    cellTitle: "Failed step 1 or 2",
  },
  held: {
    label: "Held — manual",
    cls: "pill",
    cellTitle: "Steps 1-3 passed; step 4 needs manual audience-truth check",
  },
};

function loadExpanded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return new Set();
    const expanded = (parsed as { expandedIds?: unknown }).expandedIds;
    if (!Array.isArray(expanded)) return new Set();
    return new Set(expanded.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveExpanded(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ expandedIds: [...ids] }),
    );
  } catch {
    // localStorage may be unavailable (SSR, incognito).
  }
}

function StepCell({ step }: { step: VerificationStep }) {
  if (step.state === "pass") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[12px] tabular-nums text-[var(--fg)]"
        title={step.detail}
      >
        <CheckGlyph />
        {step.cellText}
      </span>
    );
  }
  if (step.state === "fail") {
    if (step.cellText === "—") {
      return (
        <span className="text-[12px] text-[var(--fg-subtle)]" title={step.detail}>
          —
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[12px] tabular-nums"
        style={{ color: "#dc2626" }}
        title={step.detail}
      >
        <CrossGlyph />
        {step.cellText}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[12px] tabular-nums"
      style={{ color: "#f59e0b" }}
      title={step.detail}
    >
      <WarnGlyph />
      {step.cellText}
    </span>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 6.5 5 9 9.5 3.5" />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="#dc2626"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3 9 9" />
      <path d="M9 3 3 9" />
    </svg>
  );
}

function WarnGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="#f59e0b"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 11 10 1 10 6 2Z" />
      <path d="M6 5.5 6 7.5" />
      <path d="M6 9 6 9.01" />
    </svg>
  );
}

function StepDetailRow({ step }: { step: VerificationStep }) {
  const tone =
    step.state === "pass"
      ? "var(--fg-muted)"
      : step.state === "fail"
        ? "#dc2626"
        : "#f59e0b";
  return (
    <div className="flex gap-3">
      <div className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--fg-subtle)] w-[64px] pt-0.5">
        Step {step.id}
      </div>
      <div className="text-[12px] leading-snug" style={{ color: tone }}>
        {step.detail}
      </div>
    </div>
  );
}

export default function VerificationQueuePage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExpanded(loadExpanded());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveExpanded(expanded);
  }, [expanded, hydrated]);

  // ROWS is a module-level constant; no memo needed.
  const totalRows = ROWS.length;

  function toggle(id: string): void {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Verification queue</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">
          {totalRows} sample rows · live data wired post-pilot
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        4-step ladder. Pass step 1 → step 2 → step 3 → step 4. Step 4 is manual
        review for v1; everything above is automated.
      </p>

      <section
        className="mt-5 grid gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4 md:grid-cols-3"
        data-test-id="verification-stats-strip"
        aria-label="Verification stats"
      >
        {STATS.map((tile) => (
          <div key={tile.title} className="flex flex-col gap-0.5">
            <div className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              {tile.title}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-semibold tabular-nums tracking-tight text-[var(--fg)]">
                {tile.value}
              </span>
              <span className="text-[11px] text-[var(--fg-muted)]">
                {tile.subtitle}
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 overflow-hidden rounded-[12px] border border-[var(--border)]">
        <table className="dt-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Handle</th>
              <th>Step 1 · handle</th>
              <th>Step 2 · fingerprint</th>
              <th>Step 3 · niche</th>
              <th>Step 4 · audience</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const isExpanded = expanded.has(row.id);
              const status = STATUS_META[row.status];
              return (
                <RowGroup
                  key={row.id}
                  row={row}
                  status={status}
                  isExpanded={isExpanded}
                  onToggle={() => toggle(row.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[12px] text-[var(--fg-subtle)]">
        Addresses Aaron's challenge: creators may claim categories they do not
        actually belong to. Steps 1-3 are automated; step 4 is manual for v1
        until we wire audience-truth panels.
      </p>
    </div>
  );
}

function RowGroup({
  row,
  status,
  isExpanded,
  onToggle,
}: {
  row: VerificationRow;
  status: { label: string; cls: string; cellTitle: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        data-test-id={`verification-row-${row.id}`}
        className="cursor-pointer"
        onClick={onToggle}
      >
        <td>
          <div className="text-[14px] font-medium">{row.creator}</div>
        </td>
        <td className="text-[12px] text-[var(--fg-muted)]">{row.handle}</td>
        <td>
          <StepCell step={row.steps[0]} />
        </td>
        <td>
          <StepCell step={row.steps[1]} />
        </td>
        <td>
          <StepCell step={row.steps[2]} />
        </td>
        <td>
          <StepCell step={row.steps[3]} />
        </td>
        <td>
          <span
            className={`pill text-[11px] ${status.cls}`}
            title={status.cellTitle}
          >
            {status.label}
          </span>
        </td>
        <td className="text-right">
          <button
            type="button"
            data-test-id={`verification-expand-${row.id}`}
            onClick={(e) => {
              // Prevent the parent <tr> click handler from double-toggling.
              e.stopPropagation();
              onToggle();
            }}
            className="rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] hover:bg-[var(--bg-hover)]"
            aria-expanded={isExpanded}
            aria-controls={`verification-detail-${row.id}`}
          >
            {isExpanded ? "Hide" : "Inspect"}
          </button>
        </td>
      </tr>
      {isExpanded ? (
        <tr id={`verification-detail-${row.id}`}>
          <td colSpan={8} className="bg-[var(--bg-hover)]">
            <div className="flex flex-col gap-2 px-3 py-3">
              {row.steps.map((step) => (
                <StepDetailRow key={step.id} step={step} />
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
