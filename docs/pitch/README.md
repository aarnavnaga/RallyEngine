# Aaron Langerman pitch — doc set

Pitched as an **internal Mercor proposal** for a new Expert Domain — *Creator Experts* — from two current Mercor contractors (Logan + Aarnav, on the CUA-envs contract for Anthropic under Drew Geoly).

## The deck

[`Mercor-Creators-Domain.pptx`](./Mercor-Creators-Domain.pptx) — 6 slides, Mercor-styled (Inter type, accent `#7857ff`, M-mark in the top-right of every slide).

| # | Slide | Purpose |
|:-:|---|---|
| 1 | Cover | "Creator Experts." — a new Expert Domain for Mercor. Build over the summer, ship at the start of Q4. |
| 2 | Three numbers | Three external signals — $480B creator economy by 2027 (Goldman Sachs), 4× UGC ad CTR over polished creative (Impact, 2026), 74% of brands shifting budget into creator programs (Influencer Marketing Factory, 2026). |
| 3 | Why this. Why now | Three things changed in the last six months — Handshake AI going for the college funnel, brand-voice RLHF without a vendor, Mercor's own UGC spend leaking to Meta. |
| 4 | Proof + moat | Cluely already paid creators to do this ($500K all-time bounty). Mercor pays $1.5M/day in contractor wages. |
| 5 | The plan | Two phases — Summer (internship build + PMF, Logan + Aarnav as Mercor interns) → Q4 (deploy with eng + growth). Plus three foundational questions for Aaron. |
| 6 | Live demo | `musing-maxwell-84ed29.vercel.app`. |

## The supporting docs

| File | Purpose | Read time |
|---|---|---|
| [`aaron-pitch-deck.md`](./aaron-pitch-deck.md) | **Background deck** — share with Aaron before the demo. Markdown precursor, 8 sections (resolution, inherency, market, moat, GTM, asks). | 4 min |
| [`aaron-call-script.md`](./aaron-call-script.md) | **Call script** — what Logan and Aarnav say on the live demo call. 7-min demo + 3-min ask + Q&A pre-prep + cut-cards. | 5 min |
| [`aaron-langerman-brief.md`](./aaron-langerman-brief.md) | **Leave-behind brief** — full debate-case structure with all evidence, blockers, competitor matrix, timeline. | 8 min |

## Three foundational questions for Aaron

The slide-5 ask is for Aaron's read — internal-strategy questions only he can answer cleanly:

1. Where does Creator Experts live inside Mercor?
2. Hourly pricing, or per-post with a relevant-eyes bonus?
3. Who handles brand-side sales — Mercor's team, or ours during the pilot?

## Format choices

Tailored to Aaron's background:

- **Bellarmine policy debate coach** → resolution + contentions + weighing + crystallization structure throughout.
- **Coached the Mercor founders** → shared rhetorical training; no hedging, no marketing fluff.
- **Strategic Ops at Mercor** → operations-grade specificity, no slop language, time-bound and falsifiable.

## Demo

Live at [musing-maxwell-84ed29.vercel.app](https://musing-maxwell-84ed29.vercel.app). Vercel prod build verified clean (5-page Playwright smoke: PROD SHIP IT). Pop-up toast notifications are disabled site-wide for the demo so nothing competes with the walkthrough.

## Build

```bash
python3 scripts/build_aaron_deck.py
# outputs docs/pitch/Mercor-Creators-Domain.pptx
```
