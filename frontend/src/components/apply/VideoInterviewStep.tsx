"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  Info,
  Clock,
  Hand,
  RefreshCcw,
  Lock,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { ClaudeMark } from "@/components/shell/ClaudeMark";
import type {
  InterviewFrameScore,
  InterviewMessage,
} from "@/app/api/interview/finalize/route";
import type { ObserveScore } from "@/app/api/interview/observe/route";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | "idle"
  | "requesting"
  | "denied"
  | "ready"
  | "interviewing"
  | "thinking"
  | "finished"
  | "error";

interface Permissions {
  audio: boolean;
  video: boolean;
}

interface TurnResponse {
  message: string;
  done: boolean;
  mode: "scripted" | "gemini" | "fallback";
}

interface VideoInterviewStepProps {
  creatorId: string;
  campaignId: string;
  campaignTitle: string;
  done: boolean;
  onComplete: () => void;
  // Called when the user's browser does not support voice or denies permissions.
  onFallbackToText: () => void;
  // When true, render the Mercor-style two-column pre-flight (live camera +
  // device pickers + info column with tooltipped underlines + big Start CTA)
  // matching work.mercor.com/interview/<id>. When false (default), use the
  // compact card pre-flight that fits inside the apply-page right rail.
  mercorStyle?: boolean;
  // Optional descriptive blurb rendered under "This is an AI interview" in
  // mercorStyle. Falls back to a creator-economy default.
  preflightDescription?: string;
}

// Minimal Web Speech API typings, kept local because TS lib doesn't ship them.
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:
    | ((event: {
        results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
        // resultIndex points to the index of the FIRST result in `results`
        // that's new since the previous fire. Without this, iterating from 0
        // re-processes already-finalized results on every event, causing
        // exponential duplication ("I made a real on I made a real on…").
        resultIndex: number;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

type WindowWithSpeech = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FRAME_INTERVAL_MS = 10_000;
const MAX_FRAMES = 12;
const FRAME_MAX_WIDTH = 480;
const FRAME_JPEG_QUALITY = 0.6;
const SILENCE_TIMEOUT_MS = 3_500;
const TURN_RETRY_MS = 1_200;
const STORAGE_KEY_PREFIX = "mercor.interview.";
const STORAGE_VERSION = "v1";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const enUS = voices.find(
    (v) => v.lang === "en-US" && /female|samantha|jenny|ava|aria|nicky/i.test(v.name),
  );
  if (enUS) return enUS;
  return voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en")) ?? voices[0];
}

function isoNow(): string {
  return new Date().toISOString();
}

async function captureCompressedFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const targetWidth = Math.min(FRAME_MAX_WIDTH, video.videoWidth);
  const ratio = targetWidth / video.videoWidth;
  const targetHeight = Math.round(video.videoHeight * ratio);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  const dataUrl = canvas.toDataURL("image/jpeg", FRAME_JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) return null;
  return dataUrl.split(",", 2)[1] ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VideoInterviewStep({
  creatorId,
  campaignId,
  campaignTitle,
  done,
  onComplete,
  onFallbackToText,
  mercorStyle = false,
  preflightDescription,
}: VideoInterviewStepProps): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>("idle");
  const [permissions, setPermissions] = useState<Permissions>({ audio: false, video: false });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [scores, setScores] = useState<InterviewFrameScore[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [aiSpeaking, setAiSpeaking] = useState<boolean>(false);
  const [userAnswerDraft, setUserAnswerDraft] = useState<string>("");
  // typedAnswer is for browsers without SpeechRecognition (Firefox/Safari).
  const [typedAnswer, setTypedAnswer] = useState<string>("");
  // Consent gate — must be true before we can request camera/mic. Disclosed
  // pre-flight so candidates know frames go to Gemini for scoring.
  const [consentGiven, setConsentGiven] = useState<boolean>(false);
  // Device enumeration for the Mercor-style preflight (3 dropdowns: mic,
  // speaker, camera). Populated after the first successful getUserMedia call
  // because labels are only exposed once the user has granted permission.
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioIn, setSelectedAudioIn] = useState<string>("");
  const [selectedAudioOut, setSelectedAudioOut] = useState<string>("");
  const [selectedVideoIn, setSelectedVideoIn] = useState<string>("");

  const sttSupported = useMemo<boolean>(() => getSpeechRecognitionCtor() !== null, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // Browser timer ids are numbers; we keep them in refs so cleanup handlers
  // can clear them across re-renders.
  const silenceTimerRef = useRef<number | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const initialFrameTimerRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const finalAnswerRef = useRef<string>("");
  const finishedRef = useRef<boolean>(false);
  const messagesRef = useRef<InterviewMessage[]>([]);
  const scoresRef = useRef<InterviewFrameScore[]>([]);
  const ttsVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const phaseRef = useRef<Phase>("idle");
  // Lifetime-scoped AbortController so any in-flight fetch is cancelled when
  // the component unmounts (user navigates away mid-interview). Without this,
  // each fetch's AbortSignal.timeout() can keep the request alive for 15s+
  // and trigger setState on an unmounted component.
  const abortRef = useRef<AbortController | null>(null);
  // Set when we're intentionally stopping the media stream (e.g. cleanup,
  // finalize). Prevents the track.onended listener — which also fires when
  // we call track.stop() — from looping back into the lost-permission
  // handler and flipping phase to "denied" during normal teardown.
  const stoppingMediaRef = useRef<boolean>(false);

  // Keep refs in sync so timers/handlers always see latest state without
  // having to re-create themselves.
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Lifetime AbortController — fired on unmount so all in-flight fetches
  // (observe/turn/finalize) are cancelled and nothing tries to setState
  // after the component is gone.
  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    return () => {
      ac.abort();
    };
  }, []);

  // Pre-load the TTS voice list once browsers populate it.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const apply = () => {
      ttsVoiceRef.current = pickEnglishVoice();
    };
    apply();
    window.speechSynthesis.onvoiceschanged = apply;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Cleanup helpers
  // ---------------------------------------------------------------------------

  const stopMediaStream = useCallback((): void => {
    const s = streamRef.current;
    if (s) {
      // Mark this as an intentional stop so the track.onended listener that
      // we attach in requestPermissions doesn't recurse back into the
      // permission-revoked handler.
      stoppingMediaRef.current = true;
      for (const track of s.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      streamRef.current = null;
      // Reset on next tick so any pending "ended" events from track.stop()
      // are seen as intentional.
      window.setTimeout(() => {
        stoppingMediaRef.current = false;
      }, 0);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopRecognition = useCallback((): void => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopFrameCapture = useCallback((): void => {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    if (initialFrameTimerRef.current !== null) {
      window.clearTimeout(initialFrameTimerRef.current);
      initialFrameTimerRef.current = null;
    }
  }, []);

  const stopTts = useCallback((): void => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAiSpeaking(false);
  }, []);

  const fullCleanup = useCallback((): void => {
    stopRecognition();
    stopFrameCapture();
    stopMediaStream();
    stopTts();
  }, [stopFrameCapture, stopMediaStream, stopRecognition, stopTts]);

  useEffect(() => {
    return () => {
      fullCleanup();
    };
  }, [fullCleanup]);

  // ---------------------------------------------------------------------------
  // Speak (TTS)
  // ---------------------------------------------------------------------------

  const speakQuestion = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        // Guard against multiple resolution paths (onend/onerror/safety-timer)
        // racing each other — only the first one wins. The safety timer is
        // captured into a local handle so onend/onerror can cancel it before
        // it fires, avoiding setState calls on potentially-unmounted components.
        let resolved = false;
        let safetyTimer: number | null = null;
        const settle = (): void => {
          if (resolved) return;
          resolved = true;
          if (safetyTimer !== null) {
            window.clearTimeout(safetyTimer);
            safetyTimer = null;
          }
          setAiSpeaking(false);
          resolve();
        };
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1.0;
          utter.pitch = 1.0;
          utter.volume = 1.0;
          utter.lang = "en-US";
          if (ttsVoiceRef.current) utter.voice = ttsVoiceRef.current;
          utter.onstart = () => setAiSpeaking(true);
          utter.onend = () => {
            settle();
          };
          utter.onerror = () => {
            settle();
          };
          window.speechSynthesis.speak(utter);
          // Safety: resolve even if onend never fires.
          safetyTimer = window.setTimeout(() => {
            settle();
          }, Math.max(4_000, text.length * 60));
        } catch {
          settle();
        }
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Vision frame capture loop
  // ---------------------------------------------------------------------------

  const captureAndScoreFrame = useCallback(async (): Promise<void> => {
    if (frameCountRef.current >= MAX_FRAMES) return;
    if (finishedRef.current) return;
    if (!permissions.video) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    let imageB64: string | null = null;
    try {
      imageB64 = await captureCompressedFrame(video, canvas);
    } catch {
      return;
    }
    if (!imageB64) return;
    frameCountRef.current += 1;
    const lifetimeSignal = abortRef.current?.signal;
    if (lifetimeSignal?.aborted) return;
    const signal = lifetimeSignal
      ? AbortSignal.any([lifetimeSignal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000);
    try {
      const resp = await fetch("/api/interview/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageB64, mime: "image/jpeg", creatorId }),
        signal,
      });
      if (lifetimeSignal?.aborted) return;
      if (!resp.ok) return;
      const data = (await resp.json()) as ObserveScore;
      if (lifetimeSignal?.aborted) return;
      const frameScore: InterviewFrameScore = {
        confidence: data.confidence,
        engagement: data.engagement,
        cheating: data.cheating,
        reason: data.reason,
        ts: isoNow(),
      };
      setScores((prev) => [...prev, frameScore]);
    } catch {
      // Network drop on observe is non-fatal; we just lose that data point.
    }
  }, [creatorId, permissions.video]);

  const startFrameCapture = useCallback((): void => {
    if (frameTimerRef.current !== null) return;
    if (!permissions.video) return;
    // First frame after a short delay so the camera has stabilized.
    initialFrameTimerRef.current = window.setTimeout(() => {
      void captureAndScoreFrame();
    }, 4_000);
    frameTimerRef.current = window.setInterval(() => {
      void captureAndScoreFrame();
    }, FRAME_INTERVAL_MS);
  }, [captureAndScoreFrame, permissions.video]);

  // ---------------------------------------------------------------------------
  // Network: ask the AI for the next turn
  // ---------------------------------------------------------------------------

  const fetchNextTurn = useCallback(
    async (history: InterviewMessage[], attempt = 0): Promise<TurnResponse> => {
      const lifetimeSignal = abortRef.current?.signal;
      const signal = lifetimeSignal
        ? AbortSignal.any([lifetimeSignal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000);
      try {
        const resp = await fetch("/api/interview/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: campaignId,
            title: campaignTitle,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal,
        });
        if (!resp.ok) throw new Error("turn fetch !ok");
        return (await resp.json()) as TurnResponse;
      } catch (err) {
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, TURN_RETRY_MS));
          return fetchNextTurn(history, attempt + 1);
        }
        // Static fallback when network is dead so we never dead-end.
        const userTurns = history.filter((m) => m.role === "user").length;
        const fallback = [
          "Tell me about a recent post that worked. What was the hook, and why did it land?",
          "Got it. Who's actually watching, age, geo, what they're there for?",
          "Name a brand you'd never partner with, and one that would be a perfect fit. Why?",
          "Walk me through how you'd price a single TikTok post for that perfect-fit brand.",
          "Last one: what's a creator-economy take you have that most people get wrong?",
          "Thanks, that's the interview. You'll hear back from Mercor within a few days.",
        ];
        const idx = Math.min(userTurns, fallback.length - 1);
        const isLast = idx === fallback.length - 1;
        // Suppress unused-variable warning for err — keep it for future logging.
        void err;
        return { message: fallback[idx], done: isLast, mode: "fallback" };
      }
    },
    [campaignId, campaignTitle],
  );

  // ---------------------------------------------------------------------------
  // Finalize and persist
  // ---------------------------------------------------------------------------

  const finalize = useCallback(
    async (latestMessages: InterviewMessage[], latestScores: InterviewFrameScore[]): Promise<void> => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stopRecognition();
      stopFrameCapture();
      stopTts();

      const finishedAt = isoNow();
      const payload = {
        creatorId,
        campaignId,
        campaignTitle,
        transcript: latestMessages,
        scores: latestScores,
        finishedAt,
      };

      let summary = "";
      const lifetimeSignal = abortRef.current?.signal;
      const finalizeSignal = lifetimeSignal
        ? AbortSignal.any([lifetimeSignal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000);
      try {
        const resp = await fetch("/api/interview/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: finalizeSignal,
        });
        if (lifetimeSignal?.aborted) return;
        if (resp.ok) {
          const data = (await resp.json()) as {
            ok: boolean;
            record: { summary: { summary: string } };
          };
          summary = data.record?.summary?.summary ?? "";
        }
      } catch {
        // Persistence error is non-fatal for the user's flow.
      }
      if (lifetimeSignal?.aborted) return;

      // Always write to localStorage so the admin card sees it even if the
      // server-side store is empty (e.g. dev reload).
      try {
        const local = {
          transcript: latestMessages,
          scores: latestScores,
          summary,
          finishedAt,
          campaignId,
          campaignTitle,
        };
        localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${creatorId}.${STORAGE_VERSION}`,
          JSON.stringify(local),
        );
      } catch {
        // localStorage may be disabled (incognito / quota) — non-fatal.
      }

      stopMediaStream();
      setPhase("finished");
      onComplete();
    },
    [
      campaignId,
      campaignTitle,
      creatorId,
      onComplete,
      stopFrameCapture,
      stopMediaStream,
      stopRecognition,
      stopTts,
    ],
  );

  // ---------------------------------------------------------------------------
  // Conversation flow
  // ---------------------------------------------------------------------------

  const submitUserAnswer = useCallback(
    async (answer: string): Promise<void> => {
      const cleaned = answer.trim();
      if (!cleaned) return;
      stopRecognition();
      setInterimTranscript("");
      setUserAnswerDraft("");
      setTypedAnswer("");

      const userMsg: InterviewMessage = { role: "user", content: cleaned, ts: isoNow() };
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      setPhase("thinking");

      const turn = await fetchNextTurn(next);
      const aiMsg: InterviewMessage = {
        role: "assistant",
        content: turn.message,
        ts: isoNow(),
      };
      const after = [...next, aiMsg];
      setMessages(after);

      await speakQuestion(turn.message);

      if (turn.done) {
        await finalize(after, scoresRef.current);
        return;
      }

      setPhase("interviewing");
      // Restart STT for next answer.
      if (sttSupported) startRecognitionRef.current?.();
    },
    [fetchNextTurn, finalize, speakQuestion, sttSupported, stopRecognition],
  );

  // ---------------------------------------------------------------------------
  // Speech Recognition (STT)
  // ---------------------------------------------------------------------------

  const startRecognitionRef = useRef<(() => void) | null>(null);

  const startRecognition = useCallback((): void => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (recognitionRef.current) return;
    finalAnswerRef.current = "";
    setInterimTranscript("");
    let rec: ISpeechRecognition;
    try {
      rec = new Ctor();
    } catch {
      return;
    }
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      // Iterate from event.resultIndex, NOT 0. event.results is the
      // cumulative result list since recognition started; if we restart at
      // 0 every fire, every already-finalized chunk gets appended to
      // finalAnswerRef again on each subsequent fire — producing the
      // "I made a real on I made a real on …" cascade we hit on Q1.
      // The first fire usually has resultIndex=0 and one new result;
      // subsequent fires have resultIndex pointing past the previously
      // delivered finals.
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        const transcript = r[0]?.transcript ?? "";
        if (r.isFinal) {
          const cleaned = transcript.trim();
          if (cleaned) {
            finalAnswerRef.current = finalAnswerRef.current
              ? `${finalAnswerRef.current} ${cleaned}`
              : cleaned;
          }
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);
      setUserAnswerDraft(
        finalAnswerRef.current + (interim ? " " + interim : ""),
      );
      // Reset the silence timer on every new chunk.
      if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        const answer = finalAnswerRef.current.trim();
        if (answer.length > 0) {
          void submitUserAnswer(answer);
        }
      }, SILENCE_TIMEOUT_MS);
    };
    rec.onerror = (event) => {
      // 'no-speech' / 'aborted' are routine; surface only fatal errors.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setErrorMessage(`Voice recognition error: ${event.error}`);
      }
    };
    rec.onend = () => {
      // If the engine ends but the user hasn't submitted, keep listening
      // (Chrome will end after silence even with continuous=true). Read
      // phase from a ref so we always see the latest value.
      if (
        !finishedRef.current &&
        phaseRef.current === "interviewing" &&
        silenceTimerRef.current === null
      ) {
        try {
          rec.start();
        } catch {
          // ignore double-start
        }
      }
    };
    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      recognitionRef.current = null;
    }
  }, [submitUserAnswer]);

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  // ---------------------------------------------------------------------------
  // Permission gate + start
  // ---------------------------------------------------------------------------

  // Attach a one-shot listener to every track so we can detect mid-interview
  // permission revocation (Safari 17+ allows this). When the user revokes
  // mic/cam from the browser UI, the track's "ended" event fires; we treat
  // that as a fatal interview interruption (unless we triggered it ourselves
  // via stopMediaStream, in which case stoppingMediaRef.current is true).
  const handleTrackEnded = useCallback((): void => {
    if (stoppingMediaRef.current) return;
    if (finishedRef.current) return;
    stopFrameCapture();
    stopRecognition();
    stopTts();
    setErrorMessage("Camera or microphone access was revoked mid-interview.");
    setPhase("denied");
  }, [stopFrameCapture, stopRecognition, stopTts]);

  const attachTrackEndedListeners = useCallback(
    (stream: MediaStream): void => {
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", handleTrackEnded);
      }
    },
    [handleTrackEnded],
  );

  const requestPermissions = useCallback(async (): Promise<void> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPhase("denied");
      setErrorMessage("This browser doesn't support camera or microphone access.");
      return;
    }
    setPhase("requesting");
    setErrorMessage("");
    let audio = false;
    let video = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      audio = stream.getAudioTracks().length > 0;
      video = stream.getVideoTracks().length > 0;
      streamRef.current = stream;
    } catch {
      // Try audio-only or video-only as graceful fallbacks.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audio = true;
      } catch {
        // ignore
      }
      if (!audio) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          video = true;
        } catch {
          // ignore
        }
      }
    }

    if (!audio && !video) {
      setPhase("denied");
      setErrorMessage("Camera and microphone access are blocked. Falling back to typed interview.");
      return;
    }

    if (streamRef.current) {
      attachTrackEndedListeners(streamRef.current);
    }

    setPermissions({ audio, video });
    // Note: we do NOT bind streamRef → videoRef here, because the <video>
    // element only mounts after phase flips to "ready" (CameraTile is
    // conditionally rendered). The bindStreamToVideoEl effect below handles
    // the actual srcObject attach once the element exists.
    setPhase("ready");
  }, [attachTrackEndedListeners]);

  // Bind the captured MediaStream to the <video> element once it mounts.
  // CameraTile only renders for phase ∈ {ready, interviewing, thinking,
  // finished}, so we re-run this whenever phase or permissions.video change.
  // Without this, requestPermissions() sees videoRef.current === null (the
  // element hasn't mounted yet) and the preview stays black even though the
  // stream is live.
  useEffect(() => {
    if (!permissions.video) return;
    const stream = streamRef.current;
    const el = videoRef.current;
    if (!stream || !el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.muted = true;
    el.playsInline = true;
    // play() can reject if autoplay is blocked or the element is detached;
    // both are non-fatal — the user can click into the page to retry.
    void el.play().catch(() => {
      /* autoplay blocked — user gesture will retry */
    });
  }, [permissions.video, phase]);

  // Enumerate devices for the Mercor-style preflight dropdowns. Browsers
  // only expose device labels (and sometimes the full device list) AFTER a
  // permission has been granted, so we fire this on permission flip rather
  // than on mount. We also re-run it on `devicechange` so plugging/unplugging
  // a headset updates the picker live.
  useEffect(() => {
    if (!mercorStyle) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    let cancelled = false;
    async function refresh() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const ai = list.filter((d) => d.kind === "audioinput");
        const ao = list.filter((d) => d.kind === "audiooutput");
        const vi = list.filter((d) => d.kind === "videoinput");
        setAudioInputs(ai);
        setAudioOutputs(ao);
        setVideoInputs(vi);
        // Seed selections from whatever the active stream is using so the
        // dropdown reflects reality on first paint.
        const stream = streamRef.current;
        if (stream) {
          const a = stream.getAudioTracks()[0]?.getSettings().deviceId;
          const v = stream.getVideoTracks()[0]?.getSettings().deviceId;
          if (typeof a === "string") setSelectedAudioIn(a);
          if (typeof v === "string") setSelectedVideoIn(v);
        }
        if (!ao[0]) return;
        // No permission gate for output devices on most browsers, but the
        // default speaker isn't always at index 0 — pick the one flagged
        // "default" if present.
        const def =
          ao.find((d) => d.deviceId === "default") ?? ao[0];
        setSelectedAudioOut((prev) => prev || def.deviceId);
      } catch {
        // enumerateDevices can throw on insecure contexts; non-fatal.
      }
    }
    void refresh();
    const handler = () => void refresh();
    navigator.mediaDevices.addEventListener?.("devicechange", handler);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener?.("devicechange", handler);
    };
  }, [mercorStyle, permissions.audio, permissions.video]);

  const startInterview = useCallback(async (): Promise<void> => {
    setPhase("thinking");
    if (permissions.video) startFrameCapture();
    const turn = await fetchNextTurn([]);
    const aiMsg: InterviewMessage = {
      role: "assistant",
      content: turn.message,
      ts: isoNow(),
    };
    const next = [aiMsg];
    setMessages(next);
    await speakQuestion(turn.message);

    if (turn.done) {
      await finalize(next, scoresRef.current);
      return;
    }

    setPhase("interviewing");
    if (sttSupported && permissions.audio) {
      startRecognition();
    }
  }, [
    fetchNextTurn,
    finalize,
    permissions.audio,
    permissions.video,
    speakQuestion,
    startFrameCapture,
    startRecognition,
    sttSupported,
  ]);

  // ---------------------------------------------------------------------------
  // Manual controls
  // ---------------------------------------------------------------------------

  const onDoneAnswering = useCallback((): void => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const answer = (finalAnswerRef.current || userAnswerDraft || typedAnswer).trim();
    if (!answer) return;
    void submitUserAnswer(answer);
  }, [submitUserAnswer, typedAnswer, userAnswerDraft]);

  const onSubmitTyped = useCallback((): void => {
    const answer = typedAnswer.trim();
    if (!answer) return;
    void submitUserAnswer(answer);
  }, [submitUserAnswer, typedAnswer]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (phase === "denied") {
    return (
      <div data-test-id="video-interview-denied">
        <div className="flex items-center gap-2">
          <h3 className="text-[20px] font-semibold tracking-tight">Creator Interview</h3>
          <ClaudeMark model="haiku" size="sm" />
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <AlertTriangle size={18} className="mt-0.5 text-[var(--warning)]" />
          <div>
            <div className="text-[14px] font-medium">
              Camera or microphone access is blocked.
            </div>
            <div className="mt-1 text-[12px] text-[var(--fg-muted)]">
              {errorMessage || "Allow camera/mic to use the AI video interview, or continue with the typed version below."}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
                onClick={() => void requestPermissions()}
                data-test-id="video-interview-retry"
              >
                Try again
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={onFallbackToText}
                data-test-id="video-interview-fallback-text"
              >
                Use typed interview
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-test-id="video-interview-step">
      {!mercorStyle ? (
        <>
          <div className="flex items-center gap-2">
            <h3 className="text-[20px] font-semibold tracking-tight">Creator Interview</h3>
            <ClaudeMark model="haiku" size="sm" />
          </div>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.6] text-[var(--fg-muted)]">
            Live video interview, ~6 minutes. The AI interviewer will speak each question. Reply
            out loud, the transcript will appear below. We&apos;re evaluating for{" "}
            <span className="font-medium text-[var(--fg)]">{campaignTitle}</span>.
          </p>
        </>
      ) : null}

      {!mercorStyle && (phase === "idle" || phase === "requesting") ? (
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="text-[14px] font-medium">Before we start</div>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--fg-muted)]">
            <li className="flex items-center gap-2">
              <Mic size={14} /> Microphone access (so the AI can hear you)
            </li>
            <li className="flex items-center gap-2">
              <Camera size={14} /> Camera access (so the AI can score confidence)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} /> Quiet room, good lighting, ~6 minutes
            </li>
          </ul>
          <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[12px] text-[var(--fg-muted)]">
            <div className="font-medium text-[var(--fg)]">How your data is used</div>
            <ul className="mt-2 space-y-1.5">
              <li>
                Your video frames are sent to Google Gemini for confidence and integrity
                scoring. Frames are NOT stored on our servers.
              </li>
              <li>
                Your spoken answers are transcribed in your browser and sent to Google
                Gemini as text. The transcript is shown to the hiring team.
              </li>
              <li>
                You can withdraw at any time by clicking &quot;Use typed interview&quot;.
              </li>
            </ul>
          </div>
          <label className="mt-4 flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              data-test-id="video-interview-consent"
            />
            <span>I consent to AI-assisted video interview processing.</span>
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void requestPermissions()}
              className="btn-primary"
              data-test-id="video-interview-grant"
              disabled={phase === "requesting" || !consentGiven}
            >
              {phase === "requesting" ? "Requesting…" : "Grant access & start"}
            </button>
            <button
              type="button"
              onClick={onFallbackToText}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
              data-test-id="video-interview-skip-to-text"
            >
              Use typed interview instead
            </button>
          </div>
        </div>
      ) : null}

      {!mercorStyle && phase === "ready" ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CameraTile
            videoRef={videoRef}
            permissions={permissions}
          />
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="text-[14px] font-medium">You&apos;re all set</div>
            <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
              When you click below, the AI interviewer will introduce itself, ask its first
              question, and listen for your answer. Speak naturally, the AI will follow up.
            </p>
            <button
              type="button"
              onClick={() => void startInterview()}
              className="btn-primary mt-4"
              data-test-id="video-interview-start"
            >
              Start interview
            </button>
            {!sttSupported ? (
              <p className="mt-3 text-[12px] text-[var(--warning)]">
                Heads up: voice recognition isn&apos;t supported in this browser. You&apos;ll
                still hear the questions, but you&apos;ll type your answers.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {mercorStyle && (phase === "idle" || phase === "requesting" || phase === "ready") ? (
        <MercorPreflight
          campaignTitle={campaignTitle}
          videoRef={videoRef}
          permissions={permissions}
          phase={phase}
          consentGiven={consentGiven}
          onConsentChange={setConsentGiven}
          onGrant={() => void requestPermissions()}
          onStart={() => void startInterview()}
          onFallbackToText={onFallbackToText}
          sttSupported={sttSupported}
          description={preflightDescription}
          audioInputs={audioInputs}
          audioOutputs={audioOutputs}
          videoInputs={videoInputs}
          selectedAudioIn={selectedAudioIn}
          selectedAudioOut={selectedAudioOut}
          selectedVideoIn={selectedVideoIn}
          onSelectAudioIn={setSelectedAudioIn}
          onSelectAudioOut={setSelectedAudioOut}
          onSelectVideoIn={setSelectedVideoIn}
        />
      ) : null}

      {(phase === "interviewing" || phase === "thinking" || phase === "finished") ? (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CameraTile
            videoRef={videoRef}
            permissions={permissions}
            framesCaptured={scores.length}
          />
          <InterviewerPanel
            speaking={aiSpeaking}
            currentQuestion={
              messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content ?? ""
            }
            phase={phase}
          />
        </div>
      ) : null}

      {phase === "interviewing" || phase === "thinking" ? (
        <AnswerPanel
          phase={phase}
          interim={interimTranscript}
          draft={userAnswerDraft}
          typedAnswer={typedAnswer}
          onTypedChange={setTypedAnswer}
          onSubmitTyped={onSubmitTyped}
          onDoneAnswering={onDoneAnswering}
          sttSupported={sttSupported && permissions.audio}
        />
      ) : null}

      {messages.length > 0 ? (
        <Transcript messages={messages} />
      ) : null}

      {phase === "finished" || done ? (
        <div className="mt-6 flex items-center gap-2 rounded-md bg-[var(--success-soft)] px-3 py-2 text-[13px] text-[var(--success)]">
          <CheckCircle2 size={16} /> Interview complete. Mercor has the transcript and
          confidence/engagement scores. Click Submit at the bottom of the page to finish.
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4 text-[13px]">
          {errorMessage || "Something went wrong with the interview. Try the typed version."}
          <div className="mt-3">
            <button
              type="button"
              onClick={onFallbackToText}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
            >
              Use typed interview
            </button>
          </div>
        </div>
      ) : null}

      {/* Hidden canvas for frame snapshots. */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CameraTile({
  videoRef,
  permissions,
  framesCaptured,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permissions: Permissions;
  framesCaptured?: number;
}): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-black">
      <div className="relative aspect-video w-full">
        {permissions.video ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-white/60">
            <VideoOff size={20} className="mr-2" /> Camera off
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
          {permissions.video ? <Video size={11} /> : <VideoOff size={11} />}
          {permissions.audio ? <Mic size={11} /> : <MicOff size={11} />}
          <span>You</span>
        </div>
        {typeof framesCaptured === "number" && framesCaptured > 0 ? (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
            {framesCaptured} frame{framesCaptured === 1 ? "" : "s"} scored
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InterviewerPanel({
  speaking,
  currentQuestion,
  phase,
}: {
  speaking: boolean;
  currentQuestion: string;
  phase: Phase;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <div className="flex items-center gap-2">
        <Waveform active={speaking} />
        <div className="text-[12px] uppercase tracking-wider text-[var(--fg-muted)]">
          {speaking ? "Interviewer speaking" : phase === "thinking" ? "Thinking…" : "Listening"}
        </div>
        <div className="ml-auto">
          <ClaudeMark model="haiku" size="xs" />
        </div>
      </div>
      <p
        className="mt-4 text-[15px] leading-[1.5] text-[var(--fg)]"
        data-test-id="video-interview-question"
      >
        {currentQuestion || "..."}
      </p>
    </div>
  );
}

function Waveform({ active }: { active: boolean }): React.JSX.Element {
  // Pure CSS pulsing dot — animation duration changes with active state.
  const bars = [0, 1, 2, 3];
  return (
    <div className="flex items-end gap-0.5" aria-hidden="true">
      {bars.map((i) => (
        <span
          key={i}
          className="block w-1 rounded-full bg-[var(--accent)]"
          style={{
            height: active ? `${8 + ((i + 1) * 4)}px` : "6px",
            animation: active
              ? `wave-pulse ${0.8 + i * 0.12}s ease-in-out ${i * 0.06}s infinite alternate`
              : "none",
            opacity: active ? 1 : 0.4,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave-pulse {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}

function AnswerPanel({
  phase,
  interim,
  draft,
  typedAnswer,
  onTypedChange,
  onSubmitTyped,
  onDoneAnswering,
  sttSupported,
}: {
  phase: Phase;
  interim: string;
  draft: string;
  typedAnswer: string;
  onTypedChange: (v: string) => void;
  onSubmitTyped: () => void;
  onDoneAnswering: () => void;
  sttSupported: boolean;
}): React.JSX.Element {
  return (
    <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="text-[12px] uppercase tracking-wider text-[var(--fg-muted)]">
        Your answer
      </div>
      {sttSupported ? (
        <>
          <div
            className="mt-2 min-h-[64px] text-[14px] leading-[1.5]"
            data-test-id="video-interview-transcript"
          >
            {draft || (
              <span className="text-[var(--fg-subtle)]">
                {phase === "thinking"
                  ? "Waiting for the next question…"
                  : "Listening… start speaking when ready."}
              </span>
            )}
            {interim ? (
              <span className="text-[var(--fg-muted)]">
                {draft ? " " : ""}
                {interim}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onDoneAnswering}
              disabled={phase === "thinking" || !draft.trim()}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)] disabled:opacity-50"
              data-test-id="video-interview-done"
            >
              Done answering
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={typedAnswer}
            onChange={(e) => onTypedChange(e.target.value)}
            placeholder="Type your answer here…"
            disabled={phase === "thinking"}
            data-test-id="video-interview-typed"
            className="mt-2 min-h-[120px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] outline-none focus:border-[var(--accent)] disabled:opacity-50"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onSubmitTyped}
              disabled={phase === "thinking" || !typedAnswer.trim()}
              className="btn-primary disabled:opacity-50"
              data-test-id="video-interview-submit-typed"
            >
              Submit answer
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Transcript({ messages }: { messages: InterviewMessage[] }): React.JSX.Element {
  return (
    <details className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
      <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
        Transcript ({messages.length} turn{messages.length === 1 ? "" : "s"})
      </summary>
      <ol className="space-y-3 px-4 pb-4">
        {messages.map((m, i) => (
          <li key={i} className="text-[13px]">
            <span
              className={
                m.role === "assistant"
                  ? "text-[var(--accent)] font-medium"
                  : "text-[var(--fg-muted)] font-medium"
              }
            >
              {m.role === "assistant" ? "Interviewer" : "You"}:{" "}
            </span>
            <span className="text-[var(--fg)]">{m.content}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Mercor-style pre-flight (used by /interview/[id])
// ---------------------------------------------------------------------------
//
// Mirrors work.mercor.com/interview/<id>: two-column layout, big live camera
// preview + 3 device dropdowns + helper links on the left, info column with
// dotted-underline tooltipped facts + a single big purple Start CTA on the
// right. Hover on any underlined token shows the tooltip in a small dark
// popover positioned below the trigger.

interface MercorPreflightProps {
  campaignTitle: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permissions: Permissions;
  phase: Phase;
  consentGiven: boolean;
  onConsentChange: (v: boolean) => void;
  onGrant: () => void;
  onStart: () => void;
  onFallbackToText: () => void;
  sttSupported: boolean;
  description?: string;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  selectedAudioIn: string;
  selectedAudioOut: string;
  selectedVideoIn: string;
  onSelectAudioIn: (id: string) => void;
  onSelectAudioOut: (id: string) => void;
  onSelectVideoIn: (id: string) => void;
}

function MercorPreflight(props: MercorPreflightProps): React.JSX.Element {
  const {
    campaignTitle,
    videoRef,
    permissions,
    phase,
    consentGiven,
    onConsentChange,
    onGrant,
    onStart,
    onFallbackToText,
    sttSupported,
    description,
    audioInputs,
    audioOutputs,
    videoInputs,
    selectedAudioIn,
    selectedAudioOut,
    selectedVideoIn,
    onSelectAudioIn,
    onSelectAudioOut,
    onSelectVideoIn,
  } = props;

  const isReady = phase === "ready";
  const isRequesting = phase === "requesting";
  const ctaLabel = isReady
    ? "Start"
    : isRequesting
    ? "Requesting…"
    : "Enable camera & mic";
  const ctaDisabled = isRequesting || (!isReady && !consentGiven);

  function handleCta() {
    if (isReady) onStart();
    else if (consentGiven) onGrant();
  }

  return (
    <div className="mx-auto mt-10 grid w-full max-w-[1100px] grid-cols-1 gap-12 px-6 pb-16 lg:grid-cols-[1.4fr_1fr]">
      {/* ─── Left column ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--fg)]">
            {campaignTitle}
          </h1>
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-0.5 text-[12px] font-medium text-[var(--fg)]">
            ~6 min
          </span>
        </div>

        {/* Camera preview tile */}
        <div className="mt-5 overflow-hidden rounded-[14px] border border-[var(--border)] bg-black">
          <div className="relative aspect-[16/10] w-full">
            {permissions.video ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/70">
                <Camera size={28} />
                <div className="text-[13px]">
                  {isRequesting ? "Requesting camera & mic…" : "Camera off"}
                </div>
                {phase === "idle" ? (
                  <button
                    type="button"
                    onClick={onGrant}
                    disabled={!consentGiven}
                    className="rounded-md bg-white px-3 py-1.5 text-[12px] font-medium text-black hover:bg-white/90 disabled:opacity-40"
                    data-test-id="video-interview-grant"
                  >
                    Enable camera &amp; mic
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Device pickers */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DevicePicker
            icon={<Mic size={14} />}
            value={selectedAudioIn}
            options={audioInputs}
            onChange={onSelectAudioIn}
            placeholder="Microphone"
          />
          <DevicePicker
            icon={<Volume2 size={14} />}
            value={selectedAudioOut}
            options={audioOutputs}
            onChange={onSelectAudioOut}
            placeholder="Speaker"
          />
          <DevicePicker
            icon={<Camera size={14} />}
            value={selectedVideoIn}
            options={videoInputs}
            onChange={onSelectVideoIn}
            placeholder="Camera"
          />
        </div>

        {/* Helper links */}
        <div className="mt-3 flex flex-wrap gap-5 text-[12.5px]">
          <button
            type="button"
            className="text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--fg)]"
            onClick={() => testMic(permissions.audio)}
          >
            Test your mic
          </button>
          <button
            type="button"
            className="text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--fg)]"
            onClick={playTestSound}
          >
            Play test sound
          </button>
          <button
            type="button"
            className="text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--fg)]"
            onClick={onGrant}
          >
            Restart devices
          </button>
        </div>

        {/* Troubleshooting button */}
        <a
          href="mailto:loganmann@ucsb.edu?subject=Mercor%20interview%20%E2%80%94%20troubleshooting"
          className="mt-4 block w-full rounded-md border border-[var(--border)] px-3 py-2.5 text-center text-[13px] text-[var(--fg)] hover:bg-[var(--bg-hover)]"
        >
          Troubleshooting help
        </a>
      </div>

      {/* ─── Right column ─────────────────────────────────────────── */}
      <div className="flex flex-col">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 text-[var(--fg)]" />
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-[var(--fg)]">
              This is an AI interview
            </div>
            <p className="mt-2 text-[13px] leading-[1.55] text-[var(--fg-muted)]">
              {description ??
                "This AI interview explores how you think about content, audience, and brand fit."}{" "}
              <span className="font-medium text-[var(--fg)]">
                Come ready to have your camera on and to share specifics — real posts,
                real numbers, real brands.
              </span>
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-4 text-[13.5px] text-[var(--fg)]">
          <li className="flex items-center gap-3">
            <Clock size={15} className="text-[var(--fg-muted)]" />
            <span>
              Expect to spend{" "}
              <Tip text="Plan to be in a quiet room with stable internet. Very short interviews may not be considered complete — answer thoughtfully.">
                ~6 minutes
              </Tip>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Hand size={15} className="text-[var(--fg-muted)]" />
            <span>
              Need assistance?{" "}
              <Tip text="At any point, say 'I need help' out loud or click Troubleshooting help. The AI will pause and offer to reschedule.">
                Just ask
              </Tip>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <RefreshCcw size={15} className="text-[var(--fg-muted)]" />
            <span>
              3 of 3 interview{" "}
              <Tip text="You can retake this interview up to 3 times. Reserve retakes for technical issues — repeated retakes are flagged for review.">
                retakes remaining
              </Tip>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <Lock size={15} className="text-[var(--fg-muted)]" />
            <span>
              Your data is in{" "}
              <Tip text="Frames are sent to Google Gemini for confidence scoring and are not stored on Mercor's servers. The transcript is shown to the hiring team only.">
                your control
              </Tip>
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CalendarDays size={15} className="text-[var(--fg-muted)]" />
            <span>
              Interview on your{" "}
              <Tip text="No scheduled slot — start whenever you're ready. The interview pauses if you close the tab and resumes on the next visit.">
                own time
              </Tip>
            </span>
          </li>
        </ul>

        {/* Consent gate (only visible until granted) */}
        {!permissions.video && !permissions.audio ? (
          <label className="mt-6 flex items-start gap-2 text-[12px] text-[var(--fg-muted)]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={consentGiven}
              onChange={(e) => onConsentChange(e.target.checked)}
              data-test-id="video-interview-consent"
            />
            <span>
              I consent to AI-assisted video interview processing. Frames are sent to
              Gemini for confidence scoring and are not stored.
            </span>
          </label>
        ) : null}

        <button
          type="button"
          onClick={handleCta}
          disabled={ctaDisabled}
          className="btn-primary mt-6 w-full py-3 text-[15px] disabled:opacity-50"
          data-test-id="video-interview-start"
        >
          {ctaLabel}
        </button>

        {!sttSupported ? (
          <p className="mt-3 text-[12px] text-[var(--warning)]">
            Heads up: voice recognition isn&apos;t supported in this browser. You&apos;ll
            still hear the questions, but you&apos;ll type your answers.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onFallbackToText}
          className="mt-3 text-[12px] text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--fg)]"
        >
          Prefer to type instead?
        </button>
      </div>
    </div>
  );
}

// Tooltip that mirrors Mercor's dotted underline + dark popover. Hover or
// keyboard-focus the trigger to reveal the popover. We position absolutely
// so the popover doesn't reflow surrounding text.
function Tip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className="relative inline-block group focus-within:z-20">
      <span
        tabIndex={0}
        className="cursor-help underline decoration-dotted decoration-[var(--fg-muted)] underline-offset-[3px] outline-none"
      >
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-[220px] -translate-x-1/2 rounded-md bg-[#1f2937] px-3 py-2 text-[12px] leading-[1.45] text-white opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function DevicePicker({
  icon,
  value,
  options,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  value: string;
  options: MediaDeviceInfo[];
  onChange: (id: string) => void;
  placeholder: string;
}): React.JSX.Element {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-[var(--border)] bg-white pl-9 pr-8 py-2 text-[13px] text-[var(--fg)] outline-none hover:border-[var(--border-strong)] focus:border-[var(--accent)]"
      >
        {options.length === 0 ? (
          <option value="">{placeholder}</option>
        ) : (
          options.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || placeholder}
            </option>
          ))
        )}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
      />
    </div>
  );
}

// Quick "Test your mic" — flashes a 600ms tone using the WebAudio API.
// We don't actually probe the input level for the demo; the audible click
// confirms output works which is the more common failure mode.
function testMic(audioGranted: boolean): void {
  if (!audioGranted) {
    // Without mic permission, just play the test tone so the user has SOME
    // feedback that the click registered.
    playTestSound();
    return;
  }
  playTestSound();
}

function playTestSound(): void {
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    osc.type = "sine";
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // ignore — no-op on browsers without WebAudio
  }
}
