import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TurnBody {
  slug: string;
  title: string;
  messages: ChatMessage[];
}

// Per-message limits — without these, a malicious client could send
// `content: "a".repeat(10_000_000)` in a long messages array and force the
// server to bill Gemini for a 10MB+ generateContent call. Cap aggressively
// so the worst-case payload is bounded.
const MAX_MESSAGES = 60;
const MAX_CONTENT_LEN = 4000;
// Hard total-payload cap — refuses oversized requests at the boundary
// before we parse JSON. 256KB is well above MAX_MESSAGES * MAX_CONTENT_LEN
// even after JSON encoding overhead, so legitimate clients are unaffected.
const MAX_BYTES = 256_000;

interface TurnResponse {
  message: string;
  done: boolean;
  mode: "scripted" | "gemini" | "fallback";
}

interface ErrorResponse {
  error: string;
  mode?: "error";
}

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiContentPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// System prompt is tuned for the Mercor "Creators & Influencers" expert
// vertical. Same shape as Mercor's brainstorming/creator-skills interview but
// the questions are about content strategy, audience fit, brand voice, not
// engineering whiteboarding.
function systemPromptFor(title: string, slug: string): string {
  const isInfluencer =
    slug.includes("creator") ||
    slug.includes("brainstorm") ||
    slug.includes("interview");
  const persona = isInfluencer ? "creator-economy specialist" : "domain expert";
  return [
    `You are an AI interviewer running a Mercor "${title}" assessment for the Creators & Influencers expert vertical.`,
    `You are a warm, sharp, ${persona} sizing up the candidate's creative judgment over a 6-10 minute conversation.`,
    "",
    "Style:",
    "- Speak in conversational, plain-spoken English. No corporate jargon, no \"As an AI...\" preambles.",
    "- One question at a time. Wait for the candidate to actually answer before moving on.",
    "- React to what they said before you ask the next thing. Quote a phrase back, riff on it, push deeper.",
    "- Probe for specifics: which platforms, which posts, which numbers, which brands. Vagueness is the enemy.",
    "- Keep your turns short, 1 to 3 sentences. The candidate should be talking ~70% of the time.",
    "- This is a SPOKEN conversation. The candidate's reply is transcribed from voice. Their words may be a little disfluent. Do not comment on grammar or transcription artifacts.",
    "",
    "Content focus (for Creators & Influencers):",
    "1. Open by asking them to describe a recent post they're proud of and why it worked.",
    "2. Push on audience: who actually watches, age/geo/intent, how they know.",
    "3. Brand fit: name a brand you'd never partner with and why; name one that would be a great fit.",
    "4. Negotiation: walk me through how you'd price a single TikTok post for that brand.",
    "5. Close with: \"What's the one creator-economy take you have that most people get wrong?\"",
    "",
    "Open with a single welcoming sentence and your first question. Do NOT list all five questions up front.",
    "End the interview when you've covered the five topics or the candidate seems done; on close, say \"Thanks, that's the interview. You'll hear back from Mercor within a few days.\"",
  ].join("\n");
}

// The "scripted" path is the no-API-key fallback — the demo runs on Vercel
// without GEMINI_API_KEY, so we have to make this path feel responsive
// without an LLM. Each TOPIC has the question text plus a "nudge" the AI
// uses if the candidate's answer was too thin to advance on. We add a
// quoted-phrase reactive opener built from the user's actual last answer
// so the conversation isn't a fixed canned loop.
interface Topic {
  // Used when this is the very first turn (no user answer yet).
  intro?: string;
  // The actual question for this topic.
  question: string;
  // What to say if the previous answer was too thin to advance the arc.
  // null = always advance (used on open + close).
  nudge: string | null;
}

const TOPIC_ARC: Topic[] = [
  {
    intro: "Welcome, I'm your Mercor interviewer for this session.",
    question:
      "Let's start easy: tell me about a recent post you put out that worked. What was the hook, and why do you think it landed?",
    nudge: null,
  },
  {
    question:
      "Who actually watches you? If I scrolled the comments on that post right now, what would the audience look like — age, geo, what they're there for?",
    nudge:
      "I want a bit more there. Pick one detail and go deeper — was it the first two seconds, the audio, the caption, the cut? Something specific.",
  },
  {
    question:
      "Now flip it: name one brand you would never partner with, and one that would be a perfect fit. I want the reasoning, not just the names.",
    nudge:
      "Stay with me on the audience. Who's the typical person scrolling your comments — what else do they watch, what else do they post?",
  },
  {
    question:
      "Walk me through how you'd price a single TikTok post for that perfect-fit brand. The math, not just the number.",
    nudge:
      "Push me on the brand fit. Why that specific brand, and not the next one in the same category?",
  },
  {
    question:
      "Last one: what's a creator-economy take you have that you think most people get wrong?",
    nudge:
      "Walk me through the pricing math. How do you actually arrive at the number — followers, engagement, exclusivity, what?",
  },
  {
    intro: "Thanks, that's the interview.",
    question: "You'll hear back from Mercor within a few days. Feel free to end the call.",
    nudge: null,
  },
];

function isDoneSignal(text: string): boolean {
  const lc = text.toLowerCase();
  return (
    lc.includes("that's the interview") ||
    lc.includes("thats the interview") ||
    lc.includes("you'll hear back from mercor") ||
    lc.includes("youll hear back from mercor")
  );
}

// Returns true if the answer is substantive enough to advance the topic arc.
// "hello", "hello hello hello", "yeah", "idk" → false. Two real sentences → true.
function isSubstantive(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 12) return false;
  const words = trimmed
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter((w) => w.length > 1);
  if (words.length < 4) return false;
  const lower = words.map((w) => w.toLowerCase());
  const unique = new Set(lower);
  // Repeating the same word ("hello hello hello hello") shouldn't pass.
  if (unique.size < 3) return false;
  // Filler-only answers shouldn't pass either.
  const FILLER = new Set([
    "hi",
    "hey",
    "hello",
    "yeah",
    "yes",
    "no",
    "ok",
    "okay",
    "idk",
    "um",
    "uh",
    "like",
  ]);
  const meaningful = lower.filter((w) => !FILLER.has(w));
  if (meaningful.length < 3) return false;
  return true;
}

// Builds a short reactive opener that quotes a snippet of the last answer.
// Empty → no opener. Thin → a generic "Okay." / "Got it." Substantive →
// a quoted slice of their words plus a transition phrase. Keep these
// SHORT — TTS reads them out loud at the top of the next question.
function reactiveOpener(answer: string, transition: string): string {
  const trimmed = answer.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (!isSubstantive(trimmed)) {
    // Thin answer that we're advancing past anyway (e.g. on the close turn).
    return "Got it.";
  }
  // Pull a 4-9 word slice for the quote.
  const words = trimmed.split(" ");
  const sliceLen = Math.min(9, Math.max(4, Math.floor(words.length / 2)));
  let slice = words.slice(0, sliceLen).join(" ").replace(/[",.!?;:]+$/, "");
  if (slice.length > 70) {
    slice = slice.slice(0, 70).replace(/\s+\S*$/, "");
  }
  return `"${slice}" — ${transition}.`;
}

function scriptedTurn(messages: ChatMessage[]): TurnResponse {
  const userMessages = messages.filter((m) => m.role === "user");
  const userTurns = userMessages.length;
  const lastUserAnswer = userMessages[userMessages.length - 1]?.content ?? "";

  // Turn 0 — no user answer yet. Open with the welcome + Q1.
  if (userTurns === 0) {
    const t = TOPIC_ARC[0];
    const msg = [t.intro, t.question].filter(Boolean).join(" ");
    return { message: msg, done: false, mode: "scripted" };
  }

  // The candidate just answered the question for topic (userTurns - 1).
  // If that answer was thin AND the topic has a nudge, stay on it.
  const previousTopicIdx = userTurns - 1;
  const previousTopic = TOPIC_ARC[Math.min(previousTopicIdx, TOPIC_ARC.length - 1)];
  if (
    previousTopic.nudge &&
    !isSubstantive(lastUserAnswer) &&
    previousTopicIdx < TOPIC_ARC.length - 1
  ) {
    // Re-prompt on the same topic with a personalized nudge.
    const opener = reactiveOpener(lastUserAnswer, "stay with me");
    const msg = opener ? `${opener} ${previousTopic.nudge}` : previousTopic.nudge;
    return { message: msg, done: false, mode: "scripted" };
  }

  // Otherwise advance to the next topic and react to what they said.
  const nextTopicIdx = Math.min(userTurns, TOPIC_ARC.length - 1);
  const nextTopic = TOPIC_ARC[nextTopicIdx];
  const isClose = nextTopicIdx === TOPIC_ARC.length - 1;

  // Pick a transition phrase that varies by topic so consecutive turns don't
  // all start with "okay."
  const TRANSITIONS = ["okay", "got it", "interesting", "fair", "alright"];
  const transition = TRANSITIONS[nextTopicIdx % TRANSITIONS.length];
  const opener = isClose ? "" : reactiveOpener(lastUserAnswer, transition);

  let msg: string;
  if (isClose) {
    msg = [nextTopic.intro, nextTopic.question].filter(Boolean).join(" ");
  } else if (opener) {
    msg = `${opener} ${nextTopic.question}`;
  } else {
    msg = nextTopic.question;
  }

  return {
    message: msg,
    done: isClose,
    mode: "scripted",
  };
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<TurnResponse | ErrorResponse>> {
  // Pre-parse content-length cap — reject oversized payloads early.
  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: TurnBody;
  try {
    body = (await req.json()) as TurnBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  if (body.messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "payload too large" }, { status: 400 });
  }

  for (const m of body.messages) {
    if (!m || typeof m !== "object") {
      return NextResponse.json({ error: "payload too large" }, { status: 400 });
    }
    const content = (m as ChatMessage).content;
    if (typeof content !== "string" || content.length > MAX_CONTENT_LEN) {
      return NextResponse.json({ error: "payload too large" }, { status: 400 });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Graceful fallback so the demo still works without an API key configured.
  if (!apiKey) {
    return NextResponse.json(scriptedTurn(body.messages));
  }

  const systemText = systemPromptFor(body.title, body.slug);
  const contents = body.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // If the conversation just started, prompt the model to open the interview.
  if (contents.length === 0) {
    contents.push({
      role: "user",
      parts: [{ text: "Begin the interview now with your warm welcome and first question." }],
    });
  }

  const payload = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 220,
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
      // Soft-fall back to scripted on upstream error so the interview never dead-ends.
      const fallback = scriptedTurn(body.messages);
      return NextResponse.json({ ...fallback, mode: "fallback" });
    }
    const data = (await resp.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join(" ")
      .trim();
    if (!text) {
      const fallback = scriptedTurn(body.messages);
      return NextResponse.json({ ...fallback, mode: "fallback" });
    }
    return NextResponse.json({
      message: text,
      done: isDoneSignal(text),
      mode: "gemini",
    });
  } catch {
    const fallback = scriptedTurn(body.messages);
    return NextResponse.json({ ...fallback, mode: "fallback" });
  }
}
