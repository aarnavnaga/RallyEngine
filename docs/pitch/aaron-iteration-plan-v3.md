# Aaron iteration plan — v3 (post-meeting, 2026-04-29)

Source: Aaron Langerman feedback, parts 1+2 (verbatim, treated as gospel).
This plan rewrites the deck and the demo to address every challenge he
raised and amplify every belief he stated. Each change cites the
specific Aaron quote that drove it.

> **TL;DR.** Three things drive everything else.
> 1. **Prove the workflow pain is real.** *"Are brands really sourcing
>    creators in a highly manual way? What are they actually doing today?
>    Where exactly is the friction?"*
> 2. **Solve fraud / verification.** *"How do you know a creator is who
>    they claim to be?"*
> 3. **Adopt the framing he handed us, verbatim.** *"This is not just
>    'influencer matching'. It is a high-friction labor/marketplace
>    problem where AI can improve sourcing, verification, evaluation,
>    outcome prediction — and where campaign data can become a moat
>    over time."*
>
> Everything below is in service of one or more of those three.

---

## A. The new thesis statement (use everywhere)

Replace every prior framing of "Creator Experts as a Domain row" /
"creator-brand matching marketplace" / "influencer matching" with the
single statement Aaron handed us. Verbatim:

> *"This is not just influencer matching. It is a high-friction
> labor/marketplace problem where AI can improve sourcing, verification,
> evaluation, outcome prediction — and where campaign data can become
> a moat over time."*

Surfaces to update with this exact framing:
- Deck slide 1 subtitle (currently: *"A new Expert Domain for Mercor"*)
- `README.md` opener
- `docs/pitch/README.md` opener
- The first 30 seconds of the call script (slide 1 narration)
- The hover/intro tooltip in the live demo's `/admin` overview header

This reframing alone is the highest-leverage change. It costs nothing
and addresses Aaron's clearest single push.

---

## B. Deck rewrite — slide-by-slide

The current deck is 7 slides. After the rewrite it will still be 7
slides, but slides 2, 4 (renumbered), 5, and 6 are new or substantially
changed. Slide 1 keeps its layout; slide 7 (live demo CTA) is
unchanged.

### Slide 1 — Cover (unchanged layout, new subtitle)

| | Before | After |
|---|---|---|
| Subtitle | "A new Expert Domain for Mercor." | "A high-friction labor market. Where AI can compound." |
| Footer | "Build over the summer. Ship at the start of Q4." | "Sourcing. Verification. Evaluation. Outcome prediction." (Aaron's four areas, verbatim.) |

**Driving Aaron quote:** *"this is not just 'influencer matching' / it
is a high-friction labor/marketplace problem"*

---

### Slide 2 — REPLACE: "How brands find creators today"

**This is the biggest change in the deck.** Slide 2 currently shows
$480B / 20-30 hours / 63% — three numbers. Aaron explicitly told us to
cut this:

> *"Reduce abstract market-size language unless tied to the actual
> problem. Don't rely too much on vanity stats like broad creator
> economy numbers."*

Replacement: a visual of the broken current workflow. His exact ask
was *"Make the pitch visually obvious: show the broken current
workflow."* Format: a 5-step horizontal flow with friction-points called
out at each step. Distinct visual — no other slide in the deck uses a
horizontal flow.

```
   Brand brief        DM agents        Manual scroll       Email volley       Sign or pass
   (PDF)         →    + agencies   →   IG/TikTok       →   (3-5 days)     →   (no signal
                      (gatekeepers)    (vibes-only)        per creator         on success)
   ────────────       ────────────     ────────────         ────────────       ────────────
   2 days             1-2 weeks        20-30 hours          50% no-reply       0% feedback
   to write           to bookings      per campaign         rate                loop
```

Bottom of slide: *"This is the workflow today. Every step is human, slow,
and signal-poor."*

Each "X hours" / "Y%" gets a footnoted source. We'll fill these from
the cold outreach research described in section F. Until we have those
quotes, we use the HypeAuditor 20-30 hours figure (already in our deck)
+ industry benchmarks.

**Driving Aaron quotes:**
- *"How do brands find creators today? How manual is it really? Where
  does the process break?"*
- *"Show the actual difficulty of finding the right creator for a brand."*
- *"Make the product feel operationally real, not just a category idea."*

---

### Slide 3 — KEEP frame, RESTRUCTURE bullets

Keep the *"Why this. Why now."* eyebrow + the numbered-list visual
format. Replace the three bullets:

| | Before | After |
|---|---|---|
| 01 | Handshake AI is going for the college funnel. | **The workflow above is breaking under AI volume.** *"Manual review doesn't scale when content volume explodes."* |
| 02 | A growing need for creative data. | **Surface signals are getting noisier.** Views and follower counts no longer separate signal from slop. |
| 03 | Meta CPMs jumped 20%. | **Ad costs are climbing — wasted creator spend hurts more than ever.** Brands face pressure to choose right and avoid wasted spend. |

**Driving Aaron quotes:**
- *"Emphasize why AI is necessary: not as buzzword dressing, but
  because manual review doesn't scale when content volume explodes."*
- *"Don't rely too much on vanity stats like broad creator economy
  numbers."*
- *"Tighten the story so the thesis is: manual matching is getting
  harder, surface-level creator metrics are becoming noisier, AI-enabled
  analysis can identify better creators and outcomes at scale."*
- *"His reasoning was that as advertising gets more expensive, brands
  face more pressure to: choose the right creators / avoid wasted
  spend / get higher certainty on campaign ROI."*

---

### Slide 4 — KEEP "Pay for Proof" but PROMOTE its central role

Slide 4 already lands a beat Aaron explicitly liked:

> *"He found the idea compelling that the market is getting harder
> because AI-generated/slop content is increasing noise, which makes
> old signals less useful."*

Keep the comparison ledger. Two changes:
1. Re-title the slide eyebrow from `PAY FOR PROOF.` to **`SIGNAL.`** —
   sharper, matches Aaron's word ("signal work"). The pay framing
   stays in the body.
2. Add a third row to the ledger: `THE MOAT` →
   *Industry default:* "None. Each campaign starts cold."
   *Mercor Creator Domain:* "Campaign outcomes feed the model.
   Predictions get sharper every cycle."

**Driving Aaron quotes:**
- *"Some of the signal work you mentioned was 'the type of stuff' that
  was genuinely interesting."*
- *"The stronger long-term opportunity is building a system that gets
  compoundingly better at predicting which creators fit which brands,
  which creator/content combinations drive real campaign success."*
- *"Be sharper on the long-term moat: not just access to creators, but
  better predictive matching from accumulated campaign data."*

---

### Slide 5 — NEW: "Verification"

This slide does not exist today. Aaron raised fraud as one of the two
biggest product risks:

> *"He raised fraud / marketplace integrity as a major risk: people
> may misrepresent themselves; creators may claim categories they do
> not actually belong to; that undermines trust in the platform."*

> *"Show anti-fraud logic: how do you know a creator is who they claim
> to be?"*

New slide format: 4-stage verification ladder (vertical), distinct
from any existing layout in the deck.

```
01  HANDLE OWNERSHIP        Magic-link signed from the live TikTok bio.
                            Stolen handles fail at step 1.

02  CONTENT FINGERPRINT     Last 30 posts hashed. Stolen-content
                            impostors flag immediately.

03  NICHE CLAIM             Self-declared niche vs. scraped niche.
                            "Fitness creator" + 3 fitness posts in
                            30 = rejected.

04  AUDIENCE TRUTH          Declared audience demographics vs.
                            inferred audience from comment-language
                            modeling.
```

Bottom strip: *"A creator who passes all four enters the bench. Anyone
who fails any step never reaches a brand."*

**Driving Aaron quotes:**
- All three quotes above + *"the platform must actually inspect their
  content/profile and validate claims."*

---

### Slide 6 — REWRITE: "What we'd prove by August"

Aaron's exact framing for the next pitch:

> *"If pitching internally again, come with a more concrete narrative
> of: problem / why now / why Mercor / what proof by August would
> justify a handoff."*

He also said:

> *"Position this as a potentially longer-term strategic adjacency
> for Mercor, rather than assuming it belongs on the immediate
> roadmap."*

The current slide 6 has the Summer + Q4 timeline + 3 questions for
Aaron. Rewrite it to lead with **proof points by August** as the ask,
not domain-row commitment. This drops the "Q4 ship" pressure (which
Aaron said is unlikely given Mercor's RL-data + enterprise-agent
focus) and replaces it with four falsifiable proof points.

```
WHAT WE'D PROVE BY AUGUST

01  Workflow pain is real.       10 brand interviews. Logged hours, named pain points.
02  Verification works.          1,000 creators screened. Stop-rate by step.
03  Quality scoring beats baseline.  Our score vs. follower-count baseline on 5 brands.
04  Outcome prediction holds up. Predicted ROI vs. actual ROI on 10 finished campaigns.
```

Bottom: *"If 4 of 4 land, this becomes a strategic adjacency. If 2 of
4 land, we kill it."*

**Driving Aaron quotes:**
- *"He was candid that this would be hard to get onto Mercor's
  roadmap this year."*
- *"His message was more: interesting opportunity, maybe strategically
  adjacent, but not aligned with the company's immediate focus right
  now."*
- *"Position this as a potentially longer-term strategic adjacency."*
- *"What proof by August would justify a handoff."*

---

### Slide 7 — Live demo CTA (unchanged)

Aaron *liked* the concrete demo and the specific examples. Keep this
slide as-is.

> *"He responded positively to specific, concrete metrics and examples
> rather than abstract claims."*

---

## C. Demo rewrite — route-by-route

Aaron's strongest single demo critique:

> *"Make the pitch visually obvious: show the broken current workflow
> / show why AI content explosion makes it worse / show why your
> system fixes that."*

Every change below is in service of that, plus the verification and
moat asks.

### C1 — `/admin/match` (the demo's centerpiece)

Currently shows: brand panel left, ranked creators with the BENCH
performance panel on row-expand.

**Add:**

1. **`BEFORE → AFTER` toggle** at the top of the page.
   - `BEFORE` mode renders a static screenshot/mockup of "what brands
     do today": an inbox cluttered with unread DMs, a spreadsheet with
     50 creators and no quality column, an open IG profile being
     manually scrolled. Caption: *"This is what UGC sourcing looks
     like today. 20-30 hours per campaign."*
   - `AFTER` mode is the existing match workbench.
   - Toggle defaults to `AFTER`. During the demo we click `BEFORE`
     once to land slide 2's broken-workflow beat in the live UI, then
     flip back.

2. **`VERIFIED` badge** on every creator card. Hover/click reveals the
   four-step verification ladder from slide 5 with that creator's
   actual pass states. Logan = all four green. Some seed creators get
   one step amber to make the system feel real ("niche claim:
   self-declared 'lifestyle' but 78% of last-30 posts code as
   'fitness'").

3. **`PREDICTED ROI` mini-stat** added to each creator row — one-line
   prediction: *"Predicted: 110-180K views · 3.2-5.1× ROAS"*. Backed
   by `computeImpact` so it stays consistent with the existing math.

4. **Niche-claim verification** on the expanded panel — a small block
   between the BENCH and the RAG citations. Two columns:
   - "Self-declared: college + STEM + gym-aesthetic"
   - "Scraped reality: 87% UCSB-tagged · 71% gym/study split · 0
     out-of-niche posts in last 30."
   With a green check if they match, amber if drift > 30%.

### C2 — `/admin` overview

Aaron called out the moat thesis explicitly:

> *"Where campaign data can become a moat over time."*

Add a top-bar stat strip showing the compounding-data flywheel:

```
CAMPAIGNS RUN          OUTCOMES RECORDED       MODEL DELTA vs BASELINE
47                     31                      +18% (last 90 days)
```

Hover tooltip: *"Each campaign feeds the predictor. Better predictions
→ better matches → better campaigns. Compounds with usage."*

### C3 — `/admin/outreach`

Aaron explicitly liked this one:

> *"Automated outreach made sense to him as part of the workflow."*

No structural changes — keep what's there. Add one badge: a small
"AUTOMATED" pill on each thread that was sent without human touch,
plus a counter at the top: "47 of 50 outreach drafts sent without
edits." Reinforces the "operationally real" point without changing
behavior.

### C4 — NEW: `/admin/verification` page

A dedicated route that the demo visits for ~30 seconds. Lists the last
N creators who attempted onboarding, their pass/fail status by step,
and the rejection reason. Looks like a moderation queue.

Example rows:
- `@gymninja99` — passed all 4. ENTERED BENCH.
- `@fitnessguy_22` — failed step 2 (content fingerprint matched 6
  posts to `@bigsamuelfit`). REJECTED.
- `@studystacker` — failed step 3 (declared "fitness", scraped niche
  is "study + ASMR"). HELD FOR REVIEW.

Aaron's exact quote driving this page: *"the platform must actually
inspect their content/profile and validate claims."*

### C5 — Existing pages (unchanged unless they conflict)

`/home`, `/explore`, `/jobs/apply/[id]`, `/profile`, `/earnings`,
`/referrals` — keep. The pitch is a Aaron-as-admin story. Creator-
side surfaces stay as backdrop.

---

## D. Script rewrite

The new script is built on Aaron's exact narrative spine:

> *"Problem / why now / why Mercor / what proof by August would
> justify a handoff."*

Beat allocation for the 12-minute call:

| Time | Beat | Slide / Demo |
|---|---|---|
| 0:00–0:30 | The thesis statement (verbatim Aaron quote) | Slide 1 |
| 0:30–1:30 | **Problem.** The broken workflow. | Slide 2 |
| 1:30–2:30 | **Why now.** Manual review breaks under AI volume; surface signals are noisy; ad costs climbing. | Slide 3 |
| 2:30–3:30 | **Signal.** Pay-for-proof + the moat row. | Slide 4 |
| 3:30–4:30 | **Verification.** How we know a creator is who they say they are. | Slide 5 |
| 4:30–5:00 | **What we'd prove by August.** | Slide 6 |
| 5:00–11:00 | **Demo.** | Demo |
| 11:00–12:00 | Q&A. | — |

Demo beat order during the 6-minute walkthrough:
1. Land on `/admin/match`. Click `BEFORE` toggle. Land slide 2 in
   motion. Click back to `AFTER`. (45 sec)
2. Logan as #1. Click the `VERIFIED` badge — show the 4-step ladder.
   (60 sec — solves the fraud question on the spot.)
3. Expand row → BENCH panel + niche-claim verification. (60 sec)
4. Predicted ROI mini-stat. (30 sec)
5. Cited posts + RAG. (45 sec)
6. Generate outreach → land on `/admin/outreach`. Show the
   "47 of 50 sent without edits" counter. (60 sec)
7. `/admin/verification` queue — show two rejected creators. (45 sec)
8. Back to `/admin` overview — model-delta stat. (30 sec)
9. Persona switch → creator side. (45 sec)

Pull-out quote to memorize and use at slide 1 + close:

> *"This is not just influencer matching. It is a high-friction labor
> market where AI can improve sourcing, verification, evaluation, and
> outcome prediction — and where campaign data becomes a moat over
> time."*

(Word-for-word Aaron, with the only change being "improve" instead of
"can improve" for cadence.)

---

## E. What Aaron LIKED — protect and amplify

These are the nine things Aaron explicitly responded positively to.
Every one of them must stay visible — and four get amplified.

| # | Aaron quote | Where it lives now | What we do |
|---|---|---|---|
| 1 | *"Not just a creator directory, but a workflow + matching system."* | Implicit across demo | **Amplify.** Add a "FULL PIPELINE" footer strip on `/admin` that visualizes sourcing → verification → match → outreach → ROI as 5 connected nodes. |
| 2 | *"AI-generated/slop content is increasing noise, which makes old signals less useful."* | BENCH panel + slide 4 | Keep + already core. |
| 3 | *"Building systems that evaluate quality and predict ROI over time."* | Slide 4, Predicted ROI | **Amplify.** New `THE MOAT` row on slide 4 + model-delta stat on `/admin`. |
| 4 | *"Specific, concrete metrics and examples rather than abstract claims."* | Demo | Keep. The whole point of cutting Three Numbers (slide 2) is to lean harder into this. |
| 5 | *"Some of the signal work you mentioned was 'the type of stuff' that was genuinely interesting."* | BENCH panel | **Amplify.** Re-title slide 4 eyebrow to `SIGNAL.` + lead the demo with the BENCH panel earlier. |
| 6 | *"Headhunter / placement / success fee."* | Not currently surfaced | **Add.** One-line caption on slide 6: *"We get paid like a headhunter — placement / success fee on signed deals."* |
| 7 | *"Searching across creators under relevant hashtags or niches made sense, especially when there is no direct in-network match."* | Implicit in match results | **Amplify.** Add a small banner above the ranked list: *"Out-of-network discovery via #hashtag co-occurrence: 12 candidates pulled."* with a counter that ticks up when no in-network match exists. |
| 8 | *"Automated outreach made sense to him as part of the workflow."* | `/admin/outreach` | Keep + add the "47 of 50 without edits" counter. |
| 9 | *"Rising ad-cost pressure is one of your best arguments."* | Slide 3 point 3 | Keep — promote to point 1. |

---

## F. Open work / data we don't have yet

Aaron asked for things we haven't built or researched. These are
prerequisites for the next pitch.

### F1 — Customer research (HIGH priority)

Aaron's exact ask:

> *"Get specific customer research on how brands currently source and
> evaluate creators."*

> *"Validate current brand workflow: how do brands find creators
> today? how manual is it really? where does the process break?"*

Plan:
- Cold-email 8 UGC marketing managers / influencer-marketing
  agencies. Subject: *"5-minute call: how you source UGC creators
  today."*
- Target a Friday deadline for 3 callbacks.
- Use the quotes verbatim on slide 2 (broken workflow). E.g.
  *"'I have 4 spreadsheets and zero idea which one is current.'
  — Brand manager, mid-market DTC, 2026."*

Until those quotes land, slide 2 leans on the HypeAuditor 20-30 hours
stat we already have.

### F2 — Outcome data for the moat slide (MEDIUM priority)

Aaron's exact ask:

> *"Better predictive matching from accumulated campaign data."*

We have ~$25K driven across ~10 campaigns. For each, we should record:
- Predicted views vs. actual.
- Predicted engagement vs. actual.
- Predicted conversion vs. actual.

This becomes the `MODEL DELTA vs BASELINE` stat on `/admin` and the
`Outcome prediction holds up` proof point on slide 6.

### F3 — Verification implementation (HIGH priority for demo)

Slide 5 + the `VERIFIED` badge + the `/admin/verification` page need
*something* behind them. Minimum-credible build:
- Step 1 (handle ownership): a dummy "magic-link from TikTok bio"
  flow. We already have the creator stepper, so this is a single
  field.
- Step 2 (content fingerprint): hash the captions of last-30 posts;
  flag if any 5+ exact matches across two creators.
- Step 3 (niche claim): the existing niche-tag computation on
  Creator records — surface it as a verification gate.
- Step 4 (audience truth): we don't have audience demographics. Punt
  to "manual review for v1."

3 of 4 enforceable now. That's enough for a credible slide.

---

## G. Sequencing — build order

Highest leverage / lowest cost first. Estimates assume one engineer
on the demo and one on the deck working in parallel.

| # | Change | Surface | Effort | Aaron-impact |
|---|---|---|---|---|
| 1 | Reframe thesis statement (Section A) | Deck + READMEs + script + `/admin` header | 1h | Highest. Touches every surface for free. |
| 2 | Slide 6 rewrite ("Prove by August") | Deck | 1h | Highest. Directly addresses roadmap-fit pushback. |
| 3 | Slide 4 — add `THE MOAT` row + retitle to `SIGNAL.` | Deck | 30m | High. Amplifies what he liked. |
| 4 | `/admin` overview model-delta stat strip | Demo | 1h | High. Makes the moat visible. |
| 5 | Slide 5 NEW — Verification ladder | Deck | 1.5h | High. Closes the fraud-risk push. |
| 6 | `/admin/match` `VERIFIED` badge + 4-step ladder hover | Demo | 3h | High. Verification in motion. |
| 7 | Slide 2 REPLACE — broken workflow flow | Deck | 2h | Highest. His #1 ask. (Blocks on F1 quotes for full credibility, ships earlier with the HypeAuditor stat.) |
| 8 | `/admin/match` `BEFORE → AFTER` toggle | Demo | 2h | Highest. Lands slide 2 in motion. |
| 9 | Slide 3 — restructure bullets | Deck | 30m | Medium. Tightens "why now". |
| 10 | `PREDICTED ROI` mini-stat on creator rows | Demo | 1.5h | Medium. Surfaces the ROI prediction half. |
| 11 | `/admin/verification` queue page | Demo | 3h | Medium. Reinforces verification across the app. |
| 12 | `/admin/outreach` "47 of 50 without edits" counter | Demo | 30m | Low. Cheap reinforcement. |
| 13 | Niche-claim verification block on expanded panel | Demo | 1.5h | Medium. Anti-fraud at the row level. |
| 14 | `/admin` "FULL PIPELINE" footer strip | Demo | 1h | Medium. Makes "workflow + matching system" visible. |
| 15 | Out-of-network discovery banner | Demo | 1h | Medium. Reinforces a thing he liked. |
| 16 | Headhunter / success-fee caption on slide 6 | Deck | 5m | Low. Aligns to his mental model. |
| 17 | Script rewrite + memorize the verbatim quote | Script | 1h | Required. Locks in the new beats. |

Total deck rewrite: ~6 hours of direct work.
Total demo rewrite: ~14 hours.
Customer research (F1): blocks on outbound responses, not engineering.

---

## H. What gets cut or removed

Aaron told us — directly or by implication — to cut these. Listing them
explicitly so we don't quietly leave them in.

| Item | Where it lives now | Why cut |
|---|---|---|
| `$480B creator economy by 2027` (Goldman) | Slide 2 stat 1 | *"Don't rely too much on vanity stats like broad creator economy numbers."* |
| `63% of brands prefer sustained collaboration` (Net Influencer) | Slide 2 stat 3 | Same — broad creator-economy framing. |
| `Handshake AI college funnel` | Slide 3 point 1 | Tangential to the workflow / signal thesis. |
| `Need for creative data` | Slide 3 point 2 | Abstract; not tied to the workflow pain. |
| `Build over the summer. Ship at Q4.` framing | Slide 1 footer + slide 6 | Aaron explicitly said roadmap fit is unlikely this year. Replace with the proof-points framing. |
| The phrase "Creator Experts" in body text (only) | Throughout | Not killed — it's still the project name and the slide-1 H1. But every body-text mention of *"Creator Experts as a Domain row"* gets replaced with the new thesis statement. |
| `21–33% AI slop` and `26% AI creator content` chips on slide 4 | Already cut in v2 of the deck. | Keep cut. |

---

## I. Verification cascade for v3

Run after each batch of changes lands:

1. `pnpm typecheck` + `pnpm lint` clean (post-write hooks already enforce).
2. `pnpm test:e2e` — Playwright spec stays green.
3. `code-reviewer` agent on the diff.
4. `typescript-reviewer` agent on any changed `.tsx`.
5. `security-reviewer` agent — fraud/verification logic touches input
   validation; this is non-optional.
6. **Adversarial third-opinion** on the slide 2 + slide 6 rewrites
   specifically. Aaron's pushback was substantive enough that we want
   an independent reader to confirm we actually addressed it.
7. Visual-verify: PDF export of every changed deck slide; Playwright
   screenshot of every changed demo route.

---

## J. What this plan does NOT do

To be honest about scope:

- **No new platform integrations.** The verification-step-1 magic-link
  flow is mocked, not wired to a real TikTok auth.
- **No real predictive model.** "Model delta vs. baseline" is computed
  from the existing impact-score math. The story (campaign data
  compounds → predictions sharpen) is a *roadmap claim*, not a built
  feature. We say so on slide 6 ("by August").
- **No real fraud detection.** Step-2 content-fingerprint is a
  caption-hash check, not full media-fingerprint. We're honest in the
  slide deck about what's MVP.
- **No customer interviews yet.** Slide 2 stays on the HypeAuditor
  baseline until F1 lands.

These are deliberate scope cuts. Aaron's ask was to *make it
operationally real*, not to *finish building a year-long roadmap*.
The plan ships a credible v3 in roughly two engineering days.

---

## K. Pre-execution checklist

Before kicking off any of the build work above, confirm:

- [ ] User signs off on this plan as written.
- [ ] User confirms: cut Slide 2 numbers and replace with broken
      workflow (HIGHEST risk: this is the loudest content change).
- [ ] User confirms: shift slide 6 ask from "ship Q4" to "prove 4
      points by August" (changes the close).
- [ ] User confirms: add a NEW slide 5 (Verification) — deck goes from
      7 → 8 slides (or we cut slide 7 demo CTA and stay at 7; user
      to choose).
- [ ] User decides whether to clean up the stale-versions files
      (already staged — see prior turn). Recommend: yes, push that
      cleanup as its own commit before starting v3.

Once all five are checked, sequence per Section G.
