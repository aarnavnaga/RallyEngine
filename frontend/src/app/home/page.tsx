"use client";

import { Suspense, useState } from "react";
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
  Filter,
} from "lucide-react";
import {
  CONTRACTS,
  OFFERS,
  APPLICATIONS,
  type Contract,
  type Offer,
  type Application,
} from "@/lib/data/contracts";

// ─── Brand mark helper (contract-local, no full Brand object needed) ─────────
function ContractBrandMark({
  label,
  size = 28,
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
        fontSize: Math.max(10, size * 0.45),
      }}
      aria-label={label}
    >
      {initial}
    </span>
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
  { slug: "creator-voice-interview-core", name: "Creator Voice Interview CORE", duration: "12 minutes", format: "interview", roles_count: 3, max_pay: "$90/hourly" },
  { slug: "brand-fit-reasoning-core", name: "Brand Fit Reasoning CORE", duration: "8 minutes", format: "interview" },
  { slug: "audience-analytics-showcase-core", name: "Audience Analytics Showcase CORE", duration: "15 questions", format: "form" },
];

// ─── Assessment row ──────────────────────────────────────────────────────────
function AssessmentRow({ a }: { a: Assessment }) {
  const isRetake = a.state === "retake";
  const isCompleted = a.state === "completed";
  const btnLabel = isRetake ? "Retake Assessment" : isCompleted ? "Retake Assessment" : a.format === "interview" ? "Start interview" : "View assessment";
  const btnCls = isCompleted
    ? "pill pill-success text-[11px] cursor-default"
    : "rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors";

  return (
    <div
      className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-b-0"
      data-test-id={`home-assessment-${a.slug}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elev)]">
        {a.format === "interview" ? (
          <Mic size={14} className="text-[var(--fg-muted)]" />
        ) : (
          <FileText size={14} className="text-[var(--fg-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium">{a.name}</span>
          <span className="pill text-[10px]">CORE</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-muted)] flex-wrap">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {a.duration}
          </span>
          <span>·</span>
          <span>{a.format === "interview" ? "Interview" : "Form"}</span>
          {a.roles_count != null ? (
            <>
              <span>·</span>
              <span>Used by {a.roles_count} role{a.roles_count !== 1 ? "s" : ""}</span>
              {a.max_pay && (
                <>
                  <span>·</span>
                  <span>Paying up to {a.max_pay}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span>·</span>
              <span>Available for upcoming opportunities</span>
            </>
          )}
        </div>
        {isCompleted && (
          <div className="mt-1">
            <span className="pill pill-success text-[10px]">Completed</span>
          </div>
        )}
      </div>
      <button className={btnCls}>{btnLabel}</button>
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
  return (
    <div className="space-y-3">
      {active.map((c) => (
        <ContractCard key={c.id} contract={c} />
      ))}
    </div>
  );
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const preview = c.onboarding_doc_body.slice(0, 160).trim();
  const payLabel =
    c.hourly_pay_usd != null
      ? `$${c.hourly_pay_usd.toFixed(2)} / hour`
      : c.flat_pay_usd != null
        ? `$${c.flat_pay_usd.toLocaleString()} flat`
        : "-";

  return (
    <div
      className="card p-5"
      data-test-id={`home-contract-${c.id}`}
    >
      <div className="flex items-center gap-3 justify-between flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          <ContractBrandMark label={c.brand_label} size={24} />
          <span className="text-[13px] font-medium">{c.brand_label}</span>
          <KindPill kind={c.contract_kind} />
        </div>
        <span className="text-[11px] text-[var(--fg-muted)]">
          Received {c.received_ago_days} day{c.received_ago_days !== 1 ? "s" : ""} ago
        </span>
      </div>

      <div className="mt-3">
        <div className="text-[15px] font-semibold">{c.role}</div>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)] leading-relaxed line-clamp-2">
          {preview}…
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{payLabel}</span>
          <StatusPill status={c.status} />
        </div>
        <Link
          href={`/contracts/${c.id}`}
          className="text-[13px] font-medium text-[var(--accent)] hover:underline"
        >
          Open contract →
        </Link>
      </div>
    </div>
  );
}

function OffersTab() {
  return (
    <div className="space-y-3">
      {OFFERS.map((o) => (
        <OfferCard key={o.id} offer={o} />
      ))}
    </div>
  );
}

function OfferCard({ offer: o }: { offer: Offer }) {
  return (
    <div className="card p-5" data-test-id={`home-offer-${o.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ContractBrandMark label={o.brand_label} size={24} />
          <span className="text-[13px] font-medium">{o.brand_label}</span>
        </div>
        <span className="text-[11px] text-[var(--fg-muted)] shrink-0">
          Posted {o.posted_ago_days} day{o.posted_ago_days !== 1 ? "s" : ""} ago
          {" · "}
          Expires in {o.expires_in_days} day{o.expires_in_days !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-2">
        <div className="text-[15px] font-semibold">{o.role}</div>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{o.one_line}</p>
      </div>

      <div className="mt-3 text-[13px] font-semibold">{o.pay_label}</div>

      <div className="mt-4 flex items-center gap-2">
        <button className="rounded-[6px] bg-[var(--accent)] px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
          Accept offer
        </button>
        <button className="rounded-[6px] border border-[var(--border)] px-4 py-1.5 text-[12px] font-medium hover:bg-[var(--bg-hover)] transition-colors">
          Pass
        </button>
      </div>
    </div>
  );
}

function ApplicationsTab() {
  return (
    <div className="space-y-3">
      {APPLICATIONS.map((a) => (
        <ApplicationCard key={a.id} application={a} />
      ))}
    </div>
  );
}

function ApplicationCard({ application: a }: { application: Application }) {
  const statusMap: Record<Application["status"], { label: string; cls: string }> = {
    review: { label: "Under review", cls: "pill pill-warning" },
    interview: { label: "Interview", cls: "pill pill-accent" },
    rejected: { label: "Rejected", cls: "pill" },
  };
  const { label, cls } = statusMap[a.status];
  return (
    <div className="card p-5" data-test-id={`home-application-${a.id}`}>
      <div className="flex items-center gap-2">
        <ContractBrandMark label={a.brand_label} size={24} />
        <span className="text-[13px] font-medium">{a.brand_label}</span>
      </div>
      <div className="mt-2 text-[15px] font-semibold">{a.role}</div>
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={cls}>{label}</span>
          <span className="text-[11px] text-[var(--fg-muted)]">
            Submitted {a.submitted_ago_days} day{a.submitted_ago_days !== 1 ? "s" : ""} ago
          </span>
        </div>
        <button className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--danger)] transition-colors underline">
          Withdraw
        </button>
      </div>
    </div>
  );
}

function AssessmentsTab() {
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent)] to-[#f4a8b6] p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <h2 className="text-[22px] font-bold text-white tracking-tight">
              Assessments
            </h2>
            <p className="mt-2 text-[13px] text-white/80 leading-relaxed max-w-lg">
              Assessments are the quickest way to unlock more opportunities. Many roles share the same requirements, so once you&apos;ve passed an assessment, you&apos;re automatically considered for any new matching roles in the future. No extra applications, no extra hassle.
            </p>
          </div>
          <div className="flex gap-3 lg:shrink-0">
            {[
              {
                name: "Brainstorming Session CORE",
                duration: "16 minutes",
                desc: "A quick domain-specific creative brainstorming skills assessment",
                roles: 0,
                pay: "$0/hourly",
              },
              {
                name: "Data Science Interview CORE",
                duration: "30 minutes",
                desc: "Domain-specific data science skills interview",
                roles: 0,
                pay: "$0/hourly",
              },
            ].map((card) => (
              <div
                key={card.name}
                className="w-[180px] shrink-0 rounded-[10px] bg-white p-3 shadow-md"
              >
                <div className="text-[12px] font-semibold leading-snug">{card.name}</div>
                <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{card.duration}</div>
                <p className="mt-1 text-[10px] text-[var(--fg-muted)] leading-snug">{card.desc}</p>
                <div className="mt-1 text-[10px] text-[var(--fg-muted)]">
                  Used by {card.roles} roles · Paying up to {card.pay}
                </div>
                <button className="mt-2 w-full rounded-[6px] bg-[var(--accent)] py-1 text-[10px] font-semibold text-white">
                  Start interview
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2">
        <Filter size={14} className="shrink-0 text-[var(--fg-muted)]" />
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
            title="Creators & Influencers Assessments"
            count={3}
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
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
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
                      : "bg-[var(--bg-elev)] text-[var(--fg-muted)]",
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

// ─── Default export wrapped in Suspense ──────────────────────────────────────
export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}
