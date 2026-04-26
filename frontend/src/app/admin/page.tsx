"use client";

import Link from "next/link";
import { useState } from "react";
import { CREATORS, listOnboarded, listPending, listApplied, listDrafted, type Creator } from "@/lib/data/creators";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { Avatar } from "@/components/shell/Avatar";
import { computeImpact, fmtCurrency, fmtFollowers } from "@/lib/util/score";

type Tab = "all" | "onboarded" | "pending" | "applied" | "drafted";

export default function AdminOverviewPage() {
  const [tab, setTab] = useState<Tab>("pending");

  const buckets = {
    onboarded: listOnboarded(),
    pending: listPending(),
    applied: listApplied(),
    drafted: listDrafted(),
  };

  const display = tab === "all" ? CREATORS : buckets[tab];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Creators &amp; Influencers - Strategic Operations</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">data refreshes every hour</span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        New expert vertical · {CREATORS.length} creators in pool · 17 active campaigns · 9 college pilots
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <KPI label="Active campaigns" value="17" sub="3 launched this week" />
        <KPI label="Onboarded creators" value={`${buckets.onboarded.length}`} sub="ready to ship" />
        <KPI label="Pending review" value={`${buckets.pending.length}`} sub="awaiting your message" />
        <KPI label="GMV last 7 days" value={fmtCurrency(24_300)} sub="up 31% WoW" />
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 border-b border-[var(--border)]">
          {(
            [
              ["pending", `Pending (${buckets.pending.length})`],
              ["onboarded", `Onboarded (${buckets.onboarded.length})`],
              ["applied", `Applied (${buckets.applied.length})`],
              ["drafted", `Auto-drafted (${buckets.drafted.length})`],
              ["all", `All (${CREATORS.length})`],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative pb-3 pt-1 text-[14px] tracking-tight ${tab === id ? "font-medium text-[var(--accent)] after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-[var(--accent)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
              data-test-id={`admin-tab-${id}`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto pb-3 text-[12px] text-[var(--fg-muted)]">Sorted by impact ↓</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--border)]">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Creator</th>
                <th>Niche</th>
                <th>Followers</th>
                <th>Impact</th>
                <th>Best brand match</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {display
                .map((c) => ({
                  c,
                  impact: computeImpact(c).rounded,
                  bestBrand: pickBestBrand(c),
                }))
                .sort((a, b) => b.impact - a.impact)
                .map(({ c, impact, bestBrand }) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} size={28} />
                        <div>
                          <div className="text-[14px] font-medium">{c.name}</div>
                          <div className="text-[11px] text-[var(--fg-muted)]">
                            {c.handle} · {c.school ?? c.region ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[12px] text-[var(--fg-muted)]">{c.niche}</td>
                    <td>{fmtFollowers(c.followers)}</td>
                    <td>
                      <span className="pill pill-accent text-[11px]">{impact}</span>
                    </td>
                    <td>
                      {bestBrand ? (
                        <Link
                          href={`/admin/match?brand=${bestBrand}`}
                          className="text-[13px] hover:underline"
                        >
                          {BRANDS_BY_ID[bestBrand]?.name ?? bestBrand}
                        </Link>
                      ) : (
                        <span className="text-[12px] text-[var(--fg-subtle)]">-</span>
                      )}
                    </td>
                    <td>
                      <StatusPill status={c.status} />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/match?focus=${c.id}`}
                        className="rounded-md border border-[var(--border)] px-3 py-1 text-[12px] hover:bg-[var(--bg-hover)]"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="label-cap">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight">{value}</div>
      {sub ? <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">{sub}</div> : null}
    </div>
  );
}

function StatusPill({ status }: { status: Creator["status"] }) {
  const map: Record<Creator["status"], { label: string; cls: string }> = {
    onboarded: { label: "Onboarded", cls: "pill-success" },
    pending: { label: "Pending review", cls: "pill-warning" },
    applied: { label: "Applied", cls: "pill-accent" },
    drafted: { label: "Auto-drafted", cls: "" },
  };
  const m = map[status];
  return <span className={`pill text-[11px] ${m.cls}`}>{m.label}</span>;
}

function pickBestBrand(c: Creator): string | null {
  if (c.applied_to?.length) return c.applied_to[0];
  // Heuristic on niche tags
  if (c.niche_tags.includes("ucsb") || c.niche_tags.includes("stem")) return "celsius";
  if (c.niche_tags.includes("women-fitness") || c.niche_tags.includes("aesthetic")) return "alani";
  if (c.niche_tags.includes("physique") || c.niche_tags.includes("bodybuilding")) return "bucked-up";
  if (c.niche_tags.includes("yoga") || c.niche_tags.includes("pilates")) return "alo-yoga";
  if (c.niche_tags.includes("recipes") || c.niche_tags.includes("diet")) return "bloom";
  return "gymshark";
}
