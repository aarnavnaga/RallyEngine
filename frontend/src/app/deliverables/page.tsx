"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CONTRACTS } from "@/lib/data/contracts";
import { useDeliverables } from "@/lib/state/deliverables";

const DELIVERABLE_KINDS = new Set(["creator-post", "creator-campaign", "campus-ambassador"]);

export default function DeliverablesIndexPage() {
  const { deliverables } = useDeliverables();

  const eligible = CONTRACTS.filter((c) => DELIVERABLE_KINDS.has(c.contract_kind));

  return (
    <div>
      <h1 className="h-display text-[28px]">Deliverables</h1>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Submit and track your TikTok posts for each active brand contract.
      </p>

      <section className="mt-8">
        <div className="overflow-hidden rounded-[12px] border border-[var(--border)]">
          <table className="dt-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Role</th>
                <th>Status</th>
                <th>Deliverable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((contract) => {
                const d = deliverables[contract.id];
                const linked = !!d;

                return (
                  <tr key={contract.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: brandColor(contract.brand) }}
                        >
                          {contract.brand_label[0]}
                        </span>
                        <span className="font-medium">{contract.brand_label}</span>
                      </div>
                    </td>
                    <td className="text-[13px] text-[var(--fg-muted)]">{contract.role}</td>
                    <td>
                      <span
                        className={`pill text-[11px] ${
                          contract.status === "active"
                            ? "pill-success"
                            : contract.status === "draft"
                              ? "pill-warning"
                              : ""
                        }`}
                      >
                        {contract.status}
                      </span>
                    </td>
                    <td>
                      {linked ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="pill pill-accent inline-flex w-fit text-[11px]">
                            Linked
                          </span>
                          <a
                            href={d.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="max-w-[240px] truncate text-[11px] text-[var(--fg-muted)] underline-offset-2 hover:underline"
                          >
                            {d.tiktok_url}
                          </a>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--fg-muted)]">Not submitted</span>
                      )}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/deliverables/${contract.id}`}
                        className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
                      >
                        {linked ? "View" : "Submit deliverable"}
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
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
