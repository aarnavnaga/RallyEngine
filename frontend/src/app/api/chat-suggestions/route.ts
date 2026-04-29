import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface SuggestBody {
  side: "creator" | "brand";
  counterpartyName: string;
  brandName: string;
  campaignTitle: string;
  baseRateLow: number;
  baseRateHigh: number;
  stage: string;
  history: { from: "aaron" | "creator" | "brand"; text: string }[];
}

/**
 * Dynamic suggestion chip. Labels are NOT hardcoded to Agree/Counter/Skip —
 * the LLM picks a short label per turn. We keep `vibe` so the UI can color
 * the chip and so we can guarantee variety across the 3 chips: one positive,
 * one negative, one inquisitive.
 */
export interface Suggestion {
  vibe: "positive" | "negative" | "inquisitive";
  label: string;
  text: string;
}

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function staticFallback(body: SuggestBody): Suggestion[] {
  const partyName = body.side === "creator" ? body.counterpartyName.split(" ")[0] : body.brandName;
  const baseRate = Math.round((body.baseRateLow + body.baseRateHigh) / 2);
  if (body.stage === "outreach" || body.stage === "negotiating") {
    return [
      {
        vibe: "positive",
        label: "Lock the rate",
        text: `${partyName} — terms work. Sending the contract now at $${baseRate.toLocaleString()} base + bonus structure on top.`,
      },
      {
        vibe: "negative",
        label: "Push back on rate",
        text: `${partyName} — we can stretch to $${(baseRate + 100).toLocaleString()} flat. That's our ceiling for this campaign. Worth it for the audience overlap?`,
      },
      {
        vibe: "inquisitive",
        label: "Ask about cadence",
        text: `${partyName} — quick check on cadence and deliverables. What's your typical posting window, and is the format flexible (TikTok vs. Reel vs. both)?`,
      },
    ];
  }
  return [
    {
      vibe: "positive",
      label: "Confirm receipt",
      text: `${partyName} — confirming you got the contract. Anything you want me to walk through before you sign?`,
    },
    {
      vibe: "negative",
      label: "Flag a tweak",
      text: `${partyName} — one thing on the contract: the exclusivity window feels tight. Open to extending it by a week to make the launch easier?`,
    },
    {
      vibe: "inquisitive",
      label: "Schedule kickoff",
      text: `${partyName} — want to set a 15-min kickoff this week to align on script and the post-launch report?`,
    },
  ];
}

function buildSystemPrompt(body: SuggestBody): string {
  const role = body.side === "creator" ? `the creator ${body.counterpartyName}` : `the ${body.brandName} brand team`;
  return [
    `You are Aaron, a Mercor talent agent managing the negotiation between ${role} on the "${body.campaignTitle}" campaign.`,
    `Generate exactly 3 short reply suggestions for Aaron to send next. Each must have a DIFFERENT VIBE so Aaron has real choice:`,
    "  1. positive   — accept / move forward / lock terms / confirm",
    "  2. negative   — push back / decline / counter / disagree politely",
    "  3. inquisitive — pivot to a different topic, ask a clarifying question, request more info",
    "",
    "Pick a SHORT, DESCRIPTIVE label per chip (2-4 words) that fits the actual content. NEVER use the literal labels 'Agree', 'Counter', 'Skip', or 'Decline' — those are placeholder words. Examples of GOOD labels: 'Lock the rate', 'Hold at $850', 'Push for product first', 'Flag exclusivity', 'Ask about cadence', 'Sync on script'. The label should give Aaron a one-glance read on what the suggestion DOES.",
    "",
    `Each suggestion's TEXT must be 1-2 sentences, casual but professional, no emojis. Stay grounded in the rate range $${Math.round(body.baseRateLow).toLocaleString()}-$${Math.round(body.baseRateHigh).toLocaleString()}.`,
    "",
    'Output STRICT JSON only. Schema: {"suggestions":[{"vibe":"positive","label":"<2-4 word label>","text":"..."},{"vibe":"negative","label":"...","text":"..."},{"vibe":"inquisitive","label":"...","text":"..."}]}. No preamble. No markdown fence.',
  ].join("\n");
}

function buildUserPrompt(body: SuggestBody): string {
  const recent = body.history.slice(-6).map((m) => {
    const speaker = m.from === "aaron" ? "Aaron (you)" : (body.side === "creator" ? body.counterpartyName : `${body.brandName} team`);
    return `${speaker}: ${m.text}`;
  }).join("\n");
  return `Stage: ${body.stage}\n\nRecent thread:\n${recent}\n\nReturn 3 suggestions with the three vibe categories.`;
}

function isVibe(v: unknown): v is Suggestion["vibe"] {
  return v === "positive" || v === "negative" || v === "inquisitive";
}

function parseJsonResponse(raw: string): Suggestion[] | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const obj = JSON.parse(cleaned) as { suggestions?: unknown };
    if (!Array.isArray(obj.suggestions)) return null;
    const result: Suggestion[] = [];
    for (const s of obj.suggestions) {
      if (!s || typeof s !== "object") continue;
      const item = s as { label: unknown; text: unknown; vibe: unknown };
      if (typeof item.label !== "string" || typeof item.text !== "string") continue;
      if (!item.text.trim()) continue;
      const vibe = isVibe(item.vibe) ? item.vibe : null;
      if (!vibe) continue;
      // Reject the placeholder labels the user explicitly forbade.
      const lbl = item.label.trim();
      const lblLower = lbl.toLowerCase();
      if (lblLower === "agree" || lblLower === "counter" || lblLower === "skip" || lblLower === "decline") {
        continue;
      }
      result.push({ vibe, label: lbl, text: item.text.trim() });
    }
    if (result.length !== 3) return null;
    // Make sure all three vibes are represented at least once.
    const vibes = new Set(result.map((s) => s.vibe));
    if (vibes.size !== 3) return null;
    return result;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: staticFallback(body), source: "fallback-no-key" });
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(body) }] },
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(body) }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 500,
      topP: 0.9,
      responseMimeType: "application/json",
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
      return NextResponse.json({ suggestions: staticFallback(body), source: "fallback-api-error" });
    }
    const data: { candidates?: GeminiCandidate[] } = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ suggestions: staticFallback(body), source: "fallback-empty" });
    }
    const parsed = parseJsonResponse(text);
    if (!parsed) {
      return NextResponse.json({ suggestions: staticFallback(body), source: "fallback-bad-json" });
    }
    return NextResponse.json({ suggestions: parsed, source: "gemini" });
  } catch {
    return NextResponse.json({ suggestions: staticFallback(body), source: "fallback-fetch-error" });
  }
}
