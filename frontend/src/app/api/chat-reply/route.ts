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

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  let body: ChatReplyBody;
  try {
    body = (await req.json()) as ChatReplyBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
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
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
    const data: { candidates?: GeminiCandidate[] } = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "empty response" }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
