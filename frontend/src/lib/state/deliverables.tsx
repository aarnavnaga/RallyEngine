"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type DeliverableStatus = "linked" | "polling" | "verified" | "paid";

export type MetricsSnapshot = {
  ts: string;
  views: number;
  likes: number;
  comments: number;
};

export type Deliverable = {
  contract_id: string;
  tiktok_url: string;
  posted_at: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  metrics_history: MetricsSnapshot[];
  bonus_earned_usd: number;
  status: DeliverableStatus;
  simulated_days_advanced: number;
};

type DeliverablesCtx = {
  deliverables: Record<string, Deliverable>;
  linkDeliverable: (contractId: string, url: string) => void;
  simulateDays: (contractId: string, n: number) => void;
  markPaid: (contractId: string) => void;
};

const DeliverablesContext = createContext<DeliverablesCtx | undefined>(undefined);

const STORAGE_KEY = "mercor.deliverables.v1";

// Logan's 4 cited posts from creators.ts - seeding initial metrics from real data
const CITED_POSTS: Record<string, { views: number; likes: number; comments: number; saves: number }> = {
  "https://www.tiktok.com/@loganmann32/video/7608429326211501326": {
    views: 7452,
    likes: 169,
    comments: 6,
    saves: 16,
  },
  "https://www.tiktok.com/@loganmann32/video/7618484810977168654": {
    views: 4800,
    likes: 142,
    comments: 4,
    saves: 11,
  },
  "https://www.tiktok.com/@loganmann32/video/7619197602285849870": {
    views: 3245,
    likes: 96,
    comments: 3,
    saves: 7,
  },
  "https://www.tiktok.com/@loganmann32/video/7603223754671508749": {
    views: 3245,
    likes: 88,
    comments: 5,
    saves: 9,
  },
};

// Day-by-day view delta ranges for the simulate curve.
// Index 0 = day 1 advance, ..., index 6 = day 7 advance.
const DAY_VIEW_RANGES: [number, number][] = [
  [8000, 12000],
  [10000, 18000],
  [7000, 12000],
  [4000, 8000],
  [3000, 5000],
  [2000, 4000],
  [1000, 3000],
];

/**
 * Deterministic pseudo-random from a string seed.
 * Returns a float in [0, 1).
 */
function seededRand(seed: string, extra: number): number {
  let hash = 0;
  const str = seed + String(extra);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  // Mix further to avoid clustering
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 16;
  return ((hash >>> 0) % 10000) / 10000;
}

function randInRange(lo: number, hi: number, seed: string, salt: number): number {
  return lo + Math.floor(seededRand(seed, salt) * (hi - lo + 1));
}

function computeBonus(views: number): number {
  if (views >= 100_000) return 700; // $200 + $500
  if (views >= 25_000) return 200;
  return 0;
}

function load(): Record<string, Deliverable> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Deliverable>) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, Deliverable>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    /* noop */
  }
}

export function DeliverablesProvider({ children }: { children: React.ReactNode }) {
  const [deliverables, setDeliverables] = useState<Record<string, Deliverable>>({});

  // Hydrate from localStorage on mount
  useEffect(() => {
    setDeliverables(load());
  }, []);

  const linkDeliverable = useCallback((contractId: string, url: string) => {
    const seed = contractId;
    const cited = CITED_POSTS[url];
    // Day-0 baseline: if the URL matches a cited post use real metrics, else use baseline
    const baseViews = cited ? cited.views : 2400;
    const baseLikes = cited ? cited.likes : 120;
    const baseComments = cited ? cited.comments : 4;
    const baseSaves = cited ? cited.saves : 8;
    const baseShares = Math.round(baseViews * 0.0005);

    const now = new Date().toISOString();

    const deliverable: Deliverable = {
      contract_id: contractId,
      tiktok_url: url,
      posted_at: now,
      metrics: {
        views: baseViews,
        likes: baseLikes,
        comments: baseComments,
        shares: baseShares,
        saves: baseSaves,
      },
      metrics_history: [{ ts: now, views: baseViews, likes: baseLikes, comments: baseComments }],
      bonus_earned_usd: 0,
      status: "linked",
      simulated_days_advanced: 0,
    };

    setDeliverables((prev) => {
      const next = { ...prev, [contractId]: deliverable };
      save(next);
      return next;
    });
  }, []);

  const simulateDays = useCallback((contractId: string, n: number) => {
    setDeliverables((prev) => {
      const d = prev[contractId];
      if (!d) return prev;

      const seed = contractId;
      let { views, likes, comments, shares, saves } = d.metrics;
      const history = [...d.metrics_history];
      let days = d.simulated_days_advanced;
      const totalDaysToAdd = Math.min(n, 7 - days);

      for (let i = 0; i < totalDaysToAdd; i++) {
        const dayIndex = days + i; // 0-indexed: day 0 = first advance
        const [lo, hi] = DAY_VIEW_RANGES[Math.min(dayIndex, 6)];
        const viewDelta = randInRange(lo, hi, seed, dayIndex * 31 + 7);
        views += viewDelta;
        likes = Math.round(views * 0.045);
        comments = Math.round(views * 0.012);
        shares = Math.round(views * 0.0008);
        saves = Math.round(views * 0.006);

        const ts = new Date(
          Date.now() - (totalDaysToAdd - 1 - i) * 86400000
        ).toISOString();
        history.push({ ts, views, likes, comments });
      }

      days += totalDaysToAdd;
      const bonus = computeBonus(views);

      const next = {
        ...prev,
        [contractId]: {
          ...d,
          metrics: { views, likes, comments, shares, saves },
          metrics_history: history,
          bonus_earned_usd: bonus,
          status: "polling" as DeliverableStatus,
          simulated_days_advanced: days,
        },
      };
      save(next);
      return next;
    });
  }, []);

  const markPaid = useCallback((contractId: string) => {
    setDeliverables((prev) => {
      const d = prev[contractId];
      if (!d) return prev;
      const next = { ...prev, [contractId]: { ...d, status: "paid" as DeliverableStatus } };
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<DeliverablesCtx>(
    () => ({ deliverables, linkDeliverable, simulateDays, markPaid }),
    [deliverables, linkDeliverable, simulateDays, markPaid],
  );

  return (
    <DeliverablesContext.Provider value={value}>
      {children}
    </DeliverablesContext.Provider>
  );
}

export function useDeliverables(): DeliverablesCtx {
  const ctx = useContext(DeliverablesContext);
  if (!ctx) throw new Error("useDeliverables must be used inside <DeliverablesProvider>");
  return ctx;
}

// ── Standalone utilities for cross-tree reads (no Provider needed) ──────────

export function getDeliverablesSnapshot(): Record<string, Deliverable> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Deliverable>) : {};
  } catch {
    return {};
  }
}

export function subscribeDeliverables(cb: (data: Record<string, Deliverable>) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cb(getDeliverablesSnapshot());
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

// Cited posts for the suggestion chips UI
export const LOGAN_CITED_POSTS = [
  {
    url: "https://www.tiktok.com/@loganmann32/video/7608429326211501326",
    caption: "Average quant",
  },
  {
    url: "https://www.tiktok.com/@loganmann32/video/7618484810977168654",
    caption: "Gym-day check-in",
  },
  {
    url: "https://www.tiktok.com/@loganmann32/video/7619197602285849870",
    caption: "Pool flex",
  },
  {
    url: "https://www.tiktok.com/@loganmann32/video/7603223754671508749",
    caption: "The Goal:",
  },
];
