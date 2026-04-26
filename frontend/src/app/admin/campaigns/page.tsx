"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CAMPAIGNS, listCampaigns } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { BrandMark } from "@/components/shell/BrandMark";
import { fmtCurrency } from "@/lib/util/score";

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="label-cap">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{sub}</div> : null}
    </div>
  );
}

export default function CampaignsPage() {
  const campaigns = useMemo(() => listCampaigns(), []);

  const totalHires = useMemo(
    () => campaigns.reduce((acc, c) => acc + c.hires_this_month, 0),
    [campaigns],
  );

  const totalPaid = useMemo(
    () => campaigns.reduce((acc, c) => acc + c.paid_this_month, 0),
    [campaigns],
  );

  const uniqueBrands = useMemo(
    () => new Set(campaigns.map((c) => c.brand_id)).size,
    [campaigns],
  );

  const avgFillRate = useMemo(() => {
    const avg = campaigns.reduce((acc, c) => acc + Math.min(c.hires_this_month / 20, 1), 0) / campaigns.length;
    return Math.round(avg * 100);
  }, [campaigns]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Active campaigns</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">data refreshes every hour</span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        {CAMPAIGNS.length} live campaigns across {uniqueBrands} brands. Click in for the perf simulator.
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <KPI label="Total campaigns" value={`${CAMPAIGNS.length}`} sub="all active" />
        <KPI label="Hires this month" value={`${totalHires}`} sub="across all campaigns" />
        <KPI label="Paid this month" value={fmtCurrency(totalPaid)} sub="creator payouts" />
        <KPI label="Avg fill rate" value={`${avgFillRate}%`} sub="vs 20-hire target" />
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const brand = BRANDS_BY_ID[campaign.brand_id];
          const fillPct = Math.min(Math.round((campaign.hires_this_month / 20) * 100), 100);
          const briefPreview =
            campaign.brief.length > 100
              ? campaign.brief.slice(0, 100) + "…"
              : campaign.brief;

          return (
            <div
              key={campaign.id}
              className="flex flex-col rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold leading-snug tracking-tight">
                    {campaign.title}
                  </div>
                </div>
                {brand ? (
                  <div className="flex shrink-0 items-center gap-2 text-[12px] text-[var(--fg-muted)]">
                    <BrandMark brand={brand} size={22} />
                    <span className="hidden sm:inline">{brand.name}</span>
                  </div>
                ) : null}
              </div>

              {/* Brief preview */}
              <p className="mt-2 text-[12px] text-[var(--fg-muted)] leading-relaxed">{briefPreview}</p>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                <span>
                  <span className="font-semibold text-[var(--fg)]">{campaign.hires_this_month}</span>
                  <span className="text-[var(--fg-muted)]"> hires</span>
                </span>
                <span>
                  <span className="font-semibold text-[var(--fg)]">{fmtCurrency(campaign.paid_this_month)}</span>
                  <span className="text-[var(--fg-muted)]"> paid</span>
                </span>
                <span className="text-[var(--fg-muted)]">
                  {fmtCurrency(campaign.rate_low)}-{fmtCurrency(campaign.rate_high)}/{campaign.rate_unit}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                  <span>Fill rate</span>
                  <span>{fillPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 pt-1">
                <Link
                  href={`/admin/campaigns/${campaign.id}`}
                  className="btn-primary inline-flex items-center gap-1 text-[12px]"
                  data-test-id={`campaign-card-${campaign.id}`}
                >
                  Open simulator →
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
