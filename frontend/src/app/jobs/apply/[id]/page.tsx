"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { LOGAN } from "@/lib/data/creators";
import { getRubricIdForCampaign } from "@/lib/data/rubrics";
import { fmtFollowers } from "@/lib/util/score";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { ClaudeMark } from "@/components/shell/ClaudeMark";
import { VideoInterviewStep } from "@/components/apply/VideoInterviewStep";

type StepId = "resume" | "socials" | "interview" | "workauth";

const STEPS: { id: StepId; label: string; core: boolean }[] = [
  { id: "resume", label: "Upload Resume", core: false },
  { id: "workauth", label: "Work Authorization", core: false },
  { id: "socials", label: "Connect TikTok + Instagram", core: true },
  { id: "interview", label: "Creator Interview", core: true },
];

const INTERVIEW_QS = [
  "Walk us through the post you're most proud of and why it worked.",
  "Which brands have you collaborated with so far? Paid or organic.",
  "How do you decide whether a brand fits your audience?",
  "What's a brand you'd never work with, and why?",
  "What kind of campaign performance are you usually paid for - views, sales, or comments?",
];

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const c = CAMPAIGNS_BY_ID[id];
  const brand = c ? BRANDS_BY_ID[c.brand_id] : undefined;

  const [activeStep, setActiveStep] = useState<StepId>("socials");
  const [done, setDone] = useState<Record<StepId, boolean>>({
    resume: true,
    workauth: true,
    socials: false,
    interview: false,
  });
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [igConnected, setIgConnected] = useState(false);

  // Connect-once persistence: TikTok + IG connections live on the user
  // profile, not per-application, so once Logan connects them in any apply
  // flow they auto-import for every subsequent application. The user can
  // revoke from Profile → Communications. Stored as a boolean tuple in
  // localStorage so the state survives page reloads on Vercel preview where
  // we have no backend.
  const SOCIALS_KEY = "mercor.socials.connected.v1";
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SOCIALS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { tiktok?: boolean; ig?: boolean };
      const t = parsed.tiktok === true;
      const ig = parsed.ig === true;
      if (t) setTiktokConnected(true);
      if (ig) setIgConnected(true);
      if (t && ig) {
        setDone((d) => ({ ...d, socials: true }));
        // If socials is already complete, default the user to the next
        // un-done step so they don't have to click past a finished card.
        setActiveStep((curr) =>
          curr === "socials" ? "interview" : curr,
        );
      }
    } catch {
      // Corrupt JSON or quota error — non-fatal, just start fresh.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SOCIALS_KEY,
        JSON.stringify({ tiktok: tiktokConnected, ig: igConnected }),
      );
    } catch {
      // ignore
    }
  }, [tiktokConnected, igConnected]);
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [pageOf, setPageOf] = useState(0);
  const [useTextInterview, setUseTextInterview] = useState<boolean>(false);

  // Cached interview record so we don't loop the candidate through the
  // interview again after they finish, navigate off, and come back. The
  // VideoInterviewStep persists to localStorage on finalize; we mirror that
  // here so the apply page stepper knows the interview was already done.
  // Per-campaign storage key: every role gets its own submission so a
  // candidate can apply to (and complete) multiple interviews. Falls back
  // to the legacy creator-only key for any cached record written by the
  // pre-rubric build.
  const INTERVIEW_KEY = `mercor.interview.${LOGAN.id}.${id}.v1`;
  const LEGACY_INTERVIEW_KEY = `mercor.interview.${LOGAN.id}.v1`;
  type CachedInterview = {
    transcript?: { role: "user" | "assistant"; content: string; ts: string }[];
    summary?: string;
    finishedAt?: string;
    campaignId?: string;
    campaignTitle?: string;
    scores?: { confidence: number; engagement: number; cheating: string }[];
  };
  const [cachedInterview, setCachedInterview] = useState<CachedInterview | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Prefer the per-campaign record. If the user previously submitted
      // an interview for THIS specific role, we surface that. Otherwise we
      // intentionally do NOT surface a cached interview from a different
      // role — that previous decision (1 interview reused everywhere) made
      // role-specific rubric grades meaningless because a Celsius
      // submission would mark the Bucked Up Creator Interview step done.
      const raw =
        window.localStorage.getItem(INTERVIEW_KEY) ??
        // Backwards-compat: only honor the legacy single-key cache when
        // the cached record was actually for THIS campaign.
        (() => {
          const legacy = window.localStorage.getItem(LEGACY_INTERVIEW_KEY);
          if (!legacy) return null;
          try {
            const parsed = JSON.parse(legacy) as CachedInterview;
            return parsed.campaignId === id ? legacy : null;
          } catch {
            return null;
          }
        })();
      if (!raw) return;
      const parsed = JSON.parse(raw) as CachedInterview;
      setCachedInterview(parsed);
      setDone((d) => ({ ...d, interview: true }));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedSteps = useMemo(
    () => Object.values(done).filter(Boolean).length,
    [done],
  );
  const pct = Math.round((completedSteps / STEPS.length) * 100);

  if (!c || !brand) {
    return (
      <main className="mx-auto max-w-[600px] px-6 pt-12">
        <p>Listing not found.</p>
        <Link href="/explore" className="text-[var(--accent)] underline">
          Back to Explore
        </Link>
      </main>
    );
  }

  function onConnectTikTok() {
    setTiktokConnected(true);
  }
  function onConnectIG() {
    setIgConnected(true);
  }

  function maybeMarkSocialsDone() {
    if (tiktokConnected && igConnected) setDone((d) => ({ ...d, socials: true }));
  }

  function onInterviewNext() {
    if (pageOf < INTERVIEW_QS.length - 1) setPageOf(pageOf + 1);
    else setDone((d) => ({ ...d, interview: true }));
  }

  function onSubmit() {
    router.push(`/jobs/apply/${c.id}/submitted`);
  }

  const allDone = Object.values(done).every(Boolean);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
      {/* Left rail - Mercor pattern */}
      <aside className="border-r border-[var(--border)] px-6 py-8 lg:min-h-[calc(100vh-65px)]">
        <h2 className="text-[18px] font-semibold tracking-tight">{c.title}</h2>
        <div className="label-cap mt-4">{completedSteps} of {STEPS.length} steps done</div>
        <div className="mt-2 progress-rail">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-right text-[11px] text-[var(--fg-muted)]">{pct}%</div>

        <ul className="mt-6 space-y-1">
          {STEPS.map((s) => {
            const isActive = s.id === activeStep;
            const isDone = done[s.id];
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setActiveStep(s.id)}
                  data-test-id={`step-${s.id}`}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-[14px] ${
                    isActive
                      ? "border border-[var(--accent-soft)] bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle2 size={18} className="text-[var(--accent)]" />
                    ) : (
                      <Circle size={18} className="text-[var(--fg-subtle)]" />
                    )}
                    {s.label}
                    {s.core ? (
                      <span className="pill pill-accent text-[10px]">CORE</span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Right pane */}
      <section className="px-8 py-10">
        {activeStep === "resume" ? <ResumeStep /> : null}
        {activeStep === "workauth" ? <WorkAuthStep /> : null}

        {activeStep === "socials" ? (
          <ConnectSocialsStep
            tiktokConnected={tiktokConnected}
            igConnected={igConnected}
            onConnectTikTok={() => {
              onConnectTikTok();
              setTimeout(maybeMarkSocialsDone, 50);
            }}
            onConnectIG={() => {
              onConnectIG();
              setTimeout(maybeMarkSocialsDone, 50);
            }}
            done={done.socials}
            onContinue={() => setActiveStep("interview")}
          />
        ) : null}

        {activeStep === "interview" && !useTextInterview && !cachedInterview ? (
          <VideoInterviewStep
            creatorId={LOGAN.id}
            campaignId={c.id}
            campaignTitle={c.title}
            done={done.interview}
            rubricId={getRubricIdForCampaign(c)}
            onComplete={() => {
              setDone((d) => ({ ...d, interview: true }));
              // Re-read the cache the VideoInterviewStep just wrote so the
              // page swaps to the summary card on the next render and the
              // candidate doesn't get looped through the interview again.
              try {
                const raw = window.localStorage.getItem(INTERVIEW_KEY);
                if (raw) setCachedInterview(JSON.parse(raw));
              } catch {
                // ignore
              }
            }}
            onFallbackToText={() => setUseTextInterview(true)}
          />
        ) : null}

        {activeStep === "interview" && cachedInterview ? (
          <InterviewCompletedCard
            cached={cachedInterview}
            currentCampaignTitle={c.title}
            onRetake={() => {
              try {
                window.localStorage.removeItem(INTERVIEW_KEY);
              } catch {
                // ignore
              }
              setCachedInterview(null);
              setDone((d) => ({ ...d, interview: false }));
            }}
          />
        ) : null}

        {activeStep === "interview" && useTextInterview ? (
          <CreatorInterviewStep
            qIndex={pageOf}
            answers={interviewAnswers}
            onChange={(i, val) =>
              setInterviewAnswers((arr) => arr.map((a, j) => (j === i ? val : a)))
            }
            onNext={onInterviewNext}
            onBack={() => (pageOf > 0 ? setPageOf(pageOf - 1) : undefined)}
            done={done.interview}
            campaignTitle={c.title}
          />
        ) : null}

        {/* Sticky submit bar */}
        <div className="mt-12 flex items-center justify-between border-t border-[var(--border)] pt-6">
          <button
            type="button"
            onClick={() => {
              const idx = STEPS.findIndex((s) => s.id === activeStep);
              if (idx > 0) setActiveStep(STEPS[idx - 1].id);
            }}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-[13px] hover:bg-[var(--bg-hover)]"
            data-test-id="apply-back"
          >
            Back
          </button>

          {allDone ? (
            <button
              type="button"
              onClick={onSubmit}
              className="btn-primary"
              data-test-id="submit-application"
            >
              Submit application
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const idx = STEPS.findIndex((s) => s.id === activeStep);
                // Normal advance: go to the next step if there is one.
                if (idx < STEPS.length - 1) {
                  setActiveStep(STEPS[idx + 1].id);
                  return;
                }
                // We're already on the last step but other steps are
                // incomplete. Jump back to the first incomplete one so the
                // candidate can finish what's left — without this branch the
                // Next button silently no-ops and the user is stuck after
                // completing the interview but skipping socials.
                const firstIncomplete = STEPS.find((s) => !done[s.id]);
                if (firstIncomplete && firstIncomplete.id !== activeStep) {
                  setActiveStep(firstIncomplete.id);
                }
              }}
              className="btn-primary"
              data-test-id="apply-next"
            >
              {(() => {
                const idx = STEPS.findIndex((s) => s.id === activeStep);
                if (idx < STEPS.length - 1) return "Next";
                const firstIncomplete = STEPS.find((s) => !done[s.id]);
                if (firstIncomplete && firstIncomplete.id !== activeStep) {
                  return `Finish ${firstIncomplete.label}`;
                }
                return "Next";
              })()}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function ResumeStep() {
  return (
    <div>
      <h3 className="text-[20px] font-semibold tracking-tight">Resume</h3>
      <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
        Already imported from your Mercor profile.
      </p>
      <div className="mt-6 flex items-center gap-3 rounded-md border border-[var(--border)] p-4">
        <CheckCircle2 size={20} className="text-[var(--accent)]" />
        <div>
          <div className="text-[14px] font-medium">Mann_Logan_resume.pdf</div>
          <div className="text-[12px] text-[var(--fg-muted)]">Uploaded on 04/25/26</div>
        </div>
      </div>
    </div>
  );
}

function WorkAuthStep() {
  return (
    <div>
      <h3 className="text-[20px] font-semibold tracking-tight">Work Authorization</h3>
      <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
        Reused from your Mercor profile. Completed on 03/01/26.
      </p>
      <div className="mt-6 flex items-center gap-3 rounded-md border border-[var(--border)] p-4">
        <CheckCircle2 size={20} className="text-[var(--accent)]" />
        <div className="text-[14px]">U.S. citizen - verified.</div>
      </div>
    </div>
  );
}

function ConnectSocialsStep({
  tiktokConnected,
  igConnected,
  onConnectTikTok,
  onConnectIG,
  done,
  onContinue,
}: {
  tiktokConnected: boolean;
  igConnected: boolean;
  onConnectTikTok: () => void;
  onConnectIG: () => void;
  done: boolean;
  onContinue: () => void;
}) {
  return (
    <div>
      <h3 className="text-[20px] font-semibold tracking-tight">
        Connect TikTok + Instagram
      </h3>
      <p className="mt-2 text-[13px] leading-[1.6] text-[var(--fg-muted)]">
        Mercor pulls your follower count, recent posts, and aggregate engagement so brands
        can verify your audience. Read-only - we never post on your behalf.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ConnectorTile
          platform="TikTok"
          handle="@loganmann32"
          followers={LOGAN.followers}
          connected={tiktokConnected}
          onConnect={onConnectTikTok}
          recentPosts={LOGAN.cited_posts ?? []}
        />
        <ConnectorTile
          platform="Instagram"
          handle="@loganmann"
          followers={LOGAN.ig_followers ?? 4200}
          connected={igConnected}
          onConnect={onConnectIG}
          recentPosts={[]}
        />
      </div>

      {done ? (
        <div className="mt-6 flex items-center gap-2 rounded-md bg-[var(--success-soft)] px-3 py-2 text-[13px] text-[var(--success)]">
          <CheckCircle2 size={16} /> Both accounts connected - your match score will recompute in the background.
          <button onClick={onContinue} className="ml-auto text-[12px] underline" data-test-id="socials-continue">
            Continue →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ConnectorTile({
  platform,
  handle,
  followers,
  connected,
  onConnect,
  recentPosts,
}: {
  platform: "TikTok" | "Instagram";
  handle: string;
  followers: number;
  connected: boolean;
  onConnect: () => void;
  recentPosts: NonNullable<typeof LOGAN.cited_posts>;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium">{platform}</div>
          <div className="text-[12px] text-[var(--fg-muted)]">{handle}</div>
        </div>
        {connected ? (
          <span className="pill pill-success text-[11px]">✓ Connected</span>
        ) : (
          <button
            onClick={onConnect}
            data-test-id={`connect-${platform.toLowerCase()}`}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
          >
            Connect
          </button>
        )}
      </div>

      {connected ? (
        <div className="mt-4">
          <div className="text-[12px] text-[var(--fg-muted)]">
            {fmtFollowers(followers)} followers
          </div>
          {recentPosts.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {recentPosts.slice(0, 4).map((p) => (
                <a
                  key={p.url}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[var(--border)] p-2 text-[11px] hover:border-[var(--accent)]"
                >
                  <div className="font-medium leading-snug text-[var(--fg)]">{p.caption}</div>
                  <div className="mt-1 text-[var(--fg-muted)]">
                    {p.views.toLocaleString()} views · {p.likes} likes · {p.comments} comments
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[var(--fg-subtle)]">
                    <ExternalLink size={11} /> open
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CreatorInterviewStep({
  qIndex,
  answers,
  onChange,
  onNext,
  onBack,
  done,
  campaignTitle,
}: {
  qIndex: number;
  answers: string[];
  onChange: (i: number, v: string) => void;
  onNext: () => void;
  onBack: () => void;
  done: boolean;
  campaignTitle: string;
}) {
  const value = answers[qIndex] ?? "";
  const max = 50000;

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-[20px] font-semibold tracking-tight">Creator Interview</h3>
        <ClaudeMark model="sonnet" size="sm" />
      </div>
      <p className="mt-2 max-w-[640px] text-[13px] leading-[1.6] text-[var(--fg-muted)]">
        Hello! Thank you for beginning your application. This interview captures how you
        think about creator work. We&apos;re reviewing for the role: <span className="font-medium text-[var(--fg)]">{campaignTitle}</span>.
      </p>

      <div className="mt-8">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--border)] text-[12px] font-medium">
            {qIndex + 1}
          </span>
          <span className="text-[14px] font-medium tracking-tight">
            {INTERVIEW_QS[qIndex]} <span className="text-[var(--accent)]">*</span>
          </span>
        </div>
        <textarea
          value={value}
          maxLength={max}
          onChange={(e) => onChange(qIndex, e.target.value)}
          placeholder=""
          data-test-id={`interview-q${qIndex}`}
          className="mt-3 min-h-[180px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />
        <div className="mt-1 text-right text-[11px] text-[var(--fg-subtle)]">
          {value.length} / {max}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={qIndex === 0}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-[12px] text-[var(--fg-muted)]">
          Page {qIndex + 1} of {INTERVIEW_QS.length}
        </span>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary"
          data-test-id="interview-next"
        >
          {qIndex < INTERVIEW_QS.length - 1 ? "Next" : "Complete interview"}
        </button>
      </div>

      {done ? (
        <p className="mt-6 text-[12px] text-[var(--success)]">
          ✓ Interview complete - go to the bottom of the page and click Submit.
        </p>
      ) : null}
    </div>
  );
}

// One-time interview lives on the candidate's profile, not the application,
// so once Logan's submitted his Creator Interview every subsequent
// application reuses the same recording. We render a clean summary card
// instead of looping him through the AI interviewer again. Recruiters see
// the full transcript + scores in /admin/interviews/<creatorId>.
function InterviewCompletedCard({
  cached,
  currentCampaignTitle,
  onRetake,
}: {
  cached: {
    transcript?: { role: "user" | "assistant"; content: string; ts: string }[];
    summary?: string;
    finishedAt?: string;
    campaignTitle?: string;
    scores?: { confidence: number; engagement: number; cheating: string }[];
  };
  currentCampaignTitle: string;
  onRetake: () => void;
}) {
  const turns = cached.transcript?.length ?? 0;
  const userTurns = cached.transcript?.filter((m) => m.role === "user").length ?? 0;
  const date = cached.finishedAt
    ? new Date(cached.finishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const recordedFor = cached.campaignTitle && cached.campaignTitle !== currentCampaignTitle;
  const meanConfidence = cached.scores?.length
    ? Math.round(
        (cached.scores.reduce((acc, s) => acc + s.confidence, 0) / cached.scores.length) * 100,
      )
    : null;
  const meanEngagement = cached.scores?.length
    ? Math.round(
        (cached.scores.reduce((acc, s) => acc + s.engagement, 0) / cached.scores.length) * 100,
      )
    : null;
  return (
    <div data-test-id="interview-completed-card">
      <div className="flex items-center gap-2">
        <h3 className="text-[20px] font-semibold tracking-tight">Creator Interview</h3>
        <span className="pill pill-success text-[11px]">✓ Submitted</span>
      </div>
      <p className="mt-2 max-w-[640px] text-[13px] leading-[1.6] text-[var(--fg-muted)]">
        Mercor has your AI interview on file from {date}. Your answers and scoring are
        reused across applications — you only take this once.
        {recordedFor ? (
          <span>
            {" "}
            (Originally recorded for{" "}
            <span className="font-medium text-[var(--fg)]">{cached.campaignTitle}</span>.)
          </span>
        ) : null}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="label-cap">Turns</div>
          <div className="mt-0.5 text-[15px] font-semibold">{turns}</div>
          <div className="text-[11px] text-[var(--fg-muted)]">{userTurns} from you</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="label-cap">Confidence</div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {meanConfidence != null ? `${meanConfidence}%` : "—"}
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">Mean across frames</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="label-cap">Engagement</div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {meanEngagement != null ? `${meanEngagement}%` : "—"}
          </div>
          <div className="text-[11px] text-[var(--fg-muted)]">Mean across frames</div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
          <div className="label-cap">Status</div>
          <div className="mt-0.5 text-[15px] font-semibold text-[var(--success)]">Submitted</div>
          <div className="text-[11px] text-[var(--fg-muted)]">{date}</div>
        </div>
      </div>

      {cached.summary ? (
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="label-cap">AI summary</div>
          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--fg)]">{cached.summary}</p>
        </div>
      ) : null}

      {cached.transcript && cached.transcript.length > 0 ? (
        <details className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
            View transcript ({turns} turns)
          </summary>
          <ol className="space-y-3 px-4 pb-4">
            {cached.transcript.map((m, i) => (
              <li key={i} className="text-[13px]">
                <span
                  className={
                    m.role === "assistant"
                      ? "font-medium text-[var(--accent)]"
                      : "font-medium text-[var(--fg-muted)]"
                  }
                >
                  {m.role === "assistant" ? "Interviewer" : "You"}:{" "}
                </span>
                <span className="text-[var(--fg)]">{m.content}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onRetake}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
          data-test-id="interview-retake"
        >
          Retake interview
        </button>
        <p className="ml-1 self-center text-[11px] text-[var(--fg-muted)]">
          Retakes are reserved for technical issues.
        </p>
      </div>
    </div>
  );
}
