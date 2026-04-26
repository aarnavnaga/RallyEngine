"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import { FRIENDS, FRIENDS_TOTAL_POOL } from "@/lib/data/friends";
import { Avatar } from "@/components/shell/Avatar";
import { fmtCurrency, fmtFollowers } from "@/lib/util/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "connections" | "referrals";

interface VouchedState {
  [friendId: string]: boolean;
}

interface ToastMsg {
  id: number;
  text: string;
}

// Funnel bucket
interface FunnelBucket {
  label: string;
  count: number;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 50;

const FUNNEL_BUCKETS: FunnelBucket[] = [
  { label: "Signed Up", count: 0 },
  { label: "Application Started", count: 1, active: true },
  { label: "Application Completed", count: 0 },
  { label: "Offer Extended", count: 0 },
  { label: "Hired", count: 0 },
  { label: "Paid", count: 0 },
];

const KNOW_HOW_OPTIONS = [
  "Found via social platform - LinkedIn, X, Facebook, etc.",
  "Know socially - Alumni network, mutual friends, community, etc.",
  "Worked together - Current or former colleague",
  "Studied together - Classmate, study group, bootcamp, etc.",
  "Other - Any other connection",
];

const RECOMMEND_OPTIONS = [
  "Relevant skills - Strong technical or professional skills for the role",
  "High-quality educational background - Prestigious university, relevant degree, certifications",
  "High-quality employer - Worked at well-known or respected companies",
  "Unique or rare expertise - Specialized knowledge that is hard to find",
  "Other - Any other reason you recommend them",
];

// Pool used for auto-filled textarea content
const SKILLS_POOL = [
  "React and TypeScript",
  "Python and data pipelines",
  "machine learning and LLM tooling",
  "iOS development in Swift",
  "backend systems in Go",
  "product analytics and growth",
];

const COMPANIES_POOL = [
  "Figma",
  "Stripe",
  "Notion",
  "Scale AI",
  "Palantir",
  "Robinhood",
];

function buildAutoText(name: string): {
  education: string;
  employer: string;
  expertise: string;
} {
  const first = name.split(" ")[0];
  const skill = SKILLS_POOL[name.length % SKILLS_POOL.length];
  const company = COMPANIES_POOL[name.charCodeAt(0) % COMPANIES_POOL.length];
  return {
    education: `${first} studied Computer Science at UCSB and is one of the sharpest minds in our cohort. Strong academic foundation with several research projects and hackathon wins.`,
    employer: `Interned at ${company}, shipping features used by thousands of users. Demonstrated ability to ramp quickly and take ownership of complex problems end-to-end.`,
    expertise: `Hands-on experience with ${skill}, including real production deployments. This specialized background is rare at their level and directly applicable to the roles on Mercor.`,
  };
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
function ToastContainer({ messages }: { messages: ToastMsg[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {messages.map((m) => (
        <div key={m.id} className="toast flex items-center gap-2">
          <span className="text-[var(--success)]">✓</span>
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vouch Modal
// ---------------------------------------------------------------------------
interface VouchModalProps {
  name: string;
  onClose: () => void;
  onVouched: () => void;
}

function VouchModal({ name, onClose, onVouched }: VouchModalProps) {
  const [step, setStep] = useState(1);
  const [autoFill, setAutoFill] = useState(true);
  const [knowHow, setKnowHow] = useState<Set<number>>(new Set());
  const [recommend, setRecommend] = useState<Set<number>>(new Set());
  const [texts, setTexts] = useState({ education: "", employer: "", expertise: "" });
  const autoRef = useRef(autoFill);
  autoRef.current = autoFill;

  // Auto-advance logic
  useEffect(() => {
    if (!autoRef.current || step !== 1) return;
    // Pre-check step 1: indices 0 and 3 ("Found via social" + "Studied together")
    setKnowHow(new Set([0, 3]));
    const t = setTimeout(() => {
      if (!autoRef.current) return;
      setStep(2);
    }, 800);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!autoRef.current || step !== 2) return;
    // Pre-check step 2: indices 0 and 1
    setRecommend(new Set([0, 1]));
    const t = setTimeout(() => {
      if (!autoRef.current) return;
      setStep(3);
    }, 1100);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (!autoRef.current || step !== 3) return;
    const auto = buildAutoText(name);
    setTexts(auto);
    const t = setTimeout(() => {
      if (!autoRef.current) return;
      onVouched();
    }, 1500);
    return () => clearTimeout(t);
  }, [step, name, onVouched]);

  const toggleKnowHow = useCallback((i: number) => {
    setKnowHow((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const toggleRecommend = useCallback((i: number) => {
    setRecommend((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      data-test-id="vouch-modal"
    >
      <div
        className="relative w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-card)] shadow-[var(--shadow-modal)]"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <div className="text-[16px] font-semibold">Vouch for candidate</div>
            <div className="text-[12px] text-[var(--fg-muted)]">Share how you know this candidate</div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-fill toggle */}
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--fg-muted)]">
              <span>Auto-fill</span>
              <button
                role="switch"
                aria-checked={autoFill}
                data-test-id="vouch-autoaccept-toggle"
                onClick={() => setAutoFill((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoFill ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${autoFill ? "translate-x-[18px]" : "translate-x-[2px]"}`}
                />
              </button>
            </label>
            {/* Step dots */}
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`h-2 w-2 rounded-full transition-colors ${s === step ? "bg-[var(--accent)]" : s < step ? "bg-[var(--accent-soft)]" : "bg-[var(--border-strong)]"}`}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div className="text-[14px] font-semibold">Step 1 of 3: How do you know them?</div>
              <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
                How do you know {name}? Select all that apply.
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {KNOW_HOW_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => toggleKnowHow(i)}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-[13px] transition-colors ${knowHow.has(i) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors ${knowHow.has(i) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)]"}`}
                    >
                      {knowHow.has(i) && <span className="text-[10px] text-white">✓</span>}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  data-test-id="vouch-step-1-next"
                  className="btn-primary text-[13px]"
                  style={{ padding: "8px 20px" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div className="text-[14px] font-semibold">Step 2 of 3: Why recommend them?</div>
              <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
                Why are you recommending {name}? Select all that apply.
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {RECOMMEND_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => toggleRecommend(i)}
                    className={`flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-[13px] transition-colors ${recommend.has(i) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border transition-colors ${recommend.has(i) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-strong)]"}`}
                    >
                      {recommend.has(i) && <span className="text-[10px] text-white">✓</span>}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="btn-outline text-[13px]"
                  style={{ padding: "8px 20px" }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  data-test-id="vouch-step-2-next"
                  className="btn-primary text-[13px]"
                  style={{ padding: "8px 20px" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <div className="text-[14px] font-semibold">Step 3 of 3: Tell us more</div>
              <div className="mt-4 flex flex-col gap-4">
                <TextareaField
                  label="Educational Background"
                  placeholder="Tell us about their education and how it makes them stand out…"
                  value={texts.education}
                  onChange={(v) => setTexts((t) => ({ ...t, education: v }))}
                  maxChars={300}
                />
                <TextareaField
                  label="Employer Experience"
                  placeholder="Describe where they worked and what they accomplished…"
                  value={texts.employer}
                  onChange={(v) => setTexts((t) => ({ ...t, employer: v }))}
                  maxChars={300}
                />
                <TextareaField
                  label="Unique Expertise"
                  placeholder="What specialized knowledge or experience do they have?…"
                  value={texts.expertise}
                  onChange={(v) => setTexts((t) => ({ ...t, expertise: v }))}
                  maxChars={300}
                />
              </div>
              <div className="mt-5 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="btn-outline text-[13px]"
                  style={{ padding: "8px 20px" }}
                >
                  Back
                </button>
                <button
                  onClick={onVouched}
                  data-test-id="vouch-submit"
                  className="btn-primary text-[13px]"
                  style={{ padding: "8px 20px" }}
                >
                  Submit Vouch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  maxChars,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxChars: number;
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-medium">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
      />
      <div className="mt-0.5 flex justify-between text-[11px] text-[var(--fg-subtle)]">
        <span>Min 20 characters</span>
        <span>{value.length}/{maxChars}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connections Tab
// ---------------------------------------------------------------------------
interface ConnectionsTabProps {
  vouched: VouchedState;
  onVouch: (id: string) => void;
}

function ConnectionsTab({ vouched, onVouch }: ConnectionsTabProps) {
  const [filter, setFilter] = useState("");
  const [topMatchOnly, setTopMatchOnly] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const items = useMemo(() => {
    let list = [...FRIENDS];
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.handle_tiktok.toLowerCase().includes(q) ||
          f.niche.toLowerCase().includes(q),
      );
    }
    if (topMatchOnly) list = list.filter((f) => f.matches >= 3);
    return list.sort((a, b) => b.potential - a.potential);
  }, [filter, topMatchOnly]);

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, items.length);

  return (
    <div>
      <p className="mt-4 text-[13px] text-[var(--fg-muted)]">
        Track your connections and their job matches.
      </p>

      {/* Promo card */}
      <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--accent-soft)] bg-[var(--bg-promo)] p-4">
        <div className="text-[13px] font-semibold text-[var(--accent)]">
          Unlock more earnings with Mercor Intros
        </div>
        <p className="mt-1 max-w-[680px] text-[12px] text-[var(--fg-muted)]">
          You decide who to introduce and what gets sent. Mercor handles the invite, so you don&apos;t need to reach out personally.
          Click the{" "}
          <span className="inline-flex items-center gap-0.5 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[11px] text-white">
            <Sparkles size={9} /> Intro
          </span>{" "}
          button on any connection row to send a Mercor Intro.
        </p>
      </div>

      {/* Filter row */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]">
          Listings <ChevronDown size={12} />
        </button>
        <button
          onClick={() => setTopMatchOnly((v) => !v)}
          className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-[13px] transition-colors ${topMatchOnly ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
        >
          <Sparkles size={12} /> Top Match
        </button>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name or handle…"
          className="w-[220px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
        />

        {/* Bulk actions + pagination pushed right */}
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]">
            Share <ChevronDown size={12} />
          </button>
          <button className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]">
            Check Resume
          </button>
          <button className="rounded-md border border-[var(--danger)] px-3 py-1.5 text-[13px] text-[var(--danger)] hover:bg-red-50">
            Delete
          </button>
          <button className="btn-primary text-[13px]" style={{ padding: "6px 14px" }}>
            Re-upload
          </button>
        </div>
      </div>

      {/* Pagination info + arrows */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[12px] text-[var(--fg-muted)]">
        <RefreshCcw size={11} className="mr-1 cursor-pointer hover:text-[var(--fg)]" />
        <span>
          {start}-{end} of {items.length}
        </span>
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="rounded p-1 hover:bg-[var(--bg-hover)] disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
          className="rounded p-1 hover:bg-[var(--bg-hover)] disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="mt-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
        <table className="dt-table">
          <thead>
            <tr>
              <th>Connection</th>
              <th>Matches</th>
              <th>Last Activity</th>
              <th className="text-right">Potential earnings</th>
              <th>Reach out</th>
              <th>Know them well?</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((f) => {
              const isOpen = openRow === f.id;
              const isVouched = vouched[f.id] || f.vouched;
              return (
                <FriendRow
                  key={f.id}
                  f={f}
                  open={isOpen}
                  vouched={!!isVouched}
                  onToggle={() => setOpenRow(isOpen ? null : f.id)}
                  onVouch={() => onVouch(f.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FriendRow
// ---------------------------------------------------------------------------
const LISTING_NAMES: Record<string, string> = {
  anjali_khullar: "Brand Ambassador - Bloom Nutrition",
  ashmeet_cpfs: "Gym Content Creator - Celsius",
  mai_mostafa: "Wellness Creator - Alo Moves",
  siddhant_w: "Campus Rep - Ghost Energy",
  samir_ahuja: "Tech Creator - Notion",
  adarsh_k: "Strength Creator - Gymshark",
  aditya_mahna: "Lifestyle Creator - MVMT Watches",
  ahan_mishra: "STEM Humor - Brilliant.org",
  ahmed_ismail: "Fitness Creator - Whoop",
  aman_desai: "Foodie Creator - DoorDash Campus",
  bella_kim: "Pilates Creator - Lululemon",
  carlos_mendez: "Fitness Creator - Huel",
  daniela_lopez: "Women's Fitness - Fabletics",
  ethan_chu: "Gym Comedy - Gymshark",
  felix_hernandez: "Outdoor Creator - REI Co-op",
  grace_park: "Pilates Creator - Alo Yoga",
  hayden_lin: "Strength Creator - MyFitnessPal",
  isabel_garcia: "Wellness Creator - Sakara Life",
  jae_park: "Dance Fitness - Nike Training",
  kara_dwyer: "Pilates Lifestyle - Bandier",
  leo_zhang: "Comedy Fitness - Muscle Milk",
  maria_rivera: "Wellness Creator - Thrive Market",
  nathan_wong: "Physique Creator - Optimum Nutrition",
  olivia_ramirez: "Women's Fitness - Athleta",
  priya_iyer: "Yoga Creator - Manduka",
};

function FriendRow({
  f,
  open,
  vouched,
  onToggle,
  onVouch,
}: {
  f: (typeof FRIENDS)[number];
  open: boolean;
  vouched: boolean;
  onToggle: () => void;
  onVouch: () => void;
}) {
  const [introd, setIntrod] = useState(false);
  const listing = LISTING_NAMES[f.id] ?? "Compliance Officer";
  const subPay = fmtCurrency(Math.round(f.potential * 0.55));
  const lastActivity = useMemo(() => {
    // Pseudo-random activity date seeded from id length
    const days = (f.id.length % 7) + 1;
    const d = new Date("2026-04-26");
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [f.id]);

  return (
    <>
      <tr>
        <td>
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-left"
            data-test-id={`friend-${f.id}`}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <Avatar name={f.name} size={28} />
            <span>
              <div className="text-[14px] font-medium">{f.name}</div>
              <div className="text-[11px] text-[var(--fg-muted)]">
                {f.handle_tiktok} · {fmtFollowers(f.followers)} · {f.niche}
              </div>
            </span>
          </button>
        </td>
        <td className="text-[13px]">{f.matches} listing{f.matches === 1 ? "" : "s"}</td>
        <td className="text-[13px] text-[var(--fg-muted)]">{lastActivity}</td>
        <td className="text-right font-medium">{fmtCurrency(f.potential)}</td>
        <td>
          <div className="flex items-center gap-1.5">
            {f.reach_via.includes("tiktok") && (
              <span
                title="TikTok"
                className="grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-hover)] text-[12px] font-bold leading-none"
                style={{ fontFamily: "monospace" }}
              >
                TT
              </span>
            )}
            {f.reach_via.includes("instagram") && (
              <span
                title="Instagram"
                className="grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-hover)] text-[12px] font-bold leading-none"
                style={{ fontFamily: "monospace" }}
              >
                IG
              </span>
            )}
          </div>
        </td>
        <td>
          {vouched ? (
            <span className="pill pill-success text-[11px]">Vouched</span>
          ) : (
            <button
              onClick={onVouch}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)]"
            >
              Vouch
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="!bg-[var(--bg-elev)] !p-4">
            <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--bg)] px-4 py-3">
              <div>
                <div className="text-[13px] font-medium">{listing}</div>
                <div className="text-[11px] text-[var(--fg-muted)]">
                  Estimated payout {subPay} - {f.niche} fits the brief.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIntrod(true)}
                  data-test-id={`intro-${f.id}`}
                  className={introd ? "btn-outline text-[13px]" : "btn-primary flex items-center gap-1 text-[13px]"}
                  style={{ padding: "6px 14px" }}
                >
                  {introd ? (
                    "Intro sent"
                  ) : (
                    <>
                      <Sparkles size={12} /> Intro
                    </>
                  )}
                </button>
                <a
                  href={`https://tiktok.com/${f.handle_tiktok}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
                >
                  <ExternalLink size={11} className="inline" /> view
                </a>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Referrals Tab
// ---------------------------------------------------------------------------
interface ReferralsTabProps {
  extraCount: number; // vouches added during this session
}

function ReferralsTab({ extraCount }: ReferralsTabProps) {
  const [period, setPeriod] = useState<"ALL" | "1D" | "3D" | "7D">("ALL");

  const buckets = FUNNEL_BUCKETS.map((b) =>
    b.label === "Application Started" ? { ...b, count: b.count + extraCount } : b,
  );

  return (
    <div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] text-[var(--fg-muted)]">
          Track your referral earnings and progress.
        </p>
        <div className="flex items-center gap-2">
          <button className="text-[12px] font-medium text-[var(--accent)] hover:underline">
            What&apos;s new
          </button>
          <button className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]">
            Share <ChevronDown size={12} />
          </button>
          <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
            {(["ALL", "1D", "3D", "7D"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-[12px] transition-colors ${period === p ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "hover:bg-[var(--bg-hover)]"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel KPI row */}
      <div className="mt-5 grid grid-cols-6 gap-2">
        {buckets.map((b) => (
          <div
            key={b.label}
            className={`rounded-[var(--radius-md)] border p-3 text-center transition-colors ${b.active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--bg-card)]"}`}
            style={b.active ? { borderBottomWidth: "2px" } : undefined}
          >
            <div
              className="label-cap truncate"
              style={b.active ? { color: "var(--accent)" } : undefined}
            >
              {b.label}
            </div>
            <div
              className={`mt-1 text-[22px] font-bold ${b.active ? "text-[var(--accent)]" : ""}`}
            >
              {b.count}
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-[12px] text-[var(--accent)]">
          <Sparkles size={11} /> Status: Application Started <ChevronDown size={11} />
        </button>
        <button className="flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]">
          Listings <ChevronDown size={11} />
        </button>
        <button className="flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]">
          <Bell size={11} /> Bulk Reminder
        </button>
        <input
          placeholder="Search by name or email…"
          className="w-[220px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
        />
        <span className="ml-auto text-[12px] text-[var(--fg-muted)]">
          1-{1 + extraCount} of {1 + extraCount}
        </span>
      </div>

      {/* Table */}
      <div className="mt-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
        <table className="dt-table">
          <thead>
            <tr>
              <th>Referee</th>
              <th>Applications</th>
              <th>Last Activity</th>
              <th>Potential Earnings</th>
              <th>Know them well?</th>
              <th>Reminder</th>
            </tr>
          </thead>
          <tbody>
            {/* Seed row */}
            <tr>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar name="Ishan Dave" size={28} />
                  <span className="text-[14px] font-medium">Ishan Dave</span>
                </div>
              </td>
              <td className="text-[13px]">1 application</td>
              <td className="text-[13px] text-[var(--fg-muted)]">Apr 26, 2026, 2:38 AM</td>
              <td className="font-medium">$400</td>
              <td>
                <span className="pill pill-success text-[11px]">Vouched</span>
              </td>
              <td>
                <button className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
                  <Bell size={14} />
                </button>
              </td>
            </tr>
            {/* Extra rows from vouch actions */}
            {Array.from({ length: extraCount }).map((_, i) => {
              const f = FRIENDS[i % FRIENDS.length];
              return (
                <tr key={`extra-${i}`}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} size={28} />
                      <span className="text-[14px] font-medium">{f.name}</span>
                    </div>
                  </td>
                  <td className="text-[13px]">1 application</td>
                  <td className="text-[13px] text-[var(--fg-muted)]">Apr 26, 2026, 3:12 AM</td>
                  <td className="font-medium">{fmtCurrency(f.potential)}</td>
                  <td>
                    <span className="pill pill-success text-[11px]">Vouched</span>
                  </td>
                  <td>
                    <button className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
                      <Bell size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
export default function ReferralsPage() {
  const [tab, setTab] = useState<Tab>("connections");
  const [vouchingFor, setVouchingFor] = useState<{ id: string; name: string } | null>(null);
  const [vouched, setVouched] = useState<VouchedState>({});
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastCounter = useRef(0);

  // Number of new vouches for referrals tab counter
  const newVouchCount = Object.keys(vouched).length;

  const showToast = useCallback((text: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleVouchStart = useCallback(
    (id: string) => {
      const friend = FRIENDS.find((f) => f.id === id);
      if (!friend) return;
      setVouchingFor({ id, name: friend.name });
    },
    [],
  );

  const handleVouchComplete = useCallback(() => {
    if (!vouchingFor) return;
    setVouched((prev) => ({ ...prev, [vouchingFor.id]: true }));
    showToast(`Vouch submitted for ${vouchingFor.name}`);
    setVouchingFor(null);
  }, [vouchingFor, showToast]);

  return (
    <>
      <ToastContainer messages={toasts} />

      {vouchingFor && (
        <VouchModal
          name={vouchingFor.name}
          onClose={() => setVouchingFor(null)}
          onVouched={handleVouchComplete}
        />
      )}

      <div>
        {/* Page header */}
        <div className="flex items-center gap-2">
          <h1 className="h-display text-[28px]">Referrals</h1>
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[var(--border)] text-[var(--fg-muted)]">
            <HelpCircle size={12} />
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-6 border-b border-[var(--border)]">
          <button
            onClick={() => setTab("connections")}
            className={`pb-3 text-[14px] transition-colors ${tab === "connections" ? "border-b-2 border-[var(--accent)] font-semibold text-[var(--accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            data-test-id="tab-connections"
          >
            My connections ({FRIENDS_TOTAL_POOL})
          </button>
          <button
            onClick={() => setTab("referrals")}
            className={`pb-3 text-[14px] transition-colors ${tab === "referrals" ? "border-b-2 border-[var(--accent)] font-semibold text-[var(--accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
            data-test-id="tab-referrals"
          >
            My referrals ({1 + newVouchCount})
          </button>
          <span className="ml-auto pb-3 text-[13px] text-[var(--fg-muted)]">
            1/100 referrals today
          </span>
        </div>

        {tab === "connections" ? (
          <ConnectionsTab vouched={vouched} onVouch={handleVouchStart} />
        ) : (
          <ReferralsTab extraCount={newVouchCount} />
        )}
      </div>
    </>
  );
}
