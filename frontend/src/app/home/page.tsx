"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Star,
  FileText,
  Mic,
  Code,
  Heart,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Search,
  HelpCircle,
} from "lucide-react";
import {
  CONTRACTS,
  OFFERS,
  APPLICATIONS,
  type Contract,
  type Offer,
  type Application,
} from "@/lib/data/contracts";

// ─── Row icon (matches Mercor's neutral gray briefcase glyph) ────────────────
// Mercor's /home rows use a uniform gray briefcase icon regardless of brand —
// not the colored letter avatars we had before. Aaron flagged this on
// 2026-04-27 with side-by-side screenshots, so we now match 1:1.
//
// The icon is purely decorative: the brand label is already conveyed by the
// row text below, so we mark it aria-hidden to avoid screen readers
// double-announcing the brand name.
function RowIcon() {
  return (
    <div
      className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-[var(--bg-elev)]"
      aria-hidden="true"
    >
      <Briefcase
        size={14}
        strokeWidth={1.7}
        className="text-[var(--fg-muted)]"
      />
    </div>
  );
}

// ─── Pill helpers ────────────────────────────────────────────────────────────
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

function KindPill({ kind }: { kind: Contract["contract_kind"] }) {
  const labels: Record<Contract["contract_kind"], string> = {
    hourly: "Hourly contract",
    project: "Project contract",
    "creator-post": "Creator post",
    "creator-campaign": "Creator campaign",
    "campus-ambassador": "Campus ambassador",
  };
  return (
    <span className="pill pill-accent text-[10px]">{labels[kind]}</span>
  );
}

// Compact subtitle label used in the row layout — "Hourly", "Project",
// "Creator campaign" without the trailing "contract" word.
function kindShortLabel(kind: Contract["contract_kind"]): string {
  const map: Record<Contract["contract_kind"], string> = {
    hourly: "Hourly",
    project: "Project",
    "creator-post": "Creator post",
    "creator-campaign": "Creator campaign",
    "campus-ambassador": "Campus ambassador",
  };
  return map[kind];
}

// ─── Tab config ──────────────────────────────────────────────────────────────
type TabSlug = "contracts" | "offers" | "applications" | "assessments" | "saved";

const TABS: { slug: TabSlug; label: string; count?: number }[] = [
  {
    slug: "contracts",
    label: "Contracts",
    count: CONTRACTS.filter((c) => c.status === "active" || c.status === "paused").length,
  },
  { slug: "offers", label: "Offers", count: OFFERS.length },
  { slug: "applications", label: "Applications", count: APPLICATIONS.length },
  { slug: "assessments", label: "Assessments" },
  { slug: "saved", label: "Saved" },
];

// ─── Assessments data ────────────────────────────────────────────────────────
type AssessmentFormat = "interview" | "form";
type AssessmentState = "available" | "completed" | "retake";

type Assessment = {
  slug: string;
  name: string;
  duration: string;
  format: AssessmentFormat;
  roles_count?: number;
  max_pay?: string;
  state?: AssessmentState;
};

const SW_ASSESSMENTS: Assessment[] = [
  {
    slug: "open-source-contributor",
    name: "Open source contributor",
    duration: "5 questions",
    format: "form",
    roles_count: 1,
    max_pay: "$100/hourly",
    state: "completed",
  },
];

const DATA_ASSESSMENTS: Assessment[] = [
  { slug: "brainstorming-session-core", name: "Brainstorming Session CORE", duration: "16 minutes", format: "interview" },
  { slug: "data-science-interview-core", name: "Data Science Interview CORE", duration: "30 minutes", format: "interview" },
  { slug: "engineering-demo-core", name: "Engineering Demo CORE", duration: "1h 47m", format: "interview" },
  { slug: "algorithms-interview-core", name: "Algorithms Interview CORE", duration: "27 minutes", format: "interview" },
  { slug: "tool-use-interview-core", name: "Tool Use Interview CORE", duration: "19 minutes", format: "interview" },
  { slug: "bilingual-competency-core", name: "Bilingual Competency CORE", duration: "20 minutes", format: "interview", roles_count: 3, max_pay: "$50/hourly" },
  { slug: "finance-interview-core", name: "Finance Interview CORE", duration: "31 minutes", format: "interview", roles_count: 3, max_pay: "$130/hourly" },
  { slug: "clinical-case-study-core", name: "Clinical Case Study CORE", duration: "23 minutes", format: "interview", roles_count: 1, max_pay: "$130/hourly" },
  { slug: "consulting-interview-core", name: "Consulting Interview CORE", duration: "33 minutes", format: "interview", roles_count: 1, max_pay: "$150/hourly" },
  { slug: "law-interview-core", name: "Law Interview CORE", duration: "28 minutes", format: "interview", roles_count: 1, max_pay: "$130/hourly" },
  { slug: "math-contest-core", name: "Math Contest CORE", duration: "28 minutes", format: "interview", roles_count: 1, max_pay: "$60/hourly" },
  { slug: "reasoning-style-core", name: "Reasoning Style Assessment CORE", duration: "22 questions", format: "form", roles_count: 1, max_pay: "$100/hourly" },
  { slug: "audio-media-core", name: "Audio Media Assessment CORE", duration: "4 questions", format: "form" },
  { slug: "creative-prompt-writing-core", name: "Creative Prompt Writing CORE", duration: "2 questions", format: "form" },
  { slug: "general-assessment-core", name: "General Assessment CORE", duration: "12 questions", format: "form" },
  { slug: "hobbyist-interview-core", name: "Hobbyist Interview CORE", duration: "20 minutes", format: "interview" },
  { slug: "ocr-video-captioning-core", name: "OCR Video Captioning CORE", duration: "3 questions", format: "form" },
  { slug: "officejs-proficiency-core", name: "Office.js Proficiency Test CORE", duration: "2 questions", format: "form" },
  { slug: "olympiad-problem-core", name: "Olympiad Problem CORE", duration: "27 minutes", format: "interview" },
  { slug: "personal-introduction-core", name: "Personal Introduction CORE", duration: "9 minutes", format: "interview" },
  { slug: "quant-screen-core", name: "Quant Screen CORE", duration: "48 minutes", format: "interview" },
  { slug: "situational-interview-core", name: "Situational Interview CORE", duration: "19 minutes", format: "interview" },
  { slug: "visual-design-showcase-core", name: "Visual Design Showcase CORE", duration: "11 minutes", format: "interview" },
  { slug: "visual-media-assessment-core", name: "Visual Media Assessment CORE", duration: "11 questions", format: "form" },
  { slug: "voice-acting-interview-core", name: "Voice Acting Interview CORE", duration: "13 minutes", format: "interview" },
  { slug: "writing-interview-core", name: "Writing Interview CORE", duration: "20 minutes", format: "interview" },
  { slug: "domain-expert-interview-core", name: "Domain Expert Interview CORE", duration: "14 minutes", format: "interview", roles_count: 3, max_pay: "$125/hourly", state: "retake" },
  { slug: "code-review-session-core", name: "Code Review Session CORE", duration: "30 minutes", format: "interview", roles_count: 1, max_pay: "$100/hourly", state: "retake" },
  { slug: "system-design-session-core", name: "System Design Session CORE", duration: "35 minutes", format: "interview", state: "retake" },
];

const CREATOR_ASSESSMENTS: Assessment[] = [
  { slug: "influencer-video-assessment-core", name: "Influencer Video Assessment CORE", duration: "20 minutes", format: "interview", roles_count: 4, max_pay: "$120/hourly" },
  { slug: "creator-voice-interview-core", name: "Expert Voice Interview CORE", duration: "12 minutes", format: "interview", roles_count: 3, max_pay: "$90/hourly" },
  { slug: "brand-fit-reasoning-core", name: "Brand Fit Reasoning CORE", duration: "8 minutes", format: "interview" },
  { slug: "audience-analytics-showcase-core", name: "Audience Analytics Showcase CORE", duration: "15 questions", format: "form" },
];

// ─── Assessment row ──────────────────────────────────────────────────────────
function AssessmentRow({ a }: { a: Assessment }) {
  const isRetake = a.state === "retake";
  const isCompleted = a.state === "completed";
  // Some seed names embed " CORE" in the title — strip it and surface as a
  // proper pill so we don't end up double-tagging like "Brainstorming CORE [CORE]".
  const hasCore = / CORE\s*$/i.test(a.name);
  const cleanName = a.name.replace(/\s+CORE\s*$/i, "");
  const isInterview = a.format === "interview";
  const btnLabel = isCompleted
    ? "View assessment"
    : isRetake
      ? "Retake assessment"
      : isInterview
        ? "Start interview"
        : "View assessment";
  const btnCls = isCompleted
    ? "text-[12px] font-medium text-[var(--accent)] hover:underline"
    : "rounded-[8px] bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors";
  // Every assessment opens the dedicated /interview/<slug> route so the
  // candidate gets the Mercor-style preflight + camera + AI flow, with a
  // returnPath that brings them back to this very tab on completion.
  const returnPath = "/home?tab=assessments";
  const href = `/interview/${a.slug}?returnPath=${encodeURIComponent(returnPath)}`;

  return (
    <div
      className="flex items-center gap-3 border-b border-[var(--border)] py-3.5 last:border-b-0"
      data-test-id={`home-assessment-${a.slug}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elev)]">
        {isInterview ? (
          <Mic size={14} className="text-[var(--fg-muted)]" />
        ) : (
          <FileText size={14} className="text-[var(--fg-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">{cleanName}</span>
          {hasCore ? (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[var(--fg-muted)]">
              CORE
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--fg-muted)] flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {a.duration}
          </span>
          <span>·</span>
          <span>{isInterview ? "Interview" : "Form"}</span>
        </div>
        {isCompleted && (
          <div className="mt-1.5">
            <span className="pill pill-success text-[10px]">Completed</span>
          </div>
        )}
      </div>
      <div className="hidden flex-shrink-0 text-right text-[11px] text-[var(--fg-muted)] md:block">
        {a.roles_count != null ? (
          <>
            <div>
              Used by <span className="font-semibold text-[var(--fg)]">{a.roles_count} role{a.roles_count !== 1 ? "s" : ""}</span>
            </div>
            {a.max_pay && (
              <div>
                Paying up to <span className="font-semibold text-[var(--fg)]">{a.max_pay}</span>
              </div>
            )}
          </>
        ) : (
          <span>Available for upcoming opportunities</span>
        )}
      </div>
      <Link href={href} className={btnCls} data-test-id={`home-assessment-cta-${a.slug}`}>
        {btnLabel}
      </Link>
    </div>
  );
}

// ─── Accordion section ───────────────────────────────────────────────────────
function AssessmentAccordion({
  title,
  count,
  assessments,
  defaultOpen = false,
  icon,
}: {
  title: string;
  count: number;
  assessments: Assessment[];
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-4 hover:bg-[var(--bg-elev)] transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[14px] font-semibold">{title}</span>
          <span className="rounded-full bg-[var(--bg-elev)] border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--fg-muted)]">
            {count}
          </span>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-[var(--fg-muted)]" />
        ) : (
          <ChevronRight size={16} className="text-[var(--fg-muted)]" />
        )}
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-4">
          {assessments.map((a) => (
            <AssessmentRow key={a.slug} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab contents ────────────────────────────────────────────────────────────
function ContractsTab() {
  const active = CONTRACTS.filter(
    (c) => c.status === "active" || c.status === "paused",
  );
  const past = CONTRACTS.filter((c) => c.status === "completed");
  return (
    <div className="space-y-2">
      {active.map((c) => (
        <ContractCard key={c.id} contract={c} />
      ))}
      {past.length > 0 && (
        <CollapsibleSection
          title="Past contracts"
          count={past.length}
          defaultOpen={false}
        >
          {past.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const payLabel =
    c.hourly_pay_usd != null
      ? `$${c.hourly_pay_usd.toFixed(2)}/hour`
      : c.flat_pay_usd != null
        ? `$${c.flat_pay_usd.toLocaleString()} flat`
        : "—";
  const subtitle = [payLabel, kindShortLabel(c.contract_kind), c.brand_label]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/contracts/${c.id}`}
      data-test-id={`home-contract-${c.id}`}
      className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
    >
      <RowIcon />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-[var(--fg)]">
          {c.role}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--fg-muted)]">
          {subtitle}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-[11px] text-[var(--fg-muted)] sm:inline">
          Updated {c.received_ago_days} day{c.received_ago_days !== 1 ? "s" : ""} ago
        </span>
        <StatusPill status={c.status} />
      </div>
    </Link>
  );
}

function OffersTab() {
  // Local-only offer state so Pass / Accept actually do something for the
  // demo. We persist decisions to localStorage so the UI doesn't reset on
  // refresh — the brand-customer endpoint isn't wired up.
  const STORAGE_KEY = "mercor.offers.decisions.v1";
  const [decisions, setDecisions] = useState<Record<string, "passed" | "accepted">>({});
  const [accepted, setAccepted] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDecisions(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  function persist(next: Record<string, "passed" | "accepted">) {
    setDecisions(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function onPass(id: string) {
    persist({ ...decisions, [id]: "passed" });
  }
  function onAccept(o: Offer) {
    persist({ ...decisions, [o.id]: "accepted" });
    setAccepted(o.brand_label);
    // Auto-dismiss the success banner after 4s.
    window.setTimeout(() => setAccepted(null), 4000);
  }

  const remaining = OFFERS.filter((o) => !decisions[o.id]);

  return (
    <div className="space-y-3">
      {accepted ? (
        <div
          className="flex items-center justify-between rounded-md border border-[var(--success)] bg-[var(--success-soft)] px-4 py-2.5 text-[13px] text-[var(--success)]"
          role="status"
        >
          <span>
            Offer accepted from <span className="font-semibold">{accepted}</span>. The
            contract will land in your Contracts tab within 24 hours.
          </span>
          <button
            type="button"
            onClick={() => setAccepted(null)}
            aria-label="Dismiss"
            className="text-[12px] underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {remaining.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[var(--border)] px-4 py-8 text-center text-[13px] text-[var(--fg-muted)]">
          No active offers. We&apos;ll surface new ones here as they come in.
        </div>
      ) : (
        remaining.map((o) => (
          <OfferCard key={o.id} offer={o} onPass={onPass} onAccept={onAccept} />
        ))
      )}
    </div>
  );
}

function OfferCard({
  offer: o,
  onPass,
  onAccept,
}: {
  offer: Offer;
  onPass: (id: string) => void;
  onAccept: (o: Offer) => void;
}) {
  const subtitle = [o.pay_label, o.brand_label].filter(Boolean).join(" · ");
  return (
    <div
      className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
      data-test-id={`home-offer-${o.id}`}
    >
      <RowIcon />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-[var(--fg)]">
          {o.role}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--fg-muted)]">
          {subtitle}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden text-[11px] text-[var(--fg-muted)] md:inline">
          Expires in {o.expires_in_days}d
        </span>
        <button
          type="button"
          onClick={() => onPass(o.id)}
          data-test-id={`home-offer-${o.id}-pass`}
          className="rounded-[6px] border border-[var(--border)] px-3 py-1 text-[12px] font-medium hover:bg-[var(--bg-hover)] transition-colors"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={() => onAccept(o)}
          data-test-id={`home-offer-${o.id}-accept`}
          className="rounded-[6px] bg-[var(--accent)] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

function ApplicationsTab() {
  // In-progress applications stay in the main list. Submitted/under-review/
  // interview/rejected go into the collapsible "Submitted applications" so the
  // top of the page mirrors Mercor's "active first, archive collapsed" rhythm.
  const inProgress = APPLICATIONS.filter((a) => a.status === "in-progress");
  const submitted = APPLICATIONS.filter((a) => a.status !== "in-progress");
  return (
    <div className="space-y-2">
      {inProgress.map((a) => (
        <ApplicationCard key={a.id} application={a} />
      ))}
      {submitted.length > 0 && (
        <CollapsibleSection
          title="Submitted applications"
          count={submitted.length}
          defaultOpen
        >
          {submitted.map((a) => (
            <ApplicationCard key={a.id} application={a} />
          ))}
        </CollapsibleSection>
      )}
    </div>
  );
}

function ApplicationCard({ application: a }: { application: Application }) {
  const subtitle = [a.pay_label, a.kind_label, a.brand_label]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="flex items-center gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
      data-test-id={`home-application-${a.id}`}
    >
      <RowIcon />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-[var(--fg)]">
          {a.role}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[var(--fg-muted)]">
          {subtitle}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {a.status === "in-progress" ? (
          <>
            <span className="hidden text-[11px] text-[var(--fg-muted)] sm:inline">
              Started on {a.submitted_on}
            </span>
            <span className="pill pill-warning text-[10px]">
              {a.steps_completed ?? 3} of {a.steps_total ?? 4} steps completed
            </span>
          </>
        ) : (
          <>
            <span className="hidden text-[11px] text-[var(--fg-muted)] sm:inline">
              Submitted on {a.submitted_on}
            </span>
            <ApplicationStatusPill status={a.status} />
          </>
        )}
      </div>
    </div>
  );
}

function ApplicationStatusPill({ status }: { status: Application["status"] }) {
  const map: Record<Application["status"], { label: string; cls: string }> = {
    "in-progress": { label: "In progress", cls: "pill pill-warning" },
    submitted: { label: "Submitted", cls: "pill pill-success" },
    review: { label: "Under review", cls: "pill pill-warning" },
    interview: { label: "Interview", cls: "pill pill-accent" },
    rejected: { label: "Rejected", cls: "pill" },
  };
  const { label, cls } = map[status];
  return <span className={cls}>{label}</span>;
}

// ─── Generic collapsible used for "Past contracts" / "Submitted applications"
function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-[var(--fg)] hover:text-[var(--accent)]"
      >
        {open ? (
          <ChevronDown size={14} className="text-[var(--fg-muted)]" />
        ) : (
          <ChevronRight size={14} className="text-[var(--fg-muted)]" />
        )}
        {title} ({count})
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

function AssessmentsTab() {
  return (
    <div className="space-y-6">
      {/* Hero — mirrors work.mercor.com/home?tab=assessments */}
      <div className="relative overflow-visible rounded-[20px] bg-gradient-to-r from-[#5b3df0] via-[#7857ff] to-[#f4a8b6] px-10 pt-14 pb-20 lg:pb-14">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-[560px]">
            <h2 className="text-[44px] font-bold leading-[1.05] tracking-tight text-white">
              Assessments
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              Assessments are the quickest way to unlock more opportunities. Many roles share the same requirements, so once you&apos;ve passed an assessment, you&apos;re automatically considered for any new matching roles in the future. No extra applications, no extra hassle.
            </p>
          </div>
          <div className="flex items-stretch gap-4 lg:-mb-24">
            {[
              {
                slug: "influencer-video-assessment-core",
                name: "Influencer Video Assessment",
                duration: "20 minutes",
                desc: "On-camera audience-fit interview — brand voice + hook quality.",
                roles: 4,
                pay: "$120/hourly",
              },
              {
                slug: "brainstorming-session-core",
                name: "Brainstorming Session",
                duration: "16 minutes",
                desc: "A quick domain-specific creative brainstorming skills assessment",
                roles: 0,
                pay: "$0/hourly",
              },
              {
                slug: "data-science-interview-core",
                name: "Data Science Interview",
                duration: "30 minutes",
                desc: "Domain-specific data science skills interview",
                roles: 0,
                pay: "$0/hourly",
              },
            ].map((card) => {
              const href = `/interview/${card.slug}?returnPath=${encodeURIComponent("/home?tab=assessments")}`;
              return (
                <div
                  key={card.slug}
                  className="flex w-[260px] shrink-0 flex-col rounded-[14px] bg-white p-5 shadow-[0_12px_28px_rgba(15,7,52,0.22)]"
                >
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
                    <Clock size={12} strokeWidth={1.7} />
                    {card.duration}
                  </div>
                  {/* Title pinned at 2-line height so the longest-wrapping
                      title (Influencer Video Assessment) doesn't shove the
                      sibling cards' CORE pill / desc / button out of alignment. */}
                  <div className="mt-2.5 min-h-[44px] text-[17px] font-semibold leading-snug text-[var(--fg)]">
                    {card.name}
                  </div>
                  <span className="mt-2 inline-block self-start rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium tracking-wide text-[var(--fg-muted)]">
                    CORE
                  </span>
                  <p className="mt-3 min-h-[48px] text-[12px] leading-snug text-[var(--fg-muted)]">{card.desc}</p>
                  <div className="mt-3 text-[12px] text-[var(--fg-muted)]">
                    Used by <span className="font-semibold text-[var(--fg)]">{card.roles} roles</span>
                  </div>
                  <div className="text-[12px] text-[var(--fg-muted)]">
                    Paying up to <span className="font-semibold text-[var(--fg)]">{card.pay}</span>
                  </div>
                  <Link
                    href={href}
                    data-test-id={`home-assessment-hero-cta-${card.slug}`}
                    className="mt-auto block w-full rounded-[8px] bg-[var(--accent)] py-2 text-center text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    Start interview
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search bar — Mercor uses just a search icon, no filter funnel */}
      <div className="lg:mt-28 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
        <Search size={14} className="shrink-0 text-[var(--fg-muted)]" />
        <input
          className="flex-1 bg-transparent text-[13px] placeholder-[var(--fg-subtle)] outline-none"
          placeholder="Search assessments"
          readOnly
        />
      </div>

      {/* Category accordions */}
      <div className="space-y-2">
        <AssessmentAccordion
          title="Software Engineering Assessments"
          count={1}
          assessments={SW_ASSESSMENTS}
          defaultOpen
          icon={<Code size={15} className="text-[var(--accent)]" />}
        />
        <AssessmentAccordion
          title="Data-Type Assessments"
          count={29}
          assessments={DATA_ASSESSMENTS}
          defaultOpen
          icon={<FileText size={15} className="text-[var(--fg-muted)]" />}
        />
        <AssessmentAccordion
          title="Business Operations Assessments"
          count={1}
          assessments={[]}
          icon={<Briefcase size={15} className="text-[var(--fg-muted)]" />}
        />
        <AssessmentAccordion
          title="Arts & Design Assessments"
          count={1}
          assessments={[]}
          icon={<Star size={15} className="text-[var(--fg-muted)]" />}
        />
        <AssessmentAccordion
          title="Humanities Assessments"
          count={1}
          assessments={[]}
          icon={<FileText size={15} className="text-[var(--fg-muted)]" />}
        />
        <AssessmentAccordion
          title="Miscellaneous Assessments"
          count={11}
          assessments={[]}
          icon={<Star size={15} className="text-[var(--fg-muted)]" />}
        />
        {/* Mercor Creators & Influencers category */}
        <div className="relative">
          <div className="absolute -top-1 right-4 z-10 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white shadow">
            NEW - Mercor
          </div>
          <AssessmentAccordion
            title="Influencer & Creator Expert Assessments"
            count={4}
            assessments={CREATOR_ASSESSMENTS}
            defaultOpen
            icon={<Heart size={15} className="text-[#f4a8b6]" />}
          />
        </div>
      </div>
    </div>
  );
}

function SavedTab() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elev)]">
        <Heart size={22} className="text-[var(--fg-subtle)]" />
      </div>
      <div>
        <div className="text-[15px] font-semibold">No saved opportunities yet</div>
        <div className="mt-1 text-[13px] text-[var(--fg-muted)]">
          Bookmark roles as you browse and they&apos;ll appear here.
        </div>
      </div>
      <Link
        href="/explore"
        className="mt-2 rounded-[6px] border border-[var(--border)] px-4 py-2 text-[13px] font-medium hover:bg-[var(--bg-hover)] transition-colors"
      >
        Browse opportunities →
      </Link>
    </div>
  );
}

// ─── Inner component (needs useSearchParams) ──────────────────────────────────
function HomePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const rawTab = params.get("tab") as TabSlug | null;
  const activeTab: TabSlug =
    rawTab && TABS.find((t) => t.slug === rawTab) ? rawTab : "contracts";

  function switchTab(slug: TabSlug) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", slug);
    router.push(url.pathname + url.search, { scroll: false });
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="h-display text-[28px]">Welcome back, Logan!</h1>
        <span className="pill pill-success text-[11px]">LinkedIn Linked</span>
      </div>

      {/* Important tasks — Mercor's weekly contractor check-in pattern */}
      <WeeklyCheckIn />

      {/* Tabs */}
      <div className="mt-6 flex items-end gap-0 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const isActive = t.slug === activeTab;
          return (
            <button
              key={t.slug}
              data-test-id={`home-tab-${t.slug}`}
              onClick={() => switchTab(t.slug)}
              className={[
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] transition-colors",
                isActive
                  ? "border-b-2 border-[var(--accent)] font-semibold text-[var(--accent)]"
                  : "font-medium text-[var(--fg-muted)] hover:text-[var(--fg)]",
              ].join(" ")}
              style={{ marginBottom: isActive ? -1 : 0 }}
            >
              {t.label}
              {t.count != null && (
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    isActive
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--border)] text-[var(--fg-muted)]",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "contracts" && <ContractsTab />}
        {activeTab === "offers" && <OffersTab />}
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "assessments" && <AssessmentsTab />}
        {activeTab === "saved" && <SavedTab />}
      </div>
    </div>
  );
}

// ─── Weekly contractor check-in ──────────────────────────────────────────────
// Mercor surfaces a weekly availability + workload survey at the top of /home
// under "Important Tasks". The card shows a due date; the modal collects
// next-week availability, target hours, and an enrollment-preference radio.
// Once submitted, we hide the card via local state (no backend in the demo —
// localStorage persists across reloads so the demo doesn't reset on refresh).
type Availability = "as-usual" | "partial" | "none";
type StaffingPreference = "more-current" | "additional" | "satisfied";

function WeeklyCheckIn(): React.JSX.Element | null {
  const STORAGE_KEY = "mercor.weekly-checkin.v1";
  const [open, setOpen] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [availability, setAvailability] = useState<Availability>("as-usual");
  const [hours, setHours] = useState<string>("168");
  const [staffing, setStaffing] = useState<StaffingPreference>("additional");

  // Restore prior submission so the demo stays consistent on refresh.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSubmitted(true);
    } catch {
      // localStorage may be disabled (incognito/quota) — non-fatal.
    }
  }, []);

  // Lock body scroll when the modal is open so the page underneath doesn't
  // jump around when the user tabs through the radio inputs.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function submit() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          availability,
          hours: Number(hours) || 0,
          staffing,
          submittedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // ignore — submission is purely demo state
    }
    setSubmitted(true);
    setOpen(false);
  }

  if (submitted) return null;

  // Mirrors Mercor's "Due in 4 days" copy — week starts the next Monday.
  const dueDays = 4;

  return (
    <>
      <section className="mt-6">
        <div className="text-[13px] font-semibold text-[var(--fg)]">
          Important Tasks <span className="text-[var(--fg-muted)] font-medium">(1)</span>
        </div>
        <div className="mt-2 max-w-[420px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="text-[14px] font-semibold text-[var(--fg)]">
            Weekly Contractor Check-In
          </div>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--fg-muted)]">
            Ensure your availability is not marked as outdated and optionally provide
            project feedback.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-[12px] font-medium text-[#dc2626]">
              Due in {dueDays} days
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn-primary text-[12.5px]"
              data-test-id="weekly-checkin-open"
            >
              Complete check-in
            </button>
          </div>
        </div>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weekly-checkin-title"
          onClick={(e) => {
            // Click on backdrop (not the dialog itself) closes the modal.
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[440px] rounded-[14px] bg-white p-6 shadow-[var(--shadow-modal)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="weekly-checkin-title"
                    className="text-[18px] font-semibold tracking-tight text-[var(--fg)]"
                  >
                    Weekly contractor check-in
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-0.5 text-[11px] text-[var(--fg-muted)]">
                    <Clock size={11} /> 1 min
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                  Monday, May 4 — Sunday, May 10, 2026
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
                data-test-id="weekly-checkin-close"
              >
                <HelpCircle size={16} />
              </button>
            </div>

            {/* Section 1 — availability */}
            <fieldset className="mt-5">
              <legend className="text-[13px] font-semibold text-[var(--fg)]">
                Next week&apos;s availability
              </legend>
              <div className="mt-2 space-y-2">
                <RadioRow
                  name="availability"
                  value="as-usual"
                  checked={availability === "as-usual"}
                  onChange={() => setAvailability("as-usual")}
                  label="I'll be available as usual"
                />
                <RadioRow
                  name="availability"
                  value="partial"
                  checked={availability === "partial"}
                  onChange={() => setAvailability("partial")}
                  label="I'll be unavailable for part of the week"
                />
                <RadioRow
                  name="availability"
                  value="none"
                  checked={availability === "none"}
                  onChange={() => setAvailability("none")}
                  label="I won't be available at all next week"
                />
              </div>
            </fieldset>

            {/* Section 2 — hours */}
            <fieldset className="mt-5">
              <legend className="text-[13px] font-semibold text-[var(--fg)]">
                Next week&apos;s preferred time commitment
              </legend>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-[88px] rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[14px] text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  data-test-id="weekly-checkin-hours"
                />
                <span className="text-[13px] text-[var(--fg-muted)]">hours</span>
              </div>
            </fieldset>

            {/* Section 3 — staffing preference */}
            <fieldset className="mt-5">
              <legend className="text-[13px] font-semibold text-[var(--fg)]">
                How can we help you meet your target time commitment?
              </legend>
              <div className="mt-2 space-y-2">
                <RadioRow
                  name="staffing"
                  value="more-current"
                  checked={staffing === "more-current"}
                  onChange={() => setStaffing("more-current")}
                  label="I'd like more work within my current project"
                />
                <RadioRow
                  name="staffing"
                  value="additional"
                  checked={staffing === "additional"}
                  onChange={() => setStaffing("additional")}
                  label="I'd like to be staffed on an additional project"
                />
                <RadioRow
                  name="staffing"
                  value="satisfied"
                  checked={staffing === "satisfied"}
                  onChange={() => setStaffing("satisfied")}
                  label="I'm satisfied with my current engagements"
                />
              </div>
            </fieldset>

            <button
              type="button"
              onClick={submit}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)]"
              data-test-id="weekly-checkin-submit"
            >
              <CheckCircle2 size={14} /> Next
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span>{label}</span>
    </label>
  );
}

// ─── Default export wrapped in Suspense ──────────────────────────────────────
export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
