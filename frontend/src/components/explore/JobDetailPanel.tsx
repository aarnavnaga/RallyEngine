"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { BrandMark } from "@/components/shell/BrandMark";
import { fmtCurrency } from "@/lib/util/score";

const CHECKLIST = [
  { id: "resume", label: "Resume", core: false, done: true, doneAt: "04/25/26" },
  { id: "socials", label: "Connect TikTok &amp; Instagram", core: true, done: false },
  { id: "interview", label: "Creator Interview", core: true, done: false },
  { id: "workauth", label: "Work Authorization", core: false, done: true, doneAt: "03/01/26" },
];

export function JobDetailPanel({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const router = useRouter();
  const c = CAMPAIGNS_BY_ID[listingId];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!c) {
    return (
      <div className="fixed inset-0 z-40 flex">
        <button
          aria-label="close"
          className="flex-1 bg-black/15"
          onClick={onClose}
        />
        <div className="w-[600px] bg-[var(--bg)] p-6">
          <p>Listing not found.</p>
        </div>
      </div>
    );
  }

  const brand = BRANDS_BY_ID[c.brand_id];
  const completedSteps = CHECKLIST.filter((s) => s.done).length;
  const pct = Math.round((completedSteps / CHECKLIST.length) * 100);

  return (
    <div className="fixed inset-0 z-40 flex">
      <button aria-label="close" className="flex-1 bg-black/15" onClick={onClose} />
      <aside
        className="relative h-full w-[640px] overflow-y-auto border-l border-[var(--border)] bg-[var(--bg)] shadow-modal"
        role="dialog"
        aria-modal="true"
        data-test-id="job-detail-panel"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-6 py-4">
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--bg-hover)]"
            aria-label="Collapse"
          >
            <X size={16} />
          </button>
          <button className="text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]">
            Bookmark
          </button>
        </div>

        <div className="px-6 pt-4 pb-32">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="h-display text-[28px] leading-tight">{c.title}</h2>
              <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
                <span className="pill">⏱ Part-time position</span>
                <span className="pill">📍 Remote</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[28px] font-semibold leading-none tracking-tight text-[var(--fg)]">
                {fmtCurrency(c.rate_high)}
              </div>
              <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
                up to / {c.rate_unit}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-[10px] border border-[var(--border)] p-3">
            <BrandMark brand={brand} size={32} />
            <div>
              <div className="text-[14px] font-semibold">Posted by {brand.name}</div>
              <a
                href={brand.website}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-[var(--fg-muted)] hover:underline"
              >
                {new URL(brand.website).host} <ExternalLink className="inline" size={11} />
              </a>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-semibold tracking-tight">Application</div>
              <div className="text-[12px] text-[var(--fg-muted)]">
                {completedSteps} of {CHECKLIST.length} steps completed
              </div>
            </div>
            <div className="mt-2 progress-rail">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-right text-[11px] text-[var(--fg-muted)]">{pct}%</div>

            <ul className="mt-4 space-y-2">
              {CHECKLIST.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-[13px] hover:bg-[var(--bg-hover)]"
                >
                  <span>
                    {s.label === "Connect TikTok &amp; Instagram" ? (
                      <>Connect TikTok &amp; Instagram</>
                    ) : (
                      s.label
                    )}
                    {s.core ? (
                      <span className="ml-2 pill pill-accent text-[10px]">CORE</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
                    {s.done ? <>Completed on {s.doneAt}</> : "Not done"}
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full text-white ${
                        s.done ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                      }`}
                    >
                      {s.done ? "✓" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[12px] text-[var(--fg-subtle)]">
              All application steps are reused whenever another role requires the same step,
              so you never have to upload your resume or take the same interview twice.
            </p>
          </div>

          <hr className="mt-8 border-[var(--border)]" />

          <div className="mt-8">
            <div className="text-[16px] font-semibold tracking-tight">{c.title}</div>
            <p className="mt-3 text-[13px] leading-[1.7] text-[var(--fg-muted)]">{c.brief}</p>

            <div className="mt-6">
              <p className="label-cap">Project Focus</p>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-[1.6] text-[var(--fg-muted)]">
                {c.deliverables.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <p className="label-cap">Target audience</p>
              <p className="mt-2 text-[13px] leading-[1.6] text-[var(--fg-muted)]">
                {brand.audience}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {brand.target_personas.map((p) => (
                  <span key={p} className="pill text-[11px]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="label-cap">Brand voice</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {brand.brand_voice.map((p) => (
                  <span key={p} className="pill text-[11px]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--bg)] px-6 py-4">
          <button
            type="button"
            onClick={() => router.push(`/jobs/apply/${c.id}`)}
            className="btn-primary w-full"
            data-test-id="continue-application"
          >
            Continue Application
          </button>
        </div>
      </aside>
    </div>
  );
}
