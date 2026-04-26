"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Edit2, Send, SkipForward, X } from "lucide-react";
import { CREATORS, CREATORS_BY_ID, type Creator } from "@/lib/data/creators";
import { BRANDS_BY_ID, type Brand } from "@/lib/data/brands";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import { Avatar } from "@/components/shell/Avatar";
import { BrandMark } from "@/components/shell/BrandMark";
import { ClaudeMark } from "@/components/shell/ClaudeMark";
import { computeImpact, computeSuggestedPay, fmtCurrency, fmtFollowers, similarity } from "@/lib/util/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThreadStatus =
  | "queued"
  | "drafting"
  | "pending"
  | "sent"
  | "replied"
  | "negotiating"
  | "skipped";

type Reply = {
  id: string;
  text: string;
  persona: string;
  timestamp: number;
};

type Thread = {
  id: string;
  creatorId: string;
  brandId: string;
  campaignId: string;
  status: ThreadStatus;
  similarity: number;
  draftMessage: string;
  replies: Reply[];
};

// ---------------------------------------------------------------------------
// Helpers - draft message builder
// ---------------------------------------------------------------------------

function buildDraft(creator: Creator, brand: Brand, campaignTitle: string, payLow: number, payHigh: number): string {
  const firstName = creator.name.split(" ")[0];
  const post = creator.cited_posts?.[0];
  const hashtags = post?.hashtags?.slice(0, 2).join(" ") ?? creator.niche_tags.slice(0, 2).map((t) => `#${t}`).join(" ");

  if (creator.id === "loganmann32" && post) {
    return `Hey ${firstName} - saw your "${post.caption}" post (${post.url}). The ${hashtags} angle is exactly the kind of audience ${brand.name} pays for - UCSB STEM-coded, gym-native, no-fluff energy that converts. We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(payLow)}-${fmtCurrency(payHigh)}/post, full autonomy on the script. Shipping a sample regardless so you can feel the product first. Worth a 10-minute call this week?`;
  }

  const brandVoiceCue = brandVoiceHint(brand);
  return `Hey ${firstName} - your ${creator.niche} content is exactly the vibe ${brand.name} is looking for. The ${hashtags} positioning hits the same audience ${brandVoiceCue} We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(payLow)}-${fmtCurrency(payHigh)}/post, full creative autonomy. Shipping a sample today so you can get a feel before committing. Worth a quick 10-minute call to see if this is a fit?`;
}

function brandVoiceHint(brand: Brand): string {
  if (brand.id === "celsius") return "Celsius's college-ICP ad copy is chasing right now.";
  if (brand.id === "alani") return "Alani's it-girl voice is building community around.";
  if (brand.id === "bucked-up" || brand.id === "bucked-up-energy") return "Bucked Up's physique-first creative is investing in.";
  if (brand.id === "ghost-energy") return "Ghost's bold, transparent flavor drops are amplifying.";
  if (brand.id === "bloom") return "Bloom's morning-stack TikTok Shop channel is scaling.";
  if (brand.id === "ryse") return "Ryse's high-stim lift-demo ads are resonating with.";
  return `${brand.name}'s ${brand.brand_voice[0] ?? "brand voice"} campaign is targeting.`;
}

function simulatedReply(brand: Brand): string {
  if (brand.category === "preworkout" || brand.id === "bucked-up") {
    return "Could do $800 if you cover shipping on the product? Sounds like a strong fit.";
  }
  if (brand.category === "energy" && brand.id === "ghost-energy") {
    return "Great fit. Can we move on a 30-day exclusive? Our drops move fast.";
  }
  if (brand.category === "apparel") {
    return "Send the deck. We'll have our team review by end of week.";
  }
  if (brand.category === "ai-talent") {
    return "We'd want to bundle this with our campus push - can you do two posts in 14 days?";
  }
  if (brand.id === "alani") {
    return "Obsessed with your content honestly. Can you do a morning-routine angle? That's our best-performing format.";
  }
  if (brand.id === "celsius") {
    return "Love the STEM angle - can we get a study-session + gym clip in one video? That dual-use format is our core ask.";
  }
  return "Thanks for the reach-out! What does your posting schedule look like for the next 30 days?";
}

function simulatedFollowUpReply(brand: Brand): string {
  if (brand.category === "preworkout" || brand.id === "bucked-up") {
    return "That works. Let's lock it in - I'll have contracts sent over by Thursday.";
  }
  if (brand.category === "energy") {
    return "Perfect. We'll loop in our campaign lead and get you an agreement this week.";
  }
  if (brand.category === "apparel") {
    return "Looks good, we'll review and circle back within 48 hrs.";
  }
  return "Appreciate the flexibility. We'll get back to you shortly with next steps.";
}

// ---------------------------------------------------------------------------
// Build mock threads
// ---------------------------------------------------------------------------

const TARGET_BRAND_PAIRS: { brandId: string; creatorFilter?: (c: Creator) => boolean }[] = [
  { brandId: "celsius" },
  { brandId: "alani" },
  { brandId: "bucked-up" },
  { brandId: "ghost-energy" },
  { brandId: "bloom" },
];

function buildDefaultThreads(): Thread[] {
  const threads: Thread[] = [];

  // For each target brand, pick the highest-similarity creator
  for (const { brandId } of TARGET_BRAND_PAIRS) {
    const brand = BRANDS_BY_ID[brandId];
    if (!brand) continue;

    const ranked = CREATORS.filter((c) => c.id !== "loganmann32")
      .map((c) => ({ c, sim: similarity(c, brand) }))
      .sort((a, b) => b.sim - a.sim);

    const top = ranked[0];
    if (!top) continue;

    const campaignId = Object.keys(CAMPAIGNS_BY_ID).find((id) => CAMPAIGNS_BY_ID[id].brand_id === brandId) ?? "";
    const campaign = campaignId ? CAMPAIGNS_BY_ID[campaignId] : null;
    const impact = computeImpact(top.c, brand);
    const pay = computeSuggestedPay(top.c, brand, impact);
    const draft = buildDraft(top.c, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high);

    threads.push({
      id: `${brandId}-${top.c.id}`,
      creatorId: top.c.id,
      brandId,
      campaignId,
      status: "pending",
      similarity: top.sim,
      draftMessage: draft,
      replies: [],
    });
  }

  // Fill up to 12 with a spread of creators across statuses
  const usedCreatorIds = new Set(threads.map((t) => t.creatorId));
  const extraBrands = ["ryse", "gymshark", "bloom", "celsius", "ghost-energy", "alani", "bucked-up"];
  const extraStatuses: ThreadStatus[] = ["queued", "drafting", "sent", "sent", "replied", "replied", "negotiating"];
  const loganThread = buildLoganThread();
  threads.unshift(loganThread);
  usedCreatorIds.add("loganmann32");

  let idx = 0;
  for (const creator of CREATORS) {
    if (threads.length >= 12) break;
    if (usedCreatorIds.has(creator.id)) continue;

    const brandId = extraBrands[idx % extraBrands.length];
    const brand = BRANDS_BY_ID[brandId];
    if (!brand) { idx++; continue; }

    const campaignId = Object.keys(CAMPAIGNS_BY_ID).find((id) => CAMPAIGNS_BY_ID[id].brand_id === brandId) ?? "";
    const campaign = campaignId ? CAMPAIGNS_BY_ID[campaignId] : null;
    const impact = computeImpact(creator, brand);
    const pay = computeSuggestedPay(creator, brand, impact);
    const status = extraStatuses[idx % extraStatuses.length];
    const draft = buildDraft(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high);

    const replies: Reply[] = [];
    if (status === "replied" || status === "negotiating") {
      replies.push({
        id: `r-${creator.id}-1`,
        text: simulatedReply(brand),
        persona: `${brand.name} partnerships`,
        timestamp: Date.now() - 300_000,
      });
    }

    threads.push({
      id: `${brandId}-${creator.id}`,
      creatorId: creator.id,
      brandId,
      campaignId,
      status,
      similarity: similarity(creator, brand),
      draftMessage: draft,
      replies,
    });
    usedCreatorIds.add(creator.id);
    idx++;
  }

  return threads;
}

function buildLoganThread(): Thread {
  const brand = BRANDS_BY_ID["celsius"]!;
  const campaignId = "celsius-college-q2";
  const campaign = CAMPAIGNS_BY_ID[campaignId];
  const impact = computeImpact(CREATORS_BY_ID["loganmann32"], brand);
  const pay = computeSuggestedPay(CREATORS_BY_ID["loganmann32"], brand, impact);
  return {
    id: "celsius-loganmann32",
    creatorId: "loganmann32",
    brandId: "celsius",
    campaignId,
    status: "pending",
    similarity: similarity(CREATORS_BY_ID["loganmann32"], brand),
    draftMessage: buildDraft(CREATORS_BY_ID["loganmann32"], brand, campaign.title, pay.total_low, pay.total_high),
    replies: [],
  };
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------

function statusClass(status: ThreadStatus): string {
  if (status === "pending") return "pill pill-warning";
  if (status === "sent") return "pill pill-accent";
  if (status === "replied") return "pill pill-success";
  if (status === "negotiating") return "pill pill-warning";
  return "pill";
}

// ---------------------------------------------------------------------------
// Tab counts (static mock)
// ---------------------------------------------------------------------------

const TAB_COUNTS: Record<string, number> = {
  Pending: 0, // computed dynamically
  Sent: 3,
  Replied: 2,
  Negotiating: 1,
};

type TabName = "Pending" | "Sent" | "Replied" | "Negotiating";

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function OutreachPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[var(--fg-muted)]">Loading outreach queue…</div>}>
      <OutreachInner />
    </Suspense>
  );
}

function OutreachInner() {
  const params = useSearchParams();
  const focusId = params.get("focus");
  const picksParam = params.get("picks");
  const brandParam = params.get("brand");

  const [threads, setThreads] = useState<Thread[]>(() => {
    const base = buildDefaultThreads();

    // If coming from match page with picks, inject those as pending threads
    if (picksParam && brandParam) {
      const pickIds = picksParam.split(",").filter(Boolean);
      const brand = BRANDS_BY_ID[brandParam];
      if (brand) {
        const injected = pickIds
          .filter((id) => CREATORS_BY_ID[id] && !base.some((t) => t.creatorId === id && t.brandId === brandParam))
          .map((id) => {
            const creator = CREATORS_BY_ID[id];
            const campaignId = Object.keys(CAMPAIGNS_BY_ID).find((cid) => CAMPAIGNS_BY_ID[cid].brand_id === brandParam) ?? "";
            const campaign = campaignId ? CAMPAIGNS_BY_ID[campaignId] : null;
            const impact = computeImpact(creator, brand);
            const pay = computeSuggestedPay(creator, brand, impact);
            return {
              id: `${brandParam}-${id}-injected`,
              creatorId: id,
              brandId: brandParam,
              campaignId,
              status: "pending" as ThreadStatus,
              similarity: similarity(creator, brand),
              draftMessage: buildDraft(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high),
              replies: [],
            };
          });
        return [...injected, ...base];
      }
    }

    return base;
  });

  const [activeTab, setActiveTab] = useState<TabName>("Pending");
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (focusId) return focusId;
    return threads.find((t) => t.status === "pending")?.id ?? threads[0]?.id ?? "";
  });

  const selectedThread = threads.find((t) => t.id === selectedId) ?? null;

  const visibleThreads = useMemo(() => {
    if (activeTab === "Pending") return threads.filter((t) => t.status === "pending" || t.status === "queued" || t.status === "drafting");
    if (activeTab === "Sent") return threads.filter((t) => t.status === "sent");
    if (activeTab === "Replied") return threads.filter((t) => t.status === "replied");
    if (activeTab === "Negotiating") return threads.filter((t) => t.status === "negotiating");
    return threads;
  }, [threads, activeTab]);

  const updateThread = useCallback((id: string, patch: Partial<Thread>) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const pendingCount = threads.filter((t) => t.status === "pending" || t.status === "queued" || t.status === "drafting").length;

  const advanceToNext = useCallback((currentId: string) => {
    const remaining = threads.filter(
      (t) => (t.status === "pending" || t.status === "queued" || t.status === "drafting") && t.id !== currentId,
    );
    if (remaining.length > 0) setSelectedId(remaining[0].id);
  }, [threads]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Outreach approval queue</h1>
      </div>
      <p className="mt-1 text-[13px] text-[var(--fg-muted)]">
        Haiku-drafted messages. Approve, edit, or skip. Replies come back simulated 4-8s after send.
      </p>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-[var(--border)]">
        {(["Pending", "Sent", "Replied", "Negotiating"] as TabName[]).map((tab) => {
          const count = tab === "Pending" ? pendingCount : TAB_COUNTS[tab];
          return (
            <button
              key={tab}
              data-test-id={`outreach-tab-${tab.toLowerCase()}`}
              onClick={() => {
                setActiveTab(tab);
                const first = threads.find((t) => {
                  if (tab === "Pending") return t.status === "pending" || t.status === "queued" || t.status === "drafting";
                  if (tab === "Sent") return t.status === "sent";
                  if (tab === "Replied") return t.status === "replied";
                  if (tab === "Negotiating") return t.status === "negotiating";
                  return false;
                });
                if (first) setSelectedId(first.id);
              }}
              className={[
                "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors -mb-px",
                activeTab === tab
                  ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
              ].join(" ")}
            >
              {tab}
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  activeTab === tab
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[var(--bg-hover)] text-[var(--fg-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Two-pane layout */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT: thread list */}
        <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {visibleThreads.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[13px] text-[var(--fg-muted)]">
              No threads in this tab yet.
            </div>
          ) : (
            <ul>
              {visibleThreads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  thread={thread}
                  selected={thread.id === selectedId}
                  onSelect={() => setSelectedId(thread.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* RIGHT: thread detail */}
        <div>
          {selectedThread ? (
            <ThreadDetail
              thread={selectedThread}
              onUpdate={(patch) => updateThread(selectedThread.id, patch)}
              onAdvance={() => advanceToNext(selectedThread.id)}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-[14px] border border-[var(--border)] text-[13px] text-[var(--fg-muted)]">
              Select a thread to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThreadRow
// ---------------------------------------------------------------------------

function ThreadRow({
  thread,
  selected,
  onSelect,
}: {
  thread: Thread;
  selected: boolean;
  onSelect: () => void;
}) {
  const creator = CREATORS_BY_ID[thread.creatorId];
  const brand = BRANDS_BY_ID[thread.brandId];
  if (!creator || !brand) return null;

  const preview = thread.draftMessage.slice(0, 72) + "…";
  const simPct = Math.round(thread.similarity * 100);

  return (
    <li
      data-test-id={`outreach-thread-${thread.id}`}
      onClick={onSelect}
      className={[
        "flex cursor-pointer items-start gap-3 border-b border-[var(--border)] p-4 transition-colors last:border-b-0",
        selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-hover)]",
      ].join(" ")}
    >
      <Avatar name={creator.name} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-medium truncate">{creator.name}</span>
          <span className={statusClass(thread.status)} style={{ fontSize: 10, whiteSpace: "nowrap" }}>
            {thread.status}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <BrandMark brand={brand} size={14} />
          <span className="text-[11px] text-[var(--fg-muted)]">{brand.name}</span>
          <span className="text-[10px] text-[var(--fg-subtle)]">· {simPct}% match</span>
        </div>
        <p className="mt-1 truncate text-[11px] text-[var(--fg-muted)]">{preview}</p>
      </div>
      <ChevronRight size={14} className={selected ? "text-[var(--accent)]" : "text-[var(--fg-subtle)]"} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// ThreadDetail
// ---------------------------------------------------------------------------

type DetailProps = {
  thread: Thread;
  onUpdate: (patch: Partial<Thread>) => void;
  onAdvance: () => void;
};

function ThreadDetail({ thread, onUpdate, onAdvance }: DetailProps) {
  const creator = CREATORS_BY_ID[thread.creatorId];
  const brand = BRANDS_BY_ID[thread.brandId];
  const campaign = thread.campaignId ? CAMPAIGNS_BY_ID[thread.campaignId] : null;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(thread.draftMessage);
  const [counterText, setCounterText] = useState("");
  const [waitingReply, setWaitingReply] = useState(false);
  const [waitingCounter, setWaitingCounter] = useState(false);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset local edit state when thread changes
  useEffect(() => {
    setIsEditing(false);
    setEditValue(thread.draftMessage);
    setCounterText("");
    setWaitingReply(false);
    setWaitingCounter(false);
  }, [thread.id, thread.draftMessage]);

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
      if (counterTimeoutRef.current) clearTimeout(counterTimeoutRef.current);
    };
  }, []);

  if (!creator || !brand) return null;

  const impact = computeImpact(creator, brand);
  const pay = computeSuggestedPay(creator, brand, impact);

  const handleApprove = () => {
    const finalMessage = isEditing ? editValue : thread.draftMessage;
    onUpdate({ status: "sent", draftMessage: finalMessage });
    setIsEditing(false);
    setWaitingReply(true);

    const delay = 4000 + Math.random() * 4000;
    sendTimeoutRef.current = setTimeout(() => {
      onUpdate({
        status: "replied",
        replies: [
          ...thread.replies,
          {
            id: `reply-${Date.now()}`,
            text: simulatedReply(brand),
            persona: `${brand.name} partnerships`,
            timestamp: Date.now(),
          },
        ],
      });
      setWaitingReply(false);
    }, delay);
  };

  const handleEdit = () => {
    setIsEditing((v) => !v);
    if (!isEditing) setEditValue(thread.draftMessage);
  };

  const handleSkip = () => {
    onUpdate({ status: "skipped" });
    onAdvance();
  };

  const handleCounterSend = () => {
    if (!counterText.trim()) return;
    setWaitingCounter(true);
    const sentText = counterText;
    setCounterText("");

    const delay = 3000 + Math.random() * 2000;
    counterTimeoutRef.current = setTimeout(() => {
      onUpdate({
        status: "negotiating",
        replies: [
          ...thread.replies,
          {
            id: `counter-q-${Date.now()}`,
            text: sentText,
            persona: "You (Aaron)",
            timestamp: Date.now() - delay,
          },
          {
            id: `counter-r-${Date.now()}`,
            text: simulatedFollowUpReply(brand),
            persona: `${brand.name} partnerships`,
            timestamp: Date.now(),
          },
        ],
      });
      setWaitingCounter(false);
    }, delay);
  };

  const isSent = thread.status === "sent" || thread.status === "replied" || thread.status === "negotiating";
  const hasReplies = thread.replies.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Recap card */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-3">
          <Avatar name={creator.name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold">{creator.name}</span>
              <span className={statusClass(thread.status)} style={{ fontSize: 11 }}>
                {thread.status}
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
              {creator.handle} · {fmtFollowers(creator.followers)} followers
            </div>
          </div>
          <div className="text-right">
            <BrandMark brand={brand} size={24} />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-3">
          <div>
            <div className="label-cap">Brand</div>
            <div className="mt-0.5 text-[13px] font-medium">{brand.name}</div>
          </div>
          <div>
            <div className="label-cap">Campaign</div>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)] truncate" title={campaign?.title}>
              {campaign?.title ?? "-"}
            </div>
          </div>
          <div>
            <div className="label-cap">Suggested pay</div>
            <div className="mt-0.5 text-[13px] font-medium">
              {fmtCurrency(pay.total_low)}-{fmtCurrency(pay.total_high)}
            </div>
          </div>
        </div>
      </div>

      {/* Draft card */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="label-cap">Generated draft</span>
          <ClaudeMark model="haiku" size="xs" />
        </div>

        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent)]"
            rows={7}
            aria-label="Edit draft message"
          />
        ) : (
          <p className="text-[13px] leading-relaxed text-[var(--fg)]">{thread.draftMessage}</p>
        )}

        {/* Actions */}
        {!isSent && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              data-test-id="outreach-approve"
              onClick={handleApprove}
              className="btn-primary inline-flex items-center gap-2 text-[13px] py-2 px-4"
            >
              <Check size={14} />
              Approve &amp; send
            </button>
            <button
              data-test-id="outreach-edit"
              onClick={handleEdit}
              className="btn-outline inline-flex items-center gap-2 text-[13px] py-2 px-4"
            >
              <Edit2 size={14} />
              {isEditing ? "Cancel edit" : "Edit"}
            </button>
            <button
              data-test-id="outreach-skip"
              onClick={handleSkip}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-[13px] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
            >
              <SkipForward size={14} />
              Skip
            </button>
          </div>
        )}

        {isSent && !hasReplies && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--fg-muted)]">
            <span className="pill pill-accent text-[11px]">Sent</span>
            {waitingReply && <span className="animate-pulse">Waiting for reply…</span>}
          </div>
        )}
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="label-cap mb-3">Conversation</div>
          <div className="space-y-3">
            {thread.replies.map((reply) => {
              const isYou = reply.persona.toLowerCase().includes("aaron") || reply.persona.toLowerCase().includes("you");
              return (
                <div key={reply.id} className={`flex flex-col gap-1 ${isYou ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[12px] p-3 text-[13px] ${
                      isYou
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elev)] border border-[var(--border)] text-[var(--fg)]"
                    }`}
                  >
                    {reply.text}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--fg-subtle)]">
                    <span className="pill text-[10px] py-0 px-1.5">{reply.persona}</span>
                    <span>{new Date(reply.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Counter-offer box */}
          {!waitingCounter && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={counterText}
                onChange={(e) => setCounterText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCounterSend(); }}
                placeholder="Counter-offer or follow-up…"
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                aria-label="Counter-offer message"
              />
              <button
                data-test-id="outreach-counter-send"
                onClick={handleCounterSend}
                disabled={!counterText.trim()}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[13px] disabled:opacity-40"
              >
                <Send size={13} />
                Send
              </button>
            </div>
          )}
          {waitingCounter && (
            <p className="mt-3 text-[12px] text-[var(--fg-muted)] animate-pulse">
              Waiting for {brand.name} to respond…
            </p>
          )}
        </div>
      )}

      {/* Waiting for first reply indicator (after send, before reply arrives) */}
      {waitingReply && !hasReplies && (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] p-4 text-[12px] text-[var(--fg-muted)] animate-pulse text-center">
          {brand.name} is reviewing your message…
        </div>
      )}
    </div>
  );
}
