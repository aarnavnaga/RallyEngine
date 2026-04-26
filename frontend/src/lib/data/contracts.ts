// Logan's Mercor contracts. Mirrors Mercor's contract object shape
// (work.mercor.com/offer/job_<id>) so /contracts/<id> renders the same UI.
//
// Mix of Mercor SWE (real, transcribed verbatim) + 4 Mercor creator contracts
// matched to Logan's actual TikTok niche (Celsius, Bucked Up, Bloom, Mercor
// Campus Ambassadors). Plus 2 outstanding offers and 2 applications for the
// Home page tabs.

export type ContractKind = "hourly" | "project" | "creator-post" | "creator-campaign" | "campus-ambassador";
export type ContractStatus = "active" | "paused" | "completed" | "draft";

export type ContractDocument = {
  name: string;
  signed_by: "you" | "mercor" | "brand";
  signed_on?: string; // MM/DD/YYYY
  download_url?: string;
};

export type ContractChecklistItem = {
  label: string;
  description: string;
  completed: boolean;
};

export type Contract = {
  id: string; // job_<base32-ish>
  brand: "mercor" | "celsius" | "bucked-up" | "bloom" | "alani";
  brand_label: string; // Display name
  role: string; // SWE, Creator, Campus Ambassador, etc.
  contract_kind: ContractKind;
  status: ContractStatus;
  received_ago_days: number;
  hourly_pay_usd?: number;
  flat_pay_usd?: number;
  weekly_cap?: string; // "Paused" | "40 hours" | "-"
  onboarding_doc_title: string;
  onboarding_doc_body: string; // markdown-ish, rendered as paragraphs
  documents: ContractDocument[];
  checklist: ContractChecklistItem[];
  payments_note: string;
};

// Logan's REAL Mercor SWE contract (transcribed verbatim from
// work.mercor.com/offer/job_AAABnZ65gbdmtYHW5aJC06Vt).
export const CONTRACTS: Contract[] = [
  {
    id: "job_AAABnZ65gbdmtYHW5aJC06Vt",
    brand: "mercor",
    brand_label: "Mercor",
    role: "SWE",
    contract_kind: "hourly",
    status: "paused",
    received_ago_days: 9,
    hourly_pay_usd: 40,
    weekly_cap: "Paused",
    onboarding_doc_title: "CUA Environments: Welcome",
    onboarding_doc_body:
      "You're joining a project focused on building expert-level evaluation tasks for Grafana. The goal is to create tasks that test whether AI agents can actually use Grafana the way a real power user does.\n\n" +
      "What you'll be doing:\n\n" +
      "Designing realistic, multi-step Grafana workflows (dashboards, alerting rules, data source configuration, panel setup)\n\n" +
      "Writing clear task prompts that describe exactly what needs to be done\n\n" +
      "Reviewing AI agent attempts at your tasks and identifying where/why they fail\n\n" +
      "Helping calibrate task difficulty so they're challenging but solvable\n\n" +
      "Why this matters: These tasks train and evaluate AI models on real software. The quality of what you build directly shapes how well these models learn to use tools like Grafana. Your domain expertise is the thing that makes these tasks authentic.\n\n" +
      "Pay: You will first be on a task based contract for $1800 for 2 tasks then you'll switch to a $90/hr contract!\n\n" +
      "Expectations:\n\n" +
      "You should be available for at least 10-15 hrs/week during the project\n\n" +
      "Tasks need to reflect workflows you'd actually do in your day-to-day, not textbook exercises\n\n" +
      "Prompts must be specific enough that someone could verify completion programmatically (clear, measurable outcomes)\n\n" +
      "We move fast. Responsiveness matters.\n\n" +
      "We are also offering a $200-1000 bonus for a highly realistic generated DB, feel free to pull from your own experience or find online references to come up with these. Reach out to me christiannorth@mercor.com!\n\n" +
      "Next Steps:\n\n" +
      "Please login to Okta and sign up for Slack!\n\n" +
      "Also sign in with your contractor email it should look something like this: magnesium.angelonia.lithium@mercor.expert\n\n" +
      "Look forward to a meeting invite to your mercor email!\n\n" +
      "Begin reading through your instructions docs\n\n" +
      "If you have any questions, drop them in the #general Slack channel and someone will get back to you. Looking forward to working with you.",
    documents: [
      { name: "Mercor Terms of Work", signed_by: "you", signed_on: "03/18/2026" },
      { name: "CIIAA", signed_by: "you", signed_on: "03/18/2026" },
      { name: "Form W-9", signed_by: "you", signed_on: "03/18/2026" },
      { name: "Offer Letter", signed_by: "you", signed_on: "03/18/2026" },
      { name: "Engagement Letter", signed_by: "mercor" },
    ],
    checklist: [
      { label: "Okta account", description: "Activated! Click here to access your account or reset your password.", completed: true },
      { label: "ID verification", description: "Successfully completed", completed: true },
      { label: "Sign terms of work document", description: "You are required to sign Mercor's Terms of Work to accept engagement offers.", completed: true },
      { label: "Sign CIIAA document", description: "You are required to sign a Confidential Information and Inventions Assignment Agreement (CIIAA).", completed: true },
      { label: "Sign W-9 / W-8 BEN form", description: "For tax reporting, complete a W9 if you are a United States citizen or resident alien. If you are from a country outside the United States, fill out the W-8 BEN.", completed: true },
      { label: "Complete Insightful setup", description: "Set up Insightful to track your working hours.", completed: true },
      { label: "Acknowledge Mercor payout policies", description: "Please familiarize yourself with our payout policies and payroll days.", completed: true },
      { label: "Sign your offer letter", description: "You are required to sign your offer letter to accept the contract", completed: true },
      { label: "Setup payments", description: "Payment setup completed.", completed: true },
    ],
    payments_note:
      "You will receive all payments via Stripe, less currency conversion fees. You can track all of your payments on the Earnings page.",
  },

  {
    id: "job_celsiusAmb26",
    brand: "celsius",
    brand_label: "Celsius",
    role: "Creator - College Ambassadors Spring '26",
    contract_kind: "creator-campaign",
    status: "active",
    received_ago_days: 2,
    flat_pay_usd: 850,
    weekly_cap: "1× post / month",
    onboarding_doc_title: "Celsius x College Ambassadors - Spring '26",
    onboarding_doc_body:
      "We want Celsius to be the drink in your morning routine and your gym bag. You've been selected for our Spring '26 college ambassador push.\n\n" +
      "What you'll be doing:\n\n" +
      "Posting one (1) TikTok per month showing dual-use Celsius (study + gym) within Celsius brand voice. We're targeting STEM-coded UCSB, UCLA, USC, Berkeley, ASU, UMich.\n\n" +
      "Audio is open. Captions are open. You drive the vibe - we trust you to feel out what your audience wants. Just hit the brand voice: high-performance, clean energy, study-meets-gym.\n\n" +
      "Promo code: CREATOR-LOGAN for 20% off - embed in caption + IG bio for the active week.\n\n" +
      "Why we picked you: Your 'Average quant' video (https://www.tiktok.com/@loganmann32/video/7608429326211501326) hit our exact ICP - STEM x physique x late-night-grind humor. The hashtag overlap with our ad themes (#ucsb #math #quant) is uncanny. Your geo (UCSB) is on our active campus list.\n\n" +
      "Pay & Cadence:\n\n" +
      "$850 / TikTok video, paid via Stripe within 5 business days of publish-and-verify.\n\n" +
      "1 video per calendar month for 3 months. Renewable based on first-month performance.\n\n" +
      "Bonus: $200 if your video clears 25K views in the first 7 days. $500 if it clears 100K. Cumulative.\n\n" +
      "Expectations:\n\n" +
      "Post during the agreed window (we'll send you 2-day windows monthly).\n\n" +
      "Tag @celsiusofficial in caption + first IG story.\n\n" +
      "Don't post within 7 days of any direct competitor (Alani, Ghost, C4, Bang).\n\n" +
      "Send the rough cut to your Celsius coordinator before publish - we won't ghost-edit; we just sanity-check brand-safety.\n\n" +
      "If you have any questions, your coordinator is Kayla on Slack - shared channel #celsius-loganmann.",
    documents: [
      { name: "Mercor Creator Terms", signed_by: "you", signed_on: "04/24/2026" },
      { name: "Celsius Brand Brief - Spring '26", signed_by: "brand" },
      { name: "Form W-9", signed_by: "you", signed_on: "03/18/2026" },
      { name: "Engagement Letter", signed_by: "brand" },
    ],
    checklist: [
      { label: "Connect TikTok account", description: "Connected as @loganmann32 (22.7K followers).", completed: true },
      { label: "Connect Instagram account", description: "Connected as @loganmann (4.2K followers).", completed: true },
      { label: "Sign Mercor Creator Terms", description: "You are required to sign the standard creator engagement before publishing.", completed: true },
      { label: "Acknowledge Celsius brand voice", description: "Read the brand voice quick-card so the post lands inside the lane.", completed: true },
      { label: "Sample shipped", description: "1 case sent to UCSB campus mail. Tracking: 1Z9999W90387654321.", completed: true },
      { label: "Coordinator intro on Slack", description: "Kayla added you to #celsius-loganmann.", completed: false },
      { label: "Setup payments", description: "Stripe payout configured. Next payment lands within 5 business days of verified publish.", completed: true },
    ],
    payments_note:
      "Per-post payment via Stripe. Bonus tier paid as a separate line item once 7-day metric is verified.",
  },

  {
    id: "job_buckedUp26",
    brand: "bucked-up",
    brand_label: "Bucked Up",
    role: "Creator - Fraternity Social Chair Pack",
    contract_kind: "creator-campaign",
    status: "active",
    received_ago_days: 6,
    flat_pay_usd: 1620,
    weekly_cap: "3 posts over 3 weeks",
    onboarding_doc_title: "Bucked Up - Fraternity Social Chair Pack",
    onboarding_doc_body:
      "Welcome to the Bucked Up Spring social chair push. You've been selected because your aesthetic-physique content is exactly what we run ads against.\n\n" +
      "What you'll deliver:\n\n" +
      "3× TikTok videos over 3 weeks: pre-workout pour, gym session B-roll, post-workout 'why Bucked Up'.\n\n" +
      "1× IG reel recap at the end of the 3-week window.\n\n" +
      "Outdoor or campus settings preferred. We hate fluorescent gym lighting.\n\n" +
      "Why we picked you: Your physique content lands in our exact lane. The Goal: post (https://www.tiktok.com/@loganmann32/video/7603223754671508749) and your overall feed put you on the same shelf as our highest-converting creators last quarter.\n\n" +
      "Pay & Cadence:\n\n" +
      "$1,620 flat for the 3-week pack. Paid 50% on signing, 50% on final reel publish.\n\n" +
      "Bonus tier: +$300 if your videos collectively clear 50K views in 30 days post-publish.\n\n" +
      "Brand voice cheatsheet: antlers, rugged, performance, physique. Avoid soft-life or it-girl framing - that's Alo, that's Bloom, that's not us.\n\n" +
      "Coordinator: Trent at trent@bucked-up.com. He'll add you to a Slack DM thread once the first half of the deposit clears Stripe.",
    documents: [
      { name: "Mercor Creator Terms", signed_by: "you", signed_on: "04/20/2026" },
      { name: "Bucked Up Brand Brief", signed_by: "brand" },
      { name: "Form W-9", signed_by: "you", signed_on: "03/18/2026" },
      { name: "Engagement Letter", signed_by: "brand" },
    ],
    checklist: [
      { label: "Connect TikTok account", description: "Connected as @loganmann32 (22.7K followers).", completed: true },
      { label: "Sign Mercor Creator Terms", description: "Signed.", completed: true },
      { label: "Acknowledge Bucked Up brand voice", description: "Antlers, rugged, performance.", completed: true },
      { label: "Sample shipped", description: "Pre-workout tub + Bucked Up Energy 4-pack shipped.", completed: true },
      { label: "First post published", description: "Pre-workout pour, posted Apr 19.", completed: true },
      { label: "Second post published", description: "Gym session B-roll - due Apr 26.", completed: false },
      { label: "Third post + IG reel recap", description: "Due May 3.", completed: false },
    ],
    payments_note:
      "50% deposit ($810) hit your Stripe account on signing. Remainder posts on final reel publish.",
  },

  {
    id: "job_bloomMorningStack",
    brand: "bloom",
    brand_label: "Bloom Nutrition",
    role: "Creator - Creatine Gummies Morning Stack",
    contract_kind: "creator-post",
    status: "active",
    received_ago_days: 1,
    flat_pay_usd: 920,
    weekly_cap: "1× post",
    onboarding_doc_title: "Bloom × Creatine Gummies - Morning Stack",
    onboarding_doc_body:
      "Hi Logan - happy to have you on the Spring Morning Stack push. Bloom is the it-girl-meets-gym creatine play, and your dual-audience reach (UCSB + STEM bro humor) is perfect leverage for us into a slightly more masculine wedge of our market.\n\n" +
      "What you'll deliver:\n\n" +
      "1× TikTok showing your morning supplement stack. Bloom Greens + creatine gummies. Authentic kitchen + morning routine vibes.\n\n" +
      "1× IG story tagging @bloomnu in the active week.\n\n" +
      "Mention texture and flavor honestly. Our customers can tell when scripts are read.\n\n" +
      "Pay: $920 flat. Paid via Stripe within 5 business days of publish-and-verify.\n\n" +
      "Window: Post within the next 14 days. We'll send you a 3-day publish window during onboarding.\n\n" +
      "Promo code: BLOOM-LOGAN for 15% off - embed in caption.",
    documents: [
      { name: "Mercor Creator Terms", signed_by: "you", signed_on: "04/25/2026" },
      { name: "Bloom Brand Brief", signed_by: "brand" },
    ],
    checklist: [
      { label: "Connect TikTok account", description: "Connected as @loganmann32.", completed: true },
      { label: "Sign Mercor Creator Terms", description: "Signed.", completed: true },
      { label: "Sample shipped", description: "Greens powder + creatine gummies (4-pack) shipped to UCSB.", completed: false },
      { label: "Coordinator intro on Slack", description: "Maya at Bloom - pending.", completed: false },
      { label: "Publish first post", description: "Window: Apr 28 - May 4.", completed: false },
    ],
    payments_note: "Per-post via Stripe.",
  },

  {
    id: "job_cooperBrunnerBloom",
    brand: "bloom",
    brand_label: "Bloom Nutrition",
    role: "Creator - Multivitamin Morning Stack",
    contract_kind: "creator-post",
    status: "active",
    received_ago_days: 3,
    flat_pay_usd: 720,
    weekly_cap: "1x post",
    onboarding_doc_title: "Bloom x Cooper Brunner - Multivitamin Morning Stack",
    onboarding_doc_body:
      "Hey Cooper - Bloom is thrilled to bring you on for our Spring Multivitamin Morning Stack push. Your recent video at https://www.tiktok.com/@cooperbrunner/video/7342566675230887214 hit our exact ICP: morning-routine nutrition, authentic small-business support framing, and a wellness-first audience that overlaps directly with our multivitamin buyer. The slow-release angle you highlighted is precisely the product story we want to amplify.\n\n" +
      "What you will deliver: 1 TikTok video showing the Bloom morning multivitamin stack integrated into your daily routine. Match the tone and authenticity of your Endurance Products vitamin video - real, personal, no heavy scripting. Feature the Bloom multivitamin prominently and speak to at least one specific benefit (absorption, ingredients, or morning habit). Bloom voice is clean, wellness-forward, and genuine; avoid clinical or pharmaceutical framing.\n\n" +
      "Pay: $720 flat, paid via Stripe within 5 business days of publish-and-verify. Performance bonuses stack on top: +$200 if the post clears 25K views in the first 7 days, +$500 if it clears 100K views in 7 days. Both bonuses are cumulative and paid as separate Stripe line items once the metric window closes.\n\n" +
      "Next steps: Review and sign the Bloom Brand Brief below, confirm your shipping address so we can send your sample kit, and connect with your Bloom coordinator on Slack once your account is linked. Post window opens 7 days after sample delivery confirmation. We are looking forward to seeing your take on the morning stack.",
    documents: [
      { name: "Mercor Creator Terms", signed_by: "you", signed_on: "04/23/2026" },
      { name: "Bloom Brand Brief", signed_by: "brand" },
      { name: "Form W-9", signed_by: "you", signed_on: "04/23/2026" },
    ],
    checklist: [
      { label: "Connect TikTok", description: "Connect your TikTok account so Bloom can verify post metrics after publish.", completed: false },
      { label: "Sign Mercor Creator Terms", description: "You are required to sign the standard Mercor creator engagement before publishing.", completed: false },
      { label: "Acknowledge Bloom brand voice", description: "Read the Bloom voice quick-card: clean, wellness-forward, authentic. No clinical framing.", completed: false },
      { label: "Sample shipped", description: "Bloom multivitamin morning stack kit - pending address confirmation.", completed: false },
      { label: "Coordinator on Slack", description: "Bloom coordinator will add you to the shared channel once TikTok is connected.", completed: false },
    ],
    payments_note: "Per-post via Stripe.",
  },

  {
    id: "job_mercorCampus",
    brand: "mercor",
    brand_label: "Mercor (Campus)",
    role: "Campus Ambassador - UCSB",
    contract_kind: "campus-ambassador",
    status: "draft",
    received_ago_days: 0,
    hourly_pay_usd: 30,
    weekly_cap: "5 hours",
    onboarding_doc_title: "Mercor - Campus Ambassadors (UCSB, UCB, USC, MIT)",
    onboarding_doc_body:
      "Mercor is hiring 1,000+ experts a week - and we want STEM creators to introduce us. You'd be one of three founding UCSB campus ambassadors.\n\n" +
      "What you'd do:\n\n" +
      "1× TikTok per month showing a campus walk-through, your major, your work, and how you'd 'earn for your expertise' on Mercor. Honest sells better than scripted.\n\n" +
      "Cohort intros: invite 3-5 STEM friends per month to apply via your referral link. We'll auto-handle the outreach (you don't have to DM anyone).\n\n" +
      "Pay: $30/hour for up to 5 hours/week, plus $400 referral bonus for every accepted application.\n\n" +
      "This contract is currently in DRAFT - Aaron is still working out the cohort cap. You'll see it activate in your inbox once finalized.\n\n" +
      "Promo code: CAMPUS-LOGAN.",
    documents: [
      { name: "Mercor Terms of Work", signed_by: "you", signed_on: "03/18/2026" },
    ],
    checklist: [
      { label: "Confirm UCSB enrollment", description: "Verified via .edu email.", completed: true },
      { label: "Acknowledge campus ambassador handbook", description: "Pending Aaron's final draft.", completed: false },
      { label: "Connect Mercor referral link", description: "Auto-generated once accepted.", completed: false },
    ],
    payments_note: "Hourly via Stripe + referral bonus per accepted application.",
  },
];

export const CONTRACTS_BY_ID: Record<string, Contract> = Object.fromEntries(
  CONTRACTS.map((c) => [c.id, c]),
);

export function listActiveContracts() {
  return CONTRACTS.filter((c) => c.status === "active" || c.status === "paused");
}

export function listDraftContracts() {
  return CONTRACTS.filter((c) => c.status === "draft");
}

// Outstanding offers Logan hasn't accepted yet - drives the "Offers" tab on /home.
export type Offer = {
  id: string;
  brand_label: string;
  brand: Contract["brand"] | "alani" | "ghost-energy" | "lululemon";
  role: string;
  pay_label: string; // "Up to $1,200/post" etc
  posted_ago_days: number;
  expires_in_days: number;
  one_line: string;
};

export const OFFERS: Offer[] = [
  {
    id: "offer_alaniSpring",
    brand: "alani",
    brand_label: "Alani Nu",
    role: "Creator - It-Girl Energy Spring Drop",
    pay_label: "$600 - $1,000 / post",
    posted_ago_days: 1,
    expires_in_days: 6,
    one_line: "Soft, lifestyle-led storytelling for the newest flavor. GRWM or wellness-stack content welcomed.",
  },
  {
    id: "offer_ghostFlavor",
    brand: "ghost-energy",
    brand_label: "Ghost Energy",
    role: "Creator - Sour Patch Drop Reaction",
    pay_label: "$800 - $1,300 / video",
    posted_ago_days: 2,
    expires_in_days: 5,
    one_line: "Authentic first-taste reaction to Sour Patch Watermelon. Bold, transparent, irreverent. We don't script.",
  },
];

// Open applications Logan has submitted but hasn't been accepted on yet.
export type Application = {
  id: string;
  brand: Contract["brand"] | "ryse" | "alphalete";
  brand_label: string;
  role: string;
  submitted_ago_days: number;
  status: "review" | "interview" | "rejected";
};

export const APPLICATIONS: Application[] = [
  {
    id: "app_ryseGodzilla",
    brand: "ryse",
    brand_label: "Ryse Supps",
    role: "Creator - Godzilla Pre Lift Demo",
    submitted_ago_days: 4,
    status: "review",
  },
];
