"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CREATORS, type Creator, type CreatorStatus } from "@/lib/data/creators";
import { BRANDS, BRANDS_BY_ID, type Brand } from "@/lib/data/brands";
import { Avatar } from "@/components/shell/Avatar";
import { computeImpact, fmtFollowers, similarity } from "@/lib/util/score";
import { InterviewNotesCard } from "@/components/admin/InterviewNotesCard";

export default function CreatorsPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[var(--fg-muted)]">Loading pipeline…</div>}>
      <CreatorsInner />
    </Suspense>
  );
}

type StatusFilter = CreatorStatus | "all";

const MIN_FOLLOWERS_OPTIONS: { label: string; value: number }[] = [
  { label: "Any", value: 0 },
  { label: "10K+", value: 10_000 },
  { label: "50K+", value: 50_000 },
  { label: "100K+", value: 100_000 },
  { label: "500K+", value: 500_000 },
  { label: "1M+", value: 1_000_000 },
];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "onboarded", label: "Onboarded" },
  { id: "pending", label: "Pending review" },
  { id: "applied", label: "Applied" },
  { id: "drafted", label: "Auto-drafted" },
  { id: "all", label: "All" },
];

const STATUS_MAP: Record<CreatorStatus, { label: string; cls: string }> = {
  onboarded: { label: "Onboarded", cls: "pill-success" },
  pending: { label: "Pending review", cls: "pill-warning" },
  applied: { label: "Applied", cls: "pill-accent" },
  drafted: { label: "Auto-drafted", cls: "" },
};

function bestBrandForCreator(creator: Creator): Brand {
  let best = BRANDS[0];
  let bestSim = -1;
  for (const b of BRANDS) {
    const s = similarity(creator, b);
    if (s > bestSim) {
      bestSim = s;
      best = b;
    }
  }
  return best;
}

function CreatorsInner() {
  const router = useRouter();
  const params = useSearchParams();

  const initialBrand = params.get("brand") ?? "celsius";
  const initialStatus = (params.get("status") as StatusFilter | null) ?? "all";
  const initialSearch = params.get("q") ?? "";
  const initialMinFollowers = Number(params.get("minFollowers") ?? "0");

  const [brandId, setBrandId] = useState<string>(initialBrand);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [search, setSearch] = useState<string>(initialSearch);
  const [minFollowers, setMinFollowers] = useState<number>(initialMinFollowers);

  const brand = BRANDS_BY_ID[brandId] ?? BRANDS[0];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CREATORS
      .filter((c) => {
        if (statusFilter !== "all" && c.status !== statusFilter) return false;
        if (c.followers < minFollowers) return false;
        if (q && !c.name.toLowerCase().includes(q) && !c.handle.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((c) => {
        const impact = computeImpact(c, brand);
        const sim = similarity(c, brand);
        const suggestedBrand = bestBrandForCreator(c);
        return { c, impact, sim, suggestedBrand };
      })
      .sort((a, b) => b.impact.rounded - a.impact.rounded);
  }, [brandId, statusFilter, search, minFollowers, brand]);

  function updateParam(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value);
    else sp.delete(key);
    router.replace(`/admin/creators?${sp.toString()}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Creator pipeline</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">
          Sortable. Filterable. Every creator scored against a target brand of your choice.
        </span>
      </div>

      {/* Interview notes for any creator that completed the AI video interview */}
      <InterviewNotesPanel />

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        {/* Brand selector */}
        <div className="flex items-center gap-2">
          <label className="label-cap whitespace-nowrap" htmlFor="creators-brand-select">
            Target brand
          </label>
          <select
            id="creators-brand-select"
            data-test-id="creators-brand-select"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              updateParam("brand", e.target.value);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
          >
            {BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map(({ id, label }) => (
            <button
              key={id}
              data-test-id={`creators-filter-${id}`}
              onClick={() => {
                setStatusFilter(id);
                updateParam("status", id === "all" ? "" : id);
              }}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                statusFilter === id
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search name or handle…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            updateParam("q", e.target.value);
          }}
          className="min-w-[180px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[13px] placeholder:text-[var(--fg-subtle)]"
          data-test-id="creators-search"
        />

        {/* Min followers */}
        <div className="flex items-center gap-2">
          <label className="label-cap whitespace-nowrap" htmlFor="creators-min-followers">
            Min followers
          </label>
          <select
            id="creators-min-followers"
            data-test-id="creators-min-followers"
            value={minFollowers}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMinFollowers(v);
              updateParam("minFollowers", v > 0 ? String(v) : "");
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[13px]"
          >
            {MIN_FOLLOWERS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Counts row */}
      <div className="mt-3 text-[12px] text-[var(--fg-muted)]">
        Showing <span className="font-semibold text-[var(--fg)]">{rows.length}</span> of{" "}
        <span className="font-semibold text-[var(--fg)]">{CREATORS.length}</span> creators &middot; sorted by
        Impact &darr;
      </div>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-[12px] border border-[var(--border)]">
        <table className="dt-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Niche</th>
              <th>Followers</th>
              <th>Posts/wk</th>
              <th>Median interactions</th>
              <th>Similarity</th>
              <th>Impact</th>
              <th>Suggested brand</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, impact, sim, suggestedBrand }) => (
              <CreatorRow
                key={c.id}
                creator={c}
                brand={brand}
                impact={impact}
                sim={sim}
                suggestedBrand={suggestedBrand}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-10 text-center text-[13px] text-[var(--fg-muted)]">
                  No creators match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CreatorRowProps = {
  creator: Creator;
  brand: Brand;
  impact: ReturnType<typeof computeImpact>;
  sim: number;
  suggestedBrand: Brand;
};

function CreatorRow({ creator, brand, impact, sim, suggestedBrand }: CreatorRowProps) {
  const simPct = Math.round(sim * 100);
  const statusMeta = STATUS_MAP[creator.status];
  const impactTitle = [
    `sqrt(followers)/100 = ${impact.followers_factor}`,
    `niche relevance = ${impact.niche_relevance}`,
    `posts/wk = ${impact.cadence}`,
    `log10(interactions+1) = ${impact.interactions}`,
    `authenticity = ${impact.authenticity}`,
    `geo match = ${impact.geo_match}`,
    `composite = ${impact.composite}`,
  ].join(" · ");

  return (
    <tr data-test-id={`creators-row-${creator.id}`}>
      {/* Creator */}
      <td>
        <div className="flex items-center gap-2">
          <Avatar name={creator.name} size={28} />
          <div>
            <div className="text-[14px] font-medium">{creator.name}</div>
            <div className="text-[11px] text-[var(--fg-muted)]">
              {creator.handle}
              {creator.region ? ` · ${creator.region}` : ""}
            </div>
          </div>
        </div>
      </td>

      {/* Niche */}
      <td className="text-[12px] text-[var(--fg-muted)]">{creator.niche}</td>

      {/* Followers */}
      <td className="tabular-nums text-[13px]">{fmtFollowers(creator.followers)}</td>

      {/* Posts/wk */}
      <td className="tabular-nums text-[13px]">{creator.posts_per_week}</td>

      {/* Median interactions */}
      <td className="tabular-nums text-[13px]">{creator.median_interactions.toLocaleString()}</td>

      {/* Similarity */}
      <td>
        <SimilarityBar pct={simPct} />
      </td>

      {/* Impact */}
      <td>
        <span
          className="pill pill-accent text-[11px]"
          title={impactTitle}
        >
          {impact.rounded}
        </span>
      </td>

      {/* Suggested brand */}
      <td>
        <Link
          href={`/admin/match?brand=${suggestedBrand.id}&focus=${creator.id}`}
          className="text-[12px] hover:underline"
        >
          {suggestedBrand.name}
        </Link>
      </td>

      {/* Status */}
      <td>
        <span className={`pill text-[11px] ${statusMeta.cls}`}>{statusMeta.label}</span>
      </td>

      {/* Action */}
      <td className="text-right">
        <Link
          href={`/admin/match?brand=${brand.id}&focus=${creator.id}`}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)]"
          data-test-id={`creators-action-${creator.id}`}
        >
          Match →
        </Link>
      </td>
    </tr>
  );
}

function SimilarityBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-hover)]">
        <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] tabular-nums">{(pct / 100).toFixed(2)}</span>
    </div>
  );
}

function InterviewNotesPanel() {
  // Scan localStorage for any creator interview records and surface them at
  // the top of the admin pipeline so reviewers see the AI's video assessment.
  const [creatorIds, setCreatorIds] = useState<string[]>([]);

  useEffect(() => {
    const ids: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        const m = key.match(/^mercor\.interview\.(.+)\.v1$/);
        if (m && m[1]) ids.push(m[1]);
      }
    } catch {
      // localStorage may be unavailable (SSR, incognito).
    }
    // De-dupe and intersect with known creators so we don't show stale ids.
    const validIds = Array.from(new Set(ids)).filter((id) =>
      CREATORS.some((c) => c.id === id),
    );
    setCreatorIds(validIds);
  }, []);

  if (creatorIds.length === 0) return null;

  return (
    <div className="mt-5 grid grid-cols-1 gap-4" data-test-id="interview-notes-panel">
      {creatorIds.map((id) => {
        const creator = CREATORS.find((c) => c.id === id);
        return (
          <div key={id}>
            {creator ? (
              <div className="mb-2 flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
                <Avatar name={creator.name} size={20} />
                <span className="font-medium text-[var(--fg)]">{creator.name}</span>
                <span>· {creator.handle}</span>
              </div>
            ) : null}
            <InterviewNotesCard creatorId={id} />
          </div>
        );
      })}
    </div>
  );
}
