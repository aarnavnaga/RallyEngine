"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { CREATORS } from "@/lib/data/creators";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { BRANDS_BY_ID } from "@/lib/data/brands";
import { getRubricById } from "@/lib/data/rubrics";
import {
  DAY1_REVENUE_HEADLINE,
  RL_STUDIO_EMPTY_STATE,
  RL_STUDIO_STATUSES,
  RL_STUDIO_WORLDS,
} from "@/lib/data/source-of-truth";
import {
  ProjectWorldSelector,
  type RlStudioWorld,
} from "@/components/admin/rlstudio/ProjectWorldSelector";
import {
  RoleToggle,
  type RlStudioRole,
} from "@/components/admin/rlstudio/RoleToggle";
import {
  StatusPill,
  type RlStudioStatus,
} from "@/components/admin/rlstudio/StatusPill";
import {
  PairwiseABCard,
  type PairwiseRatings,
  type PairwiseVariant,
} from "@/components/admin/rlstudio/PairwiseABCard";
import { RubricRail } from "@/components/admin/rlstudio/RubricRail";
import {
  TasksTabs,
  type RlStudioTab,
} from "@/components/admin/rlstudio/TasksTabs";

// ---------- Types preserved from the prior Submission view ----------

type CheatingLevel = "none" | "low" | "medium" | "high";

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}
interface InterviewFrameScore {
  confidence: number;
  engagement: number;
  cheating: CheatingLevel;
  reason: string;
  ts: string;
}
interface RubricCriterionScore {
  id: string;
  label: string;
  score: number;
  rationale: string;
  weight: number;
}
interface ServerInterviewSummary {
  confidence: number;
  engagement: number;
  cheating: CheatingLevel;
  summary: string;
  worstFrame: InterviewFrameScore | null;
  rubricId?: string;
  rubricLabel?: string;
  rubricOverall?: number;
  criteria?: RubricCriterionScore[];
}
interface CachedInterview {
  transcript?: InterviewMessage[];
  scores?: InterviewFrameScore[];
  summary?: string;
  finishedAt?: string;
  campaignId?: string;
  campaignTitle?: string;
  rubricId?: string;
  record?: {
    creatorId: string;
    campaignId: string;
    campaignTitle: string;
    transcript: InterviewMessage[];
    scores: InterviewFrameScore[];
    summary: ServerInterviewSummary;
    finishedAt: string;
  };
}
interface SubmissionListItem {
  campaignId: string;
  campaignTitle: string;
  finishedAt: string;
  rubricId?: string;
  rubricLabel?: string;
  rubricOverall?: number;
  cached: CachedInterview;
}

const STORAGE_PREFIX = "mercor.interview.";
const STORAGE_VERSION = "v1";
const RL_STORAGE_KEY = "mercor.rlstudio.v1";

// ---------- Submission storage helpers (preserved verbatim) ----------

function loadAllSubmissions(creatorId: string): SubmissionListItem[] {
  if (typeof window === "undefined") return [];
  const out: SubmissionListItem[] = [];
  const seen = new Set<string>();
  try {
    const indexKey = `${STORAGE_PREFIX}${creatorId}.index.${STORAGE_VERSION}`;
    const raw = window.localStorage.getItem(indexKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      // Validate the index is a string[] before iterating. A tampered
      // localStorage blob (e.g. {"__proto__": {...}}) otherwise survives
      // an unchecked `as string[]` cast and lands in downstream property
      // access.
      const ids = Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
      for (const cId of ids) {
        if (seen.has(cId)) continue;
        const cached = readPerCampaign(creatorId, cId);
        if (!cached) continue;
        out.push(toListItem(cId, cached));
        seen.add(cId);
      }
    }
  } catch {
    // index corrupt — fall through
  }
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const prefix = `${STORAGE_PREFIX}${creatorId}.`;
      if (!key.startsWith(prefix)) continue;
      const tail = key.slice(prefix.length);
      if (tail === STORAGE_VERSION || tail === `index.${STORAGE_VERSION}`) continue;
      const dot = tail.lastIndexOf(".");
      if (dot < 0) continue;
      const cId = tail.slice(0, dot);
      const ver = tail.slice(dot + 1);
      if (ver !== STORAGE_VERSION) continue;
      if (seen.has(cId)) continue;
      const cached = readPerCampaign(creatorId, cId);
      if (!cached) continue;
      out.push(toListItem(cId, cached));
      seen.add(cId);
    }
  } catch {
    // ignore
  }
  if (out.length === 0) {
    try {
      const raw = window.localStorage.getItem(
        `${STORAGE_PREFIX}${creatorId}.${STORAGE_VERSION}`,
      );
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // Defend against tampered blobs that could pollute via spreads
        // downstream — only proceed if the parsed value is a non-null
        // object with a string campaignId.
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          typeof (parsed as { campaignId?: unknown }).campaignId === "string"
        ) {
          const cached = parsed as CachedInterview;
          if (cached.campaignId && !seen.has(cached.campaignId)) {
            out.push(toListItem(cached.campaignId, cached));
          }
        }
      }
    } catch {
      // ignore
    }
  }
  out.sort((a, b) => (a.finishedAt > b.finishedAt ? -1 : 1));
  return out;
}

function readPerCampaign(creatorId: string, campaignId: string): CachedInterview | null {
  try {
    const raw = window.localStorage.getItem(
      `${STORAGE_PREFIX}${creatorId}.${campaignId}.${STORAGE_VERSION}`,
    );
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { campaignId?: unknown }).campaignId !== "string"
    ) {
      return null;
    }
    return parsed as CachedInterview;
  } catch {
    return null;
  }
}

function toListItem(campaignId: string, cached: CachedInterview): SubmissionListItem {
  const summary = cached.record?.summary;
  return {
    campaignId,
    campaignTitle:
      cached.campaignTitle ?? cached.record?.campaignTitle ?? campaignId,
    finishedAt: cached.finishedAt ?? cached.record?.finishedAt ?? "",
    rubricId: cached.rubricId ?? summary?.rubricId,
    rubricLabel: summary?.rubricLabel,
    rubricOverall: summary?.rubricOverall,
    cached,
  };
}

// ---------- Seed RL Studio tasks (5 pairs in the Celsius project) ----------

interface RlStudioTask {
  id: string;
  title: string;
  prompt: string;
  variantA: PairwiseVariant;
  variantB: PairwiseVariant;
  defaultStatus: RlStudioStatus;
  defaultRatings: PairwiseRatings;
}

const SEED_TASKS: RlStudioTask[] = [
  {
    id: "celsius-ab-001",
    title: "Pre-workout hook for late-night STEM grind",
    prompt:
      "Pick the variant most likely to convert UCSB STEM students to a Celsius-pre-lift habit before a 10pm problem set.",
    variantA: {
      id: "var-a-001",
      label: "Average quant ride-along",
      creatorName: "Logan Mann",
      creatorHandle: "@loganmann32",
      thumbnailEmoji: "💪",
      thumbnailColor: "#0e7c54",
      caption:
        "Average quant. Two cans, two pages of derivatives, hit the squat rack at 11pm.",
      hashtags: ["#janestreet", "#ucsb", "#quant", "#celsiuslivefit"],
      hookCopy:
        "POV: average quant. Two pages of derivatives, one Celsius, then squats.",
    },
    variantB: {
      id: "var-b-001",
      label: "Library-to-gym sprint",
      creatorName: "Logan Mann",
      creatorHandle: "@loganmann32",
      thumbnailEmoji: "📚",
      thumbnailColor: "#1d4ed8",
      caption:
        "Library 6pm, gym 9pm, problem set due midnight. Celsius is the only thing that survives all three.",
      hashtags: ["#ucsb", "#stem", "#celsius", "#gym"],
      hookCopy:
        "Library 6pm. Gym 9pm. Problem set midnight. Same can the whole time.",
    },
    defaultStatus: "Approved",
    defaultRatings: {
      winner: 1,
      helpfulness: 6,
      brandFit: 7,
      creativeStyle: 6,
      improvement:
        "Variant A's 'average quant' opener is the wow-moment. Lean harder on the Jane-Street + UCSB cross-tag in the next pass.",
    },
  },
  {
    id: "celsius-ab-002",
    title: "Morning lift CTA — Live Fit positioning",
    prompt:
      "Which hook lands harder for the 6am pre-workout audience? Brand wants 'Live Fit' as the closer, not the opener.",
    variantA: {
      id: "var-a-002",
      label: "Quiet 6am routine",
      creatorName: "Lexi Schade",
      creatorHandle: "@lexschade",
      thumbnailEmoji: "🌅",
      thumbnailColor: "#7c3aed",
      caption:
        "Nobody else awake. Just me, the rack, and a Sparkling Orange. Live Fit.",
      hashtags: ["#celsius", "#livefit", "#morningroutine"],
      hookCopy: "Nobody else is awake. Just me, the rack, and a cold can.",
    },
    variantB: {
      id: "var-b-002",
      label: "Coffee replacement angle",
      creatorName: "Lexi Schade",
      creatorHandle: "@lexschade",
      thumbnailEmoji: "☕",
      thumbnailColor: "#b91c1c",
      caption:
        "Stopped drinking coffee 60 days ago. Celsius is the only swap that didn't crash me at 11am.",
      hashtags: ["#celsius", "#energy", "#nocaffeinecrash"],
      hookCopy: "Day 60 without coffee. Here is the one swap that worked.",
    },
    defaultStatus: "Approved",
    defaultRatings: {
      winner: 4,
      helpfulness: 6,
      brandFit: 6,
      creativeStyle: 7,
      improvement:
        "Variant B's coffee-swap framing pulls in a wider audience than the gym-only A. Move 'Live Fit' to the closer instead of leading with it.",
    },
  },
  {
    id: "celsius-ab-003",
    title: "Flavor-launch reveal — Sparkling Watermelon",
    prompt:
      "First-look reveal for a new flavor drop. Pick the variant that drives saves + shares without sounding like a paid ad.",
    variantA: {
      id: "var-a-003",
      label: "Cold-open taste test",
      creatorName: "Maya Park",
      creatorHandle: "@mayagrindset",
      thumbnailEmoji: "🍉",
      thumbnailColor: "#dc2626",
      caption:
        "Got the new Sparkling Watermelon early. Honest review in 12 seconds.",
      hashtags: ["#celsius", "#newflavor", "#tastetest"],
      hookCopy: "I got the new Watermelon early. Honest review.",
    },
    variantB: {
      id: "var-b-003",
      label: "Restock-rage hook",
      creatorName: "Maya Park",
      creatorHandle: "@mayagrindset",
      thumbnailEmoji: "🛒",
      thumbnailColor: "#0e7c54",
      caption:
        "Walked into Target, every Watermelon Celsius gone. Stocking up before the next drop.",
      hashtags: ["#celsius", "#energydrink", "#restock"],
      hookCopy: "Walked into Target. Every Watermelon Celsius — gone.",
    },
    defaultStatus: "Approved",
    defaultRatings: {
      winner: 2,
      helpfulness: 5,
      brandFit: 6,
      creativeStyle: 5,
      improvement:
        "Variant A reads more honest; B leans on FOMO that feels manufactured. Keep the cold-open taste-test format for flavor launches.",
    },
  },
  {
    id: "celsius-ab-004",
    title: "Study-fuel angle for finals week",
    prompt:
      "Audience: junior + senior STEM majors during finals. Goal: reposition Celsius as a study companion, not just gym fuel.",
    variantA: {
      id: "var-a-004",
      label: "Stack of textbooks reveal",
      creatorName: "Logan Mann",
      creatorHandle: "@loganmann32",
      thumbnailEmoji: "📖",
      thumbnailColor: "#0e7c54",
      caption:
        "Finals week. Three problem sets, one econometrics exam, six Celsius. Send help.",
      hashtags: ["#finalsweek", "#celsius", "#stem"],
      hookCopy:
        "Finals week. Three problem sets, one econometrics exam, six cans.",
    },
    variantB: {
      id: "var-b-004",
      label: "Library timelapse",
      creatorName: "Logan Mann",
      creatorHandle: "@loganmann32",
      thumbnailEmoji: "⏱️",
      thumbnailColor: "#1d4ed8",
      caption:
        "Eight hours in the UCSB library, sped up. Watch which can stays in frame the whole time.",
      hashtags: ["#ucsb", "#studytok", "#celsius"],
      hookCopy: "Eight hours in the library, sped up. Watch the desk.",
    },
    defaultStatus: "In Review",
    defaultRatings: {
      winner: 3,
      helpfulness: 5,
      brandFit: 5,
      creativeStyle: 5,
      improvement: "",
    },
  },
  {
    id: "celsius-ab-005",
    title: "Group-lift social proof",
    prompt:
      "Friends-lift content. Variant must show authentic group dynamics, not posed bodybuilding posters.",
    variantA: {
      id: "var-a-005",
      label: "Spotter-and-laugh moment",
      creatorName: "Cassey Ho",
      creatorHandle: "@blogilates",
      thumbnailEmoji: "🏋️",
      thumbnailColor: "#0e7c54",
      caption:
        "When your spotter is also the one filming. Group session, group cans.",
      hashtags: ["#celsius", "#gymfriends", "#livefit"],
      hookCopy:
        "When your spotter is also the one filming. Group session, group cans.",
    },
    variantB: {
      id: "var-b-005",
      label: "Posed group photo",
      creatorName: "Cassey Ho",
      creatorHandle: "@blogilates",
      thumbnailEmoji: "📸",
      thumbnailColor: "#525252",
      caption: "Squad lift. Celsius before, Celsius after. Built different.",
      hashtags: ["#celsius", "#built", "#gym"],
      hookCopy: "Squad lift. Celsius before. Celsius after.",
    },
    defaultStatus: "Pending",
    defaultRatings: {
      winner: 3,
      helpfulness: 4,
      brandFit: 4,
      creativeStyle: 4,
      improvement: "",
    },
  },
];

// ---------- localStorage persistence for RL Studio state ----------

interface RlStudioPersistedTask {
  status: RlStudioStatus;
  ratings: PairwiseRatings;
}

interface RlStudioPersistedState {
  world: RlStudioWorld;
  role: RlStudioRole;
  activeTaskId: string;
  tasks: Record<string, RlStudioPersistedTask>;
}

function buildDefaultState(): RlStudioPersistedState {
  const tasks: Record<string, RlStudioPersistedTask> = {};
  for (const t of SEED_TASKS) {
    tasks[t.id] = {
      status: t.defaultStatus,
      ratings: { ...t.defaultRatings },
    };
  }
  return {
    world: "Fitness",
    role: "Reviewer",
    activeTaskId: SEED_TASKS[0].id,
    tasks,
  };
}

function loadRlStudioState(): RlStudioPersistedState {
  if (typeof window === "undefined") return buildDefaultState();
  try {
    const raw = window.localStorage.getItem(RL_STORAGE_KEY);
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw) as Partial<RlStudioPersistedState>;
    const fallback = buildDefaultState();
    const tasks = { ...fallback.tasks };
    if (parsed.tasks) {
      for (const tid of Object.keys(tasks)) {
        const persisted = parsed.tasks[tid];
        if (!persisted) continue;
        // Validate `ratings` is a plain object before spreading. A
        // tampered storage blob with `{"ratings": {"__proto__": ...}}`
        // would otherwise pollute through the spread.
        const ratingsCandidate: unknown = persisted.ratings;
        const safeRatings =
          typeof ratingsCandidate === "object" &&
          ratingsCandidate !== null &&
          !Array.isArray(ratingsCandidate)
            ? (ratingsCandidate as Partial<RlStudioPersistedTask["ratings"]>)
            : {};
        tasks[tid] = {
          status: RL_STUDIO_STATUSES.includes(persisted.status)
            ? persisted.status
            : tasks[tid].status,
          ratings: {
            ...tasks[tid].ratings,
            ...safeRatings,
          },
        };
      }
    }
    return {
      world:
        parsed.world && RL_STUDIO_WORLDS.includes(parsed.world)
          ? parsed.world
          : fallback.world,
      role:
        parsed.role === "Writer" || parsed.role === "Reviewer"
          ? parsed.role
          : fallback.role,
      activeTaskId:
        parsed.activeTaskId && tasks[parsed.activeTaskId]
          ? parsed.activeTaskId
          : fallback.activeTaskId,
      tasks,
    };
  } catch {
    return buildDefaultState();
  }
}

function saveRlStudioState(state: RlStudioPersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / disabled storage — ignore silently
  }
}

// ---------- Page entry ----------

export default function AdminInterviewPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = use(params);
  return (
    <Suspense fallback={null}>
      <AdminInterviewInner creatorId={creatorId} />
    </Suspense>
  );
}

function AdminInterviewInner({ creatorId }: { creatorId: string }) {
  const search = useSearchParams();
  const queryCampaign = search.get("campaign") ?? null;

  const creator = useMemo(() => CREATORS.find((c) => c.id === creatorId), [creatorId]);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [framesOpen, setFramesOpen] = useState(false);

  const [rlState, setRlState] = useState<RlStudioPersistedState>(buildDefaultState);
  const [rlLoaded, setRlLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<RlStudioTab>("Tasks");

  useEffect(() => {
    setSubmissions(loadAllSubmissions(creatorId));
    setSubmissionsLoaded(true);
    setRlState(loadRlStudioState());
    setRlLoaded(true);
  }, [creatorId]);

  useEffect(() => {
    if (!rlLoaded) return;
    saveRlStudioState(rlState);
  }, [rlState, rlLoaded]);

  const selected: SubmissionListItem | null = useMemo(() => {
    if (submissions.length === 0) return null;
    if (queryCampaign) {
      const hit = submissions.find((s) => s.campaignId === queryCampaign);
      if (hit) return hit;
    }
    return submissions[0];
  }, [submissions, queryCampaign]);

  const activeTask = useMemo(
    () => SEED_TASKS.find((t) => t.id === rlState.activeTaskId) ?? SEED_TASKS[0],
    [rlState.activeTaskId],
  );
  const activeTaskState = rlState.tasks[activeTask.id];
  const approvedTasks = useMemo(
    () =>
      SEED_TASKS.filter((t) => rlState.tasks[t.id]?.status === "Approved"),
    [rlState.tasks],
  );
  const tabCounts: Record<RlStudioTab, number> = {
    Tasks: SEED_TASKS.length,
    "Approved Tasks": approvedTasks.length,
    Submission: submissions.length,
  };

  const celsius = BRANDS_BY_ID["celsius"];
  const brandVoice = celsius?.brand_voice ?? [
    "high-performance",
    "study-meets-gym",
    "clean energy",
    "essential nutrition",
  ];
  const adThemes = celsius?.ad_themes;

  if (!creator) {
    return (
      <div className="px-8 py-10">
        <Link href="/admin/creators" className="text-[13px] text-[var(--accent)] hover:underline">
          ← Back to creators
        </Link>
        <h1 className="mt-4 text-[24px] font-semibold tracking-tight">Creator not found</h1>
      </div>
    );
  }

  const updateActiveTask = (next: {
    status?: RlStudioStatus;
    ratings?: Partial<PairwiseRatings>;
  }) => {
    setRlState((prev) => {
      const current = prev.tasks[activeTask.id];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [activeTask.id]: {
            status: next.status ?? current.status,
            ratings: {
              ...current.ratings,
              ...(next.ratings ?? {}),
            },
          },
        },
      };
    });
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        <ArrowLeft size={13} /> All creators
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-col gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight">
              {creator.name}{" "}
              <span className="text-[var(--fg-muted)] font-medium">
                — RL Studio
              </span>
            </h1>
            <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
              {creator.handle} · {creator.followers.toLocaleString()} followers
            </p>
            <p className="mt-2 max-w-[820px] text-[12.5px] leading-snug text-[var(--fg-muted)]">
              <span
                className="font-semibold"
                style={{ color: "#7857FF" }}
              >
                {DAY1_REVENUE_HEADLINE}
              </span>{" "}
              Each rubric pair — when licensed to an AI lab via Mercor RL Studio —
              prices like other expert-graded data Mercor sells today.
            </p>
          </div>
          <RoleToggle
            role={rlState.role}
            onChange={(next) => setRlState((p) => ({ ...p, role: next }))}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <TasksTabs
          active={activeTab}
          onChange={setActiveTab}
          counts={tabCounts}
        />
      </div>

      {/* Body — three-column layout for Tasks / Approved Tasks tabs */}
      {activeTab === "Submission" ? (
        <SubmissionTabContent
          submissions={submissions}
          loaded={submissionsLoaded}
          selected={selected}
          creator={creator}
          creatorId={creatorId}
          transcriptOpen={transcriptOpen}
          setTranscriptOpen={setTranscriptOpen}
          framesOpen={framesOpen}
          setFramesOpen={setFramesOpen}
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
          {/* Left rail: project + world + task list */}
          <aside className="flex flex-col gap-4">
            <ProjectWorldSelector
              projectName="Logan × Celsius"
              world={rlState.world}
              onWorldChange={(w) => setRlState((p) => ({ ...p, world: w }))}
            />
            <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
              <div className="border-b border-[var(--border)] px-3 py-2 text-[12px] font-semibold">
                Tasks
              </div>
              <ul>
                {SEED_TASKS.map((t) => {
                  const isActive = t.id === rlState.activeTaskId;
                  const ts = rlState.tasks[t.id];
                  return (
                    <li
                      key={t.id}
                      className="border-t border-[var(--border)] first:border-t-0"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setRlState((p) => ({ ...p, activeTaskId: t.id }))
                        }
                        className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-elev)] ${
                          isActive ? "bg-[var(--accent-soft)]" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[12.5px] font-medium leading-snug text-[var(--fg)]">
                            {t.title}
                          </div>
                          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
                            Pairwise · {t.variantA.creatorHandle}
                          </div>
                        </div>
                        <StatusPill status={ts.status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>

          {/* Center pane */}
          <main className="min-w-0">
            {activeTab === "Tasks" ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
                  <div>
                    <div className="label-cap">Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill
                        status={activeTaskState.status}
                        size="md"
                      />
                      <span className="text-[12px] text-[var(--fg-muted)]">
                        Cycle: {RL_STUDIO_STATUSES.join(" → ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {RL_STUDIO_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateActiveTask({ status: s })}
                        className={`rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors ${
                          activeTaskState.status === s
                            ? "border-[#7857FF] bg-[var(--accent-soft)] text-[#7857FF]"
                            : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <PairwiseABCard
                  taskTitle={activeTask.title}
                  taskPrompt={activeTask.prompt}
                  variantA={activeTask.variantA}
                  variantB={activeTask.variantB}
                  ratings={activeTaskState.ratings}
                  onWinnerChange={(winner) =>
                    updateActiveTask({ ratings: { winner } })
                  }
                  onLikertChange={(field, next) =>
                    updateActiveTask({ ratings: { [field]: next } })
                  }
                  onImprovementChange={(text) =>
                    updateActiveTask({ ratings: { improvement: text } })
                  }
                  disabled={rlState.role === "Writer"}
                />
              </div>
            ) : (
              <ApprovedTasksList
                tasks={approvedTasks}
                taskState={rlState.tasks}
                onOpen={(id) => {
                  setRlState((p) => ({ ...p, activeTaskId: id }));
                  setActiveTab("Tasks");
                }}
              />
            )}
          </main>

          {/* Right rail: rubric */}
          <RubricRail
            brandName={celsius?.name ?? "Celsius"}
            brandVoice={brandVoice}
            adThemes={adThemes}
            worldName={rlState.world}
          />
        </div>
      )}
    </div>
  );
}

// ---------- Approved Tasks list ----------

function ApprovedTasksList({
  tasks,
  taskState,
  onOpen,
}: {
  tasks: RlStudioTask[];
  taskState: Record<string, RlStudioPersistedTask>;
  onOpen: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-[13px] text-[var(--fg-muted)]">
        {RL_STUDIO_EMPTY_STATE}
      </div>
    );
  }
  return (
    <section className="rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
      <div className="border-b border-[var(--border)] px-5 py-3 text-[13px] font-semibold">
        Approved Tasks ({tasks.length})
      </div>
      <ul>
        {tasks.map((t) => {
          const ts = taskState[t.id];
          const winnerLetter = ts.ratings.winner <= 2 ? "A" : ts.ratings.winner >= 4 ? "B" : "Tie";
          return (
            <li
              key={t.id}
              className="border-t border-[var(--border)] first:border-t-0"
            >
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-elev)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-[var(--fg)]">
                    {t.title}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--fg-muted)]">
                    {ts.ratings.improvement || t.prompt}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--fg-muted)]">
                    <span>
                      Winner:{" "}
                      <span className="font-semibold text-[var(--fg)]">
                        {winnerLetter} ({ts.ratings.winner}/5)
                      </span>
                    </span>
                    <span>Helpfulness {ts.ratings.helpfulness}/7</span>
                    <span>Brand fit {ts.ratings.brandFit}/7</span>
                    <span>Creative {ts.ratings.creativeStyle}/7</span>
                  </div>
                </div>
                <StatusPill status={ts.status} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- Submission tab — preserves the prior detail view ----------

function SubmissionTabContent({
  submissions,
  loaded,
  selected,
  creator,
  creatorId,
  transcriptOpen,
  setTranscriptOpen,
  framesOpen,
  setFramesOpen,
}: {
  submissions: SubmissionListItem[];
  loaded: boolean;
  selected: SubmissionListItem | null;
  creator: { name: string };
  creatorId: string;
  transcriptOpen: boolean;
  setTranscriptOpen: (v: boolean) => void;
  framesOpen: boolean;
  setFramesOpen: (v: boolean) => void;
}) {
  if (!loaded) {
    return (
      <div className="mt-6 text-[13px] text-[var(--fg-muted)]">
        Loading interviews…
      </div>
    );
  }
  if (submissions.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-6 text-[13px] text-[var(--fg-muted)]">
        No interviews on file for {creator.name}. Once the candidate completes
        the AI interview from{" "}
        <code className="text-[12px]">/interview/&lt;slug&gt;</code>, this view
        will populate with the transcript, rubric grades, and AI summary.
      </div>
    );
  }
  return (
    <>
      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border)] px-5 py-3 text-[13px] font-semibold">
          Submissions ({submissions.length})
        </div>
        <ul>
          {submissions.map((s) => {
            const isActive = selected?.campaignId === s.campaignId;
            const camp = CAMPAIGNS_BY_ID[s.campaignId];
            const date = s.finishedAt
              ? new Date(s.finishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—";
            const overallPct =
              s.rubricOverall != null ? `${Math.round(s.rubricOverall * 100)}%` : "—";
            return (
              <li key={s.campaignId} className="border-t border-[var(--border)] first:border-t-0">
                <Link
                  href={`/admin/interviews/${creatorId}?campaign=${s.campaignId}`}
                  className={`flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--bg-hover)] ${
                    isActive ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-[var(--fg)]">
                      {s.campaignTitle}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                      <span>{date}</span>
                      {s.rubricLabel ? (
                        <>
                          <span>·</span>
                          <span>{s.rubricLabel}</span>
                        </>
                      ) : null}
                      {camp?.brand_id ? (
                        <>
                          <span>·</span>
                          <span>{camp.brand_id}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-[11px] uppercase tracking-wider text-[var(--fg-muted)]">
                      Rubric
                    </div>
                    <div className="text-[14px] font-semibold tabular-nums">
                      {overallPct}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {selected ? (
        <SubmissionDetail
          submission={selected}
          creatorName={creator.name}
          transcriptOpen={transcriptOpen}
          setTranscriptOpen={setTranscriptOpen}
          framesOpen={framesOpen}
          setFramesOpen={setFramesOpen}
        />
      ) : null}
    </>
  );
}

function SubmissionDetail({
  submission: s,
  creatorName,
  transcriptOpen,
  setTranscriptOpen,
  framesOpen,
  setFramesOpen,
}: {
  submission: SubmissionListItem;
  creatorName: string;
  transcriptOpen: boolean;
  setTranscriptOpen: (v: boolean) => void;
  framesOpen: boolean;
  setFramesOpen: (v: boolean) => void;
}) {
  const cached = s.cached;
  const summaryObj = cached.record?.summary;
  const transcript = cached.transcript ?? cached.record?.transcript ?? [];
  const scores = cached.scores ?? cached.record?.scores ?? [];
  const summaryText = summaryObj?.summary ?? cached.summary ?? "";
  const criteria = summaryObj?.criteria;
  const rubric = getRubricById(s.rubricId);
  const overallPct = s.rubricOverall != null ? Math.round(s.rubricOverall * 100) : null;

  const meanConfidence = scores.length
    ? Math.round((scores.reduce((a, x) => a + x.confidence, 0) / scores.length) * 100)
    : summaryObj
      ? Math.round(summaryObj.confidence * 100)
      : null;
  const meanEngagement = scores.length
    ? Math.round((scores.reduce((a, x) => a + x.engagement, 0) / scores.length) * 100)
    : summaryObj
      ? Math.round(summaryObj.engagement * 100)
      : null;
  const cheatRank: Record<CheatingLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
  const worstCheat: CheatingLevel = scores.length
    ? scores.reduce<CheatingLevel>(
        (acc, x) => (cheatRank[x.cheating] > cheatRank[acc] ? x.cheating : acc),
        "none",
      )
    : (summaryObj?.cheating ?? "none");
  const worstFrame =
    summaryObj?.worstFrame ??
    scores
      .slice()
      .sort(
        (a, b) =>
          cheatRank[b.cheating] - cheatRank[a.cheating] || a.confidence - b.confidence,
      )[0] ??
    null;
  const turns = transcript.length;
  const userTurns = transcript.filter((m) => m.role === "user").length;
  const date = s.finishedAt
    ? new Date(s.finishedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[18px] font-semibold tracking-tight">{s.campaignTitle}</h2>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--fg-muted)]">
          {rubric.label}
        </span>
        {date ? (
          <span className="text-[12px] text-[var(--fg-muted)]">submitted {date}</span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label="Rubric grade" value={overallPct != null ? `${overallPct}%` : "—"} sub={rubric.label} tone={overallPct != null && overallPct < 60 ? "warn" : "ok"} />
        <KPI label="Confidence" value={meanConfidence != null ? `${meanConfidence}%` : "—"} sub="Speech + frames" tone={meanConfidence != null && meanConfidence < 50 ? "warn" : "ok"} />
        <KPI label="Engagement" value={meanEngagement != null ? `${meanEngagement}%` : "—"} sub="Speech + frames" tone={meanEngagement != null && meanEngagement < 40 ? "warn" : "ok"} />
        <KPI label="Integrity" value={worstCheat === "none" ? "Clean" : worstCheat} sub={worstCheat === "none" ? "No cheating signals" : "Worst frame flagged"} tone={worstCheat === "none" ? "ok" : "warn"} />
      </div>

      {summaryText ? (
        <section className="mt-5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="label-cap">AI summary</div>
          <p className="mt-2 text-[14px] leading-[1.55] text-[var(--fg)]">{summaryText}</p>
        </section>
      ) : null}

      {criteria && criteria.length > 0 ? (
        <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="label-cap">Rubric breakdown</div>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                {rubric.label} — {rubric.description}
              </p>
            </div>
            {overallPct != null ? (
              <div className="text-right">
                <div className="label-cap">Overall</div>
                <div className="text-[20px] font-semibold tabular-nums">{overallPct}%</div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {criteria.map((c) => {
              const pct = (c.score / 5) * 100;
              return (
                <div key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[13px] font-medium">{c.label}</div>
                    <div className="text-[12px] text-[var(--fg-muted)] tabular-nums">
                      {c.score.toFixed(1)} / 5
                      <span className="ml-2 text-[var(--fg-subtle)]">
                        weight {Math.round(c.weight * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <div
                      className={`h-full ${pct < 40 ? "bg-[var(--warning)]" : "bg-[var(--accent)]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.45] text-[var(--fg-muted)]">
                    {c.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {worstFrame && worstCheat !== "none" ? (
        <section className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--warning-soft,#fef3c7)] p-4 text-[13px] text-[var(--fg)]">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 text-[var(--warning)]" />
            <div>
              <div className="font-semibold">Integrity flag</div>
              <p className="mt-1 text-[var(--fg-muted)]">
                Worst frame at {new Date(worstFrame.ts).toLocaleTimeString()} —{" "}
                {worstFrame.cheating} cheating signal,{" "}
                {Math.round(worstFrame.confidence * 100)}% confidence. {worstFrame.reason}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
        <button
          type="button"
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-[14px] font-semibold">
            Transcript ({turns} turns · {userTurns} from candidate)
          </span>
          {transcriptOpen ? (
            <ChevronUp size={15} className="text-[var(--fg-muted)]" />
          ) : (
            <ChevronDown size={15} className="text-[var(--fg-muted)]" />
          )}
        </button>
        {transcriptOpen ? (
          <ol className="space-y-3 border-t border-[var(--border)] px-5 py-4">
            {transcript.map((m, i) => (
              <li key={i} className="text-[13px]">
                <span
                  className={
                    m.role === "assistant"
                      ? "font-semibold text-[var(--accent)]"
                      : "font-semibold text-[var(--fg-muted)]"
                  }
                >
                  {m.role === "assistant" ? "Interviewer" : creatorName}:{" "}
                </span>
                <span className="text-[var(--fg)]">{m.content}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {scores.length > 0 ? (
        <section className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setFramesOpen(!framesOpen)}
            className="flex w-full items-center justify-between px-5 py-3 text-left"
          >
            <span className="text-[14px] font-semibold">Frame scores ({scores.length})</span>
            {framesOpen ? (
              <ChevronUp size={15} className="text-[var(--fg-muted)]" />
            ) : (
              <ChevronDown size={15} className="text-[var(--fg-muted)]" />
            )}
          </button>
          {framesOpen ? (
            <table className="w-full border-collapse border-t border-[var(--border)] text-[12px]">
              <thead className="bg-[var(--bg-elev)] text-[var(--fg-muted)]">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Time</th>
                  <th className="px-5 py-2 text-left font-medium">Confidence</th>
                  <th className="px-5 py-2 text-left font-medium">Engagement</th>
                  <th className="px-5 py-2 text-left font-medium">Cheating</th>
                  <th className="px-5 py-2 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((sc, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-5 py-2 text-[var(--fg-muted)]">
                      {new Date(sc.ts).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-2">{Math.round(sc.confidence * 100)}%</td>
                    <td className="px-5 py-2">{Math.round(sc.engagement * 100)}%</td>
                    <td className="px-5 py-2 capitalize">
                      <span
                        className={
                          sc.cheating === "none"
                            ? "text-[var(--fg-muted)]"
                            : "font-medium text-[var(--warning)]"
                        }
                      >
                        {sc.cheating}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-[var(--fg-muted)]">{sc.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  tone = "ok",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="label-cap">{label}</div>
      <div
        className={`mt-1 text-[20px] font-semibold tracking-tight ${
          tone === "warn" ? "text-[var(--warning)]" : "text-[var(--fg)]"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{sub}</div>
    </div>
  );
}
