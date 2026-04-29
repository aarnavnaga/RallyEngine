# Rally — Mercor demo

Aarnav — this is the demo we're running for Aaron. Live at [musing-maxwell-84ed29.vercel.app](https://musing-maxwell-84ed29.vercel.app).

## TL;DR — spin it up

```bash
git clone https://github.com/aarnavnaga/RallyEngine.git
cd RallyEngine/frontend
pnpm install
pnpm dev   # http://localhost:3000
```

Open localhost:3000 → top-right persona button → **Sign in as Logan Mann** for the creator flow, or **Sign in as Aaron Langerman** for the admin flow.

That's the demo. Edit any page under `frontend/src/app/`, save, hot reload picks it up.

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
- `/admin` — KPI dashboard: 12 active campaigns, 38 pending applicants, $24K GMV last 7d.
- `/admin/creators` — pipeline data table sorted by Impact Score.
- `/admin/match` — manual matching workbench. Pick a brand → ranked creators with similarity, impact, suggested pay. **Logan is pinned #1 for Celsius.** Expand his row → RAG cites his actual TikTok URLs as the audience-overlap signal.
- `/admin/outreach` — outreach approval queue, two tabs (creators / brands).
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

- Push any branch → Vercel preview build.
- Merge to `main` → prod deploy at `musing-maxwell-84ed29.vercel.app`.
- I push to main directly. Branches get deleted after merge.

## Rebuild the deck

```bash
pip install python-pptx
python3 scripts/build_aaron_deck.py
```

Output: `docs/pitch/Mercor-Creators-Domain.pptx`. Open in Keynote.

## Three things Aaron needs to answer (slide 5)

1. Where does Creator Experts live inside Mercor?
2. Hourly pricing, or per-post with a relevant-eyes bonus?
3. Who closes brand deals — Mercor's GTM, or us during the pilot?

That's the call.
