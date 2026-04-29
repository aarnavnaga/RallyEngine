# Aaron Langerman pitch — final script (v2, 2026-04-29)

This is the working script for the live pitch + demo. Supersedes
`aaron-call-final.md`. The notable change in v2 is **slide 4 of the deck
(`PAY FOR PROOF.`) and the matching `LIVE PERFORMANCE BENCH` panel on
`/admin/match`** — both call out the deslopification differentiator that
Logan flagged as one of the biggest adds we should highlight.

## Read first

- **Deck:** 7 slides, `Mercor-Creators-Domain (1).pptx`. The new slide 4 is
  formatted differently from every other slide on purpose (comparison
  ledger, not stat cards or numbered list) so the pay-for-proof beat has
  its own visual rhythm.
- **Demo:** prod URL is `https://musing-maxwell-84ed29.vercel.app`. Persona
  switcher in the sidebar avatar bottom-left toggles Aaron-as-admin →
  Logan-as-creator. Reset pill in the bottom-right wipes the demo state
  including any AI interview transcripts.
- **Length target:** 12 minutes total. 4 min deck, 6 min demo, 2 min Q&A.
  Cushion: skip slide 7 narration if running long.

---

## Slide 1 · Title (10s)

> "Logan and Aarnav. We're proposing **Creator Experts** — a new Expert
> Domain for Mercor. Built over the summer, ships at the start of Q4. The
> three numbers, the why-now, the moat, the traction, the plan, then the
> live demo. Twelve minutes."

Skip the personal intro — Aaron knows us. Get to substance.

---

## Slide 2 · Three numbers (45s)

Three external signals all pointing the same way. Don't read each card —
land the through-line:

> "$480B creator economy by 2027. **Twenty to thirty hours** for companies
> to find creators per campaign. **63%** of brands now want sustained,
> quality collaboration — not one-off spam. The market is loud, the
> sourcing is broken, and the demand is for *fewer better creators*."

Cite Goldman Sachs / HypeAuditor / The Net Influencer if Aaron leans in.

---

## Slide 3 · Why this. Why now. (45s)

> "Three things changed in the last six months. (1) Handshake AI is hunting
> the college funnel — **18 million students priced as cheap RLHF labor.**
> (2) Brands now need creative data — they want to train models on what
> good UGC looks like. (3) Meta CPMs jumped 20% — brands are paying more
> than ever to reach an audience the algorithm is making harder to reach."

Pause. Then transition: *"That last point matters because it sets up our
moat."*

---

## Slide 4 · **PAY FOR PROOF.** (90s — NEW)

> "One of our biggest adds is what we're paying creators *for*."

Set up the contrast:

> "Industry default — and we know this because we've been the creator on
> these deals — pays a flat rate per post. The bench is **'how many did
> you ship?'** It's a volume metric. It rewards effort, not outcome. And
> it's exactly what's flooding YouTube and TikTok with AI slop right now
> — Kapwing puts that at **21 to 33% of YouTube's feed**, and YouTube
> just nuked 16 channels with 4.7 billion views in their January
> enforcement wave."

> "Our bench is **web-scraped performance signals** — refreshed per cycle.
> Engagement velocity. Completion rate. Comment quality. Niche fit. The
> payout is performance multiplier × audience-fit. **Outcome, not effort.**"

Close the slide:

> "78% of brands now prefer this model — up from 52% in 2023. Performance
> pricing is no longer the contrarian view. Mercor already pays *experts*
> for outcomes, not hours. We just want to do the same thing for
> creators — and we've already built the scraper."

The last sentence is the Aaron-resonance line. The Mercor-experts ↔
Mercor-creators parallel is the whole pitch.

---

## Slide 5 · Traction (45s)

> "Three signed LOIs. ~500K views driven across 10+ campaigns. ~$25K
> generated for the brands we ran. UCSB, Stanford, Berkeley, UCLA — and
> we've already mapped which creators feed into the bench at each. That's
> the **proof** for slide 4 — the performance scraper is real, not a deck
> claim."

If Aaron asks for individual examples, name Bucked Up + Celsius + Alani.

---

## Slide 6 · The plan (60s)

> "Build it over the summer — Logan and Aarnav as the first Creator
> Domain Interns, real campaigns running by August. Then hand off to
> Mercor's eng + growth teams in Q4. Domain row goes live alongside
> Software Engineer, Quant, the rest."

Three asks (read all three, slow):

> "What we need from you:
> (1) Can Creator Experts ship as its own Domain row, with you owning
> expert onboarding?
> (2) Should we grade creator deliverables on Mercor's existing quality
> rubric? Same rubric, different output medium.
> (3) What proof by August greenlights the Q4 hand-off?"

Don't push for an answer — these set the agenda for the demo.

---

## Slide 7 · Live demo CTA (5s)

> "The demo's the rest of the pitch."

Click into the live URL. Show the landing page for one beat, then start.

---

## Demo (5–6 min)

The demo runs end-to-end on `https://musing-maxwell-84ed29.vercel.app`
and is structured to land the slide-4 thesis in motion.

### 1. Aaron lands on Match (60s)

URL: `/admin/match` with Celsius pre-selected.

> "This is what Aaron sees on day one. Pick a brand. We've pre-loaded
> Celsius. The brand voice is parsed from their actual ad library —
> high-performance, study-meets-gym, clean energy, essential nutrition.
> Target geo and personas come from the brief."

Hover the brand panel left rail without saying anything for one beat.

### 2. Logan as the #1 match (45s)

> "Logan Mann. 22.7K real TikTok account, 0.71 cosine similarity, 67
> impact, $203 suggested per post. Pinned to #1 because his content is
> *anchored* in UCSB STEM + gym-aesthetic, which is Celsius's exact ICP."

Click **Collapse → Expand** to reveal the detail pane.

### 3. **The BENCH panel** — slide 4 in motion (60s)

This is the new beat. Point at the purple **LIVE PERFORMANCE BENCH**
strip across the top of the expanded panel.

> "Here's slide 4. **Live performance bench, scraped two minutes ago.**
> We pulled 20 of Logan's recent posts. **15 passed the slop filter** —
> 5 dropped because they were low-signal: low engagement, off-niche, or
> stylistically recycled. Engagement velocity is 0.46, which is the 60th
> percentile of the energy-drink niche. **Only the 15 high-signal posts
> feed Impact.** Which means they're the only ones that move the
> $203-per-post number on the right."

Pause. Land the hook:

> "Logan doesn't get paid more by posting more. He gets paid more by
> **posting better.** That's deslopification — the same way Mercor pays
> experts for outcomes, not seat-time."

### 4. RAG citations + cited posts (45s)

Scroll down past the bench into the RAG rationale section.

> "Every score has a reason. We cite the actual TikToks by URL, with
> caption + hashtags. This one — 'Average quant' — hits #janestreet,
> #math, #quant, #ucsb, #gonzalo. Cosine sim 0.60. Same audience Celsius
> runs ads to. Click the URL — that's the live TikTok."

Click one cited URL to open the actual TikTok in a new tab if Aaron is
visibly engaged.

### 5. Generate outreach (30s)

Click `Generate outreach` (top-right of the Celsius panel).

> "Outreach is generated from the same RAG. The opener cites the actual
> post the brand should care about — not generic AI flattery."

### 6. Inbox (60s)

Click **Inbox** in the rail.

> "Threads grouped by deal. Each row has a one-line summary that
> describes state, not the last message text. **Celsius greenlit at
> $850. Logan wants product first before posting. Awaiting your
> countersign.** That's the deslopification on the *operator* side too —
> Aaron's bench is signal, not message volume."

Click the Logan × Celsius thread. Show the contract preview panel on
the right.

### 7. Persona switch (30s)

Click the avatar bottom-left → switch to creator (Logan).

> "Same product, creator side. Logan applies via the standard Mercor
> stepper. Same rubric. Same expert-first flow."

If running long, end here. If not, walk to `/explore` and `/home` for
the creator context.

---

## Close + ask (90s)

Switch back to admin. Land slide 6's three asks again, this time looking
at Aaron, not the screen.

> "Three asks. Domain row, rubric reuse, August proof gate. We don't
> need a yes today — we need to know the shape of yes. What's the smallest
> proof that gets us a Q4 hand-off?"

Stop. Wait for the answer. Don't fill the silence.

---

## Off-script reveal (only if Aaron asks)

If Aaron pushes on the scraper specifically:

> "It's a TikTok scrape that runs daily across the creator pool we've
> indexed. Median interactions, completion rate, comment-to-like ratio,
> hashtag co-occurrence. The slop filter drops anything below the niche
> 25th percentile. We can show you the raw query in the appendix."

If Aaron pushes on Handshake AI:

> "Handshake's pitching colleges as cheap RLHF labor. We're pitching the
> same audience as quality creator labor — same demographics, opposite
> economics. That's the moat: we're the high-end side of a market that's
> about to bifurcate."

If Aaron asks about brand acquisition:

> "Hardest part of the marketplace and we know it. Three signed LOIs is
> proof we can ship the brand side too — but the honest answer is brand
> acquisition is where Mercor's go-to-market would be more effective
> than us. That's why the Q4 hand-off matters."

---

## Demo failsafe checklist (read before walking in)

- [ ] Hard refresh `/admin/match` once before starting; Logan row is
  pre-expanded via `?focus=loganmann32`.
- [ ] Confirm the BENCH banner is visible (`data-test-id="live-performance-bench"`).
- [ ] Confirm the persona switcher works in both directions.
- [ ] Confirm RESET pill bottom-right; if any seed state looks wrong
  mid-demo, click it and reload.
- [ ] If Wi-Fi flakes, the deck is at `~/Downloads/Mercor-Creators-Domain (1).pptx`
  and runs without internet.
- [ ] Mobile sizing has been verified at 375px and 768px — if Aaron pulls
  out his phone and asks, hand him the live URL.

---

## Why slide 4 lives where it lives

Inserted between *Why now* (macro) and *Traction* (proof). The narrative
beat is "macro signals point at this moment → here's our defensibility →
here's the proof we can ship it." Putting Pay-for-proof *before* Traction
means traction stops being a generic 'we got LOIs' brag and becomes
direct evidence that the bench works in practice. Putting it *after* Why
Now means it lands when the audience is primed to ask "OK so what's your
moat?" rather than as an abstract value-prop slide.

The visual format — comparison ledger with three labeled rows × two
columns + three citation chips below — is unique in the deck. Slides 2
and 5 use horizontal stat cards, slides 3 and 6 use numbered vertical
lists, slides 1 and 7 are hero/closer. The new slide reads as a *table*,
which is the right mental model for "industry vs us."
