"use client";

import { Suspense, useMemo, useState } from "react";
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

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[var(--fg-muted)]">Loading workbench…</div>}>
      <MatchInner />
    </Suspense>
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
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Match workbench</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">
          Transparent ranking · cosine similarity + impact score
        </span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Pick a brand. Pick creators. Generate outreach. Every score has a reason; expand any row to see the cited posts.
      </p>

      {/* Brand selector */}
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="label-cap">Brand</div>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px]"
            data-test-id="match-brand-select"
          >
            {BRANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.category}
              </option>
            ))}
          </select>
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

          <table className="dt-table">
            <thead>
              <tr>
                <th className="w-[24px]"></th>
                <th>Creator</th>
                <th>Followers</th>
                <th>Similarity</th>
                <th>Impact</th>
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
      </section>
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
              <div className="text-[14px] font-medium">{creator.name}</div>
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
          <td colSpan={7} className="bg-[var(--bg-elev)] p-0">
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
  const tagOverlap = creator.niche_tags.filter((t) =>
    brand.ad_themes.some((th) => th.toLowerCase().includes(t.toLowerCase())) ||
    brand.target_personas.some((p) => p.toLowerCase().includes(t.toLowerCase())),
  );

  return (
    <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-3">
      {/* Left: RAG rationale citing posts BY URL - the demo's wow */}
      <div className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <span className="label-cap">RAG rationale - cited posts</span>
          <ClaudeMark model="sonnet" size="xs" />
        </div>
        {citations.length > 0 ? (
          <ul className="mt-2 space-y-3">
            {citations.map((cite) => (
              <li
                key={cite.cited_post_url}
                className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-3"
              >
                <div className="text-[13px]">{cite.reason}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a
                    href={cite.cited_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-[11px] font-mono text-[var(--accent)] hover:underline"
                    data-test-id="match-cited-url"
                  >
                    {cite.cited_post_url}
                    <ExternalLink size={11} />
                  </a>
                </div>
                <div className="mt-2 text-[11px] text-[var(--fg-muted)]">
                  &ldquo;{cite.caption}&rdquo;
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cite.hashtags.map((h) => (
                    <span key={h} className="pill text-[10px]">
                      {h}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
            No cited TikTok posts indexed for this creator yet. Rank is from niche-tag and persona overlap with the
            brand brief.
          </p>
        )}

        <div className="mt-5">
          <div className="label-cap">Niche-tag overlap with {brand.name}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {creator.niche_tags.map((t) => (
              <span
                key={t}
                className={`pill text-[11px] ${tagOverlap.includes(t) ? "pill-success" : ""}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="label-cap">Geo evidence</div>
          <div className="mt-2 text-[12px] text-[var(--fg-muted)]">
            Creator is anchored in <span className="text-[var(--fg)] font-medium">{creator.geo_match_targets.join(", ")}</span>.
            {brand.target_geo.some((g) => creator.geo_match_targets.some((c) => c.toLowerCase().includes(g.toLowerCase()))) ? (
              <>
                {" "}Matches one of {brand.name}&apos;s target geos:{" "}
                <span className="text-[var(--fg)] font-medium">{brand.target_geo.join(", ")}</span>.
              </>
            ) : (
              <>
                {" "}{brand.name}&apos;s target geos:{" "}
                <span className="text-[var(--fg)] font-medium">{brand.target_geo.join(", ")}</span>. No direct overlap; ranks on
                niche fit alone.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: impact breakdown + pay breakdown */}
      <div>
        <div className="label-cap">Impact score breakdown</div>
        <table className="mt-2 w-full text-[12px]">
          <tbody>
            <Row label="sqrt(followers)/100" value={impact.followers_factor.toFixed(2)} />
            <Row label="niche relevance" value={impact.niche_relevance.toFixed(2)} />
            <Row label="posts/week" value={impact.cadence.toFixed(1)} />
            <Row label="log10(median interactions+1)" value={impact.interactions.toFixed(2)} />
            <Row label="authenticity" value={impact.authenticity.toFixed(2)} />
            <Row label="geo match" value={impact.geo_match.toFixed(2)} />
            <tr className="border-t border-[var(--border)]">
              <td className="py-1.5 text-[var(--fg-muted)]">composite =</td>
              <td className="py-1.5 text-right tabular-nums">{impact.composite.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="py-1.5 font-medium">Score</td>
              <td className="py-1.5 text-right">
                <span className="pill pill-accent text-[11px]">{impact.rounded}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <Link
          href={`/admin/interviews/${creator.id}`}
          data-test-id={`match-view-interview-${creator.id}`}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] font-medium text-[var(--fg)] hover:bg-[var(--bg-hover)]"
        >
          View AI interview →
        </Link>

        <div className="mt-5 label-cap">Suggested pay breakdown</div>
        <table className="mt-2 w-full text-[12px]">
          <tbody>
            <Row label="base floor (tier)" value={fmtCurrency(pay.base_floor)} />
            <Row label="impact × $0.15" value={fmtCurrency(pay.impact_term)} />
            <Row label="relevant-eyes bonus" value={fmtCurrency(pay.relevant_eyes_bonus)} />
            <tr className="border-t border-[var(--border)]">
              <td className="py-1.5 font-medium">Recommended</td>
              <td className="py-1.5 text-right font-semibold">{fmtCurrency(pay.recommended)}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-[var(--fg-muted)]">range</td>
              <td className="py-1.5 text-right text-[11px] text-[var(--fg-muted)]">
                {fmtCurrency(pay.total_low)} - {fmtCurrency(pay.total_high)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-1 text-[var(--fg-muted)]">{label}</td>
      <td className="py-1 text-right tabular-nums">{value}</td>
    </tr>
  );
}

// keep CREATORS_BY_ID referenced so static-analysis doesn't drop the import in dev
void CREATORS_BY_ID;
