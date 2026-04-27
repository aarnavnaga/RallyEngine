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

type KPIData = {
  label: string;
  value: string;
  sub: string;
  source: string;
};

const INSIGHTS: { tag: string; text: string; href: string }[] = [
  { tag: "Vector match", text: "Marques Brownlee × Cursor scored 0.93 cosine on dev-tool brief — top match this week.", href: "/admin/creators" },
  { tag: "Scrape signal", text: "Gymshark posted 3 new TikTok ads in the last 2 hours — auto-matched 12 candidates.", href: "/admin/creators" },
  { tag: "Pricing flag", text: "celsius-college-q2 hit 41% comment-relevance — payouts trigger above 35% floor.", href: "/admin/campaigns/celsius-college-q2" },
  { tag: "Pipeline", text: "8 new creators onboarded this week — fastest 7-day intake since Feb.", href: "/admin/creators" },
  { tag: "Negotiation", text: "Cooper Brunner asked $1,050 on Bloom but vector fit only justifies $850 — counter recommended.", href: "/admin/outreach" },
  { tag: "RAG", text: "Average brand-voice fit drifted up 0.012 to 0.872 across all active briefs in the last 24h.", href: "/admin/creators" },
];

type ActionItem = {
  id: string;
  priority: "high" | "med" | "low";
  text: string;
  href: string;
  cta: string;
};

const ACTION_ITEMS: ActionItem[] = [
  {
    id: "a1",
    priority: "high",
    text: "Approve 4 Haiku-drafted opener messages — Sam Sulek, JoelBergs, Marques Brownlee, Antonie Lokhorst",
    href: "/admin/outreach",
    cta: "Review →",
  },
  {
    id: "a2",
    priority: "high",
    text: "Greenlight Bucked Up × Sam Sulek at $1,654 base + bonus — both sides locked",
    href: "/admin/outreach",
    cta: "Sign →",
  },
  {
    id: "a3",
    priority: "high",
    text: "Counter Cooper Brunner's $1,050 ask on Bloom — vector-fit only justifies $850",
    href: "/admin/outreach",
    cta: "Counter →",
  },
  {
    id: "a4",
    priority: "med",
    text: "Gymshark just published 3 new TikTok ads — RAG matched 12 candidates",
    href: "/admin/creators?brand=gymshark",
    cta: "Match →",
  },
  {
    id: "a5",
    priority: "med",
    text: "Comment-relevance for celsius-college-q2 climbed to 41% — share with Celsius BD",
    href: "/admin/campaigns/celsius-college-q2",
    cta: "Open →",
  },
  {
    id: "a6",
    priority: "med",
    text: "Re-scrape @loganmann32, @stefanaavara, @jenny_kndd — last refresh 6h+ ago",
    href: "/admin/creators",
    cta: "Refresh →",
  },
  {
    id: "a7",
    priority: "low",
    text: "Index 8 new tech creators (MKBHD, Mrwhosetheboss, CarterPCs…) into the brand-fit vector store",
    href: "/admin/creators",
    cta: "Index →",
  },
];

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

function KPICard({ kpi, spark, sparkColor }: { kpi: KPIData; spark: number[]; sparkColor: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start justify-between">
        <div className="label-cap">{kpi.label}</div>
        <Sparkline data={spark} color={sparkColor} />
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight">{kpi.value}</div>
      <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{kpi.sub}</div>
      <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{kpi.source}</div>
    </div>
  );
}

function PriorityDot({ p }: { p: "high" | "med" | "low" }) {
  const c = p === "high" ? "#dc2626" : p === "med" ? "#f59e0b" : "#9ca3af";
  return <span className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c }} aria-label={`${p} priority`} />;
}

export default function AdminOverviewPage() {
  const [tick, setTick] = useState(0);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 4000);
    return () => window.clearInterval(id);
  }, []);

  const gmv = useMemo(() => gmvSeries(tick), [tick]);
  const onboarding = useMemo(() => onboardingSeries(), []);
  const relevance = useMemo(() => relevanceSeries(tick), [tick]);

  const latestGmv = gmv[gmv.length - 1].gmv;
  const latestRel = relevance[relevance.length - 1].relevance;
  const onboardedTotal = onboarding.reduce((s, x) => s + x.creators, 0);

  const remainingActions = ACTION_ITEMS.filter((a) => !doneIds.has(a.id));
  const totalActions = ACTION_ITEMS.length;

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  // Unique vector/RAG/scrape-derived KPIs with sparkline history
  const totalCreators = CREATORS.length;
  const brandFitDrift = (Math.cos(tick / 6) * 0.005);
  const kpis: { kpi: KPIData; spark: number[]; sparkColor: string }[] = [
    {
      kpi: {
        label: "Brand-voice fit",
        value: `${(0.872 + brandFitDrift).toFixed(3)}`,
        sub: `Avg cosine sim · top-${totalCreators} creators × 17 active briefs`,
        source: "pgvector · 1536-d embeddings",
      },
      spark: [0.81, 0.82, 0.84, 0.83, 0.85, 0.86, 0.87, 0.86, 0.87, 0.872],
      sparkColor: "var(--accent)",
    },
    {
      kpi: {
        label: "Comment-relevance",
        value: `${latestRel}%`,
        sub: `RAG-grounded payout fairness across active campaigns`,
        source: "scraped comments · re-embedded hourly",
      },
      spark: [18, 21, 24, 26, 29, 31, 34, 37, 40, latestRel],
      sparkColor: "#16a34a",
    },
    {
      kpi: {
        label: "Audience overlap",
        value: "0.74",
        sub: `New creator hashtags × live brand ad themes`,
        source: "TikTok scrape · top-30 hashtags / creator",
      },
      spark: [0.58, 0.61, 0.63, 0.65, 0.67, 0.69, 0.71, 0.72, 0.73, 0.74],
      sparkColor: "#7857ff",
    },
    {
      kpi: {
        label: "Auto-draft queue",
        value: "12",
        sub: `Haiku-drafted messages awaiting your approval`,
        source: "Claude Haiku · zero-shot brief → outreach",
      },
      spark: [4, 5, 7, 6, 8, 9, 10, 11, 11, 12],
      sparkColor: "#f59e0b",
    },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Creators &amp; Influencers - Strategic Operations</h1>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        {kpis.map((k, i) => (
          <KPICard key={i} kpi={k.kpi} spark={k.spark} sparkColor={k.sparkColor} />
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

        <ChartCard title="Comment relevance" sub={`Latest ${latestRel}% · the metric that grounds payouts`}>
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
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">Today's action items</h2>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{todayLabel} · {remainingActions.length} of {totalActions} remaining</div>
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">click to mark done</div>
        </div>

        <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)]">
          {ACTION_ITEMS.map((a) => {
            const done = doneIds.has(a.id);
            return (
              <li key={a.id} className={`flex items-start gap-3 p-4 transition-opacity ${done ? "opacity-40" : ""}`}>
                <button
                  type="button"
                  onClick={() =>
                    setDoneIds((cur) => {
                      const next = new Set(cur);
                      if (next.has(a.id)) next.delete(a.id);
                      else next.add(a.id);
                      return next;
                    })
                  }
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
