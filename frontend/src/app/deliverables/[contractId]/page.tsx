"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CONTRACTS_BY_ID } from "@/lib/data/contracts";
import { SEED_DELIVERABLES } from "@/lib/data/seed-deliverables";
import {
  useDeliverables,
  LOGAN_CITED_POSTS,
} from "@/lib/state/deliverables";
import { useToast } from "@/components/shell/ToastContainer";
import { fmtCurrency } from "@/lib/util/score";

function isValidTikTokUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("tiktok.com") && u.pathname.length > 1;
  } catch {
    return false;
  }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type AnimatedTileProps = {
  label: string;
  value: number;
  testId: string;
};

function AnimatedTile({ label, value, testId }: AnimatedTileProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    const steps = 20;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (step >= steps) {
        clearInterval(interval);
        setDisplay(end);
        prevRef.current = end;
      }
    }, 30);

    return () => clearInterval(interval);
  }, [value]);

  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] p-4"
      data-test-id={testId}
    >
      <span className="label-cap">{label}</span>
      <span className="tabular-nums text-[22px] font-semibold tracking-tight text-[var(--fg)]">
        {fmtNum(display)}
      </span>
    </div>
  );
}

export default function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = use(params);
  const contract = CONTRACTS_BY_ID[contractId];
  const { deliverables, linkDeliverable, simulateDays } = useDeliverables();
  const { push } = useToast();

  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const deliverable = deliverables[contractId];
  const linked = !!deliverable;

  // Auto-seed from SEED_DELIVERABLES on first load so demo URLs are pre-linked.
  useEffect(() => {
    if (linked) return;
    const seed = SEED_DELIVERABLES[contractId];
    if (!seed) return;
    linkDeliverable(contractId, seed.tiktok_url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);
  const daysLeft = linked ? 7 - deliverable.simulated_days_advanced : 7;
  const prevBonusRef = useRef(0);

  // Track bonus crossings for confetti toasts
  useEffect(() => {
    if (!deliverable) return;
    const { bonus_earned_usd, metrics } = deliverable;
    if (prevBonusRef.current < 200 && bonus_earned_usd >= 200 && metrics.views >= 25_000) {
      push({
        title: "Bonus tier unlocked: +$200",
        body: "First-week 25K views milestone hit.",
        kind: "success",
      });
    }
    if (prevBonusRef.current < 700 && bonus_earned_usd >= 700 && metrics.views >= 100_000) {
      push({
        title: "Performance bonus: +$500 unlocked",
        body: "Your post crossed 100K views.",
        kind: "success",
      });
    }
    prevBonusRef.current = bonus_earned_usd;
  }, [deliverable, push]);

  if (!contract) {
    return (
      <div className="py-16 text-center text-[var(--fg-muted)]">
        Contract not found.{" "}
        <Link href="/deliverables" className="text-[var(--accent)] hover:underline">
          Back to deliverables
        </Link>
      </div>
    );
  }

  function handleSubmit() {
    if (!isValidTikTokUrl(url)) return;
    setSubmitting(true);
    linkDeliverable(contractId, url);
    setSubmitting(false);
  }

  function handleSimulateDay() {
    if (!deliverable || deliverable.simulated_days_advanced >= 7) return;
    simulateDays(contractId, 1);
  }

  function handleSimulateWeek() {
    if (!deliverable) return;
    const remaining = 7 - deliverable.simulated_days_advanced;
    if (remaining <= 0) return;
    simulateDays(contractId, remaining);
  }

  const chartData = deliverable?.metrics_history.map((snap) => ({
    day: fmtDate(snap.ts),
    views: snap.views,
  })) ?? [];

  const totalEarned = (contract.flat_pay_usd ?? 0) + (deliverable?.bonus_earned_usd ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white"
          style={{ background: brandColor(contract.brand) }}
        >
          {contract.brand_label[0]}
        </span>
        <div>
          <div className="text-[13px] font-semibold text-[var(--fg)]">{contract.brand_label}</div>
          <div className="text-[12px] text-[var(--fg-muted)]">{contract.role}</div>
        </div>
        <Link
          href="/deliverables"
          className="ml-auto text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          ← All deliverables
        </Link>
      </div>

      {/* Card 1: Submit deliverable */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Submit your deliverable</h2>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              Paste the TikTok URL of your post for this contract.
            </p>
          </div>
          {linked && (
            <span className="pill pill-success text-[11px]">Linked</span>
          )}
        </div>

        {!linked ? (
          <>
            <div className="mt-4">
              <input
                data-test-id="deliverable-link-input"
                type="url"
                placeholder="https://www.tiktok.com/@yourhandle/video/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-soft)]"
              />
            </div>

            {/* Suggestion chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {LOGAN_CITED_POSTS.map((post, i) => (
                <button
                  key={post.url}
                  data-test-id={`deliverable-suggest-${i}`}
                  onClick={() => setUrl(post.url)}
                  className="rounded-full border border-[var(--accent-soft)] bg-[var(--bg-promo)] px-3 py-1 text-[11px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
                >
                  {post.caption}
                </button>
              ))}
            </div>

            <button
              data-test-id="deliverable-link-submit"
              disabled={!isValidTikTokUrl(url) || submitting}
              onClick={handleSubmit}
              className="btn-primary mt-4"
            >
              Link deliverable
            </button>
          </>
        ) : (
          <div className="mt-4">
            <a
              href={deliverable.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[13px] text-[var(--accent)] hover:underline"
            >
              {deliverable.tiktok_url}
            </a>
            <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
              Linked {new Date(deliverable.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {/* Card 2: Live performance (only after linked) */}
      {linked && (
        <div className="card p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Live performance</h2>
              <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
                Views over the past {deliverable.simulated_days_advanced} day
                {deliverable.simulated_days_advanced !== 1 ? "s" : ""}
              </p>
            </div>
            <span className="pill text-[11px]">
              Day {deliverable.simulated_days_advanced} / 7
            </span>
          </div>

          {/* Metric tiles */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            <AnimatedTile
              label="Views"
              value={deliverable.metrics.views}
              testId="deliverable-views-tile"
            />
            <AnimatedTile label="Likes" value={deliverable.metrics.likes} testId="deliverable-likes-tile" />
            <AnimatedTile label="Comments" value={deliverable.metrics.comments} testId="deliverable-comments-tile" />
            <AnimatedTile label="Shares" value={deliverable.metrics.shares} testId="deliverable-shares-tile" />
            <AnimatedTile label="Saves" value={deliverable.metrics.saves} testId="deliverable-saves-tile" />
          </div>

          {/* Area chart */}
          {chartData.length > 1 && (
            <div className="mt-5 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                    }
                    tickLine={false}
                    axisLine={{ stroke: "var(--border)" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmtNum(v), "Views"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#viewsGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Simulate buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              data-test-id="deliverable-simulate-day"
              disabled={deliverable.simulated_days_advanced >= 7}
              onClick={handleSimulateDay}
              className="btn-primary"
            >
              SIMULATE TIME - advance 1 day
            </button>
            {daysLeft > 1 && (
              <button
                data-test-id="deliverable-simulate-week"
                disabled={deliverable.simulated_days_advanced >= 7}
                onClick={handleSimulateWeek}
                className="btn-outline"
              >
                Skip to day 7
              </button>
            )}
            {deliverable.simulated_days_advanced >= 7 && (
              <span className="text-[12px] text-[var(--fg-muted)]">7-day window complete</span>
            )}
          </div>

          {/* Bonus badge */}
          {deliverable.bonus_earned_usd > 0 && (
            <div
              data-test-id="deliverable-bonus-tile"
              className="mt-4 inline-flex items-center gap-2 rounded-[8px] border border-[var(--success-soft)] bg-[var(--success-soft)] px-3 py-2"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              <span className="text-[13px] font-medium text-[var(--success)]">
                Bonus unlocked: +{fmtCurrency(deliverable.bonus_earned_usd)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Card 3: Earnings update (only after linked) */}
      {linked && (
        <div className="card p-6">
          <h2 className="text-[15px] font-semibold tracking-tight">Earnings update</h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--fg-muted)]">Base post payment</span>
              <span className="tabular-nums text-[13px] font-medium">
                {fmtCurrency(contract.flat_pay_usd ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <span className="text-[13px] text-[var(--fg-muted)]">Performance bonus</span>
              <span
                className={`tabular-nums text-[13px] font-medium ${
                  deliverable.bonus_earned_usd > 0 ? "text-[var(--success)]" : "text-[var(--fg-muted)]"
                }`}
              >
                {deliverable.bonus_earned_usd > 0
                  ? `+${fmtCurrency(deliverable.bonus_earned_usd)}`
                  : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold">Total earned this contract</span>
              <span className="tabular-nums text-[16px] font-semibold text-[var(--accent)]">
                {fmtCurrency(totalEarned)}
              </span>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-[var(--fg-muted)]">
            Released to Stripe in 2 business days after verification.
          </p>

          <Link
            href="/earnings"
            className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            Open Earnings page →
          </Link>
        </div>
      )}
    </div>
  );
}

function brandColor(brand: string): string {
  const map: Record<string, string> = {
    celsius: "#e64c00",
    "bucked-up": "#1a1a2e",
    bloom: "#c084fc",
    mercor: "#7857ff",
    alani: "#f472b6",
  };
  return map[brand] ?? "#7857ff";
}
