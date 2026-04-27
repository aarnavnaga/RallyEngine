import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CheatingLevel = "none" | "low" | "medium" | "high";

interface ObserveBody {
  // base64-encoded JPEG payload, NO data: prefix.
  imageB64: string;
  // mime type, defaults to image/jpeg.
  mime?: string;
  // optional creator id for logging only.
  creatorId?: string;
}

export interface ObserveScore {
  confidence: number; // 0..1
  engagement: number; // 0..1
  cheating: CheatingLevel;
  reason: string;
  mode: "gemini" | "fallback" | "scripted";
}

interface ErrorResponse {
  error: string;
}

// Hard cap: a 480px-wide JPEG at 60% quality is ~30-60KB; base64 doubles that
// to under 100KB. 1.5MB gives a generous ceiling without letting clients
// upload multi-MB frames that would explode Gemini billing.
const MAX_BYTES = 1_500_000;

interface GeminiContentPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiContentPart[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const VISION_MODEL = process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent`;

const SYSTEM_PROMPT = [
  "You are a hiring-interview observer. Score the candidate visible in the frame.",
  "Output STRICT JSON only, with this schema:",
  "{\"confidence\": <0..1>, \"engagement\": <0..1>, \"cheating\": \"none\"|\"low\"|\"medium\"|\"high\", \"reason\": \"<one short sentence>\"}",
  "Confidence: posture, eye contact with camera, calm facial expression. 1.0 is excellent, 0.5 is neutral, 0.0 is visibly anxious or absent.",
  "Engagement: leaning in, facial animation, attentive gaze. 1.0 is engaged, 0.5 is flat, 0.0 is disengaged or distracted.",
  "Cheating: 'none' = clean, 'low' = brief glances off-screen, 'medium' = repeated off-screen reading or visible phone, 'high' = a second person in frame or obvious notes/screen visible.",
  "If the frame is too dark, blank, or no person is visible, return confidence=0.5, engagement=0.5, cheating='none', reason='no clear view of candidate'.",
  "Reason must be a single short sentence under 80 characters. No emojis. No markdown. No code fence.",
].join("\n");

function fallbackScore(reason: string): ObserveScore {
  return {
    confidence: 0.5,
    engagement: 0.5,
    cheating: "none",
    reason,
    mode: "scripted",
  };
}

function clamp01(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeCheating(value: unknown): CheatingLevel {
  if (value === "none" || value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "none";
}

function parseScore(raw: string): Omit<ObserveScore, "mode"> | null {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const reason = typeof obj.reason === "string" ? obj.reason.slice(0, 200) : "";
    return {
      confidence: clamp01(obj.confidence),
      engagement: clamp01(obj.engagement),
      cheating: normalizeCheating(obj.cheating),
      reason,
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ObserveScore | ErrorResponse>> {
  // Pre-parse content-length cap — reject oversized payloads before we even
  // bother parsing the JSON body.
  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let body: ObserveBody;
  try {
    body = (await req.json()) as ObserveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.imageB64 || typeof body.imageB64 !== "string") {
    return NextResponse.json({ error: "imageB64 required" }, { status: 400 });
  }

  // Belt-and-braces post-parse check — the content-length header could be
  // missing or inaccurate (chunked encoding), so re-validate after parsing.
  if (body.imageB64.length > MAX_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  // Strip a data: prefix if the client accidentally sent one.
  const cleaned = body.imageB64.startsWith("data:")
    ? body.imageB64.slice(body.imageB64.indexOf(",") + 1)
    : body.imageB64;
  const mime = body.mime ?? "image/jpeg";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Demo-friendly fallback: pretend the candidate looks fine.
    return NextResponse.json(fallbackScore("no API key, default neutral score"));
  }

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: "Score this single frame from a live video interview." },
          { inlineData: { mimeType: mime, data: cleaned } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 160,
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
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) {
      return NextResponse.json({
        ...fallbackScore("vision upstream error"),
        mode: "fallback",
      });
    }
    const data = (await resp.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) {
      return NextResponse.json({
        ...fallbackScore("vision empty response"),
        mode: "fallback",
      });
    }
    const parsed = parseScore(text);
    if (!parsed) {
      return NextResponse.json({
        ...fallbackScore("vision parse error"),
        mode: "fallback",
      });
    }
    const score: ObserveScore = { ...parsed, mode: "gemini" };
    return NextResponse.json(score);
  } catch {
    return NextResponse.json({
      ...fallbackScore("vision fetch failed"),
      mode: "fallback",
    });
  }
}
