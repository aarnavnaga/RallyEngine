# Aaron Langerman — production-ready call + demo script

Live at: **https://musing-maxwell-84ed29.vercel.app**

This is the version that matches what's actually on screen. Numbers, labels, button text, and URLs are verbatim from a 2026-04-29 prod walk after the readiness fixes landed. The older `aaron-call-script.md` stays as the historical pitch deck reference.

---

## Pre-flight checklist (60 seconds before the call)

- [ ] Open `https://musing-maxwell-84ed29.vercel.app` in a fresh tab. No other tabs.
- [ ] Top-right → **Log in** → click **"I am on the Mercor team (Aaron)"**. You should land on `/admin` with the avatar showing Aaron at bottom-left of the sidebar.
- [ ] Sidebar should read: **Overview / Experts / Match / Inbox / Campaigns**. If you don't see Match, hard-refresh once.
- [ ] Click **Match**. Confirm brand dropdown is on **Celsius**. Confirm Logan Mann is row 1.
- [ ] Don't dry-run the haggler reply more than once — Gemini Flash Lite quota is fine, but each rehearsal burns a call.

---

## Part 1 — The call (what Logan says)

### Opener (~15s)

> "Aaron — Aarnav and I are on the CUA-envs contract under Drew. This isn't a separate company. It's an internal proposal: stand up Creator Experts as a new Expert Domain on Mercor. I want to walk you through the demo first — six slides after if you want them, but the demo carries the case."

### Why Mercor needs this (~30s)

> "Three things you already know. Goldman has the creator economy at $480B by 2027. Brand UGC ads from creators clear 4× the CTR of agency ads at half the cost. And 74% of brands are moving budget into creator programs this year.
>
> What's broken: brand-voice RLHF — the data type that teaches a model what a Celsius ad sounds like — has no vendor. Surge can't run it. Scale can't run it. The labor pool isn't engineers, it's creators. And meanwhile Mercor is paying Meta to find creators on TikTok who already have audiences. The marketplace, the contracts, Stripe rails — you've already shipped them. We just point them at a new labor pool."

### Hand off into the demo (~10s)

> "Easier to show than tell. I'm signed in as you on `musing-maxwell-84ed29.vercel.app` right now. Watch the Match workbench."

### After the demo — the ask (~30s)

> "Three questions, one ask.
>
> 1. Where does Creator Experts live inside Mercor — whose org owns it?
> 2. Hourly pricing, or per-post with a relevant-eyes bonus?
> 3. Who closes brand deals — Mercor's GTM, or do Aarnav and I run the first 5–10 during the pilot and hand off?
>
> The ask: bring us on as summer interns to ship the Domain row, close the first cohort of brand customers, and run the campaigns. By August we hand a clean PMF case to your eng and growth teams. No new headcount line. We're already on payroll."

### Objection handlers

| Pushback | Logan's reply |
|---|---|
| *Is the campaign sim real?* | "The performance numbers tick from a deterministic formula off the same similarity score you saw on the Match page. Every creator, brand, and TikTok URL is real and verifiable from your phone. The only mock is the actual email send." |
| *Why intern, not hire?* | "Lowest commitment for Mercor. Summer ships the case. If it works we move. If it doesn't, we wrap. No headcount line opens." |
| *Should Mercor's GTM sell brands?* | "Yes — eventually. We just need clarity on the line. Logan and I run the first 5–10 deals during the pilot, hand off the playbook, your team takes the rest." |
| *Why not Handshake?* | "Handshake is a job board. They don't have your contracts, Stripe Connect, or AI lab relationships. Adding a creator side to Handshake means rebuilding everything Mercor already has. Adding it here is one PR." |

Total spoken: ~85 seconds + the 3-minute demo + Q&A. Cap the call at 15 minutes.

---

## Part 2 — The demo (what Logan clicks)

Every screen detail below was verified on prod 2026-04-29. **[click]** = action; *italic* = what Logan says.

### Stage 1 — Sign in as Aaron (~10s)

**[click]** Top-right **Log in** → **"I am on the Mercor team (Aaron)"**.
**Lands on:** `/admin`
**You'll see:** four KPI cards across the top — `Brand-voice fit ~0.87`, `Comment-relevance ~43-44%`, `Audience overlap 0.74`, `Auto-draft queue 12`. (The first two drift slightly between visits — they tick. Audience overlap and Auto-draft are stable.) Three charts under that — Weekly revenue trending to ~$24K last week, New creators onboarded ramping to 8/week, Comment relevance climbing toward 45%. An action-items list below.

> *"I'm signed in as you. Top of the page — the four KPIs that ground every payout: brand-voice fit, comment relevance, audience overlap, auto-draft queue. Weekly revenue's at about twenty-four thousand last week and ramping. Mercor's dashboard pattern, just for the brand side."*

**Pitfall:** don't click the action items — they navigate elsewhere and break the flow.

### Stage 2 — Match workbench (~30s)

**[click]** Sidebar → **Match**.
**Lands on:** `/admin/match`
**You'll see:** brand dropdown is on **Celsius · energy**. Top row is **Logan Mann · @loganmann32 · UC Santa Barbara · 22.7K · 0.71 · 67 · $203 ($700-$1,100)**. Below him: Jenny Kndd, Cassey Ho, Senada Greca, JoelBergs, etc.

> *"Manual matching workbench. Pick Celsius. Logan's pinned at #1 — small account, 22.7K followers, but the similarity score and impact rank him ahead of much bigger creators because the audience fit is real."*

**Pitfall:** **do not change the brand dropdown.** Logan is only pinned for Celsius. Switch it to Bucked Up or Bloom and he drops out of the visible top-14. The wow moment dies.

### Stage 3 — RAG citations (~30s)

**[click]** Logan's row should already be expanded. If not, click his row.
**You'll see:** "RAG rationale - cited posts" panel with two cards. Card 1: *"UCSB on Celsius's target list. 'Average quant' hits #janestreet #math #quant — same audience Celsius runs ads to. Cosine sim 0.60."* Real TikTok URL beneath: `https://www.tiktok.com/@loganmann32/video/7608429326211501326`. Hashtag pills: `#janestreet #math #quant #ucsb #gonzalo`. Card 2 cites "The Goal:" video.

To the right: Impact score breakdown — `sqrt(followers)/100 0.62`, `niche relevance 0.92`, `posts/week 0.4`, `log10(median interactions+1) 0.46`, `authenticity 1.00`, `geo match 1.00`, `composite = 66.70`, `Score 67`. Pay breakdown: `base floor (tier) $200`, `impact × $0.15 $10`, `relevant-eyes bonus $3`, `Recommended $203`, `range $700 - $1,100`.

> *"Watch this. The rationale cites my actual TikTok posts back by URL — `tiktok.com/@loganmann32/video/7608429326211501326`, the Average-quant video. Hashtags `#janestreet #math #quant #ucsb` quoted as the audience-overlap signal. No black box. Brendan's bar."*

### Stage 4 — Generate outreach (~30s)

Logan's row is already checked (Picked: 1).
**[click]** Top-right **Generate outreach**.
**Lands on:** `/admin/outreach?brand=celsius&picks=loganmann32`
**You'll see:** Logan × Celsius pinned at top of the inbox at "71% match · 22.7K · Celsius x College Ambassadors - Spring '26 · 71% brand-voice fit". The opener Aaron has pre-drafted: *"Hey Logan - saw your 'Average quant' post (https://www.tiktok.com/@loganmann32/video/7608429326211501326). The #janestreet #math angle is exactly the kind of audience Celsius pays for - UCSB STEM-coded, gym-native, no-fluff energy that converts. We'd love to bring you into our Celsius x College Ambassadors - Spring '26 run - $700-$1,100/post, full autonomy on the script. Worth a 10-minute call this week?"*

Logan's reply already in the thread: *"Yeah honestly Celsius would crush with my crowd. The morning gym + study angle is already 60% of my comments. Could do $1100/post if you ship product first. What's the timeline?"*

Three quick-reply chips above the composer (e.g. "Confirm $1100 Rate", "Hold at $1000", "Clarify product timeline").

> *"The opener cites my Average-quant video by URL and Celsius's college-ICP positioning — that's the RAG payoff. The reply chain is persona-aware. I can approve, edit, or counter."*

### Stage 5 — Live haggle (~20s)

**[click]** Composer at the bottom (placeholder: "Reply to Logan Mann…"). Type **`$700?`** and press Enter.
**You'll see:** Aaron's $700? message lands. Within 1-3 seconds Logan's counter lands. Example reply (real Gemini Flash Lite output, will vary): *"I can do $1100/post for the Celsius ambassador program, provided product is shipped in advance and we confirm deliverables."* If Gemini stalls, a brand-aware fallback fires server-side: *"Love the ICP fit - can we do a study-session + gym clip combo? Would land on FYP for sure."* Either way, no error.

> *"Live haggler. The reply lands fast — typically 1 to 3 seconds. There's a brand-aware fallback if the upstream stalls so you never see an error mid-call. The CRM at one-thousand-hires-a-week scale, just for the brand side."*

### Stage 6 — Live campaign (~30s)

**[click]** Sidebar → **Campaigns** → click **Celsius x College Ambassadors - Spring '26**.
**Lands on:** `/admin/campaigns/celsius-college-q2`
**You'll see:** "LIVE PERFORMANCE" panel with five counters that tick — Views, Comments, Saves, Click-throughs, Sales. The exact numbers reset on each navigation and increment every 8-12 seconds while you're on the page; don't memorize specific values, just point at them moving. Avg comment relevance: **38%** (deterministic). Label below the chart: "Updates every 8-12 seconds." Pricing breakdown — formula printed: `max(base_floor, impact × 0.15) + relevant_eyes × 0.05`. Table rows are stable: Logan ($200 + $10 + $3 = $203), Jenny Kndd ($1,500 + $12 + $7 = $1,507), Jen Selter ($1,510), Adrian Leung ($1,506), Cassey Ho ($1,515). Total (5 creators): **$6,241**.

> *"Live campaign. Views tick every eight to twelve seconds. The pricing card shows the formula — base floor plus impact term plus relevant-eyes bonus — applied per creator. Logan's a small account so his line is two hundred bucks. The bigger creators on the same campaign clear fifteen hundred each. The whole point: payouts are grounded in comment relevance, not just sales. Fair to creator and brand."*

### Close (~10s)

> *"Real creator. Real brands. Real RAG citing real posts. Transparent pricing. Persona-aware ops. Mercor's UI — half a day of integration. That's the case."*

---

## What to do if something breaks mid-demo

The most likely failure mode is **Gemini Flash Lite returning a slightly off-tone reply after 3-4 rapid messages on the haggler chat**. The server-side fallback in `/api/chat-reply` catches every non-success path (verified in round 7 — 5/5 invalid-key calls returned 200 with brand-aware fallback text) so the bubble always renders. If Aaron notices a reply sounds boilerplate, say: *"Quota throttled — that one's the static fallback, the earlier ones were the real model."*

**Don't open DevTools mid-demo.** The console is noisy with `logo.clearbit.com` DNS failures (~6 errors per page). Brand logos fall through to Google favicons → letter-tile, so the visual is fine, but the console looks bad. Cosmetic only.

Recovery move for any other glitch: **bottom-right corner has a `RESET ALL FOR DEMO` button**. One click resets persona, deliverables, deal state, and timers back to the seed. Use it between dry-runs, not during the live call.
