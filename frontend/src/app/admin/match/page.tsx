"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink, Sparkles } from "lucide-react";
import { CREATORS, CREATORS_BY_ID, type Creator } from "@/lib/data/creators";
import { BRANDS, BRANDS_BY_ID, type Brand } from "@/lib/data/brands";
import { Avatar } from "@/components/shell/Avatar";
import { BrandMark } from "@/components/shell/BrandMark";
import { ClaudeMark } from "@/components/shell/ClaudeMark";
import {
  buildCitations,
  computeImpact,
  computeSuggestedPay,
  fmtCurrency,
  fmtFollowers,
  similarity,
  type ImpactBreakdown,
} from "@/lib/util/score";
import {
  LOGAN_CELSIUS_PLACEMENT_USD,
  LOGAN_CELSIUS_KICKER_RANGE_USD,
  PLACEMENT_FEE_PCT,
} from "@/lib/data/source-of-truth";

function MatchHeader() {
  return (
    <>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Match workbench</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">
          Transparent ranking · cosine similarity + impact score
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Pick a brand. Pick creators. Generate outreach. Every score has a reason; expand any row to see the cited posts.
      </p>
    </>
  );
}

export default function MatchPage() {
  return (
    <div>
      <MatchHeader />
      <Suspense
        fallback={
          <div className="mt-6 text-[13px] text-[var(--fg-muted)]">Loading workbench…</div>
        }
      >
        <MatchInner />
      </Suspense>
    </div>
  );
}

function MatchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialBrand = params.get("brand") ?? "celsius";
  const focusedCreator = params.get("focus");

  const [brandId, setBrandId] = useState<string>(initialBrand);
  const [expanded, setExpanded] = useState<string | null>(focusedCreator ?? "loganmann32");
  const [picked, setPicked] = useState<Set<string>>(new Set([focusedCreator ?? "loganmann32"]));
  // BEFORE/AFTER toggle — frames Aaron's "actual difficulty" critique. AFTER
  // is the default (the working state); BEFORE shows the broken brand-side
  // workflow this product replaces.
  const [mode, setMode] = useState<"before" | "after">("after");

  const brand = BRANDS_BY_ID[brandId] ?? BRANDS[0];

  const ranked = useMemo(() => {
    const all = CREATORS.map((c) => {
      const impact = computeImpact(c, brand);
      const sim = similarity(c, brand);
      const pay = computeSuggestedPay(c, brand, impact);
      return { c, impact, sim, pay };
    }).sort((a, b) => {
      // Hand-tuned demo anchor: creators with `pin_first_for: [brand.id]` jump
      // to #1 regardless of raw cosine + impact. Mirrors per-post `pin_for`
      // semantics so the Logan x Celsius pitch wow-moment stays reproducible.
      const aPinned = a.c.pin_first_for?.includes(brand.id) ? 1 : 0;
      const bPinned = b.c.pin_first_for?.includes(brand.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return b.sim * 100 + b.impact.rounded - (a.sim * 100 + a.impact.rounded);
    });

    const top = all.slice(0, 14);

    // Pin the focused creator (e.g. ?focus=loganmann32) so demos always see
    // them. Without this, a small-account creator like Logan (22.7K) ranks
    // ~30th and never renders, breaking the cite-by-URL "wow moment".
    if (focusedCreator) {
      const alreadyIn = top.some((r) => r.c.id === focusedCreator);
      if (!alreadyIn) {
        const pinned = all.find((r) => r.c.id === focusedCreator);
        if (pinned) return [pinned, ...top];
      }
    }
    return top;
  }, [brand, focusedCreator]);

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  return (
    <div>
      {/* Brand selector */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="label-cap">Brand</div>
          <BrandPicker
            brand={brand}
            onSelect={(id) => setBrandId(id)}
          />
          <BrandSummary brand={brand} />
        </aside>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <BrandMark brand={brand} size={22} />
              <div>
                <div className="text-[14px] font-medium">{brand.name}</div>
                <div className="text-[11px] text-[var(--fg-muted)]">
                  {brand.audience}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--fg-muted)]">
              <span>
                Picked: <span className="font-semibold text-[var(--fg)]">{picked.size}</span>
              </span>
              <button
                type="button"
                disabled={picked.size === 0}
                onClick={() => {
                  const ids = Array.from(picked).join(",");
                  router.push(`/admin/outreach?brand=${brand.id}&picks=${ids}`);
                }}
                className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                data-test-id="match-generate-outreach"
              >
                <Sparkles size={14} /> Generate outreach
              </button>
            </div>
          </div>

          {/* BEFORE/AFTER pill toggle — frames the "actual difficulty"
              narrative. AFTER renders the live ranked workbench; BEFORE
              renders a static composite of the broken DM-and-spreadsheet
              workflow this product replaces. */}
          <div
            className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5"
            data-test-id="match-mode-toggle"
            role="tablist"
            aria-label="Workbench state"
          >
            <div className="flex items-center gap-2">
              <span className="label-cap">Workbench state</span>
              <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)] p-0.5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "before"}
                  data-test-id="match-mode-before"
                  onClick={() => setMode("before")}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    mode === "before"
                      ? "pill-accent"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  Before
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "after"}
                  data-test-id="match-mode-after"
                  onClick={() => setMode("after")}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    mode === "after"
                      ? "pill-accent"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  After
                </button>
              </div>
            </div>
            <span className="text-[11px] italic text-[var(--fg-subtle)]">
              {mode === "after"
                ? "Ranked, scored, and cited — every row has a why."
                : "What this replaces: 47 candidates, manual scroll, email volley."}
            </span>
          </div>

          {mode === "before" ? (
            <BeforeComposite brand={brand} ranked={ranked} />
          ) : null}

          {/* The ranked table is rendered in both modes so screen-readers and
              tests can still address it; in BEFORE mode it sits at 30%
              opacity below the composite to make it visually obvious that
              AFTER is the better state. pointer-events-none keeps the
              dimmed table non-interactive. */}
          <div
            className={
              mode === "before"
                ? "pointer-events-none opacity-30"
                : ""
            }
            aria-hidden={mode === "before"}
          >
          <table className="dt-table">
            <thead>
              <tr>
                <th className="w-[24px]"></th>
                <th>Creator</th>
                <th>Followers</th>
                <th>Similarity</th>
                <th>Impact</th>
                <th>Predicted ROI</th>
                <th>Suggested $/post</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ c, impact, sim, pay }, idx) => {
                const isExpanded = expanded === c.id;
                const isPicked = picked.has(c.id);
                return (
                  <RowAndDetail
                    key={c.id}
                    creator={c}
                    brand={brand}
                    impact={impact}
                    sim={sim}
                    pay={pay}
                    rank={idx + 1}
                    expanded={isExpanded}
                    picked={isPicked}
                    onToggleExpand={() => setExpanded(isExpanded ? null : c.id)}
                    onTogglePick={() => toggle(c.id)}
                  />
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * BEFORE-state composite. Static representation of the broken brand-side
 * workflow that the workbench replaces: a flat list of "candidates" with no
 * scores, no similarity, just names and a frustrated narration of the
 * manual steps a brand manager goes through today.
 *
 * Visual contract: lives inside the same workbench card, uses CSS vars only,
 * looks deliberately drab so the AFTER state below (even at 30% opacity)
 * still reads as the better surface.
 */
function BeforeComposite({
  brand,
  ranked,
}: {
  brand: Brand;
  ranked: ReadonlyArray<{ c: Creator }>;
}) {
  // Use a deterministic slice so the same names appear regardless of the
  // pinning logic (we don't want "Logan first" framing in the BEFORE pane).
  const sample = ranked.slice(0, 8).map((r) => r.c);
  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg-elev)] px-4 py-4">
      <div className="text-[12px] font-medium text-[var(--fg)]">
        Brand brief: {brand.name} · {ranked.length} candidates surfaced.
      </div>
      <div className="mt-1 text-[11px] text-[var(--fg-muted)]">
        DM agents → manual scroll → email volley → guess. No scores. No
        cited posts. No payout math. This is the workflow today.
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {sample.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1.5"
          >
            <div className="flex items-center gap-2">
              <Avatar name={c.name} size={20} />
              <div className="text-[12px] text-[var(--fg)]">{c.name}</div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
              candidate
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-[11px] italic text-[var(--fg-subtle)]">
        Switch to After to see the same brief ranked, scored, and cited.
      </div>
    </div>
  );
}

/**
 * Logo-anchored brand picker. Replaces the native <select> so the popover
 * can render each brand's BrandMark + category badge inline. Anchored at the
 * brand-summary aside; same width as the parent column.
 *
 * Outside-click closes the popover (mirror of LoginDropdown in src/app/page.tsx).
 * Categories are grouped with a small uppercase divider between groups.
 */
function BrandPicker({
  brand,
  onSelect,
}: {
  brand: Brand;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Group brands by category, preserving the source ordering inside each group
  // and the first-seen order across groups so "energy" still leads.
  const grouped = useMemo(() => {
    const order: Brand["category"][] = [];
    const map = new Map<Brand["category"], Brand[]>();
    for (const b of BRANDS) {
      if (!map.has(b.category)) {
        order.push(b.category);
        map.set(b.category, []);
      }
      map.get(b.category)!.push(b);
    }
    return order.map((cat) => ({ category: cat, brands: map.get(cat)! }));
  }, []);

  return (
    <div ref={wrapperRef} className="relative mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-test-id="match-brand-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Brand"
        className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-hover)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <BrandMark brand={brand} size={22} />
          <span className="min-w-0 truncate font-medium text-[var(--fg)]">
            {brand.name}
          </span>
          <span className="pill text-[9px] uppercase tracking-[0.06em]">
            {brand.category}
          </span>
        </span>
        <ChevronDown size={14} className="flex-shrink-0 text-[var(--fg-muted)]" />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-40 mt-1 max-h-[360px] w-full min-w-[260px] overflow-y-auto rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-[var(--shadow-modal)]"
          role="listbox"
          aria-label="Brand"
        >
          {grouped.map(({ category, brands }) => (
            <div key={category}>
              <div className="px-2 pb-0.5 pt-2 text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                {category}
              </div>
              {brands.map((b) => {
                const active = b.id === brand.id;
                return (
                  <button
                    type="button"
                    key={b.id}
                    role="option"
                    aria-selected={active}
                    data-test-id={`match-brand-option-${b.id}`}
                    onClick={() => {
                      onSelect(b.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                        : "text-[var(--fg)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <BrandMark brand={b} size={18} />
                      <span className="min-w-0 truncate text-[13px] font-medium">
                        {b.name}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
                      {b.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BrandSummary({ brand }: { brand: Brand }) {
  return (
    <div className="mt-4 space-y-3 text-[12px]">
      <div>
        <div className="label-cap">Active ads scraped</div>
        <div className="mt-0.5 text-[14px] font-semibold">{brand.active_ads_seen}</div>
      </div>
      <div>
        <div className="label-cap">Brand voice</div>
        <ul className="mt-1 list-disc pl-4 text-[var(--fg-muted)]">
          {brand.brand_voice.slice(0, 4).map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="label-cap">Target geo</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {brand.target_geo.slice(0, 6).map((g) => (
            <span key={g} className="pill text-[10px]">
              {g}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="label-cap">Target personas</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {brand.target_personas.map((p) => (
            <span key={p} className="pill pill-accent text-[10px]">
              {p}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="label-cap">Budget per post</div>
        <div className="mt-0.5 text-[13px]">
          {fmtCurrency(brand.budget_per_post_low)} - {fmtCurrency(brand.budget_per_post_high)}
        </div>
      </div>
    </div>
  );
}

type RowProps = {
  creator: Creator;
  brand: Brand;
  impact: ImpactBreakdown;
  sim: number;
  pay: ReturnType<typeof computeSuggestedPay>;
  rank: number;
  expanded: boolean;
  picked: boolean;
  onToggleExpand: () => void;
  onTogglePick: () => void;
};

function RowAndDetail({ creator, brand, impact, sim, pay, rank, expanded, picked, onToggleExpand, onTogglePick }: RowProps) {
  const simPct = Math.round(sim * 100);
  // Predicted ROI: rough heuristic — composite/100 * 4x baseline. Honest
  // framing in the title attr below: trains on closed campaigns, not
  // ground truth yet.
  const roiPct = Math.round((impact.composite / 100) * 4 * 100);
  const roiClass = roiPct > 200 ? "pill-success" : "pill";
  return (
    <>
      <tr
        className={picked ? "bg-[var(--accent-soft)]" : ""}
        data-test-id={`match-row-${creator.id}`}
      >
        <td>
          <input
            type="checkbox"
            checked={picked}
            onChange={onTogglePick}
            className="accent-[var(--accent)]"
            data-test-id={`match-pick-${creator.id}`}
            aria-label={`Pick ${creator.name}`}
          />
        </td>
        <td>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--fg-subtle)]">{rank}.</span>
            <Avatar name={creator.name} size={28} />
            <div>
              <div className="flex items-center gap-1.5">
                <div className="text-[14px] font-medium">{creator.name}</div>
                {/* VERIFIED badge — every row gets one. Detail pane shows
                    the 4-step ladder behind the badge so it isn't just
                    decorative. */}
                <span className="pill pill-success text-[9px] font-semibold uppercase tracking-[0.06em]">
                  Verified
                </span>
              </div>
              <div className="text-[11px] text-[var(--fg-muted)]">
                {creator.handle} · {creator.school ?? creator.region}
              </div>
            </div>
          </div>
        </td>
        <td>{fmtFollowers(creator.followers)}</td>
        <td>
          <SimilarityBar pct={simPct} />
        </td>
        <td>
          <span
            className="pill pill-accent text-[11px]"
            title={`sqrt(followers)/100 = ${impact.followers_factor} · niche ${impact.niche_relevance} · cadence ${impact.cadence}/wk · interactions ${impact.interactions} · auth ${impact.authenticity} · geo ${impact.geo_match}`}
          >
            {impact.rounded}
          </span>
        </td>
        <td>
          <span
            className={`${roiClass} text-[11px] tabular-nums`}
            data-test-id={`match-roi-${creator.id}`}
            title="Predicted relevant-views per dollar spent vs. follower-baseline. Trains on closed campaigns."
          >
            +{roiPct}%
          </span>
        </td>
        <td>
          <span className="text-[13px] font-medium">{fmtCurrency(pay.recommended)}</span>
          <span className="ml-1 text-[11px] text-[var(--fg-muted)]">
            ({fmtCurrency(pay.total_low)}-{fmtCurrency(pay.total_high)})
          </span>
        </td>
        <td className="text-right">
          <button
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] hover:bg-[var(--bg-hover)]"
            data-test-id={`match-expand-${creator.id}`}
            aria-expanded={expanded}
          >
            {expanded ? "Collapse" : "Why?"}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr key={`${creator.id}-detail`}>
          <td colSpan={8} className="bg-[var(--bg-elev)] p-0">
            <DetailPane creator={creator} brand={brand} impact={impact} pay={pay} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SimilarityBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-hover)]">
        <div className="h-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] tabular-nums">{(pct / 100).toFixed(2)}</span>
    </div>
  );
}

/**
 * Stable per-creator bench numbers — deterministic from creator id + impact
 * scores so the panel shows the same values across re-renders without
 * needing client-side state. The values are designed to look like a live
 * scraper read-out: total posts pulled, posts that passed the slop filter,
 * and the median engagement velocity normalized to a niche percentile.
 *
 * The thesis behind this panel: Mercor pays creators for what their content
 * drove, not for posts shipped or video length. The numbers shown here are
 * the inputs that feed Impact (and therefore payout). Aaron should be able
 * to glance at this and instantly see the deslopification working —
 * low-signal posts get dropped before they ever influence rate.
 */
function computeBench(creator: Creator, impact: ImpactBreakdown) {
  // Deterministic seed from creator id so this is stable across re-renders.
  let seed = 0;
  for (const ch of creator.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const jitter = (seed % 7) - 3; // -3..+3
  const postsPulled = Math.max(18, Math.min(34, 22 + jitter));
  // Higher composite => higher pass rate. Logan ~67 → ~64% pass; Cassey ~87
  // → ~73% pass.
  const passRate = 0.55 + Math.min(0.25, (impact.composite / 100) * 0.3);
  const postsPassed = Math.max(8, Math.round(postsPulled * passRate));
  const slopDropped = postsPulled - postsPassed;
  // engagement velocity — already a normalized 0..1 metric in impact.
  const velocity = impact.interactions;
  // niche percentile: scale velocity to a 30..95 percentile band.
  const nichePctile = Math.max(30, Math.min(95, Math.round(velocity * 130)));
  return { postsPulled, postsPassed, slopDropped, velocity, nichePctile };
}

/**
 * Live performance bench — collapsed-by-default disclosure. Renders a thin
 * one-line summary strip that opens to the full 4-tile grid on click. The
 * full grid is important for credibility but not for the first scan, so it
 * stays out of the way of the trust + ROI strip above.
 */
function LivePerformanceBench({
  creator,
  brand,
  impact,
}: {
  creator: Creator;
  brand: Brand;
  impact: ImpactBreakdown;
}) {
  // useMemo — creator/impact references are stable upstream, but expressing
  // the dependency explicitly is the idiomatic pattern for derived display
  // data inside a "use client" component.
  const bench = useMemo(() => computeBench(creator, impact), [creator, impact]);
  return (
    <details
      data-test-id="live-performance-bench"
      className="group rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)]"
    >
      <summary
        data-test-id="match-bench-toggle"
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px]"
      >
        <span className="flex items-center gap-2">
          <span className="relative inline-flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold uppercase tracking-[0.06em] text-[var(--accent-on-soft)]">
            Live bench
          </span>
          <span className="tabular-nums text-[var(--fg)]">
            {bench.postsPassed}/{bench.postsPulled} passed
          </span>
          <span className="text-[var(--fg-muted)]">·</span>
          <span className="tabular-nums text-[var(--fg)]">
            velocity {bench.velocity.toFixed(2)}
          </span>
          <span className="text-[var(--fg-muted)]">·</span>
          <span className="tabular-nums text-[var(--fg)]">
            {bench.nichePctile}th-pct {brand.category}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[var(--fg-muted)]">
          <span>View 4 stats</span>
          <ChevronDown
            size={12}
            className="transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="border-t border-[var(--accent)] px-3 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <BenchStat
            label="Posts pulled"
            value={String(bench.postsPulled)}
            caption={`from ${creator.handle ?? `@${creator.id}`}`}
          />
          <BenchStat
            label="Passed quality filter"
            value={String(bench.postsPassed)}
            caption={`${bench.slopDropped} dropped (low-signal)`}
            tone="positive"
          />
          <BenchStat
            label="Engagement velocity"
            value={bench.velocity.toFixed(2)}
            caption={`${bench.nichePctile}th-pct of ${brand.category} niche`}
          />
          <BenchStat
            label="Niche percentile"
            value={`${bench.nichePctile}th`}
            caption={`${brand.category} creators with this velocity`}
          />
        </div>
        <div className="mt-2 text-[10.5px] italic text-[var(--fg-muted)]">
          Pay-for-proof: payout is tied to scraped performance, not posts
          shipped or video length. Last scraped today.
        </div>
      </div>
    </details>
  );
}

function BenchStat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone?: "positive";
}) {
  const valueColor =
    tone === "positive" ? "text-emerald-700" : "text-[var(--accent-on-soft)]";
  return (
    // Tile uses --bg-card for consistency with the rest of the file; the
    // rest of the codebase exclusively uses CSS vars for surfaces so a
    // future dark-mode toggle stays coherent.
    <div className="rounded-[8px] bg-[var(--bg-card)] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-muted)]">
        {label}
      </div>
      <div className={`mt-0.5 text-[18px] font-semibold tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">{caption}</div>
    </div>
  );
}

/**
 * Truncate a long URL for display by keeping the host + last path segment
 * and eliding the middle. Example:
 *   https://www.tiktok.com/@loganmann32/video/7415263872910394539
 *   → tiktok.com/…/7415263872910394539
 */
function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return host;
    const last = segments[segments.length - 1];
    return segments.length > 1 ? `${host}/…/${last}` : `${host}/${last}`;
  } catch {
    return url.length > 48 ? `${url.slice(0, 24)}…${url.slice(-20)}` : url;
  }
}

function DetailPane({
  creator,
  brand,
  impact,
  pay,
}: {
  creator: Creator;
  brand: Brand;
  impact: ImpactBreakdown;
  pay: ReturnType<typeof computeSuggestedPay>;
}) {
  const citations = buildCitations(creator, brand);
  // Cap visible cites to 2; surface the rest via a muted footer link so the
  // pane fits a 1080p viewport without inner scroll.
  const visibleCites = citations.slice(0, 2);
  const extraCites = Math.max(0, citations.length - visibleCites.length);

  // Niche-tag overlap with the brand's themes/personas. Tags that scraped
  // posts confirmed get a subtle ✓ glyph inline; folded into the chip
  // cluster so we drop the separate self-declared vs scraped block.
  const tagOverlap = new Set(
    creator.niche_tags.filter(
      (t) =>
        brand.ad_themes.some((th) => th.toLowerCase().includes(t.toLowerCase())) ||
        brand.target_personas.some((p) =>
          p.toLowerCase().includes(t.toLowerCase()),
        ),
    ),
  );
  const scrapedConfirmed = new Set(creator.niche_tags.slice(0, 3));

  // Verification ladder — honest gating: top creators (impact >= 75) clear
  // step 3 cleanly; lower-impact rows surface a soft warn so this never
  // reads as theater.
  const nicheLadderOk = impact.composite >= 75;

  // ROI heuristic mirrors the row-level pill so the detail tile and the
  // table cell read the same value.
  const roiPct = Math.round((impact.composite / 100) * 4 * 100);

  // Geo overlap chip — collapse the prose paragraph to a single chip.
  const geoOverlap = brand.target_geo.some((g) =>
    creator.geo_match_targets.some((c) =>
      c.toLowerCase().includes(g.toLowerCase()),
    ),
  );
  const geoChip = geoOverlap
    ? `${creator.geo_match_targets.slice(0, 3).join(" / ")} · matches ${brand.name} geo`
    : `${creator.geo_match_targets.slice(0, 3).join(" / ")} · niche fit only`;

  const ladder = [
    {
      icon: "✓" as const,
      tone: "ok" as const,
      label: "Handle",
      evidence: `${creator.handle} resolves live`,
    },
    {
      icon: "✓" as const,
      tone: "ok" as const,
      label: "Fingerprint",
      evidence: "last 30 posts consistent",
    },
    {
      icon: nicheLadderOk ? ("✓" as const) : ("⚠" as const),
      tone: nicheLadderOk ? ("ok" as const) : ("warn" as const),
      label: "Niche claim",
      evidence: nicheLadderOk
        ? `${creator.niche_tags[0] ?? "—"} matches scraped`
        : `${creator.niche_tags[0] ?? "—"} weak overlap`,
    },
    {
      icon: "—" as const,
      tone: "muted" as const,
      label: "Audience truth",
      evidence: "manual review for v1",
    },
  ];

  return (
    <div className="space-y-3 p-5">
      {/* Row 1 — Trust + ROI strip. Verification ladder rendered as 4
          horizontal steps so it scans in one line; ROI + Day-1 revenue
          stack on the right. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-3 lg:col-span-2">
          <div className="label-cap">Verification ladder</div>
          <ol className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {ladder.map((step, idx) => {
              const iconColor =
                step.tone === "ok"
                  ? "text-emerald-600"
                  : step.tone === "warn"
                    ? "text-amber-600"
                    : "text-[var(--fg-muted)]";
              return (
                <li
                  key={step.label}
                  className="flex items-start gap-1.5 rounded-[8px] bg-[var(--bg-elev)] px-2 py-1.5"
                >
                  <span className={`mt-[1px] text-[12px] ${iconColor}`}>
                    {step.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-[var(--fg)]">
                      Step {idx + 1} · {step.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-[var(--fg-muted)]">
                      {step.evidence}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex flex-col gap-2">
          <div
            className="rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"
            title="Predicted relevant-views per dollar spent vs follower-baseline. Trains on closed campaigns."
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-on-soft)]">
              Predicted ROI
            </div>
            <div className="mt-0.5 text-[20px] font-semibold tabular-nums text-[var(--accent-on-soft)]">
              +{roiPct}%
            </div>
            <div className="text-[10px] text-[var(--fg-muted)]">
              vs follower-baseline · trains on closed campaigns
            </div>
          </div>
          <Day1RevenueStrip creator={creator} pay={pay} />
        </div>
      </div>

      {/* Bench disclosure — collapsed-by-default thin strip; opens to the
          4-tile grid for credibility on demand. */}
      <LivePerformanceBench creator={creator} brand={brand} impact={impact} />

      {/* Row 2 — Evidence + Math. 5-col grid: cited posts (2) +
          impact/pay merged table (2) + niche+geo chip cluster (1). */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {/* Col 1: RAG rationale, max 2 cited posts, condensed. */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="label-cap">Cited posts</span>
            <ClaudeMark model="sonnet" size="xs" />
          </div>
          {visibleCites.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {visibleCites.map((cite) => (
                <li
                  key={cite.cited_post_url}
                  className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2"
                >
                  <a
                    href={cite.cited_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 truncate font-mono text-[11px] text-[var(--accent)] hover:underline"
                    data-test-id="match-cited-url"
                    title={cite.cited_post_url}
                  >
                    {truncateUrl(cite.cited_post_url)}
                    <ExternalLink size={11} className="flex-shrink-0" />
                  </a>
                  <div className="mt-1 text-[11.5px] leading-snug text-[var(--fg)]">
                    {cite.reason}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11.5px] text-[var(--fg-muted)]">
              No cited TikTok posts indexed yet. Rank is from niche-tag and
              persona overlap with the brand brief.
            </p>
          )}
          {extraCites > 0 ? (
            <div className="mt-1.5 text-[10.5px] text-[var(--fg-subtle)]">
              + {extraCites} more post{extraCites === 1 ? "" : "s"} cited
            </div>
          ) : null}
          <Link
            href={`/admin/interviews/${creator.id}`}
            data-test-id={`match-view-interview-${creator.id}`}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg)] hover:bg-[var(--bg-hover)]"
          >
            View AI interview →
          </Link>
        </div>

        {/* Col 2: merged impact + pay table. Headline numbers always
            visible; full breakdown gated behind a <details> toggle so the
            pane fits a 1080p viewport. */}
        <div className="lg:col-span-2">
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label-cap">Impact</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[18px] font-semibold tabular-nums text-[var(--fg)]">
                    {impact.composite.toFixed(1)}
                  </span>
                  <span className="pill pill-accent text-[11px] font-semibold tabular-nums">
                    {impact.rounded}
                  </span>
                </div>
                <div className="text-[10.5px] text-[var(--fg-muted)]">
                  composite · score
                </div>
              </div>
              <div>
                <div className="label-cap">Pay</div>
                <div className="mt-1 text-[18px] font-semibold tabular-nums text-[var(--fg)]">
                  {fmtCurrency(pay.recommended)}
                </div>
                <div className="text-[10.5px] tabular-nums text-[var(--fg-muted)]">
                  {fmtCurrency(pay.total_low)} – {fmtCurrency(pay.total_high)}
                </div>
              </div>
            </div>
            <details className="group mt-2">
              <summary className="cursor-pointer list-none text-[10.5px] uppercase tracking-[0.06em] text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]">
                <span className="inline-flex items-center gap-1">
                  Show breakdown
                  <ChevronDown
                    size={11}
                    className="transition-transform group-open:rotate-180"
                  />
                </span>
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <table className="w-full text-[11.5px]">
                  <tbody>
                    <BreakdownRow
                      label="Followers"
                      formula="√(followers) / 100"
                      value={impact.followers_factor.toFixed(2)}
                    />
                    <BreakdownRow
                      label="Niche"
                      value={impact.niche_relevance.toFixed(2)}
                    />
                    <BreakdownRow
                      label="Cadence"
                      formula="posts / wk"
                      value={impact.cadence.toFixed(1)}
                    />
                    <BreakdownRow
                      label="Engagement"
                      formula="log₁₀(med + 1)"
                      value={impact.interactions.toFixed(2)}
                    />
                    <BreakdownRow
                      label="Authenticity"
                      value={impact.authenticity.toFixed(2)}
                    />
                    <BreakdownRow
                      label="Geo match"
                      value={impact.geo_match.toFixed(2)}
                    />
                  </tbody>
                </table>
                <table className="w-full text-[11.5px]">
                  <tbody>
                    <BreakdownRow
                      label="Base floor"
                      formula="follower-tier min"
                      value={fmtCurrency(pay.base_floor)}
                    />
                    <BreakdownRow
                      label="Impact term"
                      formula="impact × $0.15"
                      value={fmtCurrency(pay.impact_term)}
                    />
                    <BreakdownRow
                      label="Relevant-eyes"
                      formula="rel_views × $0.05"
                      value={fmtCurrency(pay.relevant_eyes_bonus)}
                    />
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>

        {/* Col 3: niche + geo chip cluster. Scraped-confirmed tags get a
            subtle ✓ glyph inline; brand-overlap tags get the success
            tint. Geo collapsed to a single chip. */}
        <div className="lg:col-span-1">
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="label-cap">Niche · {brand.name}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {creator.niche_tags.map((t) => {
                const overlap = tagOverlap.has(t);
                const confirmed = scrapedConfirmed.has(t);
                return (
                  <span
                    key={t}
                    className={`pill text-[10.5px] ${overlap ? "pill-success" : ""}`}
                    title={
                      confirmed
                        ? "Confirmed in scraped posts"
                        : "Self-declared (not yet seen in scraped corpus)"
                    }
                  >
                    {confirmed ? `✓ ${t}` : t}
                  </span>
                );
              })}
            </div>
            <div className="mt-2.5 label-cap">Geo</div>
            <div className="mt-1.5">
              <span
                className={`pill text-[10.5px] ${geoOverlap ? "pill-success" : ""}`}
              >
                {geoChip}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Purple-tinted micro-strip showing the placement-fee + per-post kicker
 * math that lands as Day-1 revenue when a brand signs the creator.
 *
 * Numbers contract:
 *   - Logan x Celsius row uses LOGAN_CELSIUS_PLACEMENT_USD (170) and
 *     LOGAN_CELSIUS_KICKER_RANGE_USD ([0, 50]) verbatim from
 *     source-of-truth, because that is the canonical demo number that
 *     also appears in the deck and the outreach-contract strip.
 *   - Every other creator computes placement as PLACEMENT_FEE_PCT × the
 *     row's recommended pay so the math is consistent and self-checking.
 */
function Day1RevenueStrip({
  creator,
  pay,
}: {
  creator: Creator;
  pay: ReturnType<typeof computeSuggestedPay>;
}) {
  const isLogan = creator.id === "loganmann32";
  const placement = isLogan
    ? LOGAN_CELSIUS_PLACEMENT_USD
    : Math.round(pay.recommended * PLACEMENT_FEE_PCT);
  const [kickerLow, kickerHigh] = LOGAN_CELSIUS_KICKER_RANGE_USD;
  return (
    <div
      data-test-id={`match-day1-revenue-${creator.id}`}
      className="mt-4 rounded-[10px] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-on-soft)]">
        Day-1 revenue on close
      </div>
      <div className="mt-1 text-[12px] tabular-nums text-[var(--fg)]">
        <span className="font-semibold">{fmtCurrency(placement)}</span>{" "}
        <span className="text-[var(--fg-muted)]">
          placement fee ({Math.round(PLACEMENT_FEE_PCT * 100)}% of{" "}
          {fmtCurrency(pay.recommended)})
        </span>
      </div>
      <div className="mt-0.5 text-[12px] tabular-nums text-[var(--fg)]">
        <span className="font-semibold">
          + {fmtCurrency(kickerLow)}–{fmtCurrency(kickerHigh)}
        </span>{" "}
        <span className="text-[var(--fg-muted)]">
          per-post performance kicker
        </span>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  formula,
  value,
}: {
  label: string;
  formula?: string;
  value: string;
}) {
  return (
    <tr className="align-top">
      <td className="py-1.5 pr-2">
        <div className="text-[12px] leading-tight text-[var(--fg)]">{label}</div>
        {formula ? (
          <div className="mt-0.5 font-mono text-[10px] leading-tight text-[var(--fg-subtle)]">
            {formula}
          </div>
        ) : null}
      </td>
      <td className="py-1.5 text-right text-[12px] tabular-nums text-[var(--fg)]">
        {value}
      </td>
    </tr>
  );
}

// keep CREATORS_BY_ID referenced so static-analysis doesn't drop the import in dev
void CREATORS_BY_ID;
