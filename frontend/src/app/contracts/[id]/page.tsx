"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CONTRACTS_BY_ID, type Contract } from "@/lib/data/contracts";

// ─── Brand mark (local, mirrors Home page helper) ────────────────────────────
function ContractBrandMark({
  label,
  size = 32,
}: {
  label: string;
  size?: number;
}) {
  const BRAND_COLORS: Record<string, string> = {
    Mercor: "#7857ff",
    Celsius: "#0e7c54",
    "Bucked Up": "#0d1f43",
    "Bloom Nutrition": "#1f3a3a",
    "Mercor (Campus)": "#7857ff",
    "Alani Nu": "#f4a8b6",
    "Ghost Energy": "#262626",
    "Ryse Supps": "#1c1c1c",
  };
  const color = BRAND_COLORS[label] ?? "#9ca3af";
  const initial = label.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase();
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-md font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(12, size * 0.45),
      }}
      aria-label={label}
    >
      {initial}
    </span>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: Contract["status"] }) {
  const map: Record<Contract["status"], { label: string; cls: string }> = {
    active: { label: "Active", cls: "pill pill-success" },
    paused: { label: "Paused", cls: "pill pill-warning" },
    completed: { label: "Completed", cls: "pill" },
    draft: { label: "Draft", cls: "pill" },
  };
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}

// ─── Kind label helper ────────────────────────────────────────────────────────
function kindLabel(kind: Contract["contract_kind"]): string {
  const labels: Record<Contract["contract_kind"], string> = {
    hourly: "Hourly contract",
    project: "Project contract",
    "creator-post": "Creator post",
    "creator-campaign": "Creator campaign",
    "campus-ambassador": "Campus ambassador",
  };
  return labels[kind];
}

// ─── Onboarding doc with expand/collapse ─────────────────────────────────────
function OnboardingDoc({ title, body }: { title: string; body: string }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = body.split("\n\n").filter(Boolean);

  // Show first 3 paragraphs collapsed
  const visible = expanded ? paragraphs : paragraphs.slice(0, 3);

  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight">Onboarding document</h2>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
        You are required to read the onboarding document before starting work.
      </p>

      <div className="mt-3 rounded-[var(--radius-lg)] bg-[var(--bg-elev)] border border-[var(--border)] p-5">
        <div className="text-[14px] font-semibold mb-3">{title}</div>
        <div className="space-y-3">
          {visible.map((para, i) => (
            <p key={i} className="text-[13px] leading-relaxed text-[var(--fg)]">
              {para}
            </p>
          ))}
        </div>
        {paragraphs.length > 3 && (
          <button
            data-test-id="contract-onboarding-readmore"
            onClick={() => setExpanded((v) => !v)}
            className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            {expanded ? (
              <>
                Read less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Read more <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Payments section ─────────────────────────────────────────────────────────
function PaymentsSection({ contract: c }: { contract: Contract }) {
  const payLabel =
    c.hourly_pay_usd != null
      ? `$${c.hourly_pay_usd.toFixed(2)} / hour`
      : c.flat_pay_usd != null
        ? `$${c.flat_pay_usd.toLocaleString()} flat`
        : "-";
  const capLabel = c.weekly_cap ?? "-";

  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight">Payments</h2>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
        {c.payments_note}{" "}
        <Link href="/earnings" className="text-[var(--accent)] hover:underline">
          Earnings page
        </Link>
      </p>

      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[13px] text-[var(--fg-muted)]">
            {c.hourly_pay_usd != null ? "Hourly pay" : "Flat pay"}
          </span>
          <span className="text-[14px] font-semibold">{payLabel}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] text-[var(--fg-muted)]">
            {c.contract_kind === "hourly" ? "Weekly cap" : "Cadence"}
          </span>
          <span className="text-[14px] font-medium">{capLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Documents section ────────────────────────────────────────────────────────
function DocumentsSection({ contract: c }: { contract: Contract }) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight">Documents</h2>

      <div className="mt-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        {c.documents.map((doc, i) => {
          const sub =
            doc.signed_on
              ? `Signed on ${doc.signed_on}`
              : doc.signed_by === "mercor"
                ? "Signed by Mercor."
                : "Signed by brand.";
          return (
            <div
              key={i}
              data-test-id={`contract-doc-${i}`}
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-b-0"
            >
              <div>
                <div className="text-[13px] font-medium">{doc.name}</div>
                <div className="text-[11px] text-[var(--fg-muted)]">{sub}</div>
              </div>
              <button
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                aria-label={`Download ${doc.name}`}
              >
                <Download size={14} className="text-[var(--fg-muted)]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Checklist rail ───────────────────────────────────────────────────────────
function ChecklistRail({ contract: c }: { contract: Contract }) {
  return (
    <div className="lg:sticky lg:top-6 space-y-3">
      {/* Status pill at top */}
      <div className="flex items-center gap-2">
        <StatusPill status={c.status} />
        <span className="text-[12px] text-[var(--fg-muted)]">
          Received {c.received_ago_days} day{c.received_ago_days !== 1 ? "s" : ""} ago
        </span>
      </div>

      <h2 className="text-[16px] font-semibold tracking-tight">
        View initial project information
      </h2>

      <div className="space-y-2">
        {c.checklist.map((item, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] p-3"
          >
            <div className="flex items-start gap-2 justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold leading-snug">{item.label}</div>
                <div className="mt-0.5 text-[11px] text-[var(--fg-muted)] leading-relaxed">
                  {item.description}
                </div>
              </div>
              <div className="shrink-0 mt-0.5">
                {item.completed ? (
                  <CheckCircle2 size={18} className="text-[var(--success)]" />
                ) : (
                  <Circle size={18} className="text-[var(--fg-faint)]" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inner component (needs React.use(params)) ────────────────────────────────
function ContractDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const contract = CONTRACTS_BY_ID[id];

  if (!contract) {
    return (
      <div className="fade-in flex flex-col items-center gap-4 py-24 text-center">
        <div className="text-[18px] font-semibold">Contract not found</div>
        <p className="text-[13px] text-[var(--fg-muted)]">
          The contract ID &ldquo;{id}&rdquo; does not exist.
        </p>
        <Link
          href="/home"
          className="flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Back nav */}
      <Link
        href="/home"
        className="mb-6 inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
      >
        <ArrowLeft size={13} />
        Home
      </Link>

      {/* Two-column layout */}
      <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* LEFT: main */}
        <div className="space-y-8">
          {/* Brand + role header */}
          <div>
            <div className="flex items-center gap-3">
              <ContractBrandMark label={contract.brand_label} size={32} />
              <span className="text-[14px] font-medium text-[var(--fg-muted)]">
                {contract.brand_label}
              </span>
            </div>
            <div className="mt-3 flex items-start justify-between flex-wrap gap-2">
              <h1
                className="h-display text-[26px] leading-tight"
                style={{ fontSize: 26 }}
              >
                {contract.role}
              </h1>
              <div className="text-right">
                <div className="text-[13px] text-[var(--fg-muted)]">
                  {kindLabel(contract.contract_kind)}
                </div>
                <div className="text-[11px] text-[var(--fg-subtle)]">
                  Received {contract.received_ago_days} day
                  {contract.received_ago_days !== 1 ? "s" : ""} ago
                </div>
              </div>
            </div>
          </div>

          <OnboardingDoc
            title={contract.onboarding_doc_title}
            body={contract.onboarding_doc_body}
          />

          <PaymentsSection contract={contract} />

          <DocumentsSection contract={contract} />

          <p className="text-[12px] text-[var(--fg-muted)]">
            Need help?{" "}
            <a
              href="mailto:support@mercor.com"
              className="text-[var(--accent)] hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>

        {/* RIGHT: sticky checklist rail */}
        <ChecklistRail contract={contract} />
      </div>
    </div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────
export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <ContractDetailInner params={params} />
    </Suspense>
  );
}
