# Rally — Mercor demo

Live at [musing-maxwell-84ed29.vercel.app](https://musing-maxwell-84ed29.vercel.app).

## TL;DR — spin it up

```bash
git clone https://github.com/aarnavnaga/RallyEngine.git
cd RallyEngine/frontend
pnpm install
pnpm dev   # http://localhost:3000
```

Open localhost:3000 → top-right **Log in** → choose **"I am a creator (Logan)"** for the creator flow, or **"I am on the Mercor team (Aaron)"** for the admin flow.

That's the demo. Edit any page under `frontend/src/app/`, save, hot reload picks it up.

## Pitch docs

All in [`docs/pitch/`](./docs/pitch/):
- [`aaron-call-final.md`](./docs/pitch/aaron-call-final.md) — live call script (v3, verbatim numbers, button text, URLs from prod).
- [`aaron-demo-day-checklist.md`](./docs/pitch/aaron-demo-day-checklist.md) — T-15 pre-flight, mid-call recovery moves, T+0 wrap-up.
- [`aaron-iteration-plan-v3.md`](./docs/pitch/aaron-iteration-plan-v3.md) — post-call rewrite plan that drove the v3 deck + demo.
- [`Mercor-Creators-Domain.pptx`](./docs/pitch/Mercor-Creators-Domain.pptx) — the deck (**8 slides**). PDF export alongside.

Day-1 revenue strips appear across `/admin/match`, `/admin/outreach`, and `/admin/interviews`, and pull from [`frontend/src/lib/data/source-of-truth.ts`](./frontend/src/lib/data/source-of-truth.ts) so the headline copy stays 1:1 with the deck.

## Tests + verify

```bash
cd frontend
pnpm test:e2e   # Playwright spec against prod (4 tests, ~5s)
pnpm verify     # tsc --noEmit + Playwright spec — run this 10 min before the demo
```

The spec lives at [`frontend/e2e/aaron-flow.spec.ts`](./frontend/e2e/aaron-flow.spec.ts) and locks in: the end-to-end Aaron flow with stage-timing budgets, dead-link footer hidden on /admin/*, RESET ALL FOR DEMO state-wipe, creator-persona bounce from admin routes, and console-error gating. CI runs it on every push to `main` and on every PR via `.github/workflows/e2e.yml`.

## What's implemented

**Creator flow** (sign in as Logan)
- `/explore` — Mercor-mirror grid. Domain filter has a new `Creators & Influencers` row with brand campaigns (Celsius, Bucked Up, Bloom, Ghost, etc.).
- `/jobs/apply/[id]` — Mercor's exact 4-step application stepper: Resume / Connect TikTok+IG / Creator Interview / Work Auth.
- `/jobs/apply/[id]/submitted` — confetti page.
- `/home` — Mercor home pattern with active campaigns + recent activity.
- `/referrals` — Mercor referrals UI, but TikTok+IG icons instead of LinkedIn. 412 friends scraped from Logan's actual social network.
- `/earnings` — Mercor-style bar chart + Stripe Connected pill.
- `/profile` — six tabs identical to Mercor (Resume, Location, Availability, Work Prefs, Communications, Account).
- `/deliverables/[contractId]` — campaign deliverable submission with bonus tier unlocks.

**Admin flow** (sign in as Aaron)
- `/admin` — overview with 3-tile data flywheel strip (Campaigns run · Outcomes recorded · RL tasks graded) and a 5-node pipeline footer (Source → Verify → Match → Outreach → Evaluate → ROI).
- `/admin/creators` — pipeline data table sorted by Impact Score.
- `/admin/match` — matching workbench with **BEFORE/AFTER** toggle, **VERIFIED** ladder badge per creator (4-step pass-state hover), **Predicted ROI** mini-stat per row, and the canonical day-1 revenue strip on the contract preview. **Logan is pinned #1 for Celsius.** Expand his row → RAG cites his actual TikTok URLs.
- `/admin/verification` — moderation queue showing the last N onboarding attempts with VERIFIED ladder pass/fail by step + rejection reasons.
- `/admin/interviews/[creatorId]` — RL Studio emulation. Three-pane Project / World / Task IA, Writer/Reviewer role toggle (Reviewer default), pairwise A/B with 1–5 winner radio + 1–7 Likert sliders + free-text *improvement areas*. Day-1 revenue strip in the header.
- `/admin/outreach` — outreach approval queue, two tabs (creators / brands), **AUTOMATED** pill on every untouched thread + a "47 of 50 outreach drafts sent without edits" counter at the top.
- `/admin/campaigns/[id]` — live perf simulator with view ticks, comment-relevance, payout breakdown.

**Real data**
- `@loganmann32` is wired in: real 22.7K-follower TikTok + 4 cited posts (`7608429326211501326`, `7618484810977168654`, `7619197602285849870`, `7603223754671508749`) — clickable, scrapable, verifiable from your phone.
- 15 real fitness/energy brands (Celsius, Alani Nu, Bucked Up, Ghost, Bloom Nutrition, Ryse, Gorgie, C4, ON, Magic Mind, Liquid Death, Olipop, Create Wellness, etc.).
- Aaron's LinkedIn photo embedded as his avatar.

**Design**
- Mercor purple `#7857ff`, Inter typography, light theme. Mercor M-mark in the top-right of every page.
- Pop-up toasts disabled site-wide (the floating notifications were distracting on the call).

## Why each piece exists

| Path | What | Why |
|---|---|---|
| `frontend/` | Next.js demo. Deployed to Vercel. | The actual product Aaron clicks through. |
| `docs/pitch/` | The deck (`Mercor-Creators-Domain.pptx`) + call script. | What we walk Aaron through before the demo. |
| `scripts/build_aaron_deck.py` | Python builder for the .pptx. | Run this when slide content changes. Uses python-pptx + Mercor design tokens. |
| `scripts/auto-hotfix.sh` | Dev server watchdog. | Keeps `pnpm dev` alive if it crashes. |

## Push workflow

- The Vercel ↔ GitHub integration is **not** configured to auto-deploy. `git push` (any branch, including `main`) does NOT trigger a build — verified 2026-04-29 by polling prod for 5 min after merging to `main` and seeing zero GitHub Deployments / check-runs.
- To deploy: link the project once with `vercel link --yes --project musing-maxwell-84ed29`, then run `vercel deploy --prod --yes` from the repo root. The first run aliases the new deployment to `musing-maxwell-84ed29.vercel.app`.
- I push commits to `main` directly. Deploy is a separate, manual step.

## Rebuild the deck

```bash
pip install python-pptx
python3 scripts/build_aaron_deck.py
```

Output: `docs/pitch/Mercor-Creators-Domain.pptx`. Open in Keynote.

## Three things Aaron needs to answer (slide 7)

1. Where does Creator Experts live inside Mercor?
2. Hourly pricing, or per-post with a relevant-eyes bonus?
3. Who closes brand deals — Mercor's GTM, or us during the pilot?

That's the call.
