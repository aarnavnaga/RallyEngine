"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Edit2, Send, Sparkles, X } from "lucide-react";
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

type DealStage = "outreach" | "negotiating" | "offer-pending" | "signed";

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
  draft: string; // Aaron's pre-filled outbound message (Haiku-drafted)
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
  autoMode: boolean;
  creatorChat: ChatThread;
  brandChat: ChatThread;
  contract: ContractTerms | null;
};

type TabName = "Pending" | "Negotiating" | "Offer" | "Signed";

// ---------------------------------------------------------------------------
// Helpers - draft + reply builders
// ---------------------------------------------------------------------------

function buildCreatorOutreach(creator: Creator, brand: Brand, campaignTitle: string, low: number, high: number): string {
  const firstName = creator.name.split(" ")[0];
  const post = creator.cited_posts?.[0];
  const hashtags = post?.hashtags?.slice(0, 2).join(" ") ?? creator.niche_tags.slice(0, 2).map((t) => `#${t}`).join(" ");
  if (creator.id === "loganmann32" && post) {
    return `Hey ${firstName} - saw your "${post.caption}" post (${post.url}). The ${hashtags} angle is exactly the kind of audience ${brand.name} pays for - UCSB STEM-coded, gym-native, no-fluff energy that converts. We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full autonomy on the script. Worth a 10-minute call this week?`;
  }
  return `Hey ${firstName} - your ${creator.niche} content is exactly the vibe ${brand.name} is looking for. The ${hashtags} positioning hits the same audience their ${brand.brand_voice[0] ?? "brand voice"} campaign is targeting. We'd love to bring you into our ${campaignTitle} run - ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full creative autonomy. Worth a quick 10-minute call to see if this is a fit?`;
}

function buildBrandOutreach(brand: Brand, creator: Creator, campaignTitle: string, low: number, high: number): string {
  return `Hey ${brand.name} team - Mercor BD here. We've identified ${creator.name} (${fmtFollowers(creator.followers)} followers, ${(similarity(creator, brand) * 100).toFixed(0)}% brand-voice fit) as a top match for ${campaignTitle}. Suggested rate ${fmtCurrency(low)}-${fmtCurrency(high)}/post, full creative autonomy on the creator's side. Brand-relevance score, comment-fit data, and contract terms attached. Want to greenlight or counter on rate?`;
}

function simulatedCreatorReply(brand: Brand, creator: Creator): string {
  const post = creator.cited_posts?.[0];
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
  if (brand.id === "bucked-up" || brand.id === "ryse") return `Approve at $750 + product. Need brand-voice review on draft script before posting.`;
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

function buildHaikuOutreachToCreator(brand: Brand, creator: Creator, campaignTitle: string): string {
  return `Hey ${creator.name.split(" ")[0]} - ${brand.name} just countered with $${(brand.id === "celsius" ? 850 : 800).toLocaleString()} base + view bonus. Confirms exclusivity at 14 days. Want me to lock or push back on rate?`;
}

function buildHaikuOutreachToBrand(brand: Brand, creator: Creator): string {
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
      stage: "negotiating",
      similarity: similarity(creator, brand),
      autoMode: false,
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
      stage: "negotiating",
      similarity: similarity(creator, brand),
      autoMode: false,
      creatorChat: chatWith(
        [
          { id: `c-${cfg.creator}-1`, from: "aaron", text: buildCreatorOutreach(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high), timestamp: now - 720_000 },
          ...(cfg.creatorReplied
            ? [{ id: `c-${cfg.creator}-2`, from: "creator" as const, text: simulatedCreatorReply(brand, creator), timestamp: now - 540_000 }]
            : []),
        ],
        cfg.creatorReplied
          ? buildHaikuOutreachToCreator(brand, creator, campaign?.title ?? "")
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
          ? buildHaikuOutreachToBrand(brand, creator)
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
      autoMode: false,
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
        autoMode: false,
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

function loadDeals(): Deal[] {
  if (typeof window === "undefined") return buildDefaultDeals();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultDeals();
    const parsed = JSON.parse(raw) as Deal[];
    if (!Array.isArray(parsed) || parsed.length === 0) return buildDefaultDeals();
    return parsed;
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

// ---------------------------------------------------------------------------
// Stage helpers
// ---------------------------------------------------------------------------

const STAGES: DealStage[] = ["outreach", "negotiating", "offer-pending", "signed"];

const STAGE_LABEL: Record<DealStage, string> = {
  outreach: "Outreach",
  negotiating: "Negotiating",
  "offer-pending": "Offer pending",
  signed: "Signed",
};

function dealMatchesTab(deal: Deal, tab: TabName): boolean {
  if (tab === "Pending") return deal.stage === "outreach";
  if (tab === "Negotiating") return deal.stage === "negotiating";
  if (tab === "Offer") return deal.stage === "offer-pending";
  if (tab === "Signed") return deal.stage === "signed";
  return false;
}

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
          autoMode: false,
          creatorChat: emptyChat(buildCreatorOutreach(creator, brand, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
          brandChat: emptyChat(buildBrandOutreach(brand, creator, campaign?.title ?? `${brand.name} Campaign`, pay.total_low, pay.total_high)),
          contract: null,
        });
      }
      return [...additions, ...current];
    });
  }, [picksParam, brandParam]);

  const [activeTab, setActiveTab] = useState<TabName>("Pending");
  const [selectedId, setSelectedId] = useState<string>("");

  // Default-select the focused deal if URL says so, else the first matching the active tab.
  useEffect(() => {
    if (focusId && deals.some((d) => d.id === focusId)) {
      setSelectedId(focusId);
      const match = deals.find((d) => d.id === focusId);
      if (match) setActiveTab(stageToTab(match.stage));
      return;
    }
    if (!selectedId || !deals.some((d) => d.id === selectedId)) {
      const first = deals.find((d) => dealMatchesTab(d, activeTab)) ?? deals[0];
      if (first) setSelectedId(first.id);
    }
  }, [focusId, deals, activeTab, selectedId]);

  const visibleDeals = useMemo(() => deals.filter((d) => dealMatchesTab(d, activeTab)), [deals, activeTab]);

  const tabCounts = useMemo(() => ({
    Pending: deals.filter((d) => d.stage === "outreach").length,
    Negotiating: deals.filter((d) => d.stage === "negotiating").length,
    Offer: deals.filter((d) => d.stage === "offer-pending").length,
    Signed: deals.filter((d) => d.stage === "signed").length,
  }), [deals]);

  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const updateDeal = useCallback((id: string, patch: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => {
    setDeals((current) =>
      current.map((d) => (d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d)),
    );
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="h-display text-[28px]">Outreach approval queue</h1>
        <span className="text-[12px] text-[var(--fg-muted)]">Each deal: one chat with the creator, one chat with the brand. Aaron is the middle.</span>
      </div>

      {/* Status tabs */}
      <div className="mt-5 flex items-center gap-x-8 border-b border-[var(--border)]">
        {(["Pending", "Negotiating", "Offer", "Signed"] as TabName[]).map((tab) => (
          <button
            key={tab}
            type="button"
            data-test-id={`outreach-tab-${tab.toLowerCase()}`}
            onClick={() => {
              setActiveTab(tab);
              const first = deals.find((d) => dealMatchesTab(d, tab));
              if (first) setSelectedId(first.id);
            }}
            className={[
              "relative pb-3 pt-1 text-[14px] tracking-tight",
              activeTab === tab
                ? "font-medium text-[var(--accent)] after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-[var(--accent)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
            ].join(" ")}
          >
            {tab}
            <span
              className={`ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                activeTab === tab ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--bg-hover)] text-[var(--fg-muted)]"
              }`}
            >
              {tabCounts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Two/three-pane layout */}
      <div className={`mt-4 grid gap-4 ${selected?.contract && selected.stage !== "outreach" ? "grid-cols-1 lg:grid-cols-[320px_1fr_320px]" : "grid-cols-1 lg:grid-cols-[320px_1fr]"}`}>
        {/* LEFT: deal list */}
        <aside className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
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
                />
              ))}
            </ul>
          )}
        </aside>

        {/* CENTER: deal detail */}
        <div>
          {selected ? (
            <DealDetail deal={selected} onUpdate={(p) => updateDeal(selected.id, p)} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-[14px] border border-[var(--border)] text-[13px] text-[var(--fg-muted)]">
              Select a deal to review
            </div>
          )}
        </div>

        {/* RIGHT rail: contract preview (only when negotiating+ with a contract) */}
        {selected?.contract && selected.stage !== "outreach" ? (
          <ContractPanel deal={selected} onUpdate={(p) => updateDeal(selected.id, p)} />
        ) : null}
      </div>
    </div>
  );
}

function stageToTab(stage: DealStage): TabName {
  if (stage === "outreach") return "Pending";
  if (stage === "negotiating") return "Negotiating";
  if (stage === "offer-pending") return "Offer";
  return "Signed";
}

// ---------------------------------------------------------------------------
// Deal row (left list)
// ---------------------------------------------------------------------------

function DealRow({ deal, selected, onSelect }: { deal: Deal; selected: boolean; onSelect: () => void }) {
  const creator = CREATORS_BY_ID[deal.creatorId];
  const brand = BRANDS_BY_ID[deal.brandId];
  if (!creator || !brand) return null;

  const lastCreatorMsg = deal.creatorChat.messages[deal.creatorChat.messages.length - 1];
  const lastBrandMsg = deal.brandChat.messages[deal.brandChat.messages.length - 1];
  const lastTs = Math.max(lastCreatorMsg?.timestamp ?? 0, lastBrandMsg?.timestamp ?? 0);
  const preview = (lastTs === lastCreatorMsg?.timestamp ? lastCreatorMsg?.text : lastBrandMsg?.text) ?? deal.creatorChat.draft;

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
          <span className="text-[13.5px] font-medium truncate">{creator.name} × {brand.name}</span>
          <StagePill stage={deal.stage} />
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--fg-muted)] truncate">{(deal.similarity * 100).toFixed(0)}% match · {fmtFollowers(creator.followers)}</div>
        <p className="mt-1 line-clamp-1 text-[11.5px] text-[var(--fg-muted)]">{preview}</p>
      </div>
      <ChevronRight size={14} className={selected ? "text-[var(--accent)]" : "text-[var(--fg-subtle)]"} />
    </li>
  );
}

function StagePill({ stage }: { stage: DealStage }) {
  const cls =
    stage === "outreach" ? "pill"
    : stage === "negotiating" ? "pill pill-warning"
    : stage === "offer-pending" ? "pill pill-accent"
    : "pill pill-success";
  return <span className={cls} style={{ fontSize: 10, whiteSpace: "nowrap" }}>{STAGE_LABEL[stage]}</span>;
}

// ---------------------------------------------------------------------------
// Deal detail (center pane) - two chats: Aaron→Creator, Aaron→Brand
// ---------------------------------------------------------------------------

function DealDetail({ deal, onUpdate }: { deal: Deal; onUpdate: (p: Partial<Deal> | ((d: Deal) => Partial<Deal>)) => void }) {
  const creator = CREATORS_BY_ID[deal.creatorId];
  const brand = BRANDS_BY_ID[deal.brandId];
  const campaign = deal.campaignId ? CAMPAIGNS_BY_ID[deal.campaignId] : null;

  const [side, setSide] = useState<ChatSide>("creator");
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-mediate: every ~6s, advance whichever side is silent toward an offer.
  useEffect(() => {
    if (!deal.autoMode) {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      return;
    }
    if (deal.stage === "signed") return;
    if (!creator || !brand) return;
    autoTimerRef.current = setTimeout(() => {
      onUpdate((current) => autoMediateStep(current, creator, brand, campaign?.title ?? `${brand.name} Campaign`));
    }, 5500);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [deal, creator, brand, campaign, onUpdate]);

  if (!creator || !brand) return null;

  const chat = side === "creator" ? deal.creatorChat : deal.brandChat;

  return (
    <div className="flex flex-col gap-4">
      {/* Header card */}
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-3">
          <Avatar name={creator.name} size={40} />
          <div className="text-[14px] font-medium text-[var(--fg-muted)]">×</div>
          <BrandMark brand={brand} size={40} />
          <div className="ml-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold">{creator.name} × {brand.name}</span>
              <StagePill stage={deal.stage} />
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--fg-muted)] truncate">
              {campaign?.title ?? `${brand.name} Campaign`} · {(deal.similarity * 100).toFixed(0)}% brand-voice fit
            </div>
          </div>
          <button
            type="button"
            data-test-id="auto-mediate-toggle"
            onClick={() => onUpdate({ autoMode: !deal.autoMode })}
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
              deal.autoMode
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]",
            ].join(" ")}
            title="Let Claude auto-negotiate between both sides"
          >
            <Sparkles size={12} />
            {deal.autoMode ? "Auto-mediating" : "Auto-mediate"}
            <ClaudeMark model="haiku" size="xs" />
          </button>
        </div>

        <StageBreadcrumb stage={deal.stage} />
      </div>

      {/* Chat side toggle */}
      <div className="flex gap-1.5">
        <ChatTab
          active={side === "creator"}
          onClick={() => setSide("creator")}
          icon={<Avatar name={creator.name} size={16} />}
          label={`Aaron → ${creator.name.split(" ")[0]}`}
          unread={deal.creatorChat.messages[deal.creatorChat.messages.length - 1]?.from === "creator"}
        />
        <ChatTab
          active={side === "brand"}
          onClick={() => setSide("brand")}
          icon={<BrandMark brand={brand} size={16} />}
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

function ChatTab({ active, onClick, icon, label, unread }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; unread: boolean }) {
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

  // Build the 3 suggested quick-reply chips. Tailored to where the deal is.
  const suggestions = useMemo(() => buildSuggestions(deal, side, creator, brand), [deal, side, creator, brand]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const message: Message = {
        id: `m-${side}-${Date.now()}`,
        from: "aaron",
        text: text.trim(),
        timestamp: Date.now(),
      };
      setDraft("");
      setWaiting(true);
      onUpdate((d) => ({
        [side === "creator" ? "creatorChat" : "brandChat"]: {
          ...d[side === "creator" ? "creatorChat" : "brandChat"],
          messages: [...d[side === "creator" ? "creatorChat" : "brandChat"].messages, message],
          draft: "",
        },
      }));
      // Simulated reply 4-7s later, plus stage advance if both sides have replied at least once.
      const delay = 4000 + Math.random() * 3000;
      setTimeout(() => {
        const replyText = side === "creator" ? simulatedCreatorReply(brand, creator) : simulatedBrandReply(brand, creator);
        const reply: Message = {
          id: `r-${side}-${Date.now()}`,
          from: side,
          text: replyText,
          timestamp: Date.now(),
        };
        onUpdate((d) => {
          const chatKey = side === "creator" ? "creatorChat" : "brandChat";
          const updatedChat = {
            ...d[chatKey],
            messages: [...d[chatKey].messages, reply],
          };
          // Stage progression: if we're in outreach and got our first reply on
          // either side, advance to negotiating with a contract attached.
          let stage: DealStage = d.stage;
          let contract = d.contract;
          if (d.stage === "outreach") {
            stage = "negotiating";
            const impact = computeImpact(creator, brand);
            const pay = computeSuggestedPay(creator, brand, impact);
            contract = buildContract(creator, brand, pay.total_low, pay.total_high);
          }
          return { [chatKey]: updatedChat, stage, contract };
        });
        setWaiting(false);
      }, delay);
    },
    [side, brand, creator, onUpdate],
  );

  return (
    <div className="rounded-[14px] rounded-tl-none border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg-muted)]">
        Conversation with {counterpartyName}
        <ClaudeMark model="haiku" size="xs" />
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2.5">
        {chat.messages.length === 0 ? (
          <p className="text-[12px] italic text-[var(--fg-muted)]">No messages sent yet. Approve the Haiku-drafted message below to kick off this thread.</p>
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
              onClick={() => setDraft(s.text)}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-[12px] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              <div className="font-semibold text-[var(--fg)]">{s.label}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--fg-muted)]">{s.text}</div>
            </button>
          ))}
        </div>
      ) : null}

      {/* Composer */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={chat.messages.length === 0 ? "Approve the Haiku-drafted opener…" : `Reply to ${counterpartyName}…`}
          className="flex-1 resize-none rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-3 text-[13px] leading-relaxed focus:border-[var(--accent)] focus:outline-none"
          data-test-id="outreach-composer"
        />
        <button
          type="button"
          onClick={() => sendMessage(draft)}
          disabled={!draft.trim() || waiting}
          className="btn-primary inline-flex h-[42px] items-center gap-1.5 px-4 text-[13px] disabled:opacity-50"
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

function buildSuggestions(deal: Deal, side: ChatSide, creator: Creator, brand: Brand): { label: string; text: string }[] {
  const partyName = side === "creator" ? creator.name.split(" ")[0] : brand.name;
  const otherSide = side === "creator" ? brand.name : creator.name.split(" ")[0];
  const baseRate = deal.contract?.base_pay ?? Math.round((computeSuggestedPay(creator, brand, computeImpact(creator, brand)).total_low + computeSuggestedPay(creator, brand, computeImpact(creator, brand)).total_high) / 2);

  if (deal.stage === "outreach" || deal.stage === "negotiating") {
    return [
      {
        label: "Counter on rate",
        text: side === "creator"
          ? `${partyName} - we can stretch to $${(baseRate + 100).toLocaleString()} flat with the bonus structure on top. That's our ceiling for this campaign. Sound fair?`
          : `${partyName} team - ${otherSide} is asking $${(baseRate + 100).toLocaleString()}. Given their fit score and audience overlap, I'd recommend we lock at this rate. Greenlight?`,
      },
      {
        label: "Agree & lock",
        text: side === "creator"
          ? `${partyName} - terms work. Sending the contract now: $${baseRate.toLocaleString()} base + $${deal.contract?.bonus_per_block ?? 150} per 100K views over ${(deal.contract?.bonus_floor ?? 250_000).toLocaleString()}. Sample ships today.`
          : `${partyName} - ${otherSide} accepts. Locking at $${baseRate.toLocaleString()} base + bonus structure. Sending the contract for countersign.`,
      },
      {
        label: "Ask for details",
        text: side === "creator"
          ? `${partyName} - want to make sure we're aligned. What's your typical posting cadence, and is there flexibility on the deliverable format (TikTok vs Reel vs both)?`
          : `${partyName} team - one detail I want to confirm: any brand-voice guidelines or do-not-mention list we should hand to ${otherSide} before they post?`,
      },
    ];
  }

  // offer-pending or signed
  return [
    {
      label: "Confirm receipt",
      text: side === "creator"
        ? `${partyName} - just confirming you got the contract email. Anything you want me to walk through before you sign?`
        : `${partyName} team - just confirming the countersigned contract is on its way to your inbox. Anything else needed?`,
    },
    {
      label: "Schedule kickoff",
      text: side === "creator"
        ? `${partyName} - want to set a 15-min kickoff Thursday to align on script and posting window?`
        : `${partyName} team - shall we sync briefly on launch window and tracking pixels before ${otherSide} posts?`,
    },
    {
      label: "Send post-launch report",
      text: side === "creator"
        ? `${partyName} - once the post is up I'll send you the comment-relevance report 48hrs after launch so you see what's landing.`
        : `${partyName} team - we'll send a comment-relevance + sales-attribution report 48hrs after ${otherSide}'s post drops.`,
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
    let stage: DealStage = deal.stage;
    let contract = deal.contract;
    if (deal.stage === "outreach") {
      stage = "negotiating";
      const impact = computeImpact(creator, brand);
      const pay = computeSuggestedPay(creator, brand, impact);
      contract = buildContract(creator, brand, pay.total_low, pay.total_high);
    }
    return {
      creatorChat: { ...deal.creatorChat, messages: [...deal.creatorChat.messages, reply] },
      stage,
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
    let stage: DealStage = deal.stage;
    if (deal.stage === "outreach") stage = "negotiating";
    return {
      brandChat: { ...deal.brandChat, messages: [...deal.brandChat.messages, reply] },
      stage,
    };
  }
  // Both sides have replied. Advance to offer-pending if not already, with a
  // mediating Aaron message on each side.
  if (deal.stage === "negotiating") {
    return {
      stage: "offer-pending",
      creatorChat: {
        ...deal.creatorChat,
        messages: [
          ...deal.creatorChat.messages,
          { id: `m-c-${now}`, from: "aaron", text: `${creator.name.split(" ")[0]} - ${brand.name} approved the rate. Contract is in your inbox. Sample ships within 48hrs of countersign.`, timestamp: now },
        ],
      },
      brandChat: {
        ...deal.brandChat,
        messages: [
          ...deal.brandChat.messages,
          { id: `m-b-${now}`, from: "aaron", text: `${brand.name} team - ${creator.name} is locked. Contract is in your inbox for countersign.`, timestamp: now },
        ],
      },
    };
  }
  // Already at offer-pending, mark signed.
  if (deal.stage === "offer-pending" && deal.contract) {
    return {
      stage: "signed",
      contract: { ...deal.contract, approved_by_creator: true, approved_by_brand: true },
    };
  }
  // Nothing to do.
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
          if (c.approved_by_creator && c.approved_by_brand) {
            onUpdate({ stage: "signed" });
          } else {
            onUpdate({ stage: "offer-pending" });
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
        Draft generated by Claude Haiku from the negotiation transcript above. Both parties' approvals sync across creator + admin views via persisted state.
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
