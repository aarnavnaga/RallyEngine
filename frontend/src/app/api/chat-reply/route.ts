import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface ChatReplyBody {
  side: "creator" | "brand";
  counterpartyName: string;
  brandName: string;
  campaignTitle: string;
  baseRateLow: number;
  baseRateHigh: number;
  history: { from: "aaron" | "creator" | "brand"; text: string }[];
  lastAaronMessage: string;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function buildSystemPrompt(body: ChatReplyBody): string {
  const role = body.side === "creator"
    ? `You are ${body.counterpartyName}, a content creator being recruited for the "${body.campaignTitle}" sponsored post by ${body.brandName}.`
    : `You are the ${body.brandName} brand team responding to the talent agent who is matching ${body.counterpartyName} to your "${body.campaignTitle}" campaign.`;

  const negotiationFloor = Math.round(body.baseRateLow);
  const negotiationCeiling = Math.round(body.baseRateHigh);

  return [
    role,
    `The agent (Aaron) just sent you a message. Reply in character with one short message: 1-2 sentences, casual but professional, no emojis.`,
    body.side === "creator"
      ? `You want MORE money than the floor offered. The agent's range is $${negotiationFloor}-$${negotiationCeiling}. Counter UP toward the ceiling, never below the floor. Mention shipping, exclusivity, posting cadence, or deliverable scope as leverage.`
      : `You are the brand. You care about ROI and audience fit. You may push back on rate, ask for usage rights, exclusivity windows, or extra deliverables. Don't accept blindly. Counter on commercial terms.`,
    `Stay under 35 words. Output ONLY the reply text. No preamble, no quotes, no JSON, no markdown, no signature.`,
  ].join("\n\n");
}

function buildUserPrompt(body: ChatReplyBody): string {
  const recent = body.history
    .slice(-6)
    .map((m) => {
      const speaker = m.from === "aaron" ? "Aaron (agent)" : (body.side === "creator" ? body.counterpartyName : `${body.brandName} team`);
      return `${speaker}: ${m.text}`;
    })
    .join("\n");
  return `Recent thread:\n${recent}\n\nLatest from Aaron: ${body.lastAaronMessage}\n\nYour reply:`;
}

// Brand-aware deterministic fallback. Mirrors the voice of the client-side
// `simulatedCreatorReply` / `simulatedBrandReply` in
// frontend/src/app/admin/outreach/page.tsx so a flaky Gemini upstream during
// the live demo never produces a 502 or an empty bubble. We can't import the
// brand fixtures into a Node runtime route without dragging in the embeddings
// JSON, so match by brandName substring (case-insensitive).
function fallbackReply(body: ChatReplyBody): string {
  const brand = body.brandName.toLowerCase();
  const counterFirst = body.counterpartyName.split(" ")[0] ?? body.counterpartyName;
  if (body.side === "creator") {
    if (brand.includes("celsius")) {
      return "Love the ICP fit - can we do a study-session + gym clip combo? Would land on FYP for sure.";
    }
    if (brand.includes("alani")) {
      return "Obsessed with your content honestly. Can you do a morning-routine angle? That's our best-performing format.";
    }
    if (brand.includes("bucked")) {
      return "Could do $800 if you cover shipping on the product? Sounds like a strong fit.";
    }
    if (brand.includes("ghost")) {
      return "Great fit. Can we move on a 30-day exclusive? Our drops move fast.";
    }
    return "Thanks for reaching out! What does your posting schedule look like for the next 30 days, and is there flexibility on rate?";
  }
  // brand-side fallback
  if (brand.includes("celsius")) {
    return `${counterFirst} is exactly our college-ICP profile. Greenlight at $850 base + bonus for ≥500K views. Lock the contract.`;
  }
  if (brand.includes("alani") || brand.includes("bloom")) {
    return `Slate looks good. Locking ${counterFirst} at proposed rate - send the contract for countersign.`;
  }
  if (brand.includes("bucked") || brand.includes("ryse")) {
    return "Approve at $750 + product. Need brand-voice review on draft script before posting.";
  }
  if (brand.includes("ghost")) {
    return "Can we tighten exclusivity to 30 days only? At $900 with that constraint we're in.";
  }
  return "Reviewing internally. Will revert in 48 hours.";
}

// In-memory token bucket: 30 requests / 60s per IP. Defensive — fine if the
// demo URL leaks. Bucket lives in module scope so it persists across requests
// on the same warm Vercel function instance. Cold starts wipe it (worst case:
// a few extra requests until the next cold start), which is acceptable for a
// demo-tier defense.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (buckets.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0]!;
    const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    buckets.set(ip, recent);
    return { ok: false, retryAfter };
  }
  recent.push(now);
  buckets.set(ip, recent);
  // Opportunistic GC: when buckets grow past a few hundred unique IPs, drop
  // any bucket whose newest entry has aged out.
  if (buckets.size > 500) {
    for (const [k, v] of buckets) {
      if (v.length === 0 || v[v.length - 1]! < cutoff) buckets.delete(k);
    }
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_after: rl.retryAfter },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: ChatReplyBody;
  try {
    body = (await req.json()) as ChatReplyBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: fallbackReply(body), fallback: true });
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(body) }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(body) }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 120,
      topP: 0.9,
    },
  };

  try {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      return NextResponse.json({ text: fallbackReply(body), fallback: true });
    }
    const data: { candidates?: GeminiCandidate[] } = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ text: fallbackReply(body), fallback: true });
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ text: fallbackReply(body), fallback: true });
  }
}
