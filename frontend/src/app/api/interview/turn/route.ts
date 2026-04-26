import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Body = {
  slug: string;
  title: string;
  messages: ChatMessage[];
};

// System prompt is tuned for the Mercor "Creators & Influencers" expert
// vertical. Same shape as Mercor's brainstorming/creator-skills interview but
// the questions are about content strategy, audience fit, brand voice — not
// engineering whiteboarding.
function systemPromptFor(title: string, slug: string): string {
  const isInfluencer = slug.includes("creator") || slug.includes("brainstorm") || slug.includes("interview");
  const persona = isInfluencer ? "creator-economy specialist" : "domain expert";
  return [
    `You are an AI interviewer running a Mercor "${title}" assessment for the Creators & Influencers expert vertical.`,
    `You are a warm, sharp, ${persona} sizing up the candidate's creative judgment over a 6–10 minute conversation.`,
    "",
    "Style:",
    "- Speak in conversational, plain-spoken English. No corporate jargon, no \"As an AI…\" preambles.",
    "- One question at a time. Wait for the candidate to actually answer before moving on.",
    "- React to what they said before you ask the next thing — quote a phrase back, riff on it, push deeper.",
    "- Probe for specifics: which platforms, which posts, which numbers, which brands. Vagueness is the enemy.",
    "- Keep your turns short — 1 to 3 sentences. The candidate should be talking ~70% of the time.",
    "",
    "Content focus (for Creators & Influencers):",
    "1. Open by asking them to describe a recent post they're proud of and why it worked.",
    "2. Push on audience: who actually watches, age/geo/intent, how they know.",
    "3. Brand fit: name a brand you'd never partner with and why; name one that would be a great fit.",
    "4. Negotiation: walk me through how you'd price a single TikTok post for that brand.",
    "5. Close with: \"What's the one creator-economy take you have that most people get wrong?\"",
    "",
    "Open with a single welcoming sentence and your first question. Do NOT list all five questions up front.",
    "End the interview when you've covered the five topics or the candidate seems done; on close, say \"Thanks — that's the interview. You'll hear back from Mercor within a few days.\"",
  ].join("\n");
}

const FALLBACK_TURNS = [
  "Welcome — I'm your Mercor interviewer for the Brainstorming Session. Let's start easy: tell me about a recent post you put out that worked. What was the hook, and why do you think it landed?",
  "Got it — and who actually watches you? If I scrolled the comments on that post right now, what would the audience look like — age, geo, what they're there for?",
  "Interesting. Now flip it: name one brand you would NEVER partner with, and one that would be a perfect fit. I want to hear the reasoning, not just the names.",
  "Okay — same brand you just named as a perfect fit. Walk me through how you'd price a single TikTok post for them. Talk me through the math, not just the number.",
  "Last one. What's a creator-economy take you have that you think most people get wrong?",
  "Thanks — that's the interview. You'll hear back from Mercor within a few days. Feel free to end the call.",
];

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Graceful fallback so the demo still works without an API key configured.
  // The fallback walks through a scripted 6-turn interview based on how many
  // user messages have been sent so far.
  if (!apiKey) {
    const userTurns = body.messages.filter((m) => m.role === "user").length;
    const next = FALLBACK_TURNS[Math.min(userTurns, FALLBACK_TURNS.length - 1)];
    return NextResponse.json({
      message: next,
      done: userTurns >= FALLBACK_TURNS.length - 1,
      mode: "scripted",
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPromptFor(body.title, body.slug),
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join(" ")
      .trim();

    const done = /\bthat['’]s the interview\b/i.test(text) || /you['’]ll hear back from Mercor/i.test(text);

    return NextResponse.json({ message: text, done, mode: "claude" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic API error";
    return NextResponse.json({ error: message, mode: "error" }, { status: 502 });
  }
}
