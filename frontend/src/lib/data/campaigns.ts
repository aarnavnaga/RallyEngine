// Brand campaigns surfaced as Mercor-style "Explore opportunities" cards.
// Mirrors Mercor's Explore page schema: title, rate range, 1-click apply,
// hires-this-month avatars, total $ paid this month.

import type { Brand } from "./brands";
import { BRANDS_BY_ID } from "./brands";

export type Campaign = {
  id: string;
  brand_id: Brand["id"];
  title: string;
  rate_low: number;
  rate_high: number;
  rate_unit: "post" | "campaign" | "story" | "video" | "month";
  oneclick_apply: boolean;
  hires_this_month: number;
  paid_this_month: number;
  brief: string;
  deliverables: string[];
  target_personas: string[];
  active: boolean;
};

const C = (c: Omit<Campaign, "active">): Campaign => ({ ...c, active: true });

export const CAMPAIGNS: Campaign[] = [
  C({
    id: "celsius-college-q2",
    brand_id: "celsius",
    title: "Celsius x College Ambassadors - Spring '26",
    rate_low: 700,
    rate_high: 1100,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 14,
    paid_this_month: 12_400,
    brief:
      "We want to be the drink in your morning routine and your gym bag. Single TikTok showing dual-use (study + gym) within Celsius brand voice. Specifically targeting STEM-coded UCSB, UCLA, USC, Berkeley, ASU, UMich, UF, GTech.",
    deliverables: [
      "1× TikTok video (15-45s) showing dual-use",
      "1× Instagram story tagging @celsiusofficial",
      "Promo code: CREATOR-FIRSTNAME for 20% off",
    ],
    target_personas: ["college-stem", "gym-aesthetic"],
  }),
  C({
    id: "alani-itgirl-spring",
    brand_id: "alani",
    title: "Alani Nu × It-Girl Energy - Spring Drop",
    rate_low: 600,
    rate_high: 1000,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 8,
    paid_this_month: 6_800,
    brief:
      "Soft, lifestyle-led storytelling for our newest flavor. Get-ready-with-me, morning-routine, or wellness-stack content welcomed. Avoid hard-sell pre-workout framing - keep it pretty.",
    deliverables: ["1× TikTok GRWM or routine", "1× IG carousel"],
    target_personas: ["women-lifestyle", "wellness"],
  }),
  C({
    id: "bucked-up-frat",
    brand_id: "bucked-up",
    title: "Bucked Up - Fraternity Social Chair Pack",
    rate_low: 700,
    rate_high: 1200,
    rate_unit: "campaign",
    oneclick_apply: true,
    hires_this_month: 5,
    paid_this_month: 4_400,
    brief:
      "Pre-workout for college-age aesthetic creators. Three-week campaign: pre-workout pour, gym session B-roll, post-workout 'why Bucked Up'. Outdoor or campus settings preferred.",
    deliverables: ["3× TikTok (1 over 3 weeks)", "1× IG reel recap"],
    target_personas: ["gym-aesthetic", "physique", "outdoor"],
  }),
  C({
    id: "ghost-energy-flavor",
    brand_id: "ghost-energy",
    title: "Ghost Energy - Sour Patch Drop Reaction",
    rate_low: 800,
    rate_high: 1300,
    rate_unit: "video",
    oneclick_apply: true,
    hires_this_month: 11,
    paid_this_month: 10_900,
    brief:
      "Authentic first-taste reaction to the new Sour Patch Watermelon flavor. Bold, transparent, irreverent - that's Ghost. We trust your voice; do not script.",
    deliverables: ["1× TikTok reaction (30-60s)", "1× IG reel"],
    target_personas: ["gym-aesthetic", "lifestyle"],
  }),
  C({
    id: "bloom-creatine-gummies",
    brand_id: "bloom",
    title: "Bloom × Creatine Gummies - Morning Stack",
    rate_low: 600,
    rate_high: 1100,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 12,
    paid_this_month: 9_600,
    brief:
      "Show your morning supplement stack. Bloom Greens + creatine gummies. Authentic kitchen + morning routine vibes. Mention texture and flavor.",
    deliverables: ["1× TikTok morning stack", "1× IG story tag"],
    target_personas: ["women-lifestyle", "wellness", "gym-aesthetic"],
  }),
  C({
    id: "ryse-godzilla",
    brand_id: "ryse",
    title: "Ryse Supps × Godzilla Pre - Lift Demo",
    rate_low: 600,
    rate_high: 1100,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 7,
    paid_this_month: 5_600,
    brief:
      "Tonight's-gonna-be-a-PR-night vibe. Show your scoop and your set. Tagline: 'Fuel the lift.' We pay extra if your set is genuinely impressive.",
    deliverables: ["1× TikTok lift video"],
    target_personas: ["gym-aesthetic", "physique", "athlete"],
  }),
  C({
    id: "gymshark-tshirts",
    brand_id: "gymshark",
    title: "Gymshark Athlete Program - Spring Drop",
    rate_low: 800,
    rate_high: 1500,
    rate_unit: "post",
    oneclick_apply: false,
    hires_this_month: 18,
    paid_this_month: 22_500,
    brief:
      "We build the world's largest athlete program. Apply once - if accepted, you'll receive priority access to drops, athlete-only product, and ongoing campaign opportunities.",
    deliverables: ["1× TikTok per drop", "Quarterly recap"],
    target_personas: ["gym-aesthetic", "athlete"],
  }),
  C({
    id: "alphalete-amplify",
    brand_id: "alphalete",
    title: "Alphalete Amplify Shorts - Physique Showcase",
    rate_low: 700,
    rate_high: 1300,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 6,
    paid_this_month: 5_900,
    brief:
      "Premium fit for premium creators. Show how Amplify shorts hold up through your full session. Keep it physique-aesthetic, indoor or outdoor lighting both fine.",
    deliverables: ["1× TikTok session", "1× IG fit pic"],
    target_personas: ["gym-aesthetic", "physique"],
  }),
  C({
    id: "alo-soft-life",
    brand_id: "alo-yoga",
    title: "Alo Yoga × Soft Life Mornings",
    rate_low: 800,
    rate_high: 1500,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 9,
    paid_this_month: 10_300,
    brief:
      "Slow morning, soft fabrics, golden-hour light. Show your mat, your cup, your fit. No hard-sell - pure lifestyle storytelling.",
    deliverables: ["1× TikTok lifestyle", "1× IG carousel"],
    target_personas: ["wellness", "women-lifestyle"],
  }),
  C({
    id: "lululemon-align",
    brand_id: "lululemon",
    title: "lululemon Align - Wear-Anywhere Test",
    rate_low: 900,
    rate_high: 1700,
    rate_unit: "post",
    oneclick_apply: false,
    hires_this_month: 4,
    paid_this_month: 6_400,
    brief:
      "Take Align leggings somewhere they don't belong. Coffee shop. Errands. Library. Show why they're not just gym pants. We are picky about fit and vibe.",
    deliverables: ["1× TikTok wear-test", "1× IG carousel"],
    target_personas: ["wellness", "lifestyle"],
  }),
  C({
    id: "vitality-set-drop",
    brand_id: "vitality",
    title: "Vitality Sets - Community Drop",
    rate_low: 600,
    rate_high: 1100,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 5,
    paid_this_month: 4_200,
    brief:
      "Two-piece set drop. Show full-fit transition (street-to-gym). Tag #VitalityCommunity for re-shares.",
    deliverables: ["1× TikTok transition", "1× IG fit pic"],
    target_personas: ["women-lifestyle", "gym-aesthetic"],
  }),
  C({
    id: "popflex-pilates",
    brand_id: "popflex",
    title: "POPFLEX × Cassey's Pirouette - Pilates Cohort",
    rate_low: 500,
    rate_high: 900,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 6,
    paid_this_month: 4_100,
    brief:
      "Pirouette Skort - show twirling, Pilates classes, post-yoga coffee. Cassey is hands-on with this drop.",
    deliverables: ["1× TikTok"],
    target_personas: ["women-lifestyle", "wellness"],
  }),
  C({
    id: "olipop-gym",
    brand_id: "olipop",
    title: "Olipop x Gym Crossover",
    rate_low: 600,
    rate_high: 1000,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 7,
    paid_this_month: 5_400,
    brief:
      "Olipop fits gym lifestyle better than people think. Show post-workout pour, gym-bag photo, or wellness-stack moment.",
    deliverables: ["1× TikTok", "1× IG story"],
    target_personas: ["wellness", "gym-aesthetic"],
  }),
  C({
    id: "liquid-death-tallboy",
    brand_id: "liquid-death",
    title: "Liquid Death × Tallboy Heists",
    rate_low: 700,
    rate_high: 1300,
    rate_unit: "video",
    oneclick_apply: true,
    hires_this_month: 5,
    paid_this_month: 4_800,
    brief:
      "Murder your thirst, on camera. Be irreverent. Be metal. The cleaner the joke, the better the ad. We do not script.",
    deliverables: ["1× TikTok"],
    target_personas: ["lifestyle", "gym-aesthetic"],
  }),
  C({
    id: "magic-mind-quant",
    brand_id: "magic-mind",
    title: "Magic Mind × Quant Mornings",
    rate_low: 500,
    rate_high: 900,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 4,
    paid_this_month: 3_200,
    brief:
      "Cognitive-performance shot for STEM creators. 'No-jitters morning' angle. Keep it grounded; specific moments win.",
    deliverables: ["1× TikTok study/morning", "1× IG story"],
    target_personas: ["college-stem", "wellness"],
  }),
  C({
    id: "create-creatine",
    brand_id: "create-wellness",
    title: "Create Creatine Gummies - First-time stack",
    rate_low: 500,
    rate_high: 900,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 3,
    paid_this_month: 2_300,
    brief:
      "Authentic 'first-time using creatine gummies' content. Show the routine, mention texture/sweetness honestly. Voice = grounded.",
    deliverables: ["1× TikTok"],
    target_personas: ["gym-aesthetic", "wellness"],
  }),
  C({
    id: "mercor-campus",
    brand_id: "mercor",
    title: "Mercor - Campus Ambassadors (UCSB, UCB, USC, MIT)",
    rate_low: 800,
    rate_high: 1400,
    rate_unit: "post",
    oneclick_apply: true,
    hires_this_month: 11,
    paid_this_month: 12_700,
    brief:
      "Mercor is hiring 1,000+ experts a week - and we want STEM creators to introduce us. Show your major, your work, and how you'd 'earn for your expertise' on Mercor. Honest sells better than scripted.",
    deliverables: ["1× TikTok campus walk-through", "Promo code: CAMPUS-FIRSTNAME"],
    target_personas: ["college-stem"],
  }),
];

export function listCampaigns() {
  return CAMPAIGNS.filter((c) => c.active).map((c) => ({
    ...c,
    brand: BRANDS_BY_ID[c.brand_id],
  }));
}

export const CAMPAIGNS_BY_ID: Record<string, Campaign> = Object.fromEntries(
  CAMPAIGNS.map((c) => [c.id, c]),
);
