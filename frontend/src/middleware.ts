import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Edge-runtime middleware: per-IP sliding-window rate limit + same-origin gate
// for the cost-sensitive interview / chat-assist API surface.
//
// This is intentionally simple: a single-process, in-memory token bucket
// keyed by `x-forwarded-for`. Good enough for a single Next.js runtime;
// behind a load balancer with multiple instances you'd swap this for a
// shared store (Redis / Upstash). The constraints in the worker brief
// explicitly forbid new dependencies, so we use the Map-based approach.
// ---------------------------------------------------------------------------

interface RateConfig {
  // Number of allowed requests inside the rolling window.
  limit: number;
  // Window duration in milliseconds.
  windowMs: number;
}

interface BucketState {
  // How many requests have hit this bucket inside the current window.
  count: number;
  // Timestamp (ms) when the current window opened.
  windowStart: number;
}

// 60-second windows for every protected route.
const WINDOW_MS = 60_000;

// Per-route limits. Tuned for the demo workload:
// - observe runs every ~10s for ≤120s, so 12/min is the natural ceiling.
// - turn fires once per candidate answer, ~1 per 30-45s, so 8/min is plenty.
// - finalize runs once per interview; 6/min covers retries + edge cases.
// - chat-{suggestions,reply} are conversational helpers; 30/min is generous.
const RATE_RULES: { prefix: string; cfg: RateConfig }[] = [
  { prefix: "/api/interview/observe", cfg: { limit: 12, windowMs: WINDOW_MS } },
  { prefix: "/api/interview/turn", cfg: { limit: 8, windowMs: WINDOW_MS } },
  { prefix: "/api/interview/finalize", cfg: { limit: 6, windowMs: WINDOW_MS } },
  { prefix: "/api/chat-suggestions", cfg: { limit: 30, windowMs: WINDOW_MS } },
  { prefix: "/api/chat-reply", cfg: { limit: 30, windowMs: WINDOW_MS } },
];

// Module-scoped bucket store. Single instance per Next.js runtime.
// Garbage-collected lazily on every lookup so we don't leak memory in a
// long-lived process.
const buckets = new Map<string, BucketState>();
const GC_AGE_MS = 5 * 60_000;

function gcExpired(now: number): void {
  for (const [key, state] of buckets) {
    if (now - state.windowStart > GC_AGE_MS) {
      buckets.delete(key);
    }
  }
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // Take the first IP from the chain (closest client).
    const first = xff.split(",", 1)[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "default";
}

function matchRule(pathname: string): RateConfig | null {
  for (const rule of RATE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.cfg;
    }
  }
  return null;
}

function consumeToken(
  key: string,
  cfg: RateConfig,
  now: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const state = buckets.get(key);
  if (!state || now - state.windowStart >= cfg.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (state.count >= cfg.limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((state.windowStart + cfg.windowMs - now) / 1000),
    );
    return { ok: false, retryAfter };
  }
  buckets.set(key, { count: state.count + 1, windowStart: state.windowStart });
  return { ok: true };
}

// Same-origin gate. If an Origin header is present, it must match the Host
// header. Browser fetches always send Origin; legitimate server-to-server
// callers omit it, so we only enforce when it's set.
function rejectCrossOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  if (!host) return null;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (originHost !== host) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export function middleware(req: NextRequest): NextResponse {
  const cfg = matchRule(req.nextUrl.pathname);
  if (!cfg) return NextResponse.next();

  const crossOrigin = rejectCrossOrigin(req);
  if (crossOrigin) return crossOrigin;

  const now = Date.now();
  // Run GC opportunistically on every request — keeps the Map bounded.
  gcExpired(now);

  const key = `${req.nextUrl.pathname}:${clientIp(req)}`;
  const consumed = consumeToken(key, cfg, now);
  if (!consumed.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: consumed.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(consumed.retryAfter) },
      },
    );
  }

  return NextResponse.next();
}

// Matcher restricts middleware execution to the protected API surface so
// other routes (pages, static assets) pay no overhead.
export const config = {
  matcher: [
    "/api/interview/:path*",
    "/api/chat-reply",
    "/api/chat-reply/:path*",
    "/api/chat-suggestions",
    "/api/chat-suggestions/:path*",
  ],
};
