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

interface Suggestion {
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
      { label: "Agree", text: `${partyName} - terms work. Sending the contract now: $${baseRate.toLocaleString()} base + bonus structure on top.` },
      { label: "Counter", text: `${partyName} - we can stretch to $${(baseRate + 100).toLocaleString()} flat. That's our ceiling for this campaign. Sound fair?` },
      { label: "Skip", text: `${partyName} - want to make sure we're aligned. What's your typical posting cadence and deliverable format?` },
    ];
  }
  return [
    { label: "Agree", text: `${partyName} - confirming you got the contract. Anything you want me to walk through before you sign?` },
    { label: "Counter", text: `${partyName} - quick clarification on the deliverable scope before we lock - any flexibility on the post window?` },
    { label: "Skip", text: `${partyName} - once the post is up I'll send you the comment-relevance report 48hrs after launch.` },
  ];
}

function buildSystemPrompt(body: SuggestBody): string {
  const role = body.side === "creator" ? `the creator ${body.counterpartyName}` : `the ${body.brandName} brand team`;
  return [
    `You are Aaron, a Mercor talent agent. You're managing the negotiation between ${role} on the "${body.campaignTitle}" campaign.`,
    `The chat history is below. Generate exactly 3 short reply suggestions for Aaron (the AGENT) to send next. The 3 must follow this vibe:`,
    `1. AGREE — accept / move forward / lock terms`,
    `2. COUNTER — push back / negotiate / disagree politely`,
    `3. SKIP — deflect or pivot to a different topic (deliverable scope, timing, exclusivity, shipping)`,
    `Each must be 1-2 sentences, casual but professional, no emojis. Stay grounded in the rate range $${Math.round(body.baseRateLow).toLocaleString()}-$${Math.round(body.baseRateHigh).toLocaleString()}.`,
    `Output STRICT JSON only. Schema: {"suggestions":[{"label":"Agree","text":"..."},{"label":"Counter","text":"..."},{"label":"Skip","text":"..."}]}. No preamble. No markdown fence.`,
  ].join("\n");
}

function buildUserPrompt(body: SuggestBody): string {
  const recent = body.history.slice(-6).map((m) => {
    const speaker = m.from === "aaron" ? "Aaron (you)" : (body.side === "creator" ? body.counterpartyName : `${body.brandName} team`);
    return `${speaker}: ${m.text}`;
  }).join("\n");
  return `Stage: ${body.stage}\n\nRecent thread:\n${recent}\n\nReturn 3 suggestions Aaron could send next.`;
}

function parseJsonResponse(raw: string): Suggestion[] | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const obj = JSON.parse(cleaned) as { suggestions?: unknown };
    if (!Array.isArray(obj.suggestions)) return null;
    const result: Suggestion[] = [];
    for (const s of obj.suggestions) {
      if (s && typeof s === "object" && "label" in s && "text" in s) {
        const item = s as { label: unknown; text: unknown };
        if (typeof item.label === "string" && typeof item.text === "string" && item.text.trim()) {
          result.push({ label: item.label.trim(), text: item.text.trim() });
        }
      }
    }
    return result.length === 3 ? result : null;
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
      temperature: 0.8,
      maxOutputTokens: 400,
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
