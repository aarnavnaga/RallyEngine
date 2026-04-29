"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronRight, Send, Sparkles } from "lucide-react";
import { CREATORS, CREATORS_BY_ID, type Creator } from "@/lib/data/creators";
import { BRANDS_BY_ID, type Brand } from "@/lib/data/brands";
import { CAMPAIGNS_BY_ID } from "@/lib/data/campaigns";
import {
  OUTREACH_AUTOMATION_COUNTER,
  OUTREACH_CONTRACT_REVENUE_STRIP,
} from "@/lib/data/source-of-truth";
import { Avatar } from "@/components/shell/Avatar";
import { BrandMark } from "@/components/shell/BrandMark";
import { ClaudeMark } from "@/components/shell/ClaudeMark";
import { buildCitations, computeImpact, computeSuggestedPay, fmtCurrency, fmtFollowers, similarity } from "@/lib/util/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Inbox-only flow: chats are for OUTREACH only — creators either agree to
// the terms or pass. There is no in-app negotiation. Once signed, the
// conversation moves to Slack and the chat composer is replaced by a
// "Comms moved to Slack" banner so the inbox stays clean.
type DealStage = "outreach" | "signed";

type ChatSide = "creator" | "brand";

type Message = {
  id: string;
  text: string;
  /** "aaron" = us, the Mercor operator. "creator"/"brand" = the counterparty replying to us. */
  from: "aaron" | "creator" | "brand";
  timestamp: number;
};

type ChatThread = {
  messages: Message[];
  draft: string; // Aaron's pre-filled outbound message (deterministic template — see buildOpenerToCreator/Brand)
};

type ContractTerms = {
  base_pay: number;
  base_kpi: string;
  bonus_per_block: number;
  bonus_block: number;
  bonus_floor: number;
  exclusivity_days: number;
  due_date: string;
  approved_by_creator: boolean;
  approved_by_brand: boolean;
};

/** A single deal Aaron is shepherding. One creator × one brand × one campaign,
 * with TWO chats branching from it: Aaron ↔ Creator and Aaron ↔ Brand. */
type Deal = {
  id: string;
  creatorId: string;
  brandId: string;
  campaignId: string;
  stage: DealStage;
  similarity: number;
  creatorChat: ChatThread;
  brandChat: ChatThread;
  contract: ContractTerms | null;
  /** Strategic Project Lead assigned to handle this deal end-to-end.
   *  Max one SPL per contract. When set, the auto-engine simulates the
   *  SPL chatting with both the creator and the brand on Aaron's behalf.
   *  Aaron can intervene at any time via the standard composer. */
  assignedSpl?: string | null;
};

/**
 * Mercor SPL roster surfaced in the Assign dropdown. These are example
 * Strategic Project Leads from Mercor's existing operations team that
 * Aaron can hand individual contracts to.
 *
 * Kept module-local (not exported) because Next.js page files only allow
 * a small set of named exports; helpers live alongside the component.
 */
interface SplPerson {
  id: string;
  name: string;
  title: string;
}

const MERCOR_SPLS: SplPerson[] = [
  { id: "sundeep-jolly", name: "Sundeep Jolly", title: "Co-founder, Operations" },
  { id: "daniel-bennett", name: "Daniel Bennett", title: "Strategic Projects" },
  { id: "jasmine-singh", name: "Jasmine Singh", title: "Strategic Projects" },
  { id: "chris-krimitsos", name: "Chris Krimitsos", title: "Strategic Operations" },
  { id: "maya-patel", name: "Maya Patel", title: "Account Management" },
  { id: "ezra-chen", name: "Ezra Chen", title: "Business Development" },
  { id: "priya-iyer", name: "Priya Iyer", title: "Operations" },
  { id: "noor-ahmadi", name: "Noor Ahmadi", title: "Creator Partnerships" },
  { id: "marcus-grant", name: "Marcus Grant", title: "Brand Partnerships" },
  { id: "lila-okonkwo", name: "Lila Okonkwo", title: "Strategic Projects" },
];

function splById(id: string | null | undefined): SplPerson | null {
  if (!id) return null;
  return MERCOR_SPLS.find((s) => s.id === id) ?? null;
}

// Inbox is a single scrollable list — no separate tabs per stage. Status
// is communicated by a colored pill on each row (orange = pending,
// green = signed). Aaron filters by scrolling, not by clicking tabs.

// ---------------------------------------------------------------------------
// Helpers - draft + reply builders
// ---------------------------------------------------------------------------

function buildCreatorOutreach(creator: Creator, brand: Brand, campaignTitle: string, low: number, high: number): string {
  const firstName = creator.name.split(" ")[0];
  // Use the same brand-aware ranked citation (pin_for + cosine) as /admin/match
  // so the outreach quote stays in lockstep with the wow-moment shown on the
  // match page. Falls back to file order when buildCitations returns empty.
  const topCitation = buildCitations(creator, brand)[0];
  const post = topCitation ?? creator.cited_posts?.[0];
  const hashtags = post?.hashtags?.slice(0, 2).join(" ") ?? creator.niche_tags.slice(0, 2).map((t) => `#${t}`).join(" ");
  const postUrl = topCitation?.cited_post_url ?? creator.cited_posts?.[0]?.url;
  if (creator.id === "loganmann32" && post && postUrl) {
    return `Hey ${firstName} - saw your "${post.caption}" post (${postUrl}). The ${hashtags} angle is exactly the kind of audience ${brand.name} pays for - UCSB STEM-coded, gym-native, no-fluff energy that converts. We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full autonomy on the script. Worth a 10-minute call this week?`;
  }
  return `Hey ${firstName} - your ${creator.niche} content is exactly the vibe ${brand.name} is looking for. The ${hashtags} positioning hits the same audience their ${brand.brand_voice[0] ?? "brand voice"} campaign is targeting. We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full creative autonomy. Worth a quick 10-minute call to see if this is a fit?`;
}

function buildBrandOutreach(brand: Brand, creator: Creator, campaignTitle: string, low: number, high: number): string {
  return `Hey ${brand.name} team - Mercor BD here. We've identified ${creator.name} (${fmtFollowers(creator.followers)} followers, ${(similarity(creator, brand) * 100).toFixed(0)}% brand-voice fit) as a top match for ${campaignTitle}. Suggested rate ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full creative autonomy on the creator's side. Brand-relevance score, comment-fit data, and contract terms attached. Want to greenlight or counter on rate?`;
}

function simulatedCreatorReply(brand: Brand, creator: Creator): string {
  // Brand-aware ranked citation matches /admin/match wow-moment ordering.
  const topCitation = buildCitations(creator, brand)[0];
  const post = topCitation ?? creator.cited_posts?.[0];
  if (creator.id === "loganmann32" && post) {
    return `Yeah honestly ${brand.name} would crush with my crowd. The morning gym + study angle is already 60% of my comments. Could do $1100/post if you ship product first. What's the timeline?`;
  }
  if (brand.id === "alani") {
    return "Obsessed with your content honestly. Can you do a morning-routine angle? That's our best-performing format.";
  }
  if (brand.id === "celsius") return "Love the ICP fit - can we do a study-session + gym clip combo? Would land on FYP for sure.";
  if (brand.category === "preworkout" || brand.id === "bucked-up") return "Could do $800 if you cover shipping on the product? Sounds like a strong fit.";
  if (brand.category === "energy" && brand.id === "ghost-energy") return "Great fit. Can we move on a 30-day exclusive? Our drops move fast.";
  return "Thanks for reaching out! What does your posting schedule look like for the next 30 days, and is there flexibility on rate?";
}

function simulatedBrandReply(brand: Brand, creator: Creator): string {
  if (brand.id === "celsius") return `${creator.name.split(" ")[0]} is exactly our college-ICP profile. Greenlight at $850 base + bonus for ≥500K views. Lock the contract.`;
  if (brand.id === "alani" || brand.id === "bloom") return `Slate looks good. Locking ${creator.name.split(" ")[0]} at proposed rate - send the contract for countersign.`;
  if (brand.id === "bucked-up" || brand.id === "ryse") return `Approve at $750 + product. Want to review the draft against our brand-voice fit score before posting.`;
  if (brand.id === "ghost-energy") return `Can we tighten exclusivity to 30 days only? At $900 with that constraint we're in.`;
  return "Reviewing internally. Will revert in 48 hours.";
}

function buildContract(creator: Creator, brand: Brand, payLow: number, payHigh: number): ContractTerms {
  const base = Math.round((payLow + payHigh) / 2);
  // Due date 14 days from "now" (synthetic)
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return {
    base_pay: base,
    base_kpi: `1 ${brand.id === "ghost-energy" || brand.category === "energy" ? "TikTok + 1 IG Reel" : "TikTok"} post (45-60s), product-in-frame, posted by ${due.toISOString().slice(0, 10)}`,
    bonus_per_block: brand.category === "energy" ? 250 : 150,
    bonus_block: 100_000,
    bonus_floor: brand.id === "celsius" ? 500_000 : 250_000,
    exclusivity_days: brand.category === "preworkout" || brand.category === "energy" ? 30 : 14,
    due_date: due.toISOString().slice(0, 10),
    approved_by_creator: false,
    approved_by_brand: false,
  };
}

function buildOpenerToCreator(brand: Brand, creator: Creator, campaignTitle: string): string {
  return `Hey ${creator.name.split(" ")[0]} - ${brand.name} just countered with $${(brand.id === "celsius" ? 850 : 800).toLocaleString()} base + view bonus. Confirms exclusivity at 14 days. Want me to lock or push back on rate?`;
}

function buildOpenerToBrand(brand: Brand, creator: Creator): string {
  return `Hey ${brand.name} - ${creator.name} accepts the rate, asking for product first before posting. Our standard practice. Send greenlight to lock contract?`;
}

// ---------------------------------------------------------------------------
// Default deal seed
// ---------------------------------------------------------------------------

function emptyChat(draft: string): ChatThread {
  return { messages: [], draft };
}

function chatWith(messages: Message[], draft: string): ChatThread {
  return { messages, draft };
}

function buildDefaultDeals(): Deal[] {
  const deals: Deal[] = [];
  const now = Date.now();

  // ── 1. Logan × Celsius — pinned demo deal, sits at "negotiating" with a real
  //      contract preview ready to show off the right-rail panel.
  {
    const creator = CREATORS_BY_ID["loganmann32"];
    const brand = BRANDS_BY_ID["celsius"]!;
    const campaign = CAMPAIGNS_BY_ID["celsius-college-q2"];
    const impact = computeImpact(creator, brand);
    const pay = computeSuggestedPay(creator, brand, impact);
    const contract = buildContract(creator, brand, pay.total_low, pay.total_high);
    deals.push({
      id: "deal-celsius-loganmann32",
      creatorId: "loganmann32",
      brandId: "celsius",
      campaignId: "celsius-college-q2",
      stage: "outreach",
      similarity: similarity(creator, brand),
      creatorChat: chatWith(
        [
          { id: "c-l-1", from: "aaron", text: buildCreatorOutreach(creator, brand, campaign.title, pay.total_low, pay.total_high), timestamp: now - 600_000 },
          { id: "c-l-2", from: "creator", text: simulatedCreatorReply(brand, creator), timestamp: now - 480_000 },
        ],
        "Sample is shipping today, 14-day exclusivity is firm. We can land at $1000 base + $150 per 100K over 500K views. Sound right?",
      ),
      brandChat: chatWith(
        [
          { id: "b-l-1", from: "aaron", text: buildBrandOutreach(brand, creator, campaign.title, pay.total_low, pay.total_high), timestamp: now - 540_000 },
          { id: "b-l-2", from: "brand", text: simulatedBrandReply(brand, creator), timestamp: now - 360_000 },
        ],
        "Locking at $1000 base + bonus structure attached. Logan's confirmed sample-first. Ready for countersign.",
      ),
      contract,
    });
  }

  // ── 2. A few deals at "negotiating" stage with contracts ready to view.
  const negotiating: Array<{ creator: string; brand: string; campaign: string; creatorReplied: boolean; brandReplied: boolean }> = [
    { creator: "antonielokhorst", brand: "alani", campaign: "alani-spring-26", creatorReplied: true, brandReplied: false },
    { creator: "noahperlofit", brand: "bucked-up", campaign: "bucked-up-frat-26", creatorReplied: true, brandReplied: true },
    { creator: "trainingtall", brand: "ghost-energy", campaign: "ghost-energy-spring-26", creatorReplied: false, brandReplied: true },
  ];
  for (const cfg of negotiating) {
    const creator = CREATORS_BY_ID[cfg.creator];
    const brand = BRANDS_BY_ID[cfg.brand];
    if (!creator || !brand) continue;
    const campaign = CAMPAIGNS_BY_ID[cfg.campaign];
    const impact = computeImpact(creator, brand);
    const pay = computeSuggestedPay(creator, brand, impact);
    const contract = buildContract(creator, brand, pay.total_low, pay.total_high);
    deals.push({
      id: `deal-${cfg.brand}-${cfg.creator}`,
      creatorId: cfg.creator,
      brandId: cfg.brand,
      campaignId: cfg.campaign,
      stage: "outreach",
      similarity: similarity(creator, brand),
      creatorChat: chatWith(
        [
          { id: `c-${cfg.creator}-1`, from: "aaron", text: buildCreatorOutreach(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high), timestamp: now - 720_000 },
          ...(cfg.creatorReplied
            ? [{ id: `c-${cfg.creator}-2`, from: "creator" as const, text: simulatedCreatorReply(brand, creator), timestamp: now - 540_000 }]
            : []),
        ],
        cfg.creatorReplied
          ? buildOpenerToCreator(brand, creator, campaign?.title ?? "")
          : "Following up - did you get the brief? Happy to walk through pay structure on a quick call.",
      ),
      brandChat: chatWith(
        [
          { id: `b-${cfg.brand}-${cfg.creator}-1`, from: "aaron", text: buildBrandOutreach(brand, creator, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high), timestamp: now - 700_000 },
          ...(cfg.brandReplied
            ? [{ id: `b-${cfg.brand}-${cfg.creator}-2`, from: "brand" as const, text: simulatedBrandReply(brand, creator), timestamp: now - 420_000 }]
            : []),
        ],
        cfg.brandReplied
          ? buildOpenerToBrand(brand, creator)
          : "Following up on the slate - want me to send a redlined contract template?",
      ),
      contract,
    });
  }

  // ── 3. Pure outreach stage, no contract yet, no replies.
  const outreach: Array<{ creator: string; brand: string; campaign: string }> = [
    { creator: "cooperbrunner", brand: "bloom", campaign: "bloom-creatine-26" },
    { creator: "jenny_kndd", brand: "alani", campaign: "alani-spring-26" },
    { creator: "stevecook_32", brand: "ryse", campaign: "ryse-godzilla-pre" },
    { creator: "joelbergs", brand: "ghost-energy", campaign: "ghost-energy-spring-26" },
    { creator: "samsulek", brand: "bucked-up", campaign: "bucked-up-frat-26" },
  ];
  for (const cfg of outreach) {
    const creator = CREATORS_BY_ID[cfg.creator];
    const brand = BRANDS_BY_ID[cfg.brand];
    if (!creator || !brand) continue;
    const campaign = CAMPAIGNS_BY_ID[cfg.campaign];
    const impact = computeImpact(creator, brand);
    const pay = computeSuggestedPay(creator, brand, impact);
    deals.push({
      id: `deal-${cfg.brand}-${cfg.creator}`,
      creatorId: cfg.creator,
      brandId: cfg.brand,
      campaignId: cfg.campaign,
      stage: "outreach",
      similarity: similarity(creator, brand),
      creatorChat: emptyChat(buildCreatorOutreach(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
      brandChat: emptyChat(buildBrandOutreach(brand, creator, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
      contract: null,
    });
  }

  // ── 4. One signed deal so the Signed tab isn't empty.
  {
    const creator = CREATORS_BY_ID["jessejameswest"];
    const brand = BRANDS_BY_ID["bucked-up"];
    if (creator && brand) {
      const campaign = CAMPAIGNS_BY_ID["bucked-up-frat-26"];
      const impact = computeImpact(creator, brand);
      const pay = computeSuggestedPay(creator, brand, impact);
      const contract = buildContract(creator, brand, pay.total_low, pay.total_high);
      contract.approved_by_creator = true;
      contract.approved_by_brand = true;
      deals.push({
        id: `deal-${brand.id}-${creator.id}`,
        creatorId: creator.id,
        brandId: brand.id,
        campaignId: "bucked-up-frat-26",
        stage: "signed",
        similarity: similarity(creator, brand),
        creatorChat: chatWith([
          { id: "c-jjw-1", from: "aaron", text: buildCreatorOutreach(creator, brand, campaign?.title ?? "", pay.total_low, pay.total_high), timestamp: now - 1_000_000 },
          { id: "c-jjw-2", from: "creator", text: simulatedCreatorReply(brand, creator), timestamp: now - 800_000 },
          { id: "c-jjw-3", from: "aaron", text: "Locked. Contract PDF sent. Sample ships Monday.", timestamp: now - 600_000 },
        ], ""),
        brandChat: chatWith([
          { id: "b-jjw-1", from: "aaron", text: buildBrandOutreach(brand, creator, campaign?.title ?? "", pay.total_low, pay.total_high), timestamp: now - 950_000 },
          { id: "b-jjw-2", from: "brand", text: simulatedBrandReply(brand, creator), timestamp: now - 700_000 },
          { id: "b-jjw-3", from: "aaron", text: "Countersigned. Posting window 2026-05-08 → 05-15.", timestamp: now - 500_000 },
        ], ""),
        contract,
      });
    }
  }

  return deals;
}

// ---------------------------------------------------------------------------
// localStorage persistence — same key for admin AND creator-side views.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mercor.outreach.v2";
const STORAGE_KEY_AUTO_MEDIATE = "mercor.outreach.autoMediate.v1";

type AutoMediateMap = Record<string, boolean>;

function isPlainRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isDeal(x: unknown): x is Deal {
  if (!isPlainRecord(x)) return false;
  return (
    typeof x.id === "string" &&
    typeof x.creatorId === "string" &&
    typeof x.brandId === "string" &&
    typeof x.stage === "string" &&
    isPlainRecord(x.creatorChat) &&
    Array.isArray((x.creatorChat as Record<string, unknown>).messages) &&
    isPlainRecord(x.brandChat) &&
    Array.isArray((x.brandChat as Record<string, unknown>).messages)
  );
}

function loadDeals(): Deal[] {
  if (typeof window === "undefined") return buildDefaultDeals();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultDeals();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return buildDefaultDeals();
    const valid = parsed.filter(isDeal);
    return valid.length > 0 ? valid : buildDefaultDeals();
  } catch {
    return buildDefaultDeals();
  }
}

function saveDeals(deals: Deal[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  } catch {
    /* quota / private mode — ignore */
  }
}

function loadAutoMediate(): AutoMediateMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_AUTO_MEDIATE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: AutoMediateMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "boolean") result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function saveAutoMediate(map: AutoMediateMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_AUTO_MEDIATE, JSON.stringify(map));
  } catch {
    /* quota / private mode — ignore */
  }
}

// ---------------------------------------------------------------------------
// Stage helpers
// ---------------------------------------------------------------------------

const STAGES: DealStage[] = ["outreach", "signed"];

const STAGE_LABEL: Record<DealStage, string> = {
  outreach: "Pending",
  signed: "Signed",
};

// ---------------------------------------------------------------------------
// Page
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

  const [deals, setDeals] = useState<Deal[]>(() => buildDefaultDeals());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount, then persist on every change.
  useEffect(() => {
    setDeals(loadDeals());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveDeals(deals);
  }, [deals, hydrated]);

  // Auto-engine: fires for every deal that has an SPL assigned. Replaces
  // the old per-deal Auto toggle. Each tick advances one of the two chats
  // (creator or brand) by simulating their reply, regardless of whether
  // the deal is currently selected — so SPLs are progressing all of their
  // assignments in the background.
  useEffect(() => {
    if (!hydrated) return;
    const dealsWithSpl = deals.filter((d) => d.assignedSpl && d.stage === "outreach");
    if (dealsWithSpl.length === 0) return;
    const timer = window.setTimeout(() => {
      setDeals((current) =>
        current.map((d) => {
          if (!d.assignedSpl || d.stage !== "outreach") return d;
          const creator = CREATORS_BY_ID[d.creatorId];
          const brand = BRANDS_BY_ID[d.brandId];
          const campaign = d.campaignId ? CAMPAIGNS_BY_ID[d.campaignId] : null;
          if (!creator || !brand) return d;
          const campaignTitle = campaign?.title ?? `${brand.name} Campaign`;
          const patch = autoMediateStep(d, creator, brand, campaignTitle);
          return { ...d, ...patch };
        }),
      );
    }, 5500);
    return () => window.clearTimeout(timer);
    // Re-run whenever any assigned-SPL deal changes message count or the
    // assignment set itself changes, so each tick fires after the previous
    // round persists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    deals.map((d) => `${d.id}:${d.assignedSpl ?? ""}:${d.creatorChat.messages.length}:${d.brandChat.messages.length}:${d.stage}`).join("|"),
  ]);

  // Inject picks from /admin/match if present.
  useEffect(() => {
    if (!picksParam || !brandParam) return;
    const brand = BRANDS_BY_ID[brandParam];
    if (!brand) return;
    setDeals((current) => {
      const ids = picksParam.split(",").filter(Boolean);
      const additions: Deal[] = [];
      for (const id of ids) {
        if (current.some((d) => d.creatorId === id && d.brandId === brandParam)) continue;
        const creator = CREATORS_BY_ID[id];
        if (!creator) continue;
        const campaignId = Object.keys(CAMPAIGNS_BY_ID).find((cid) => CAMPAIGNS_BY_ID[cid].brand_id === brandParam) ?? "";
        const campaign = campaignId ? CAMPAIGNS_BY_ID[campaignId] : null;
        const impact = computeImpact(creator, brand);
        const pay = computeSuggestedPay(creator, brand, impact);
        additions.push({
          id: `deal-${brandParam}-${id}-${Date.now()}`,
          creatorId: id,
          brandId: brandParam,
          campaignId,
          stage: "outreach",
          similarity: similarity(creator, brand),
          creatorChat: emptyChat(buildCreatorOutreach(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
          brandChat: emptyChat(buildBrandOutreach(brand, creator, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
          contract: null,
        });
      }
      return [...additions, ...current];
    });
  }, [picksParam, brandParam]);

  const [selectedId, setSelectedId] = useState<string>("");

  // Default-select the focused deal if URL says so, else the first deal.
  useEffect(() => {
    if (focusId && deals.some((d) => d.id === focusId)) {
      setSelectedId(focusId);
      return;
    }
    if (!selectedId || !deals.some((d) => d.id === selectedId)) {
      const first = deals[0];
      if (first) setSelectedId(first.id);
    }
  }, [focusId, deals, selectedId]);

  // Inbox: outreach pending sorted to the top (Aaron's queue), signed at
  // the bottom for reference. Within each group keep input order.
  const visibleDeals = useMemo(() => {
    const pending = deals.filter((d) => d.stage === "outreach");
    const signed = deals.filter((d) => d.stage === "signed");
    return [...pending, ...signed];
  }, [deals]);

  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const updateDeal = useCallback((id: string, patch: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => {
    setDeals((current) =>
      current.map((d) => (d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d)),
    );
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Inbox</h1>
      </div>
      <div
        className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-[var(--fg-muted)]"
        data-test-id="outreach-automation-counter"
      >
        <Sparkles size={12} className="text-[var(--accent)]" />
        <span>{OUTREACH_AUTOMATION_COUNTER}</span>
      </div>

      {/* Two-pane layout: scrollable inbox + chat. No negotiation rail —
          deliverables are decided in the interview, here is just outreach. */}
      <div className="mt-4 grid gap-4 grid-cols-1 lg:grid-cols-[320px_1fr]">
        {/* LEFT: deal list */}
        <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] overflow-visible">
          {visibleDeals.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[13px] text-[var(--fg-muted)]">
              No deals in this tab yet.
            </div>
          ) : (
            <ul>
              {visibleDeals.map((deal) => (
                <DealRow
                  key={deal.id}
                  deal={deal}
                  selected={deal.id === selectedId}
                  onSelect={() => setSelectedId(deal.id)}
                  onAssignSpl={(splId) => updateDeal(deal.id, { assignedSpl: splId })}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* CENTER: deal detail */}
        <div>
          {selected ? (
            <DealDetail
              deal={selected}
              onUpdate={(p) => updateDeal(selected.id, p)}
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-[14px] border border-[var(--border)] text-[13px] text-[var(--fg-muted)]">
              Select a deal to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// stageToTab removed — Inbox no longer has tabs.

// ---------------------------------------------------------------------------
// Deal row (left list)
// ---------------------------------------------------------------------------

interface DealRowProps {
  deal: Deal;
  selected: boolean;
  onSelect: () => void;
  onAssignSpl: (splId: string | null) => void;
}

/**
 * Deterministically tags ~93% of threads as "auto-sent" for the demo.
 * Heuristic: hash the deal id to a stable int and reserve the lowest 7%
 * of the hash space for "manually edited" threads. The pill is purely
 * presentational — a marker that the SPL agent drafted and sent the
 * opener without operator intervention.
 */
function isAutomatedThread(dealId: string): boolean {
  let hash = 0;
  for (let i = 0; i < dealId.length; i++) {
    hash = (hash * 31 + dealId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100 >= 7;
}

function DealRow({ deal, selected, onSelect, onAssignSpl }: DealRowProps) {
  const creator = CREATORS_BY_ID[deal.creatorId];
  const brand = BRANDS_BY_ID[deal.brandId];
  if (!creator || !brand) return null;
  const automated = isAutomatedThread(deal.id);

  const lastCreatorMsg = deal.creatorChat.messages[deal.creatorChat.messages.length - 1];
  const lastBrandMsg = deal.brandChat.messages[deal.brandChat.messages.length - 1];
  const lastTs = Math.max(lastCreatorMsg?.timestamp ?? 0, lastBrandMsg?.timestamp ?? 0);
  // 1-line LLM-style summary subtext per chat card. We surface the most
  // recent counterparty turn (or the drafted opener if nothing's been
  // sent yet) so Aaron can scan the inbox without opening every thread.
  const lastFromOther =
    lastTs === lastCreatorMsg?.timestamp && lastCreatorMsg?.from !== "aaron"
      ? lastCreatorMsg?.text
      : lastBrandMsg?.from !== "aaron"
        ? lastBrandMsg?.text
        : null;
  const preview =
    lastFromOther ??
    (lastTs === lastCreatorMsg?.timestamp ? lastCreatorMsg?.text : lastBrandMsg?.text) ??
    deal.creatorChat.draft;
  const summary = synthesizeSummary(creator, brand, deal, preview);
  const spl = splById(deal.assignedSpl);

  return (
    <li
      data-test-id={`outreach-deal-${deal.id}`}
      onClick={onSelect}
      className={[
        "flex cursor-pointer items-start gap-3 border-b border-[var(--border)] p-4 transition-colors last:border-b-0",
        selected ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--bg-hover)]",
      ].join(" ")}
    >
      <div className="relative h-10 w-10 shrink-0">
        <Avatar name={creator.name} size={36} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--bg)] ring-2 ring-[var(--bg-card)]">
          <BrandMark brand={brand} size={12} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-[13.5px] font-medium truncate">{creator.name} × {brand.name}</span>
            {automated ? (
              <span
                className="pill pill-accent shrink-0"
                style={{ fontSize: 10, whiteSpace: "nowrap" }}
                data-test-id={`outreach-automated-pill-${deal.id}`}
                title="Drafted and sent by the SPL agent without operator edits."
              >
                AUTOMATED
              </span>
            ) : null}
          </span>
          <StagePill stage={deal.stage} />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--fg-muted)] truncate">{(deal.similarity * 100).toFixed(0)}% match · {fmtFollowers(creator.followers)}</div>
        <p className="mt-1 line-clamp-2 text-[11.5px] italic text-[var(--fg-muted)]">{summary}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <AssignSplControl
            assignedSpl={spl}
            onAssign={(id) => onAssignSpl(id)}
            disabled={deal.stage === "signed"}
          />
        </div>
      </div>
      <ChevronRight size={14} className={selected ? "text-[var(--accent)]" : "text-[var(--fg-subtle)]"} />
    </li>
  );
}

/**
 * One-glance summary of the conversation state — derived locally from
 * the deal's chat state, not by mangling raw message text. Each summary
 * follows the shape "<state signal> · Awaiting <actor>" so Aaron can
 * scan the inbox and instantly see whose court the ball is in.
 *
 * Old behaviour (replaced 2026-04-29): prefixed the creator's first
 * name onto the brand's reply text, which produced strings like
 * "Logan logan is exactly our college-ICP profile" because the brand
 * reply itself already contained the creator's first name. The
 * regex-strip of "Hey <name>," also missed brand replies that don't
 * use that opener. Logan asked for short, dynamic, signal-rich
 * summaries instead.
 */
function synthesizeSummary(
  creator: Creator,
  brand: Brand,
  deal: Deal,
  _preview: string | undefined,
): string {
  const firstName = creator.name.split(" ")[0];
  const matchPct = Math.round(deal.similarity * 100);

  if (deal.stage === "signed") {
    return `Signed · contract executed, comms moved to Slack briefing channel.`;
  }

  const lastCreatorMsg =
    deal.creatorChat.messages[deal.creatorChat.messages.length - 1];
  const lastBrandMsg =
    deal.brandChat.messages[deal.brandChat.messages.length - 1];
  const creatorReplied = lastCreatorMsg?.from === "creator";
  const brandReplied = lastBrandMsg?.from === "brand";
  const aaronSentToCreator = deal.creatorChat.messages.some(
    (m) => m.from === "aaron",
  );
  const aaronSentToBrand = deal.brandChat.messages.some(
    (m) => m.from === "aaron",
  );

  // Nothing sent yet — we only have a draft opener.
  if (!aaronSentToCreator && !aaronSentToBrand) {
    return `Draft opener queued · ${matchPct}% audience match with ${brand.name}. Awaiting your send.`;
  }

  // Outbound, no replies yet.
  if (!creatorReplied && !brandReplied) {
    return `Outreach sent · ${matchPct}% match. Awaiting first reply.`;
  }

  const brandSignal = brandReplied
    ? extractBrandSignal(lastBrandMsg.text, brand)
    : null;
  const creatorSignal = creatorReplied
    ? extractCreatorSignal(lastCreatorMsg.text)
    : null;

  // Both sides replied — call out who agreed and what's left.
  if (brandSignal && creatorSignal) {
    return `${brandSignal} · ${firstName} ${creatorSignal} · Awaiting your countersign.`;
  }
  // Brand replied, creator hasn't.
  if (brandSignal) {
    return `${brandSignal} · Awaiting ${firstName}'s reply.`;
  }
  // Creator replied, brand hasn't.
  if (creatorSignal) {
    return `${firstName} ${creatorSignal} · Awaiting ${brand.name} to greenlight.`;
  }
  return `Outreach in flight · ${matchPct}% match. Awaiting reply.`;
}

/** Pulls a short brand-side signal from the last brand reply text.
 *  Looks for a quoted dollar rate, exclusivity counter, greenlight, or
 *  "reviewing internally" pattern. Falls back to a generic "<Brand>
 *  responded" so the summary always ends with a noun phrase. */
function extractBrandSignal(text: string, brand: Brand): string {
  const dollarMatch = text.match(/\$\s?([\d,]+)/);
  const rate = dollarMatch ? `$${dollarMatch[1].replace(/,/g, "")}` : null;
  const dayMatch = text.match(/(\d+)[-\s]?day/i);
  const days = dayMatch ? Number(dayMatch[1]) : null;
  const greenlight = /greenlight|lock|approve|locking/i.test(text);
  const reviewing = /review(ing)?\s+(internally|the\s+draft|against)/i.test(text);
  const counter = /counter|push back/i.test(text);
  const exclusivityAsk = /tighten\s+exclusivity|exclusivity\s+to/i.test(text);

  if (greenlight && rate) return `${brand.name} greenlit at ${rate}`;
  if (exclusivityAsk && days && rate) {
    return `${brand.name} wants ${days}-day exclusive at ${rate}`;
  }
  if (counter && rate) return `${brand.name} countered ${rate}`;
  if (greenlight) return `${brand.name} ready to lock`;
  if (rate) return `${brand.name} quoted ${rate}`;
  if (reviewing) return `${brand.name} reviewing internally`;
  return `${brand.name} responded`;
}

/** Pulls a short creator-side signal from the last creator reply text.
 *  Detects the most common creator asks: product-first, exclusivity,
 *  creative angle, timeline, and counter-rate. Returns a verb phrase
 *  ready to follow the creator's first name (e.g. "wants product
 *  before posting"). */
function extractCreatorSignal(text: string): string {
  if (/product\s+first|ship\s+product|product\s+before|cover\s+shipping/i.test(text)) {
    return "wants product first before posting";
  }
  if (/exclusiv/i.test(text)) return "asking about exclusivity";
  if (/morning|format|angle|combo|gym\s+clip/i.test(text)) {
    return "pitched a creative angle";
  }
  if (/timeline|when|schedule|posting/i.test(text)) {
    return "asking about timeline";
  }
  const dollar = text.match(/\$\s?([\d,]+)/);
  if (dollar) return `countered at $${dollar[1].replace(/,/g, "")}`;
  return "responded";
}

interface AssignSplControlProps {
  assignedSpl: SplPerson | null;
  onAssign: (id: string | null) => void;
  disabled?: boolean;
}

/**
 * Compact dropdown that replaces the old Auto toggle. Opens a scrolling
 * list of MERCOR_SPLS so Aaron can hand a single contract to one SPL
 * (max one per contract). Selecting "Unassign" clears the slot and
 * pulls the deal back to Aaron's manual queue.
 */
function AssignSplControl({ assignedSpl, onAssign, disabled }: AssignSplControlProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] transition-colors",
          assignedSpl
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
        data-test-id="assign-spl-button"
      >
        {assignedSpl ? `SPL · ${assignedSpl.name.split(" ")[0]}` : "Assign"}
        <ChevronDown size={11} />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-7 z-30 max-h-[260px] w-[240px] overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-card)] py-1 text-[12px] shadow-[var(--shadow-card)]"
        >
          {assignedSpl ? (
            <button
              type="button"
              onClick={() => {
                onAssign(null);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-[var(--danger)] hover:bg-[var(--bg-hover)]"
            >
              Unassign {assignedSpl.name.split(" ")[0]}
            </button>
          ) : null}
          {MERCOR_SPLS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onAssign(s.id);
                setOpen(false);
              }}
              className={[
                "block w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)]",
                assignedSpl?.id === s.id ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "",
              ].join(" ")}
            >
              <div className="font-medium text-[var(--fg)]">{s.name}</div>
              <div className="text-[10.5px] text-[var(--fg-muted)]">{s.title}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StagePill({ stage }: { stage: DealStage }) {
  // Pending = orange/amber. Signed = green. No in-between states — once
  // signed, the deal moves to Slack and the row reads "Signed".
  const cls = stage === "outreach" ? "pill pill-warning" : "pill pill-success";
  return <span className={cls} style={{ fontSize: 10, whiteSpace: "nowrap" }}>{STAGE_LABEL[stage]}</span>;
}

// ---------------------------------------------------------------------------
// Deal detail (center pane) - two chats: Aaron→Creator, Aaron→Brand
// ---------------------------------------------------------------------------

interface DealDetailProps {
  deal: Deal;
  onUpdate: (p: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => void;
}

function DealDetail({ deal, onUpdate }: DealDetailProps) {
  const creator = CREATORS_BY_ID[deal.creatorId];
  const brand = BRANDS_BY_ID[deal.brandId];
  const campaign = deal.campaignId ? CAMPAIGNS_BY_ID[deal.campaignId] : null;

  const [side, setSide] = useState<ChatSide>("creator");

  if (!creator || !brand) return null;

  const chat = side === "creator" ? deal.creatorChat : deal.brandChat;
  const spl = splById(deal.assignedSpl);

  // Once a deal is signed, the chat is replaced with a Slack-handoff
  // banner — comms move out of Mercor's surface and onto the brand's
  // dedicated channel. Aaron stays in the loop via the persisted record.
  if (deal.stage === "signed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="flex items-center gap-3">
            <Avatar name={creator.name} size={40} />
            <div className="text-[14px] font-medium text-[var(--fg-muted)]">×</div>
            <BrandMark key={brand.id} brand={brand} size={40} eager />
            <div className="ml-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{creator.name} × {brand.name}</span>
                <StagePill stage={deal.stage} />
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--fg-muted)] truncate">
                {campaign?.title ?? `${brand.name} Campaign`} · {(deal.similarity * 100).toFixed(0)}% brand-voice fit
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--success)] bg-[var(--success-soft)] p-5 text-[13px] leading-relaxed text-[var(--success)]">
          <div className="text-[14px] font-semibold">Comms moved to Slack.</div>
          <p className="mt-2 text-[var(--fg)]">
            This contract is signed. Day-to-day coordination with {creator.name.split(" ")[0]} and the {brand.name} brand team happens in their dedicated Slack channel. Deliverables were locked in the Creator Interview, so there&apos;s nothing left to negotiate here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-3">
          <Avatar name={creator.name} size={40} />
          <div className="text-[14px] font-medium text-[var(--fg-muted)]">×</div>
          <BrandMark key={brand.id} brand={brand} size={40} eager />
          <div className="ml-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold">{creator.name} × {brand.name}</span>
              <StagePill stage={deal.stage} />
              {spl ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]"
                  title={`${spl.name} (${spl.title}) is handling this contract — Aaron can intervene at any time.`}
                >
                  <Sparkles size={10} />
                  SPL · {spl.name}
                  <ClaudeMark model="haiku" size="xs" />
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)] truncate">
              {campaign?.title ?? `${brand.name} Campaign`} · {(deal.similarity * 100).toFixed(0)}% brand-voice fit
            </div>
          </div>
        </div>

        {/* StageBreadcrumb removed — Inbox only has Pending and Signed,
            so the breadcrumb adds visual noise without information. */}
      </div>

      {/* Chat side toggle */}
      <div className="flex gap-1.5">
        <ChatTab
          active={side === "creator"}
          onClick={() => setSide("creator")}
          icon={<Avatar name={creator.name} size={16} />}
          kind="creator"
          label={`Aaron → ${creator.name.split(" ")[0]}`}
          unread={deal.creatorChat.messages[deal.creatorChat.messages.length - 1]?.from === "creator"}
        />
        <ChatTab
          active={side === "brand"}
          onClick={() => setSide("brand")}
          icon={<BrandMark key={brand.id} brand={brand} size={16} />}
          kind="brand"
          label={`Aaron → ${brand.name}`}
          unread={deal.brandChat.messages[deal.brandChat.messages.length - 1]?.from === "brand"}
        />
      </div>

      {/* Chat panel */}
      <ChatPanel
        deal={deal}
        side={side}
        creator={creator}
        brand={brand}
        chat={chat}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function ChatTab({ active, onClick, icon, label, unread, kind }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; unread: boolean; kind: "creator" | "brand" }) {
  const kindStyle = kind === "creator"
    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
    : "bg-[#fef3c7] text-[#92400e]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-t-[10px] border border-b-0 px-3.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "border-[var(--border)] bg-[var(--bg-card)] text-[var(--fg)]"
          : "border-transparent bg-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]",
      ].join(" ")}
    >
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindStyle}`}>
        {kind === "creator" ? "Creator" : "Brand"}
      </span>
      {icon}
      {label}
      {unread ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-label="unread reply" /> : null}
    </button>
  );
}

function StageBreadcrumb({ stage }: { stage: DealStage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <ol className="mt-3 flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
      {STAGES.map((s, i) => {
        const reached = i <= idx;
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={[
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold",
                reached ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-hover)] text-[var(--fg-subtle)]",
              ].join(" ")}
            >
              {i + 1}
            </span>
            <span className={reached ? "text-[var(--fg)] font-medium" : ""}>{STAGE_LABEL[s]}</span>
            {i < STAGES.length - 1 ? <span className="text-[var(--fg-subtle)]">›</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Chat panel: messages + 3 quick-reply chips + textarea
// ---------------------------------------------------------------------------

function ChatPanel({
  deal,
  side,
  creator,
  brand,
  chat,
  onUpdate,
}: {
  deal: Deal;
  side: ChatSide;
  creator: Creator;
  brand: Brand;
  chat: ChatThread;
  onUpdate: (p: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => void;
}) {
  const [draft, setDraft] = useState(chat.draft);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    setDraft(chat.draft);
  }, [chat.draft, deal.id, side]);

  const counterpartyName = side === "creator" ? creator.name : brand.name;

  // Build the 3 suggested quick-reply chips. We always render *some*
  // suggestions: while the LLM-backed `/api/chat-suggestions` request is in
  // flight or fails, we show the local static fallback so the UI never goes
  // empty. Successful fetches are cached per (deal, side, stage, message
  // count) so flipping back to a thread we already loaded is instant.
  const fallbackSuggestions = useMemo<Suggestion[]>(
    () => staticSuggestions(deal, side, creator, brand),
    [deal, side, creator, brand],
  );
  const messageCount = chat.messages.length;
  const suggestionCacheKey = `${deal.id}:${side}:${deal.stage}:${messageCount}`;
  const [suggestionCache, setSuggestionCache] = useState<Record<string, Suggestion[]>>({});
  // Mirror the cache in a ref so the fetch effect can read the latest cache
  // state without re-running every time we write to it.
  const suggestionCacheRef = useRef(suggestionCache);
  useEffect(() => {
    suggestionCacheRef.current = suggestionCache;
  }, [suggestionCache]);
  const cachedSuggestions = suggestionCache[suggestionCacheKey];
  const suggestions: Suggestion[] = cachedSuggestions ?? fallbackSuggestions;

  // Mirror the moving parts that build the fetch payload behind refs so the
  // suggestions effect can read the latest values without depending on the
  // unstable `creator` / `brand` / `deal` / `chat.messages` references —
  // each of those re-renders on every keystroke into the draft, which would
  // abort and re-issue the /api/chat-suggestions request per character. The
  // stable `suggestionCacheKey` already encodes the (deal, side, stage,
  // messageCount) identity that actually changes the suggestions.
  type SuggestionPayloadInputs = {
    creator: Creator;
    brand: Brand;
    deal: Deal;
    chatMessages: Message[];
    side: ChatSide;
  };
  const suggestionInputsRef = useRef<SuggestionPayloadInputs>({
    creator,
    brand,
    deal,
    chatMessages: chat.messages,
    side,
  });
  useEffect(() => {
    suggestionInputsRef.current = {
      creator,
      brand,
      deal,
      chatMessages: chat.messages,
      side,
    };
  }, [creator, brand, deal, chat.messages, side]);

  useEffect(() => {
    // Skip the LLM call when there's nothing to negotiate against yet —
    // the static fallback is fine for the empty-thread case.
    if (messageCount === 0) return;
    if (suggestionCacheRef.current[suggestionCacheKey]) return;

    const {
      creator: refCreator,
      brand: refBrand,
      deal: refDeal,
      chatMessages: refMessages,
      side: refSide,
    } = suggestionInputsRef.current;

    const controller = new AbortController();
    const impact = computeImpact(refCreator, refBrand);
    const pay = computeSuggestedPay(refCreator, refBrand, impact);
    const baseRateLow = refDeal.contract?.base_pay ?? pay.total_low;
    const baseRateHigh = (refDeal.contract?.base_pay ?? pay.total_high) + 200;
    const campaignTitle = CAMPAIGNS_BY_ID[refDeal.campaignId]?.title ?? `${refBrand.name} campaign`;
    const history = refMessages.map((m) => ({ from: m.from, text: m.text }));

    const payload = {
      side: refSide,
      counterpartyName: refSide === "creator" ? refCreator.name : refBrand.name,
      brandName: refBrand.name,
      campaignTitle,
      baseRateLow,
      baseRateHigh,
      stage: refDeal.stage,
      history,
    };

    void (async () => {
      try {
        const resp = await fetch("/api/chat-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!resp.ok) return; // silent fallback
        const data: { suggestions?: Suggestion[] } = await resp.json();
        const next = Array.isArray(data.suggestions) ? data.suggestions : null;
        if (!next || next.length === 0) return; // silent fallback
        if (controller.signal.aborted) return;
        setSuggestionCache((prev) => ({ ...prev, [suggestionCacheKey]: next }));
      } catch {
        // Silent fallback — UI keeps showing static suggestions.
      }
    })();

    return () => controller.abort();
  }, [suggestionCacheKey, messageCount]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const message: Message = {
        id: `m-${side}-${Date.now()}`,
        from: "aaron",
        text: text.trim(),
        timestamp: Date.now(),
      };
      setDraft("");
      setWaiting(true);
      const chatKey = side === "creator" ? "creatorChat" : "brandChat";
      onUpdate((d) => ({
        [chatKey]: {
          ...d[chatKey],
          messages: [...d[chatKey].messages, message],
          draft: "",
        },
      }));

      const impact = computeImpact(creator, brand);
      const pay = computeSuggestedPay(creator, brand, impact);
      const baseRateLow = deal.contract?.base_pay ?? pay.total_low;
      const baseRateHigh = (deal.contract?.base_pay ?? pay.total_high) + 200;
      const campaignTitle = CAMPAIGNS_BY_ID[deal.campaignId]?.title ?? `${brand.name} campaign`;

      const history = [
        ...(side === "creator" ? deal.creatorChat.messages : deal.brandChat.messages),
        message,
      ].map((m) => ({ from: m.from, text: m.text }));

      let replyText: string;
      try {
        const resp = await fetch("/api/chat-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            side,
            counterpartyName: side === "creator" ? creator.name : brand.name,
            brandName: brand.name,
            campaignTitle,
            baseRateLow,
            baseRateHigh,
            history,
            lastAaronMessage: text.trim(),
          }),
        });
        if (resp.ok) {
          const data: { text?: string } = await resp.json();
          replyText = data.text?.trim() || (side === "creator" ? simulatedCreatorReply(brand, creator) : simulatedBrandReply(brand, creator));
        } else {
          replyText = side === "creator" ? simulatedCreatorReply(brand, creator) : simulatedBrandReply(brand, creator);
        }
      } catch {
        replyText = side === "creator" ? simulatedCreatorReply(brand, creator) : simulatedBrandReply(brand, creator);
      }

      const reply: Message = {
        id: `r-${side}-${Date.now()}`,
        from: side,
        text: replyText,
        timestamp: Date.now(),
      };
      onUpdate((d) => {
        const updatedChat = {
          ...d[chatKey],
          messages: [...d[chatKey].messages, reply],
        };
        // Outreach is the only chat stage. Once the counterparty agrees,
        // a separate Assign-SPL flow takes over — chats here don't auto-
        // promote to a "signed" state. The contract template is still
        // built in the background so we have it ready for handoff.
        let contract = d.contract;
        if (d.stage === "outreach" && !contract) {
          contract = buildContract(creator, brand, pay.total_low, pay.total_high);
        }
        return { [chatKey]: updatedChat, contract };
      });
      setWaiting(false);
    },
    [side, brand, creator, onUpdate, deal.contract, deal.campaignId, deal.creatorChat.messages, deal.brandChat.messages],
  );

  return (
    <div className="rounded-[14px] rounded-tl-none border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-muted)]">
        Conversation with {counterpartyName}
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2.5">
        {chat.messages.length === 0 ? (
          <p className="text-[12px] italic text-[var(--fg-muted)]">No messages sent yet. Approve the drafted message below to kick off this thread.</p>
        ) : (
          chat.messages.map((m) => <MessageBubble key={m.id} message={m} counterpartyName={counterpartyName} />)
        )}
        {waiting ? (
          <div className="self-start text-[11px] italic text-[var(--fg-muted)]">{counterpartyName} is typing…</div>
        ) : null}
      </div>

      {/* Quick-reply chips above the input */}
      {chat.messages.length > 0 && !waiting ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              data-test-id={`outreach-suggest-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
              disabled={waiting}
              onClick={() => sendMessage(s.text)}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-[12px] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-[var(--fg)]">{s.label}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--fg-muted)]">{s.text}</div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Composer — short single-row input inline with the Send button. */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim() && !waiting) sendMessage(draft);
            }
          }}
          placeholder={chat.messages.length === 0 ? "Approve the drafted opener…" : `Reply to ${counterpartyName}…`}
          className="flex-1 h-[40px] rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 text-[13px] leading-none focus:border-[var(--accent)] focus:outline-none"
          data-test-id="outreach-composer"
        />
        <button
          type="button"
          onClick={() => sendMessage(draft)}
          disabled={!draft.trim() || waiting}
          className="btn-primary inline-flex h-[40px] items-center gap-1.5 px-4 text-[13px] disabled:opacity-50"
          data-test-id="outreach-send"
        >
          <Send size={14} />
          {chat.messages.length === 0 ? "Approve & send" : "Send"}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message, counterpartyName }: { message: Message; counterpartyName: string }) {
  const isAaron = message.from === "aaron";
  return (
    <div className={`flex ${isAaron ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[78%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed",
          isAaron
            ? "bg-[var(--accent)] text-white"
            : "bg-[var(--bg-elev)] text-[var(--fg)] border border-[var(--border)]",
        ].join(" ")}
      >
        <div className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${isAaron ? "text-white/70" : "text-[var(--fg-muted)]"}`}>
          {isAaron ? "You (Aaron)" : counterpartyName}
        </div>
        {message.text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-reply suggestion builder (3 chips above the input)
// ---------------------------------------------------------------------------
//
// Suggestions are vibe-categorized: one positive (move forward / lock), one
// negative (push back / decline / counter), one inquisitive (pivot / ask).
// Labels are dynamic per turn — never the literal "Agree", "Counter", "Skip",
// or "Decline" placeholder words. Vibe is what guarantees the chips give
// Aaron a real choice no matter what the LLM picks for the wording.

type SuggestionVibe = "positive" | "negative" | "inquisitive";
type Suggestion = { label: string; text: string; vibe: SuggestionVibe };

function staticSuggestions(deal: Deal, side: ChatSide, creator: Creator, brand: Brand): Suggestion[] {
  const partyName = side === "creator" ? creator.name.split(" ")[0] : brand.name;
  const otherSide = side === "creator" ? brand.name : creator.name.split(" ")[0];
  const baseRate = deal.contract?.base_pay ?? Math.round((computeSuggestedPay(creator, brand, computeImpact(creator, brand)).total_low + computeSuggestedPay(creator, brand, computeImpact(creator, brand)).total_high) / 2);

  if (deal.stage === "outreach") {
    return [
      {
        vibe: "positive",
        label: "Lock the rate",
        text: side === "creator"
          ? `${partyName} — terms work. Sending the contract now: $${baseRate.toLocaleString()} base + $${deal.contract?.bonus_per_block ?? 150} per 100K views over ${(deal.contract?.bonus_floor ?? 250_000).toLocaleString()}. Sample ships today.`
          : `${partyName} — ${otherSide} accepts. Locking at $${baseRate.toLocaleString()} base + bonus structure. Sending the contract for countersign.`,
      },
      {
        vibe: "negative",
        label: `Hold at $${baseRate.toLocaleString()}`,
        text: side === "creator"
          ? `${partyName} — we can stretch to $${(baseRate + 100).toLocaleString()} flat with the bonus structure on top. That's our ceiling for this campaign. Worth it for the audience overlap?`
          : `${partyName} team — ${otherSide} is asking more. Given their fit score and audience overlap, I'd hold at $${baseRate.toLocaleString()} base + bonus. Greenlight?`,
      },
      {
        vibe: "inquisitive",
        label: "Ask about cadence",
        text: side === "creator"
          ? `${partyName} — quick check on cadence and deliverables. What's your typical posting window, and is the format flexible (TikTok vs. Reel vs. both)?`
          : `${partyName} team — one detail I want to confirm before we lock: any brand-voice guidelines or do-not-mention list we should hand to ${otherSide} before they post?`,
      },
    ];
  }

  // offer-pending or signed
  return [
    {
      vibe: "positive",
      label: "Confirm receipt",
      text: side === "creator"
        ? `${partyName} — just confirming you got the contract email. Anything you want me to walk through before you sign?`
        : `${partyName} team — just confirming the countersigned contract is on its way to your inbox. Anything else needed?`,
    },
    {
      vibe: "negative",
      label: "Flag a tweak",
      text: side === "creator"
        ? `${partyName} — one thing on the contract: the exclusivity window feels tight. Open to extending it by a week to make the launch easier?`
        : `${partyName} team — heads up: ${otherSide} flagged the exclusivity window as tight. Open to a week extension to reduce launch friction?`,
    },
    {
      vibe: "inquisitive",
      label: "Schedule kickoff",
      text: side === "creator"
        ? `${partyName} — want to set a 15-min kickoff Thursday to align on script and posting window?`
        : `${partyName} team — shall we sync briefly on launch window and tracking pixels before ${otherSide} posts?`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Auto-mediate: one tick of an automated negotiation
// ---------------------------------------------------------------------------

function autoMediateStep(deal: Deal, creator: Creator, brand: Brand, campaignTitle: string): Partial<Deal> {
  const now = Date.now();
  // If outreach is still un-sent on either side, fire the opening message.
  if (deal.creatorChat.messages.length === 0) {
    const msg: Message = { id: `m-c-${now}`, from: "aaron", text: deal.creatorChat.draft, timestamp: now };
    return { creatorChat: { ...deal.creatorChat, messages: [msg] } };
  }
  if (deal.brandChat.messages.length === 0) {
    const msg: Message = { id: `m-b-${now}`, from: "aaron", text: deal.brandChat.draft, timestamp: now };
    return { brandChat: { ...deal.brandChat, messages: [msg] } };
  }
  // If creator hasn't replied yet, simulate their reply.
  const lastCreator = deal.creatorChat.messages[deal.creatorChat.messages.length - 1];
  if (lastCreator && lastCreator.from === "aaron") {
    const reply: Message = {
      id: `m-c-${now}`,
      from: "creator",
      text: simulatedCreatorReply(brand, creator),
      timestamp: now,
    };
    // Build the contract template in the background so it's ready when
    // Aaron decides to assign SPLs. Outreach chats themselves do not
    // promote stages — Aaron either accepts the deal manually (→ signed
    // → comms move to Slack) or escalates via Assign SPLs.
    let contract = deal.contract;
    if (!contract) {
      const impact = computeImpact(creator, brand);
      const pay = computeSuggestedPay(creator, brand, impact);
      contract = buildContract(creator, brand, pay.total_low, pay.total_high);
    }
    return {
      creatorChat: { ...deal.creatorChat, messages: [...deal.creatorChat.messages, reply] },
      contract,
    };
  }
  // If brand hasn't replied yet, simulate their reply.
  const lastBrand = deal.brandChat.messages[deal.brandChat.messages.length - 1];
  if (lastBrand && lastBrand.from === "aaron") {
    const reply: Message = {
      id: `m-b-${now}`,
      from: "brand",
      text: simulatedBrandReply(brand, creator),
      timestamp: now,
    };
    return {
      brandChat: { ...deal.brandChat, messages: [...deal.brandChat.messages, reply] },
    };
  }
  // Nothing to do. SPL assignment + signing happens off this surface.
  return {};
}

// ---------------------------------------------------------------------------
// Contract panel (right rail)
// ---------------------------------------------------------------------------

function ContractPanel({ deal, onUpdate }: { deal: Deal; onUpdate: (p: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => void }) {
  const creator = CREATORS_BY_ID[deal.creatorId];
  const brand = BRANDS_BY_ID[deal.brandId];
  if (!creator || !brand || !deal.contract) return null;
  const c = deal.contract;

  return (
    <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4 lg:sticky lg:top-4 self-start">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-muted)]">Contract preview</div>
        <span className={`pill ${deal.stage === "signed" ? "pill-success" : "pill-accent"}`} style={{ fontSize: 10 }}>
          {deal.stage === "signed" ? "Signed" : "Draft"}
        </span>
      </div>
      <div className="mt-3 text-[13px] font-semibold text-[var(--fg)]">{creator.name} × {brand.name}</div>

      <dl className="mt-4 space-y-3 text-[12px]">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Base KPI</dt>
          <dd className="mt-0.5 text-[var(--fg)]">{c.base_kpi}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Base pay</dt>
          <dd className="mt-0.5 text-[14px] font-semibold text-[var(--fg)]">{fmtCurrency(c.base_pay)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Bonus KPI</dt>
          <dd className="mt-0.5 text-[var(--fg)]">
            {fmtCurrency(c.bonus_per_block)} per {c.bonus_block.toLocaleString()} views above {c.bonus_floor.toLocaleString()}.
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Due</dt>
            <dd className="mt-0.5 text-[var(--fg)]">{c.due_date}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Exclusivity</dt>
            <dd className="mt-0.5 text-[var(--fg)]">{c.exclusivity_days} days</dd>
          </div>
        </div>
      </dl>

      {/* Day-1 revenue micro-strip — frames the placement fee + perf
          kicker that books the moment a deal is signed, before any
          per-task RL revenue lands. Copy is canonical (see
          source-of-truth.ts) so deck slide 6 and the contract preview
          stay in lockstep. */}
      <div
        className="mt-3 rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] p-2 text-[11px] text-[var(--accent-on-soft)]"
        data-test-id="outreach-day1-revenue"
      >
        {OUTREACH_CONTRACT_REVENUE_STRIP}
      </div>

      {/* Approvals */}
      <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
        <ApprovalRow
          label={`${creator.name.split(" ")[0]}'s side`}
          approved={c.approved_by_creator}
          onToggle={() => onUpdate((d) => ({ contract: d.contract ? { ...d.contract, approved_by_creator: !d.contract.approved_by_creator } : null }))}
        />
        <ApprovalRow
          label={`${brand.name}'s side`}
          approved={c.approved_by_brand}
          onToggle={() => onUpdate((d) => ({ contract: d.contract ? { ...d.contract, approved_by_brand: !d.contract.approved_by_brand } : null }))}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          // Inbox no longer routes through an offer-pending stage; once
          // both sides approve, mark signed (comms move to Slack).
          if (c.approved_by_creator && c.approved_by_brand) {
            onUpdate({ stage: "signed" });
          }
        }}
        disabled={deal.stage === "signed"}
        className="mt-4 w-full rounded-[10px] bg-[var(--accent)] py-2 text-[12px] font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        data-test-id="contract-advance"
      >
        {deal.stage === "signed"
          ? "Contract signed"
          : c.approved_by_creator && c.approved_by_brand
            ? "Mark contract signed"
            : "Send contract for countersign"}
      </button>

      <p className="mt-2 text-[10px] leading-relaxed text-[var(--fg-muted)]">
        Draft generated from the negotiation transcript above. Both parties' approvals sync across expert + admin views via persisted state.
      </p>
    </aside>
  );
}

function ApprovalRow({ label, approved, onToggle }: { label: string; approved: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex w-full items-center justify-between rounded-[8px] border px-3 py-2 text-[12px] transition-colors",
        approved
          ? "border-[var(--success)] bg-[color:color-mix(in_srgb,var(--success-soft)_50%,transparent)] text-[var(--success)]"
          : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
      ].join(" ")}
    >
      <span>{label}</span>
      {approved ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <Check size={12} />
          Approved
        </span>
      ) : (
        <span className="text-[11px]">Awaiting…</span>
      )}
    </button>
  );
}
