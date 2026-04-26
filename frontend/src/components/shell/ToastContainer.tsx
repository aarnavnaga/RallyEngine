"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Toast = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  kind?: "info" | "success" | "warning";
  ts: number;
};

type Ctx = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "ts">) => void;
  dismiss: (id: string) => void;
};

const ToastCtx = createContext<Ctx | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push: Ctx["push"] = useCallback((t) => {
    const next: Toast = { ...t, id: crypto.randomUUID(), ts: Date.now() };
    setToasts((cur) => [next, ...cur].slice(0, 6));
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== next.id));
    }, 5500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="toast pointer-events-auto fade-in" data-test-id={`toast-${t.id}`}>
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  t.kind === "success"
                    ? "bg-[var(--success)]"
                    : t.kind === "warning"
                    ? "bg-[var(--warning)]"
                    : "bg-[var(--accent)]"
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="pr-7 text-[13px] font-semibold leading-snug text-[var(--fg)]">
                  {t.title}
                </div>
                {t.body ? (
                  <div className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                    {t.body}
                  </div>
                ) : null}
                {t.href ? (
                  <a
                    href={t.href}
                    className="mt-1.5 inline-block text-[12px] font-medium text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    view →
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
                aria-label="Dismiss notification"
                data-test-id="toast-dismiss"
                className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--fg-subtle)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/** Demo realtime ticker: emits a curated event every 8-15s. Can be toggled. */
export function useDemoTicker(active: boolean, identity: "creator" | "admin" | null) {
  const { push } = useToast();
  useEffect(() => {
    if (!active || !identity) return;
    const events = identity === "creator" ? CREATOR_EVENTS : ADMIN_EVENTS;
    let i = 0;
    const tick = () => {
      const ev = events[i % events.length];
      push(ev);
      i += 1;
    };
    // Fire one within 4s of mount, then jitter 8-15s
    const first = window.setTimeout(tick, 3500);
    const interval = window.setInterval(() => {
      tick();
    }, 12000 + Math.floor(Math.random() * 4500));
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [active, identity, push]);
}

const CREATOR_EVENTS: Omit<Toast, "id" | "ts">[] = [
  {
    title: "Celsius reviewed your application",
    body: "Your campaign brief is in the brand's queue. Avg time-to-decision: 4 days.",
    href: "/home",
    kind: "info",
  },
  {
    title: "Bucked Up just opened a new campaign",
    body: "Pre-workout × college aesthetic. Estimated fit 92%.",
    href: "/explore",
    kind: "info",
  },
  {
    title: "Bloom Nutrition pinged you",
    body: "Wants to talk about a creatine gummies deal.",
    href: "/home",
    kind: "info",
  },
  {
    title: "Your friend Sam Sulek joined Mercor",
    body: "Congrats - referral bonus pending.",
    href: "/referrals",
    kind: "success",
  },
];

const ADMIN_EVENTS: Omit<Toast, "id" | "ts">[] = [
  {
    title: "loganmann32 - new application for Celsius",
    body: "Similarity 0.91, impact 87. Top of queue.",
    href: "/admin/match",
    kind: "info",
  },
  {
    title: "@trainingtall responded to Ghost Energy outreach",
    body: "Open to negotiating. Reply: 'Could do $1,200 if you cover shipping.'",
    href: "/admin/outreach",
    kind: "info",
  },
  {
    title: "Gymshark just published 3 new TikTok ads",
    body: "Auto-detected. 12 candidate creators identified.",
    href: "/admin/match",
    kind: "info",
  },
  {
    title: "Campaign #c-04 hit 100K views",
    body: "Comment-relevance currently 41%. Above payout floor.",
    href: "/admin/campaigns/c-04",
    kind: "success",
  },
  {
    title: "@blogilates onboarded",
    body: "Cassey Ho is now in the Mercor creator pool.",
    href: "/admin/creators",
    kind: "success",
  },
];
