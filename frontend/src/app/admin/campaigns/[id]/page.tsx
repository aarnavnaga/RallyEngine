"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { CREATORS } from "@/lib/data/creators";
import { Avatar } from "@/components/shell/Avatar";
import { BrandMark } from "@/components/shell/BrandMark";
import {
  computeImpact,
  computeSuggestedPay,
  fmtCurrency,
  fmtFollowers,
  similarity,
} from "@/lib/util/score";
import { ClaudeMark } from "@/components/shell/ClaudeMark";

// ── Synthetic perf generator (deterministic from campaign id) ──────────────
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function genPerf(seed: string): { day: string; views: number; sales: number }[] {
  const h = hashSeed(seed);
  const base = 4000 + (h % 8000);
  const today = new Date(2026, 3, 26); // Apr 26 2026
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 13 + i);
    const noise = hashSeed(`${seed}-${i}`) % 3000;
    const views = base + noise + i * 200;
    const sales = Math.round(views * 0.003 + (hashSeed(`${seed}-s-${i}`) % 5));
    return {
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      views,
      sales,
    };
  });
}

// ── Live activity feed lines ───────────────────────────────────────────────
const ACTIVITY_TEMPLATES = [
  "Logan Mann posted to TikTok - 7.4K views in first 90 minutes.",
  "Noah Perlo's comment relevance score: 0.62",
  "Senada Greca: comment lands within Celsius brand voice",
  "Sales attributed to Bucked Up campaign: 12 today, $890",
  "Austin Hendrickson posted a new reel - 14.2K views in 3 hours.",
  "Bloom campaign comment relevance avg: 71%",
  "Jesse James West: 3 comments flagged as high-relevance by NLP.",
  "Ghost Energy: 4 new hires confirmed this week.",
];

// ── Counter animation hook ─────────────────────────────────────────────────
function useTickingCounter(target: number, intervalMs: number) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => v + Math.floor(Math.random() * 40 + 5));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return value;
}

// ── Status pill ────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cls =
    status === "live"
      ? "pill-success"
      : status === "paused"
      ? "pill-warning"
      : "";
  return <span className={`pill text-[11px] ${cls}`}>{status}</span>;
}

// ── Pricing table row ──────────────────────────────────────────────────────
function PricingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <tr>
      <td className="py-1 text-[var(--fg-muted)]">{label}</td>
      <td className="py-1 text-right tabular-nums">{value}</td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);

  const campaign = CAMPAIGNS_BY_ID[id];
  const brand = campaign ? BRANDS_BY_ID[campaign.brand_id] : null;

  // Derive top-5 creators by similarity to this campaign's brand.
  // `pin_first_for: [brand.id]` creators jump to the top regardless of cosine
  // (mirrors /admin/match — keeps the Logan x Celsius wow-moment reproducible).
  const top5 = React.useMemo(() => {
    if (!brand) return [];
    return CREATORS.map((c) => ({
      c,
      sim: similarity(c, brand),
      impact: computeImpact(c, brand),
    }))
      .sort((a, b) => {
        const aPinned = a.c.pin_first_for?.includes(brand.id) ? 1 : 0;
        const bPinned = b.c.pin_first_for?.includes(brand.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return b.sim - a.sim;
      })
      .slice(0, 5);
  }, [brand]);

  // Pricing breakdown for top-5
  const pricingRows = React.useMemo(() => {
    if (!brand) return [];
    return top5.map(({ c, impact }) => ({
      creator: c,
      pay: computeSuggestedPay(c, brand, impact),
    }));
  }, [brand, top5]);

  const pricingTotal = React.useMemo(
    () => pricingRows.reduce((acc, r) => acc + r.pay.recommended, 0),
    [pricingRows],
  );

  // Synthetic perf data
  const perfData = React.useMemo(() => (campaign ? genPerf(campaign.id) : []), [campaign]);

  // Avg comment relevance (cosine sim of fan comments to brand voice).
  // Locked to 38% for celsius-college-q2 to match the demo script; for every
  // other campaign we derive a stable value from the campaign id.
  const avgRelevance = React.useMemo(() => {
    if (id === "celsius-college-q2") return 38;
    if (!campaign) return 0;
    return 30 + (hashSeed(campaign.id) % 50);
  }, [id, campaign]);

  // Ticking counters
  const lastPerf = perfData[perfData.length - 1];
  const baseViews = lastPerf?.views ?? 50000;
  const views = useTickingCounter(baseViews, 3000 + Math.floor(Math.random() * 2000));
  const comments = useTickingCounter(Math.floor(baseViews * 0.04), 4200);
  const saves = useTickingCounter(Math.floor(baseViews * 0.025), 5100);
  const clickthroughs = useTickingCounter(Math.floor(baseViews * 0.018), 3700);
  const sales = useTickingCounter(campaign?.hires_this_month ? campaign.hires_this_month * 4 : 48, 4500);

  // Live activity feed
  const [activityFeed, setActivityFeed] = useState<string[]>(
    ACTIVITY_TEMPLATES.slice(0, 4),
  );
  const activityIdx = useRef(4);
  useEffect(() => {
    const min = 8000;
    const max = 12000;
    const schedule = () => {
      const delay = min + Math.floor(Math.random() * (max - min));
      return setTimeout(() => {
        const next = ACTIVITY_TEMPLATES[activityIdx.current % ACTIVITY_TEMPLATES.length];
        activityIdx.current += 1;
        setActivityFeed((prev) => [next, ...prev.slice(0, 3)]);
        schedule();
      }, delay);
    };
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  // Pause toggle
  const [paused, setPaused] = useState(false);

  if (!campaign || !brand) {
    return (
      <div className="text-[13px] text-[var(--fg-muted)]">
        Campaign not found.{" "}
        <Link href="/admin/campaigns" className="text-[var(--accent)] hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-1 flex items-center gap-2">
        <BrandMark brand={brand} size={20} />
        <span className="text-[12px] text-[var(--fg-muted)]">{brand.name}</span>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h-display text-[26px]">{campaign.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={paused ? "paused" : "live"} />
            <button
              onClick={() => setPaused((p) => !p)}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)]"
              data-test-id="campaign-pause-toggle"
            >
              {paused ? "Resume campaign" : "Pause campaign"}
            </button>
          </div>
        </div>
        <Link
          href="/admin/campaigns"
          className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:underline"
        >
          ← All campaigns
        </Link>
      </div>

      {/* Two-column layout */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── LEFT MAIN ── */}
        <div className="space-y-6">

          {/* Brief card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="label-cap">Campaign brief</div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
              {campaign.brief}
            </p>
            <div className="mt-4">
              <div className="label-cap">Deliverables</div>
              <ul className="mt-1 space-y-1 text-[12px] text-[var(--fg-muted)]">
                {campaign.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[var(--accent)]">·</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Live performance card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="label-cap">Live performance</div>

            {/* Big number row */}
            <div className="mt-3 grid grid-cols-5 gap-3">
              {(
                [
                  ["Views", views, "campaign-views-counter"],
                  ["Comments", comments, null],
                  ["Saves", saves, null],
                  ["Click-throughs", clickthroughs, null],
                  ["Sales", sales, null],
                ] as [string, number, string | null][]
              ).map(([label, val, testId]) => (
                <div key={label} className="text-center">
                  <div
                    className="text-[20px] font-semibold tabular-nums tracking-tight"
                    {...(testId ? { "data-test-id": testId } : {})}
                  >
                    {val.toLocaleString()}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{label}</div>
                </div>
              ))}
            </div>

            {/* 14-day line chart */}
            <div className="mt-5 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perfData}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    yAxisId="views"
                    tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    yAxisId="sales"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Line
                    yAxisId="views"
                    type="monotone"
                    dataKey="views"
                    name="Views"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="sales"
                    type="monotone"
                    dataKey="sales"
                    name="Sales"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-3">
              <div>
                <div className="label-cap">Avg comment relevance</div>
                <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
                  Cosine similarity of fan comments to brand voice. Drives the relevant_eyes payout term.
                </p>
              </div>
              <div className="text-[20px] font-semibold tracking-tight text-[var(--accent)]">{avgRelevance}%</div>
            </div>
          </section>

          {/* Pricing breakdown card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <span className="label-cap">Pricing breakdown - top 5 creators</span>
              <ClaudeMark model="sonnet" size="xs" />
            </div>
            <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
              Formula: max(base_floor, impact × 0.15) + relevant_eyes × 0.05
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-2 text-left font-medium text-[var(--fg-muted)]">Creator</th>
                    <th className="pb-2 text-right font-medium text-[var(--fg-muted)]">Base floor</th>
                    <th className="pb-2 text-right font-medium text-[var(--fg-muted)]">Impact term</th>
                    <th className="pb-2 text-right font-medium text-[var(--fg-muted)]">Rel-eyes bonus</th>
                    <th className="pb-2 text-right font-medium text-[var(--fg-muted)]">Total invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRows.map(({ creator, pay }) => (
                    <tr
                      key={creator.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={creator.name} size={22} />
                          <div>
                            <div className="font-medium">{creator.name}</div>
                            <div className="text-[10px] text-[var(--fg-muted)]">
                              {fmtFollowers(creator.followers)} followers
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtCurrency(pay.base_floor)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtCurrency(pay.impact_term)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {fmtCurrency(pay.relevant_eyes_bonus)}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {fmtCurrency(pay.recommended)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[var(--border)]">
                    <td colSpan={4} className="py-2 font-semibold">
                      Total (5 creators)
                    </td>
                    <td className="py-2 text-right text-[14px] font-bold tabular-nums">
                      {fmtCurrency(pricingTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[11px] text-[var(--fg-muted)] italic">
              Pricing transparently grounded in comment relevance
            </p>
          </section>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div className="space-y-5">

          {/* Top 5 creators card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="label-cap">Top 5 creators on this campaign</div>
            <div className="mt-3 space-y-3">
              {top5.map(({ c, sim }) => {
                const simPct = Math.round(sim * 100);
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3"
                    data-test-id={`campaign-creator-row-${c.id}`}
                  >
                    <Avatar name={c.name} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[13px] font-medium">{c.name}</span>
                        <Link
                          href={`/admin/match?brand=${brand.id}&focus=${c.id}`}
                          className="shrink-0 text-[11px] text-[var(--accent)] hover:underline"
                        >
                          View →
                        </Link>
                      </div>
                      {/* Similarity bar */}
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${simPct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10px] tabular-nums text-[var(--fg-muted)]">
                          {(sim).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Live activity card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="label-cap">Live activity</div>
            <ul className="mt-3 space-y-2">
              {activityFeed.map((event, idx) => (
                <li
                  key={`${event}-${idx}`}
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[11px] leading-snug text-[var(--fg-muted)]"
                >
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] align-middle" />
                  {event}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-[var(--fg-subtle)]">Updates every 8-12 seconds</p>
          </section>

          {/* Rate range card */}
          <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="label-cap">Campaign details</div>
            <div className="mt-2 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">Rate range</span>
                <span className="font-medium">
                  {fmtCurrency(campaign.rate_low)}-{fmtCurrency(campaign.rate_high)}/{campaign.rate_unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">Hires this month</span>
                <span className="font-medium">{campaign.hires_this_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">Paid this month</span>
                <span className="font-medium">{fmtCurrency(campaign.paid_this_month)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">One-click apply</span>
                <span className="font-medium">{campaign.oneclick_apply ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-muted)]">Target personas</span>
                <span className="text-right">
                  {campaign.target_personas.map((p) => (
                    <span key={p} className="pill text-[10px] ml-1">
                      {p}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
