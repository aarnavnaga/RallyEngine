"use client";

import { RotateCcw } from "lucide-react";

/**
 * Floating "RESET ALL FOR DEMO" pill. Wipes every `mercor.*` localStorage key
 * (forward-compatible — any new key under that namespace is reset
 * automatically) and reloads to `/` so the demo starts from the landing page.
 *
 * Interview state is namespaced under `mercor.interview.<creatorId>.*` and is
 * therefore covered by the `mercor.*` sweep below. We additionally take a
 * belt-and-suspenders second pass that explicitly targets the interview
 * prefix so that any future legacy/non-`mercor.*` interview keys still get
 * wiped. This makes the reset usable mid-pitch: Logan can replay the AI
 * interview and see the new transcript + rubric grade populate fresh on
 * `/admin/interviews/loganmann32` instead of seeing the previous run's
 * cached results.
 *
 * Mounted in AppShell so it only appears on authenticated pages, never on the
 * landing screen itself.
 */
export function ResetDemoButton() {
  function handleReset() {
    const ok = window.confirm(
      "Reset all demo state to defaults?\n\nThis clears persona, deliverables, simulated time, completed AI interview transcripts and rubric grades, and any in-flight demo state. You will be returned to the landing page so you can replay the demo from scratch.",
    );
    if (!ok) return;
    try {
      // Pass 1: every mercor.* localStorage key (covers identity, interview,
      // outreach, deliverables, simulated time, etc.).
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("mercor.") ||
          // Defensive: any future legacy interview keys not under mercor.*.
          key.startsWith("interview.") ||
          key.includes(".interview.") ||
          key.includes("rubric")
        ) {
          toRemove.push(key);
        }
      }
      for (const key of toRemove) window.localStorage.removeItem(key);
      window.sessionStorage.clear();
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-muted)] shadow-sm hover:border-[var(--accent)] hover:text-[var(--accent)]"
      aria-label="Reset all demo state to defaults"
      title="Reset all demo state to defaults"
      data-test-id="reset-demo"
    >
      <RotateCcw size={12} strokeWidth={2} />
      Reset all for demo
    </button>
  );
}
