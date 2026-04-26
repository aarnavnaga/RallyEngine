"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, Sparkles, Wallet } from "lucide-react";
import { listCampaigns } from "@/lib/data/campaigns";
import { BRAND_DOMAINS } from "@/lib/data/brands";
import { BrandMark } from "@/components/shell/BrandMark";
import { fmtCurrency } from "@/lib/util/score";
import { JobDetailPanel } from "@/components/explore/JobDetailPanel";
import { getHiresForCampaign } from "@/lib/data/creator-avatars";

const CATEGORY_LABEL: Record<string, string> = {
  energy: "Energy drinks",
  preworkout: "Pre-workout",
  creatine: "Creatine + supplements",
  protein: "Protein",
  apparel: "Apparel",
  wellness: "Wellness",
  supplement: "Supplements",
  "ai-talent": "AI / Talent",
};

// Every campaign in this demo lives under the new "Creators & Influencers"
// vertical Mercor adds. Selecting any other domain therefore shows nothing.
const CREATORS_DOMAIN = "Creators & Influencers";

export default function ExplorePage() {
  const router = useRouter();
  const search = useSearchParams();
  const listingId = search.get("listingId");
  const queryDomain = search.get("domain");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"priority" | "rate-high" | "rate-low" | "hires">(
    "priority",
  );
  const [domain, setDomain] = useState<string | null>(
    queryDomain ?? CREATORS_DOMAIN,
  );

  const items = useMemo(() => {
    const all = listCampaigns();
    let filtered = all;
    if (domain && domain !== CREATORS_DOMAIN) {
      // No campaigns exist outside the Creators vertical in this demo.
      filtered = [];
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (c) => c.title.toLowerCase().includes(q) || c.brand.name.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "rate-high":
        filtered = [...filtered].sort((a, b) => b.rate_high - a.rate_high);
        break;
      case "rate-low":
        filtered = [...filtered].sort((a, b) => a.rate_low - b.rate_low);
        break;
      case "hires":
        filtered = [...filtered].sort(
          (a, b) => b.hires_this_month - a.hires_this_month,
        );
        break;
      default:
        // priority: keep declared order but float Mercor-the-brand below
        filtered = [...filtered].sort((a, b) =>
          a.brand_id === "mercor" ? 1 : b.brand_id === "mercor" ? -1 : 0,
        );
    }
    return filtered;
  }, [query, sort, domain]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Explore opportunities</h1>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <label className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search"
            className="w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-3 text-[14px] outline-none focus:border-[var(--accent)]"
            data-test-id="explore-search"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const order: typeof sort[] = ["priority", "rate-high", "rate-low", "hires"];
            setSort(order[(order.indexOf(sort) + 1) % order.length]);
          }}
          className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] hover:bg-[var(--bg-hover)]"
          data-test-id="explore-sort"
        >
          <ArrowUpDown size={14} />
          {sort === "priority" ? "Priority" : sort === "rate-high" ? "Highest rate" : sort === "rate-low" ? "Lowest rate" : "Most hires"}
        </button>
        <button
          type="button"
          className="rounded-[10px] bg-[var(--accent)] px-3 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={13} />
            Refer &amp; earn
          </span>
        </button>
      </div>

      {/* Domain pill row, mirroring Mercor */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DomainChip
          label={domain ?? "Domain"}
          active={!!domain}
          onClick={() => setDomain(null)}
        />
        {!domain ? (
          <div className="ml-2 flex flex-wrap gap-1.5">
            {BRAND_DOMAINS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(d)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-[12px] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]"
              >
                {d}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
            onClick={() => setDomain(null)}
            aria-label="Clear domain filter"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Card grid - full width 5 cols on lg+ to match work.mercor.com/explore */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => router.push(`/explore?listingId=${c.id}`)}
            className="card card-hover relative w-full p-5 text-left"
            data-test-id={`opportunity-card-${c.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <BrandMark brand={c.brand} size={26} />
                <div className="text-[12px] text-[var(--fg-muted)]">{c.brand.name}</div>
              </div>
              {c.oneclick_apply ? (
                <span className="pill pill-success text-[11px]">
                  ✓ 1-click apply
                </span>
              ) : null}
            </div>
            <div className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-[var(--fg)]">
              {c.title}
            </div>
            <div className="mt-1 text-[13px] text-[var(--fg-muted)]">
              {fmtCurrency(c.rate_low)} - {fmtCurrency(c.rate_high)} / {c.rate_unit}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {getHiresForCampaign(c.brand_id, 3).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="h-5 w-5 rounded-full border border-[var(--bg)] bg-[var(--bg-hover)] object-cover"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <span className="text-[12px] text-[var(--fg-muted)]">
                  {c.hires_this_month} hired this month
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)]">
                <Wallet size={12} strokeWidth={1.7} />
                {fmtCurrency(c.paid_this_month)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Right-rail panel, slides in via search param */}
      {listingId ? (
        <JobDetailPanel listingId={listingId} onClose={() => router.push("/explore")} />
      ) : null}
    </div>
  );
}

function DomainChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)]"
      }`}
      data-test-id="domain-filter"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 5.5 a1.5 1.5 0 0 1 1.5 -1.5 h2.5 l1.5 1.5 h5 a1.5 1.5 0 0 1 1.5 1.5 v5 a1.5 1.5 0 0 1 -1.5 1.5 h-9 a1.5 1.5 0 0 1 -1.5 -1.5 z"/>
      </svg>
      {label}
    </button>
  );
}

