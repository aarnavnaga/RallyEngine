# Aaron Langerman pitch — final script (v3, 2026-04-29)

This is the working script for the live pitch + demo. Supersedes
v2. v3 is built on Aaron's verbatim post-call framing — *"high-friction
labor/marketplace problem where AI can improve sourcing, verification,
evaluation, outcome prediction — and where campaign data can become a
moat over time"* — with a v3 deck (8 slides) and a v3 demo that adds
the RL Studio interview-analysis surface, `/admin/verification`, an
`/admin` flywheel strip, VERIFIED + Predicted ROI on every match
card, an AUTOMATED pill on outreach, and day-1 revenue strips on
the three surfaces Aaron lingers on.

## Read first

- **Deck:** 8 slides. Slide 5 (Verification) is new. Slide 6
  (day-1 revenue) is new. Slide 7 (Prove-by-August) replaces the old
  "Q4 ship" framing. Slide 8 is the live demo CTA.
- **Demo:** prod URL `https://musing-maxwell-84ed29.vercel.app`.
  Persona switcher in the sidebar avatar bottom-left toggles
  Aaron-as-admin → Logan-as-creator. RESET pill bottom-right wipes
  state including any AI interview transcripts.
- **Length target:** 12 minutes. ~3 min deck spine, ~30s slide 4,
  60s slide 5, 60s slide 6, 60s slide 7, ~3.5 min live demo,
  ~1 min Q&A. Cushion: skip slide 1 narration entirely if running
  long — Aaron knows us.
- **Source of truth:** every dollar amount and percentage in this
  script is canonical from `frontend/src/lib/data/source-of-truth.ts`.
  Do not improvise numbers on the call.

---

## 0:00–1:00 · Open + thesis (slide 1)

Skip the personal intro. Get to substance.

> "Logan and Aarnav. Twelve minutes. Three things, then the live demo."

Click slide 1. Read the subtitle off the screen, then the Aaron-handoff
quote slowly:

> "**A high-friction labor market. Where AI can compound.** That's
> Aaron's framing from two weeks ago, verbatim: *this is not just
> influencer matching — it's a high-friction labor/marketplace
> problem where AI can improve sourcing, verification, evaluation,
> outcome prediction, and where campaign data becomes a moat over
> time.* We took that as gospel and rebuilt the deck and the demo
> around it. Sourcing. Verification. Evaluation. Outcome prediction.
> Four pillars. One slide each."

**Aaron's likely objection:** *"I said this was a strategic adjacency,
not roadmap-fit."*
**Response:** "We heard that — slide 7 is exactly that ask. Prove four
things by August, you decide if it earns the adjacency."

---

## 1:00–3:00 · Slides 2 + 3 — broken workflow + why now

Click to slide 2. Don't read the cards — narrate the flow left to
right with your finger on the screen.

> "Brand brief becomes a PDF. The PDF gets handed to a marketing
> manager. She opens IG and TikTok DMs. She manually scrolls 40
> profiles, evaluates by eye. Three to five email round-trips per
> creator. Then she signs or passes — with no signal on whether she
> picked right. Every step is human, slow, signal-poor.

> Two stats. **70% of brands say finding the right creators is their
> biggest bottleneck** — that's Aspire's *State of Influencer
> Marketing 2025*. **39% still rely on manual research** — IMH's Q1
> 2025 pulse. This isn't us speculating. This is what brands say
> they're doing today."

Click to slide 3.

> "Three things made this worse in the last six months.

> One: **manual review doesn't scale when content explodes.**
> January this year, YouTube removed 16 channels and erased
> **35 million subscribers and 4.7 billion views** in one
> enforcement cycle. The signal-to-noise problem is structural now.

> Two: **surface signals are getting noisier.** Only **26% of
> consumers prefer AI-generated creator content today, down from
> 60% in 2023** — Billion Dollar Boy's *Muse Two* report,
> November. Views and follower counts no longer separate signal
> from slop.

> Three: **ad costs are climbing.** Meta's Q3 2025 earnings:
> **+10% YoY price-per-ad**, citing 'increased advertiser demand'
> — Susan Li on the call, October. When ads cost more, picking
> the wrong creator hurts more."

**Aaron's likely objection:** *"You're still leading with macro
stats."*
**Response:** "These three are workflow stats — not market-size.
The bottleneck stat *is* the workflow. The AI-content stat *is* the
signal collapse. The CPM stat is your line — you said rising ad-cost
pressure was our best argument."

---

## 3:00–4:30 · Slide 4 — SIGNAL + the moat

Click to slide 4. The eyebrow now reads `SIGNAL.`

> "Industry default pays a flat rate per post. The bench is *how
> many did you ship.* Volume metric. Rewards effort, not outcome.

> Our bench is web-scraped performance signals — engagement
> velocity, completion rate, comment quality, niche fit.
> **Outcome, not effort.**

> The third row is the moat. Industry default: each campaign starts
> cold, no learning. Mercor Creator Domain: campaign outcomes feed
> the predictor. **Predictor delta versus follower-baseline is +18%
> on the last 90 days**, and that gap widens with every campaign."

Anchor stat:

> "**68% of brand-creator contracts now include performance metrics,
> up from 42% in 2023** — Lumanu's $1B+ payouts dataset. Mercor
> already pays experts for outcomes, not hours. We're applying the
> same thing to creators."

**Aaron's likely objection:** *"Predictor delta on what — your seed
data?"*
**Response:** "Honest answer: yes for v1. The 31 outcomes recorded
in the demo are the seed. The slide 7 commitment is to ship the
prediction-vs-actual on 10 finished campaigns by August. If it
doesn't hold, kill it."

---

## 4:30–5:30 · Slide 5 — Verification ladder (NEW)

Click to slide 5. New slide. Read the ladder vertically.

> "Aaron, you raised fraud as a major risk. Here's our answer.
> Four-step ladder.

> One: **handle ownership.** Magic-link signed from the live TikTok
> bio. Stolen handles fail at step one.

> Two: **content fingerprint.** Hash captions of last 30 posts.
> Stolen-content impostors flag immediately.

> Three: **niche claim.** Self-declared niche versus scraped niche.
> Manual review for v1 — we're being honest about that.

> Four: **audience truth.** Sampled audience demographics. Manual
> review for v1.

> The numbers behind the slide: **37.2% of influencer followers
> are fake, ~$4.6B/yr brand waste** (SociaVault 100K-account audit).
> **55% of Instagram influencers have engaged in fraudulent
> activity** (HypeAuditor). The FTC's max civil penalty per fake
> review is **$53,088** under the Final Rule. The cost of skipping
> verification is real money for the brand and real exposure for
> the platform."

**Aaron's likely objection:** *"Steps 3 and 4 are 'manual review for
v1' — that's not a moat."*
**Response:** "Correct. v1 is 2-of-4 enforceable, 4-of-4 by August.
We'd rather under-promise than ship a fraud claim we can't back.
You'll see this exact honesty surfaced in the live demo on
`/admin/verification` — every row labeled with what's automated
and what's still human."

---

## 5:30–6:30 · Slide 6 — Day-1 revenue (NEW)

Click to slide 6. Land on the Logan × Celsius signed-deal block.

> "You asked how we get paid. **Headhunter model.**

> Logan and Celsius signed in our demo seed. Base contract $850.
> **20% placement fee on close — that's $170 in our pocket the
> moment the contract signs.** Plus **a 5% per-post performance
> kicker**, which is $0 to $50 per post depending on view-bonus
> hits — that's the Lumanu pattern.

> Then the third revenue line — **per-task RL data licensing.** The
> rubric pairs we collect when the brand grades the creator
> become RL training data. Mercor RL Studio sells that. We share.

> Read the headline verbatim — it's the canonical line we use on
> every revenue surface in the demo:

> **Logan × Celsius signed: $170 placement + $0–$50 perf kicker +
> per-task RL revenue when this becomes a Mercor world.**"

**Aaron's likely objection:** *"$170 a deal doesn't compound to
real revenue."*
**Response:** "60 deals a month, $850 average, 20%, 12 months —
that's **$1.22M ARR** at steady state. The unit math is on the
growth-team slide. The placement fee is the floor, not the ceiling.
The RL licensing line is where this gets interesting."

---

## 6:30–7:30 · Slide 7 — Prove-by-August (replaces old slide 6)

Click to slide 7. This is the ask now. No "Q4 ship" framing.

> "Four falsifiable things we'd prove by August.

> **One: workflow pain is real.** Ten brand interviews, logged
> hours, named pain points. Direct quotes you can put in front of
> Mercor's growth leadership.

> **Two: verification works.** 1,000 creators screened. Stop-rate
> by step. We tell you exactly what % fail at handle vs.
> fingerprint vs. niche.

> **Three: quality scoring beats baseline.** Our score versus
> follower-count on five brands' actual outcomes. If we don't beat
> follower-count, we kill it.

> **Four: outcome prediction holds.** Predicted ROI versus actual
> ROI on ten finished campaigns. Calibration plot, no hand-waving.

> **4 of 4 lands → strategic adjacency. 2 of 4 → kill it.** Paid
> like a headhunter, placement on signed deals, in either case."

The three questions for Aaron go at the bottom of the slide:

> "Three questions we want answers to today:
> One — **where does Creator Experts live inside Mercor?**
> Two — **hourly pricing, or per-post with a relevant-eyes bonus?**
> Three — **who closes brand deals — Mercor's GTM, or us during the
> pilot?**"

Don't push for answers — these set the agenda for the demo.

**Aaron's likely objection:** *"Two of those are pricing decisions
I can't make alone."*
**Response:** "Understood — we're flagging them so you know what
we'd unblock with on the next conversation, not asking you to
decide today."

---

## 7:30–11:00 · Slide 8 → live demo

Click slide 8.

> "The demo's the rest of the pitch. Three minutes."

Click into the live URL.

### 7:30–8:00 · `/admin` overview (flywheel strip)

URL: `/admin`. Land on the dashboard. Point at the top three tiles.

> "Three tiles. **Campaigns run: 47** — every one feeds the model.
> **Outcomes recorded: 31** — predictor delta vs follower-baseline
> +18%, last 90 days. **RL tasks graded: 312** — expert-rated
> rubric pairs licensed to AI labs. That's the moat row from slide
> 4 in motion."

Point at the pipeline footer at the bottom.

> "**Source → Verify → Match → Outreach → Evaluate → ROI.** Five
> nodes. The whole product is one workflow."

**Aaron's likely objection:** *"47 campaigns is seed data."*
**Response:** "Yes — slide 7, point four. By August it's real."

### 8:00–9:00 · `/admin/match` — BEFORE/AFTER + VERIFIED + Predicted ROI

URL: `/admin/match` with Celsius pre-selected. Click the
**BEFORE** toggle at the top.

> "This is what brands do today. Cluttered DM inbox. Spreadsheet
> with 50 creators, no quality column. IG profile being manually
> scrolled. Every step is human, slow, signal-poor — exactly the
> 5-step flow on slide 2."

Click back to **AFTER**.

> "This is the same workbench, post-Mercor. Logan pinned #1 for
> Celsius. 22.7K real TikTok account, 0.71 cosine similarity.
> Look at the row."

Point at the **VERIFIED** badge on Logan's row.

> "**VERIFIED ladder, all four green.** Click it."

Click VERIFIED. The 4-step ladder pops with Logan's actual pass
states.

> "Handle, fingerprint, niche, audience — all green. Some other
> creators in the bench have one step amber. Niche-claim drift
> over 30%. We surface that, not hide it."

Point at the **Predicted ROI** mini-stat.

> "**Predicted: 110–180K views, 3.2–5.1× ROAS.** Backed by the
> same impact-score math, not a separate model. Calibration is
> what slide 7 commits to proving."

Point at the day-1 revenue strip on the contract preview.

> "**Logan × Celsius signed: $170 placement + $0–$50 perf kicker +
> per-task RL revenue when this becomes a Mercor world.** Same
> headline on every surface."

### 9:00–10:00 · `/admin/interviews/loganmann32` — RL Studio emulation

Click into Logan's row → **Interview** tab, or navigate directly
to `/admin/interviews/loganmann32`.

> "This is the new surface. **RL Studio emulation.** This page
> is the creator's Mercor interview transcript graded as if it
> were a Mercor RL task. Three-pane IA — **Project / World / Task**
> on the left, transcript center, rubric right. Same shape as
> `studio.mercor.com`."

Point at the role toggle.

> "**Writer / Reviewer.** Reviewer is default — that's Aaron's
> view. Writer mode is what a Mercor RL contractor would see."

Point at the pairwise A/B block.

> "**Pairwise A/B.** Two candidate responses to the same interview
> question. 1–5 winner radio, 1–7 Likert sliders, free-text
> *improvement areas*. **This is RLHF.** Every brand-creator deal
> generates one of these. That's the per-task RL revenue line on
> slide 6."

**Aaron's likely objection:** *"Mercor doesn't sell RL data through
brand campaigns."*
**Response:** "Today. The thesis is that *creator-quality RLHF for
brand outcomes* is a market Mercor doesn't have a comp for. Slide 7
proof point three is exactly this — does our score beat
follower-count baseline. If yes, the data is worth licensing."

### 10:00–10:45 · `/admin/outreach` — AUTOMATED pill

Click **Outreach** in the rail. URL: `/admin/outreach`.

> "**47 of 50 outreach drafts sent without edits.** That counter
> at the top is live."

Point at an **AUTOMATED** pill on a thread.

> "Every thread the system sent untouched gets the AUTOMATED pill.
> The 3 that needed human edits don't. You said automated outreach
> made sense as part of the workflow — this is what *operationally
> real* looks like."

Click into the Logan × Celsius thread. Point at the contract
preview revenue strip.

> "**Placement fee on close: $170. Per-post performance kicker:
> $0–$50.** Same numbers, every surface."

### 10:45–11:00 · Persona switch (cushion — skip if tight)

Click the avatar bottom-left → switch to creator (Logan).

> "Same product, creator side. Logan applies via the standard
> Mercor stepper. Same rubric. Expert-first flow — except the
> output medium is a TikTok, not a Python file."

---

## 11:00–12:00 · Close + ask

Switch back to admin. Land slide 7's three questions one more
time, looking at Aaron not the screen.

> "Three questions. Where Creator Experts lives. Pricing model.
> Who closes brand deals. Whichever order is easiest for you."

Stop. Wait for the answer. Don't fill the silence.

If Aaron pushes back on roadmap fit specifically:

> "We took your *strategic adjacency* line literally. Slide 7 is
> the proof gate, not a roadmap claim. If 4 of 4 land by August,
> we earn the conversation about where this lives. If 2 of 4 land,
> we kill it ourselves and the question is moot."

If Aaron pushes on RL licensing as a revenue line:

> "Honest framing: line three on slide 6 is illustrative. The
> placement fee is the floor and it stands alone — $1.22M ARR at
> 60 deals/month. The RL line is the upside if the data we collect
> is worth what Mercor RL Studio already sells per task. We'd
> rather flag it as a roadmap bet than bury it."

If Aaron asks who closes brand deals:

> "Hardest part of the marketplace and we know it. Three signed
> LOIs is proof we can ship the brand side. Honest answer:
> Mercor's GTM is more effective than us at scale. That's why
> question three is on the slide."

---

## Demo failsafe checklist (read before walking in)

- [ ] Hard refresh `/admin/match` once before starting. Logan row
  pre-expanded via `?focus=loganmann32`.
- [ ] Confirm the **VERIFIED** badge renders on Logan's row.
- [ ] Confirm the **BEFORE/AFTER** toggle at the top of `/admin/match`.
- [ ] Confirm the day-1 revenue strip on the contract preview reads
  the verbatim headline from `source-of-truth.ts`.
- [ ] Confirm `/admin/verification` queue page loads.
- [ ] Confirm `/admin/interviews/loganmann32` loads with three-pane
  IA, role toggle (Reviewer default), and pairwise A/B block.
- [ ] Confirm `/admin/outreach` shows the 47/50 counter and at least
  one AUTOMATED pill.
- [ ] Confirm `/admin` shows the 3-tile flywheel strip and the
  5-node pipeline footer.
- [ ] Confirm persona switcher works in both directions.
- [ ] Confirm RESET pill bottom-right wipes state.
- [ ] If Wi-Fi flakes, the deck is at
  `~/Downloads/Mercor-Creators-Domain.pptx` and runs offline.
- [ ] Mobile sizing verified at 375px and 768px — hand Aaron the
  live URL if he asks.

---

## Why slide 5 lives where it lives

Inserted between *SIGNAL* (slide 4) and *day-1 revenue* (slide 6).
The narrative beat is "here's the moat → here's how we keep the
moat clean → here's how we get paid for it." Slide 5 closes Aaron's
fraud objection on the spot. Putting it *before* slide 6 means by
the time Aaron sees the headhunter math, he already trusts the
signal those dollars are paying for.
