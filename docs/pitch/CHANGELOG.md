# Aaron iteration v3 — change-to-quote map

Every change in this iteration traces to a verbatim quote from Aaron
Langerman's two-part feedback. This document is the receipts.

**Feedback source:** Aaron Langerman 1:1, transcribed verbatim into
`docs/pitch/aaron-iteration-plan-v3.md` Appendix B.
**Demo (live):** <https://musing-maxwell-84ed29.vercel.app>
**Deck (.pptx):** [`docs/pitch/Mercor-Creators-Domain.pptx`](./Mercor-Creators-Domain.pptx)
**Deck (.pdf):** [`docs/pitch/Mercor-Creators-Domain.pdf`](./Mercor-Creators-Domain.pdf)
**Live-call script:** [`docs/pitch/aaron-call-final.md`](./aaron-call-final.md)
**Growth-team prep:** [`docs/pitch/mercor-growth-team-prep.md`](./mercor-growth-team-prep.md)
**Iteration plan:** [`docs/pitch/aaron-iteration-plan-v3.md`](./aaron-iteration-plan-v3.md)

---

## Deck (8 slides — was 7)

| Slide | Aaron's quote that drove it | What changed |
|---|---|---|
| 1 — cover | *"This is not just 'influencer matching'. It is a high-friction labor/marketplace problem where AI can improve sourcing, verification, evaluation, outcome prediction."* | Subtitle rewritten to **"A high-friction labor market. Where AI compounds."** Footer line surfaces Aaron's four-area framing verbatim: *"Sourcing. Verification. Evaluation. Outcome prediction."* |
| 2 — BROKEN WORKFLOW (NEW) | *"Make the pitch more concrete and visual."* + *"Show the actual difficulty of finding the right creator for a brand."* | Five-step horizontal flow (Brand brief → DM agents → Manual scroll → Email volley → Sign or pass) with friction tags. Stats: 70% of brands report sourcing as their biggest bottleneck (Aspire 2025); 39% still rely on manual research (IMH/Sprout Q1 2025). |
| 3 — WHY NOW | *"Manual review doesn't scale when content volume explodes."* + *"Rising ad costs"* + *"AI-generated/slop content is increasing noise"* | Three drivers, all from Aaron's feedback. (1) YouTube Jan 2026 enforcement (16 channels, 35M subs, 4.7B views erased). (2) **"AI slop has flooded the feed"** — 26% AI-content preference, down from 60% (BDB *Muse Two*, Nov 2025). (3) Meta Q3 2025 +10% YoY price-per-ad. The word *slop* is intentional — Aaron noticed and visibly responded to it during the v2 read. |
| 4 — SIGNAL | *"The signal work mentioned was the type of stuff that was genuinely interesting."* + *"Compoundingly better at predicting which creators fit which brands."* | Re-eyebrowed from *PAY FOR PROOF* → **SIGNAL** (Aaron's word). Comparison ledger plus a new `THE MOAT` row (predictor delta vs follower-baseline). Anchor stat REPLACED: dropped UNVERIFIED 78% performance-pay claim, swapped to **68% of brand-creator contracts include performance metrics, up from 42% in 2023** (Lumanu $1B+ payouts dataset — primary-source verified). |
| 5 — VERIFICATION (NEW) | *"How do you know a creator is who they claim to be?"* + *"Creators may claim categories they do not actually belong to."* | Four-step ladder — handle ownership, fingerprint, niche claim, audience truth. Steps 3-4 honestly labeled *"manual review for v1"*. Stats: 37.2% follower fraud / $4.6B brand waste (SociaVault); 55% of IG influencers have engaged in fraud (HypeAuditor); FTC max $53,088/violation. |
| 6 — DAY-1 REVENUE (NEW) | *"He seemed to understand the business model as something like a headhunter / placement / success fee."* | Three revenue lines on the **Logan × Celsius signed deal**: (a) Placement fee 20% × $850 = **$170** (headhunter contingent benchmark). (b) Performance kicker 5% of view-bonus = **$0–$50** (Lumanu pattern). (c) Per-task RL data licensing — bridges to Mercor's existing human-data market for RL environments. |
| 7 — PROVE BY AUGUST | *"What proof by August would justify a handoff."* + *"Position this as a potentially longer-term strategic adjacency for Mercor, rather than assuming it belongs on the immediate roadmap."* | Was *THE PLAN*. Four falsifiable proof points: workflow-pain (10 brand interviews), verification (1,000 creators screened), quality scoring (vs follower-count baseline on 5 brands), outcome prediction (predicted vs actual on 10 finished campaigns). Verdict gate: *"4 of 4 → strategic adjacency. 2 of 4 → kill it."* |
| 8 — LIVE DEMO | unchanged | URL pointer + demo CTA. |

---

## Demo route changes

| Route | Aaron's quote | What changed |
|---|---|---|
| `/admin` (Overview) | *"Campaign data can become a moat over time."* | New 3-tile **data flywheel strip** at top (Campaigns run 47 · Outcomes recorded 31 · RL tasks graded 312) plus a 6-node pipeline footer (`Source → Verify → Match → Outreach → Evaluate → ROI`). Visualizes the "compounding moat" framing. |
| `/admin/match` | *"Show the actual difficulty"* + *"How do you know a creator is who they claim to be?"* + *"Two sides: discovery / sourcing and ROI evaluation / prediction."* | (1) Native `<select>` brand selector replaced with a **logo picker**: trigger button shows the active brand's logo + name + category badge; popover groups all 36 brands by 12 categories with each row showing a colored brand mark. (2) **BEFORE/AFTER toggle** — BEFORE shows the broken workflow composite, AFTER shows the live ranked workbench. (3) **VERIFIED badge** on every creator row + 4-step ladder revealed on expand. (4) New **Predicted ROI** column (returned-relevant-views per dollar). (5) Expanded "Why" pane condensed to a single screen: horizontal verification ladder + Predicted ROI + day-1 revenue strip on top, max-2 cited TikTok URLs + merged Impact + Pay table + niche/geo chips below. (6) BENCH panel collapsed behind a disclosure (still surfaces "passed quality filter" / engagement velocity / niche percentile). |
| `/admin/interviews/[creatorId]` | *"The signal work was genuinely interesting"* + the existing Mercor RL Studio surface | Rebuilt to emulate **Mercor RL Studio** 1:1 — Project + World selector (Beauty / Fitness / Gaming / Food / Fashion), Writer/Reviewer toggle, pairwise A/B card with 1–5 winner radio, three Likert sliders (helpfulness / brand-fit / creative style), free-text "improvement areas", rubric rail consuming `BRANDS_BY_ID["celsius"].brand_voice`, status pills `Pending / In Review / Approved / Needs Edits / Discarded`, separate `Tasks · Approved Tasks · Submission` tabs. Submission tab preserves the v2 transcript + KPIs + frame scores. Frames creator UGC RLHF as the same workflow Mercor sells to top AI labs today. |
| `/admin/outreach` | *"Automated outreach made sense to him as part of the workflow."* | AUTOMATED pill on auto-sent threads. *"47 of 50 outreach drafts sent without edits"* counter under the Inbox header. Day-1 revenue micro-strip in the contract preview panel (`$170 placement + $0–$50 perf kicker`). |
| `/admin/verification` | initial standalone tab | **CUT.** The 4-step verification ladder lives inline in `/admin/match`'s expanded row — Logan confirmed the row-level surface is enough; a separate tab fragmented the workflow. Sidebar entry removed. |

---

## Cross-cutting

| Change | Aaron's quote | Where it surfaces |
|---|---|---|
| Day-1 revenue mechanics on every relevant surface | *"Headhunter / placement / success fee"* | Deck slide 6 + `/admin` overview tile 3 + `/admin/match` row strip + `/admin/outreach` contract panel + `/admin/interviews` RL Studio header. Same dollar figures everywhere — sourced from `frontend/src/lib/data/source-of-truth.ts`. |
| The word *slop* in the deck (only) | *"AI-generated/slop content is increasing noise"* — Aaron noticed | Slide 3 driver #2 only. **Never used in the demo** — `/admin/match`'s BENCH panel reads "Passed quality filter", not "Passed slop filter". |
| Mercor's two stated focus areas (RL environments + enterprise agents) addressed | *"This is not aligned with the company's immediate focus right now... interesting opportunity, maybe strategically adjacent"* | Slide 7 frames the ask as Prove-by-August adjacency, not Q4 ship. RL Studio emulation is the explicit bridge to Mercor's human-data-for-RL market. |
| Growth-team prep (next pitch) | *"Speak with Mercor growth people next."* | New `docs/pitch/mercor-growth-team-prep.md` — five named SF on-site attendees (Luna Aizarani, Eugene Ling, Eddie Huang, Eda Topuz, Neil Banerjee) with per-attendee tailoring brief, 30/60/90 deals/month sensitivity table, Eugene Ling lawsuit caveat (public-record only). |
| Brand acquisition honesty paragraph in script | *"Brand acquisition is hard"* (implicit) | Verbatim in the script: *"Brand acquisition is where Mercor's go-to-market would be more effective than us. That's why the Q4 hand-off matters — and why we're asking for the August proof gate, not a Q4 ship commitment."* |
| All vanity stats removed | *"Don't rely too much on vanity stats like broad creator economy numbers."* | Dropped from deck/script: hours-per-campaign benchmarks, %-budget-shift-to-creators, the unverified 78% performance-pay claim. Drop list documented in plan §4.2. |

---

## Quality gates

- `pnpm typecheck` — clean
- `pnpm build` — passes (18 routes; `/admin/verification` removed)
- Adversarial review (3 reviewers, parallel) — all SHIP-WITH-NAMED-FIXES; named fixes applied:
  - typescript-reviewer: empty-catch comment, ratings shape-guard, redundant `useMemo`, missing `type="button"`, source-of-truth pipeline node-count comment
  - security-reviewer: href URL allowlist in admin/page.tsx, `Array.isArray` + shape guards on `JSON.parse` in interviews loaders
  - Aaron + Mercor-growth adversary: pre-baked 30/60/90 sensitivity table for Eddie's unit-econ stress test; explicit post-August timing on the brand-side intro ask
- E2E spec (Playwright) on prod — 4 tests, ~5s, passing
- CI on main: `e2e` + `README drift watch` workflows green on commit `c67652d`

---

*Generated 2026-04-29.*
