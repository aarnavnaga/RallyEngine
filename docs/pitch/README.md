# Aaron Langerman pitch — doc set

Internal Mercor proposal — *a high-friction labor market where AI can compound* — from Logan + Aarnav (both on the CUA-envs contract for Anthropic under Drew Geoly). v3 reframe (post-Aaron-call, 2026-04-29) replaces the "Creator Experts as a Domain row" framing with Aaron's verbatim *sourcing / verification / evaluation / outcome prediction* spine.

## Files

| File | Purpose |
|---|---|
| [`Mercor-Creators-Domain.pptx`](./Mercor-Creators-Domain.pptx) | The deck. **8 slides**, Mercor-styled. |
| [`Mercor-Creators-Domain.pdf`](./Mercor-Creators-Domain.pdf) | PDF export of the deck for offline review. |
| [`aaron-call-final.md`](./aaron-call-final.md) | **Live call script (v3).** Verbatim numbers, button text, URLs from prod. What Logan says + what Logan clicks during the demo. |
| [`aaron-demo-day-checklist.md`](./aaron-demo-day-checklist.md) | **Day-of operating checklist.** T-15 pre-flight, mid-call recovery moves, T+0 wrap-up. |
| [`aaron-iteration-plan-v3.md`](./aaron-iteration-plan-v3.md) | The post-call rewrite plan. Section-by-section trace from Aaron's verbatim feedback to deck/demo/script changes. |
| [`mercor-growth-team-prep.md`](./mercor-growth-team-prep.md) | Mercor SF growth-team roster + per-person lean-in (Luna, Eugene, Eddie, Eda, Neil) for the SF follow-up. |
| `mercor-logo.png` | Logo asset embedded in the deck. |

## Slides (v3 — 8 total)

1. **Cover** — *"A high-friction labor market. Where AI can compound."* Footer: *"Sourcing. Verification. Evaluation. Outcome prediction."* (Aaron's four areas, verbatim.)
2. **How brands find creators today** — 5-step horizontal broken-workflow flow (brand brief → DM agents → manual scroll → email volley → sign or pass). Anchor stats: **70% of brands say finding the right creators is their biggest bottleneck** (Aspire 2025), **39% still rely on manual research** (IMH Q1 2025).
3. **Why this. Why now.** — 3 stats, all workflow-driven. YouTube Jan 2026 enforcement (35M subs erased). Billion Dollar Boy *Muse Two*: only **26% prefer AI-generated creator content, down from 60% in 2023**. Meta Q3 2025 **+10% YoY price-per-ad**.
4. **SIGNAL.** — Comparison ledger (industry default vs Mercor Creator Domain) plus the new `THE MOAT` row. Anchor stat: **68% of brand-creator contracts include performance metrics, up from 42% in 2023** (Lumanu $1B+ payouts dataset). Predictor delta vs follower-baseline: **+18% (last 90d)**.
5. **VERIFICATION.** *(NEW)* — 4-step ladder: handle ownership, content fingerprint, niche claim, audience truth. Honest labels for steps 3 + 4 ("manual review for v1"). Stats: **37.2% fake followers / $4.6B/yr brand waste** (SociaVault); **55% of IG influencers engaged in fraud** (HypeAuditor); **$53,088 FTC max civil penalty** per fake review.
6. **Day-1 revenue.** *(NEW)* — Logan × Celsius signed: **$170 placement (20% × $850) + $0–$50 perf kicker (5% per-post Lumanu pattern) + per-task RL revenue when this becomes a Mercor world.** Headline copy is canonical from `frontend/src/lib/data/source-of-truth.ts` and matches verbatim across `/admin/match`, `/admin/outreach`, and `/admin/interviews`.
7. **What we'd prove by August.** — 4 falsifiable proof points (workflow pain real / verification works / quality scoring beats follower-baseline / outcome prediction holds). Verdict gate: *"4 of 4 → strategic adjacency. 2 of 4 → kill it."* Plus *"Paid like a headhunter. Placement on signed deals."* The three questions for Aaron live in the slide footer.
8. **Live demo.** — `musing-maxwell-84ed29.vercel.app`.

## Three questions for Aaron (slide 7 close)

1. Where does Creator Experts live inside Mercor?
2. Hourly pricing, or per-post with a relevant-eyes bonus?
3. Who closes brand deals — Mercor's GTM, or us during the pilot?

## Build

```bash
pip install python-pptx
python3 scripts/build_aaron_deck.py
# outputs docs/pitch/Mercor-Creators-Domain.pptx
```
