"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { CREATORS } from "@/lib/data/creators";
import { fmtCurrency } from "@/lib/util/score";

const WEEKS = ["Feb 23", "Mar 2", "Mar 9", "Mar 16", "Mar 23", "Mar 30", "Apr 6", "Apr 13", "Apr 20", "Apr 27"];

function gmvSeries(tick: number) {
  const base = [3200, 4100, 5800, 7400, 9100, 11200, 13400, 16800, 21900, 24300];
  return WEEKS.map((w, i) => ({
    week: w,
    gmv: i === base.length - 1 ? base[i] + Math.floor(Math.sin(tick / 4) * 600) : base[i],
  }));
}

function onboardingSeries() {
  const base = [1, 1, 2, 2, 3, 3, 4, 5, 7, 8];
  return WEEKS.map((w, i) => ({ week: w, creators: base[i] }));
}

function relevanceSeries(tick: number) {
  const base = [18, 21, 24, 26, 29, 31, 34, 37, 40, 43];
  return WEEKS.map((w, i) => ({
    week: w,
    relevance: i === base.length - 1 ? base[i] + Math.round(Math.cos(tick / 5) * 1.4) : base[i],
  }));
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="text-[13px] font-semibold tracking-tight text-[var(--fg)]">{title}</div>
      <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{sub}</div>
      <div className="mt-4 h-[180px] w-full">{children}</div>
    </div>
  );
}

type ChartTooltipProps = TooltipProps<number, string> & {
  formatter: (v: number) => string;
};

function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value ?? 0;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] shadow-[var(--shadow-card)]">
      <div className="font-medium text-[var(--fg)]">{label}</div>
      <div className="text-[var(--accent)]">{formatter(value)}</div>
    </div>
  );
}

type KpiId = "brand_voice_fit" | "comment_relevance" | "audience_overlap" | "auto_draft_queue";

type KpiTarget = { kpiId: KpiId; delta: number };

type KpiSpec = {
  id: KpiId;
  label: string;
  sub: (tot: number) => string;
  source: string;
  base: number;
  format: (v: number) => string;
  formatDelta: (d: number) => string;
  spark: number[];
  sparkColor: string;
};

type KpiData = {
  label: string;
  value: string;
  sub: string;
  source: string;
};

type ActionItem = {
  id: string;
  priority: "high" | "med" | "low";
  text: string;
  href: string;
  cta: string;
  kpiTargets: KpiTarget[];
  kpiTagLabel: string; // short label rendered as a chip ("Auto-draft queue −4")
  custom?: boolean;
};

const KPI_LABELS: Record<KpiId, string> = {
  brand_voice_fit: "Brand-voice fit",
  comment_relevance: "Comment-relevance",
  audience_overlap: "Audience overlap",
  auto_draft_queue: "Auto-draft queue",
};

const SEED_ACTION_ITEMS: ActionItem[] = [
  {
    id: "a1",
    priority: "high",
    text: "Approve 4 Haiku-drafted opener messages — Sam Sulek, JoelBergs, Marques Brownlee, Antonie Lokhorst",
    href: "/admin/outreach",
    cta: "Review →",
    kpiTargets: [{ kpiId: "auto_draft_queue", delta: -4 }],
    kpiTagLabel: "Auto-draft queue −4",
  },
  {
    id: "a2",
    priority: "high",
    text: "Greenlight Bucked Up × Sam Sulek at $1,654 base + bonus — both sides locked",
    href: "/admin/outreach",
    cta: "Sign →",
    kpiTargets: [{ kpiId: "auto_draft_queue", delta: -1 }],
    kpiTagLabel: "Auto-draft queue −1",
  },
  {
    id: "a3",
    priority: "high",
    text: "Counter Cooper Brunner's $1,050 ask on Bloom — vector-fit only justifies $850",
    href: "/admin/outreach",
    cta: "Counter →",
    kpiTargets: [
      { kpiId: "auto_draft_queue", delta: -1 },
      { kpiId: "brand_voice_fit", delta: 0.002 },
    ],
    kpiTagLabel: "Auto-draft queue −1 · Brand-voice fit +0.002",
  },
  {
    id: "a4",
    priority: "med",
    text: "Gymshark just published 3 new TikTok ads — RAG matched 12 candidates",
    href: "/admin/creators?brand=gymshark",
    cta: "Match →",
    kpiTargets: [
      { kpiId: "audience_overlap", delta: 0.02 },
      { kpiId: "auto_draft_queue", delta: 12 },
    ],
    kpiTagLabel: "Audience overlap +0.02 · Auto-draft queue +12",
  },
  {
    id: "a5",
    priority: "med",
    text: "Comment-relevance for celsius-college-q2 climbed to 41% — share with Celsius BD",
    href: "/admin/campaigns/celsius-college-q2",
    cta: "Open →",
    kpiTargets: [{ kpiId: "comment_relevance", delta: 1 }],
    kpiTagLabel: "Comment-relevance +1%",
  },
  {
    id: "a6",
    priority: "med",
    text: "Re-scrape @loganmann32, @stefanaavara, @jenny_kndd — last refresh 6h+ ago",
    href: "/admin/creators",
    cta: "Refresh →",
    kpiTargets: [{ kpiId: "brand_voice_fit", delta: 0.005 }],
    kpiTagLabel: "Brand-voice fit +0.005",
  },
  {
    id: "a7",
    priority: "low",
    text: "Index 8 new tech creators (MKBHD, Mrwhosetheboss, CarterPCs…) into the brand-fit vector store",
    href: "/admin/creators",
    cta: "Index →",
    kpiTargets: [
      { kpiId: "brand_voice_fit", delta: 0.012 },
      { kpiId: "audience_overlap", delta: 0.02 },
    ],
    kpiTagLabel: "Brand-voice fit +0.012 · Audience overlap +0.02",
  },
];

const STORAGE_KEY = "mercor.admin.actions.v1";

type StoredState = {
  doneIds: string[];
  customItems: ActionItem[];
};

const VALID_KPI_IDS: ReadonlySet<KpiId> = new Set([
  "brand_voice_fit",
  "comment_relevance",
  "audience_overlap",
  "auto_draft_queue",
]);
const VALID_PRIORITIES: ReadonlySet<ActionItem["priority"]> = new Set(["high", "med", "low"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function sanitizeActionItem(v: unknown): ActionItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.text !== "string") return null;
  if (!VALID_PRIORITIES.has(v.priority as ActionItem["priority"])) return null;
  if (!Array.isArray(v.kpiTargets)) return null;
  const kpiTargets = v.kpiTargets
    .filter((t): t is Record<string, unknown> => isRecord(t))
    .filter(
      (t): t is KpiTarget =>
        VALID_KPI_IDS.has(t.kpiId as KpiId) && typeof t.delta === "number" && Number.isFinite(t.delta),
    );
  return {
    id: v.id,
    text: v.text,
    priority: v.priority as ActionItem["priority"],
    kpiTargets,
    kpiTagLabel: typeof v.kpiTagLabel === "string" ? v.kpiTagLabel : "",
    href: typeof v.href === "string" ? v.href : "/admin",
    cta: typeof v.cta === "string" ? v.cta : "Open →",
    custom: true,
  };
}

function loadState(): StoredState {
  if (typeof window === "undefined") return { doneIds: [], customItems: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { doneIds: [], customItems: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { doneIds: [], customItems: [] };
    return {
      doneIds: Array.isArray(parsed.doneIds)
        ? parsed.doneIds.filter((x): x is string => typeof x === "string")
        : [],
      customItems: Array.isArray(parsed.customItems)
        ? parsed.customItems.map(sanitizeActionItem).filter((x): x is ActionItem => x !== null)
        : [],
    };
  } catch {
    return { doneIds: [], customItems: [] };
  }
}

function saveState(s: StoredState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 22;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({
  kpi,
  spark,
  sparkColor,
  delta,
  formatDelta,
}: {
  kpi: KpiData;
  spark: number[];
  sparkColor: string;
  delta: number;
  formatDelta: (d: number) => string;
}) {
  const showDelta = Math.abs(delta) > 1e-9;
  const positive = delta > 0;
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start justify-between">
        <div className="label-cap">{kpi.label}</div>
        <Sparkline data={spark} color={sparkColor} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[24px] font-semibold tracking-tight">{kpi.value}</div>
        {showDelta ? (
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
            style={{
              background: positive ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)",
              color: positive ? "#16a34a" : "#dc2626",
            }}
            title="Live delta from completed action items"
          >
            {formatDelta(delta)}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{kpi.sub}</div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{kpi.source}</div>
    </div>
  );
}

function PriorityDot({ p }: { p: "high" | "med" | "low" }) {
  const c = p === "high" ? "#dc2626" : p === "med" ? "#f59e0b" : "#9ca3af";
  return <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c }} aria-label={`${p} priority`} />;
}

function AddActionForm({ onAdd }: { onAdd: (item: ActionItem) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"high" | "med" | "low">("med");
  const [kpiId, setKpiId] = useState<KpiId | "">("auto_draft_queue");
  const [delta, setDelta] = useState("1");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-[12px] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]"
        data-test-id="action-add-trigger"
      >
        + Add action
      </button>
    );
  }

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const numDelta = Number.parseFloat(delta);
    const targets: KpiTarget[] = [];
    if (kpiId !== "" && Number.isFinite(numDelta) && numDelta !== 0) {
      targets.push({ kpiId, delta: numDelta });
    }
    const tagLabel =
      targets.length > 0
        ? `${KPI_LABELS[kpiId as KpiId]} ${numDelta >= 0 ? "+" : ""}${numDelta}`
        : "No KPI link";
    onAdd({
      id: `custom-${Date.now()}`,
      priority,
      text: trimmed,
      href: "/admin",
      cta: "Open →",
      kpiTargets: targets,
      kpiTagLabel: tagLabel,
      custom: true,
    });
    setText("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as "high" | "med" | "low")}
        className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[12px]"
        aria-label="Priority"
      >
        <option value="high">High</option>
        <option value="med">Med</option>
        <option value="low">Low</option>
      </select>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Action description…"
        className="min-w-[280px] flex-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[12px] outline-none focus:border-[var(--accent)]"
      />
      <select
        value={kpiId}
        onChange={(e) => setKpiId(e.target.value as KpiId | "")}
        className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[12px]"
        aria-label="KPI target"
      >
        <option value="">No KPI link</option>
        <option value="brand_voice_fit">Brand-voice fit</option>
        <option value="comment_relevance">Comment-relevance</option>
        <option value="audience_overlap">Audience overlap</option>
        <option value="auto_draft_queue">Auto-draft queue</option>
      </select>
      <input
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        placeholder="Δ"
        className="w-[64px] rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-[12px] tabular-nums outline-none focus:border-[var(--accent)]"
        aria-label="Delta to apply when done"
      />
      <button type="button" onClick={submit} className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[var(--accent-hover)]">
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
        cancel
      </button>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [tick, setTick] = useState(0);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<ActionItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadState();
    setDoneIds(new Set(s.doneIds));
    setCustomItems(s.customItems);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ doneIds: [...doneIds], customItems });
  }, [doneIds, customItems, hydrated]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 4000);
    return () => window.clearInterval(id);
  }, []);

  const items = useMemo(() => [...SEED_ACTION_ITEMS, ...customItems], [customItems]);

  const totalDelta = useMemo(() => {
    const acc: Record<KpiId, number> = {
      brand_voice_fit: 0,
      comment_relevance: 0,
      audience_overlap: 0,
      auto_draft_queue: 0,
    };
    for (const it of items) {
      if (!doneIds.has(it.id)) continue;
      for (const t of it.kpiTargets) acc[t.kpiId] += t.delta;
    }
    return acc;
  }, [items, doneIds]);

  const gmv = useMemo(() => gmvSeries(tick), [tick]);
  const onboarding = useMemo(() => onboardingSeries(), []);
  const relevance = useMemo(() => relevanceSeries(tick), [tick]);

  const latestGmv = gmv[gmv.length - 1].gmv;
  const latestRel = relevance[relevance.length - 1].relevance;
  const onboardedTotal = onboarding.reduce((s, x) => s + x.creators, 0);

  const remainingActions = items.filter((a) => !doneIds.has(a.id));
  const totalActions = items.length;

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const totalCreators = CREATORS.length;
  const brandFitDrift = Math.cos(tick / 6) * 0.005;

  const kpiCards = useMemo(() => {
    const queueDelta = totalDelta.auto_draft_queue;
    const fitDelta = totalDelta.brand_voice_fit;
    const relDelta = totalDelta.comment_relevance;
    const overlapDelta = totalDelta.audience_overlap;
    return [
      {
        id: "brand_voice_fit" as KpiId,
        kpi: {
          label: KPI_LABELS.brand_voice_fit,
          value: (0.872 + brandFitDrift + fitDelta).toFixed(3),
          sub: `Avg cosine sim · top-${totalCreators} creators × 17 active briefs`,
          source: "pgvector · 1536-d embeddings",
        },
        spark: [0.81, 0.82, 0.84, 0.83, 0.85, 0.86, 0.87, 0.86, 0.87, 0.872 + fitDelta],
        sparkColor: "var(--accent)",
        delta: fitDelta,
        formatDelta: (d: number) => `${d >= 0 ? "+" : ""}${d.toFixed(3)}`,
      },
      {
        id: "comment_relevance" as KpiId,
        kpi: {
          label: KPI_LABELS.comment_relevance,
          value: `${latestRel + relDelta}%`,
          sub: "RAG-grounded payout fairness across active campaigns",
          source: "scraped comments · re-embedded hourly",
        },
        spark: [18, 21, 24, 26, 29, 31, 34, 37, 40, latestRel + relDelta],
        sparkColor: "#16a34a",
        delta: relDelta,
        formatDelta: (d: number) => `${d >= 0 ? "+" : ""}${d}%`,
      },
      {
        id: "audience_overlap" as KpiId,
        kpi: {
          label: KPI_LABELS.audience_overlap,
          value: (0.74 + overlapDelta).toFixed(2),
          sub: "New creator hashtags × live brand ad themes",
          source: "TikTok scrape · top-30 hashtags / creator",
        },
        spark: [0.58, 0.61, 0.63, 0.65, 0.67, 0.69, 0.71, 0.72, 0.73, 0.74 + overlapDelta],
        sparkColor: "#7857ff",
        delta: overlapDelta,
        formatDelta: (d: number) => `${d >= 0 ? "+" : ""}${d.toFixed(2)}`,
      },
      {
        id: "auto_draft_queue" as KpiId,
        kpi: {
          label: KPI_LABELS.auto_draft_queue,
          value: `${Math.max(0, 12 + queueDelta)}`,
          sub: "Haiku-drafted messages awaiting your approval",
          source: "Claude Haiku · zero-shot brief → outreach",
        },
        spark: [4, 5, 7, 6, 8, 9, 10, 11, 11, Math.max(0, 12 + queueDelta)],
        sparkColor: "#f59e0b",
        delta: queueDelta,
        formatDelta: (d: number) => `${d >= 0 ? "+" : ""}${d}`,
      },
    ];
  }, [totalDelta, brandFitDrift, latestRel, totalCreators]);

  const toggleDone = (id: string) => {
    setDoneIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustom = (item: ActionItem) => {
    setCustomItems((cur) => [...cur, item]);
  };

  const deleteCustom = (id: string) => {
    setCustomItems((cur) => cur.filter((x) => x.id !== id));
    setDoneIds((cur) => {
      const next = new Set(cur);
      next.delete(id);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Creators &amp; Influencers - Strategic Operations</h1>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4" data-test-id="admin-kpi-grid">
        {kpiCards.map((k) => (
          <KPICard
            key={k.id}
            kpi={k.kpi}
            spark={k.spark}
            sparkColor={k.sparkColor}
            delta={k.delta}
            formatDelta={k.formatDelta}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <ChartCard title="Weekly revenue" sub={`Latest week ${fmtCurrency(latestGmv)} · 10-week trend`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gmv} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip<number, string> content={(props) => <ChartTooltip {...props} formatter={(v) => fmtCurrency(v)} />} cursor={{ fill: "var(--bg-hover)" }} />
              <Bar dataKey="gmv" fill="var(--accent)" radius={[4, 4, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New creators onboarded" sub={`${onboardedTotal} onboarded over 10 weeks · ramping`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={onboarding} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip<number, string> content={(props) => <ChartTooltip {...props} formatter={(v) => `${v} new creators`} />} cursor={{ fill: "var(--bg-hover)" }} />
              <Bar dataKey="creators" fill="#16a34a" radius={[4, 4, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comment relevance" sub={`Latest ${latestRel + totalDelta.comment_relevance}% · the metric that grounds payouts`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={relevance} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="relevanceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 10, fill: "var(--fg-muted)" }} tickLine={false} axisLine={false} width={32} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip<number, string> content={(props) => <ChartTooltip {...props} formatter={(v) => `${v}%`} />} cursor={{ stroke: "var(--accent)", strokeDasharray: "3 3" }} />
              <Area dataKey="relevance" stroke="var(--accent)" strokeWidth={2} fill="url(#relevanceFill)" animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">Today's action items</h2>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{todayLabel} · {remainingActions.length} of {totalActions} remaining · checking off applies the linked KPI delta live</div>
          </div>
          <AddActionForm onAdd={addCustom} />
        </div>

        <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)]" data-test-id="admin-action-list">
          {items.map((a) => {
            const done = doneIds.has(a.id);
            return (
              <li
                key={a.id}
                className={`flex items-start gap-3 p-4 transition-opacity ${done ? "opacity-40" : ""}`}
                data-test-id={`admin-action-${a.id}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDone(a.id)}
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[var(--border-strong)] hover:border-[var(--accent)]"
                  aria-label={done ? "mark not done" : "mark done"}
                >
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2.5 6.5 5 9 9.5 3.5" />
                    </svg>
                  ) : null}
                </button>
                <PriorityDot p={a.priority} />
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] leading-snug ${done ? "line-through" : ""}`}>{a.text}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                    <span
                      className="rounded-full border border-[var(--border)] px-2 py-0.5"
                      title={a.kpiTargets.length ? "KPI deltas applied when done" : "No KPI link"}
                    >
                      {a.kpiTagLabel}
                    </span>
                    {a.custom ? (
                      <button
                        type="button"
                        onClick={() => deleteCustom(a.id)}
                        className="rounded-full border border-[var(--border)] px-2 py-0.5 hover:border-[#dc2626] hover:text-[#dc2626]"
                        aria-label="Delete custom action"
                      >
                        delete
                      </button>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={a.href}
                  className="shrink-0 rounded-md border border-[var(--border)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)]"
                >
                  {a.cta}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
