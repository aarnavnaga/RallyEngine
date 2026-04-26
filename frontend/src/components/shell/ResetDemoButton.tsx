"use client";

import { RotateCcw } from "lucide-react";

/**
 * Floating "RESET ALL FOR DEMO" pill. Wipes every `mercor.*` localStorage key
 * (forward-compatible — any new key under that namespace is reset
 * automatically) and reloads to `/` so the demo starts from the landing page.
 *
 * Mounted in AppShell so it only appears on authenticated pages, never on the
 * landing screen itself.
 */
export function ResetDemoButton() {
  function handleReset() {
    const ok = window.confirm(
      "Reset all demo state to defaults?\n\nThis clears persona, deliverables, simulated time, and any in-flight demo state. You will be returned to the landing page.",
    );
    if (!ok) return;
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("mercor.")) toRemove.push(key);
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
