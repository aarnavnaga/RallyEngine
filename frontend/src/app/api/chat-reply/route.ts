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
    return "Approve at $750 + product. Want to review the draft against our brand-voice fit score before posting.";
  }
  if (brand.includes("ghost")) {
    return "Can we tighten exclusivity to 30 days only? At $900 with that constraint we're in.";
  }
  return "Reviewing internally. Will revert in 48 hours.";
}

// Rate limiting for this route lives in the edge middleware (src/middleware.ts:
// 30 req/60s per IP, same-origin gate). Middleware rejects before this handler
// runs, so this function only sees allowed traffic.
//
// Round-16: harden against malformed payloads. The previous shape only
// wrapped the fetch in try/catch, so buildSystemPrompt / buildUserPrompt /
// fallbackReply could throw uncaught (e.g. body.history.slice when history
// is undefined, body.brandName.toLowerCase when brandName is undefined),
// returning 500 with empty body. Now: validate first, normalize, then run
// inside an outer try/catch that always returns a 200 fallback so the demo
// bubble never sees an error.

const STATIC_FALLBACK = "Reviewing internally. Will revert in 48 hours.";

interface UnknownObject {
  [key: string]: unknown;
}

function normalizeBody(raw: unknown): ChatReplyBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as UnknownObject;
  // Required fields — if any of these are missing or wrong type, we can't
  // build a coherent prompt. Caller will see a 200 fallback.
  if (typeof o.brandName !== "string") return null;
  if (typeof o.counterpartyName !== "string") return null;
  if (!Array.isArray(o.history)) return null;
  return {
    side: o.side === "brand" ? "brand" : "creator",
    counterpartyName: o.counterpartyName,
    brandName: o.brandName,
    campaignTitle:
      typeof o.campaignTitle === "string" ? o.campaignTitle : "this campaign",
    baseRateLow:
      typeof o.baseRateLow === "number" && Number.isFinite(o.baseRateLow)
        ? o.baseRateLow
        : 500,
    baseRateHigh:
      typeof o.baseRateHigh === "number" && Number.isFinite(o.baseRateHigh)
        ? o.baseRateHigh
        : 1500,
    history: (o.history as unknown[]).filter(
      (m): m is { from: "aaron" | "creator" | "brand"; text: string } =>
        !!m &&
        typeof m === "object" &&
        typeof (m as UnknownObject).text === "string" &&
        ["aaron", "creator", "brand"].includes(
          String((m as UnknownObject).from),
        ),
    ),
    lastAaronMessage:
      typeof o.lastAaronMessage === "string" ? o.lastAaronMessage : "",
  };
}

export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
    }

    const body = normalizeBody(raw);
    if (!body) {
      // Malformed: missing required brandName / counterpartyName / history.
      // 200 with fallback so a stale client or curl probe never sees a 5xx.
      return NextResponse.json(
        { text: STATIC_FALLBACK, fallback: true, reason: "malformed body" },
        { status: 200 },
      );
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
  } catch (e) {
    // Last-resort safety net. Anything that escapes the inner blocks
    // (e.g. an unexpected throw inside fallbackReply itself) should still
    // produce a 200 fallback so the haggler bubble renders. The reason
    // string is a debug aid for ops, never shown to the user.
    const reason = e instanceof Error ? e.message.slice(0, 120) : "internal_error";
    return NextResponse.json(
      { text: STATIC_FALLBACK, fallback: true, reason },
      { status: 200 },
    );
  }
}
