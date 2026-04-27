# Mercor demo — `rallyai.org`

Live demo for the **Aaron Langerman pitch** that positions a new `Creators & Influencers` expert vertical inside Mercor's existing marketplace. Mirrors `work.mercor.com` 1:1 in look and feel; same Explore grid, same application stepper, same contracts, same Stripe earnings, same Referrals — just a new domain row and new humans (creators + influencers).

> **Hi Arnav** — this README is your full onboarding. Read it top-to-bottom and you'll be able to run the demo, edit any page, push a PR, and ship by yourself. Auto-updated by a 24/7 bot on every push.

---

## TL;DR — get to a working demo in 90 seconds

```bash
git clone https://github.com/aarnavnaga/RallyEngine.git
cd RallyEngine/frontend
pnpm install              # or `npm install`
pnpm dev                  # http://localhost:3000
```

Open `http://localhost:3000`. Click the persona button top-right → **Sign in as Logan Mann (creator)** for the creator flow, or **Sign in as Aaron Langerman (Mercor team)** for the admin flow. That's the demo.

---

## What this repo is

Two flows, one codebase, one URL.

| Flow | Persona | Lands on | Purpose |
|---|---|---|---|
| **Creator** | Logan Mann (real `@loganmann32`, 22.7K followers) | `/explore` | Apply to a brand campaign, get matched, sign a contract, submit a deliverable, get paid. Same Mercor UI Aaron already knows. |
| **Admin** | Aaron Langerman (Mercor Strategic Ops) | `/admin` | Match creators to brands, run AI-drafted outreach, watch live campaign performance. |

Both flows share the same Mercor design tokens, the same Explore grid, the same application stepper, the same Stripe-style contracts. The whole point of the demo is "this is Mercor, plus one new Domain row in the filter."

---

## Features

### Landing & navigation
- **`/`** — Mercor.com 1:1 mirror with `Creators & Influencers` role card highlighted
- Persona switcher in the top-right `Log in` dropdown — toggles between Logan (creator) and Aaron (Mercor team)
- Sidebar persona-switch avatar (bottom-left) with one-click toggle
- `RESET ALL FOR DEMO` floating pill — wipes every `mercor.*` localStorage key + reloads
- Cookie consent banner (privacy-preserving default), Mercor footer with X / YouTube / LinkedIn / Instagram social links
- 4-column footer wired across every signed-in route via `AppShell`
- Notifications dropdown in sidebar bell slot

### Creator flow (Logan Mann · `@loganmann32` · 22.7K followers)
- **`/explore`** — 5-column brand campaign grid with rate badges, hires-this-month avatar stacks, total paid this month
- `Domain` filter with `Creators & Influencers` highlighted as `NEW`
- `JobDetailPanel` right-rail with brief, application checklist, sticky `Continue Application` CTA
- **`/jobs/apply/[id]`** — 4-step Mercor stepper: Resume → Connect TikTok+IG → Creator Interview → Work Authorization
- Mocked TikTok/IG OAuth that returns Logan's real follower count + last 6 video thumbnails
- **Video interview step** with live camera + mic preview, consent gate, Web Speech API STT/TTS, Gemini Vision frame scoring (confidence + cheating detection), dynamic question adaptation
- **`/jobs/apply/[id]/submitted`** — confetti page + "Similar Opportunities" carousel
- **`/home`** — creator dashboard with `Contracts`, `Offers`, `Applications`, `Assessments`, `Saved` tabs + Creators & Influencers assessment category
- **`/contracts/[id]`** — Stripe-style contract detail (real Mercor SWE onboarding doc + Celsius creator contract)
- **`/deliverables`** — submit deliverables for active contracts
- **`/deliverables/[contractId]`** — link TikTok URL → `SIMULATE TIME` fast-forwards views/comments → bonus tier earnings
- **`/referrals`** — TikTok+IG friends table (412 friends scraped from Logan's followings) with `Intro` + `Vouch` buttons; 6-bucket funnel KPI row; 3-step Vouch modal with auto-fill toggle
- **`/earnings`** — Mercor 1:1 stacked bar chart (Paid/Pending), Stripe Connected pill, Mercor Intros promo card, Contracts section, full Payments table
- **`/profile`** — 6 tabs (Resume / Location / Availability / Work Preferences / Communications / Account) wired to `?tab=` URL param; real Logan resume + Domain Interests pills

### Admin flow (Aaron Langerman · Mercor Strategic Ops)
- **`/admin`** — KPIs (active campaigns, onboarded creators, pending review, GMV last 7d) + Pending / Onboarded / Applied / Auto-drafted / All applicant tabs
- **`/admin/creators`** — pipeline data table sorted by Impact Score
- **`/admin/match`** — manual matching workbench. Pick a brand → ranked creators with similarity, impact, suggested pay
- Expand any row → cosine-sim breakdown citing **specific TikTok URLs by URL** (e.g. `tiktok.com/@loganmann32/video/7608429326211501326`) in the rationale paragraph
- `?focus=loganmann32` URL param pins Logan to the top so the cite-by-URL "wow moment" always works
- **`/admin/outreach`** — AI-drafted message queue. Creator + Brand toggle, status tabs (Pending / Sent / Replied / Negotiating). Approve / Edit / Skip per row. Replies arrive simulated 4–8s after send. Persona-aware `chat-reply` route powered by Gemini 2.5 Flash Lite
- **`/admin/campaigns/[id]`** — live perf simulator. Views tick every 8s. Avg comment relevance card. Pricing breakdown table. Sales attribution rows
- **Interview notes card** — propagates VideoInterview transcript + confidence/cheating scores into Aaron's dashboard per creator

### AI / RAG layer
- **Real semantic embeddings** via Gemini `gemini-embedding-001` (768d, **100% free tier**). Indexed at build time → static `frontend/src/lib/data/embeddings.json` (33 brands + 45 creators + 13 cited posts). Zero runtime API cost. Reproducible.
- **Cosine similarity** at runtime in pure TS — `cosineSim()` in [score.ts](frontend/src/lib/util/score.ts), blended 55% semantic + 45% keyword-fuzz so the demo's headline numbers stay calibrated for the 0.4–0.95 UI band
- **Per-cited-post cosine ranker** — picks the highest-cosine TikTok video for each (creator, brand) pair so the rationale paragraph cites the most-relevant URL by URL
- **Auto-cite cosine in rationale** — every match card now prints `Cosine sim 0.XX.` after the human-readable reason
- Indexer script: [`scripts/build-embeddings.ts`](frontend/scripts/build-embeddings.ts) — `pnpm exec tsx scripts/build-embeddings.ts` to rebuild the index after data changes
- **`/api/chat-suggestions`** — Gemini-backed quick-reply chip generator for Aaron's outreach approval queue
- **`/api/chat-reply`** — Gemini persona-aware counterparty reply simulator (creator vs brand, base-rate aware, in-character)
- **`/api/interview/turn`** — Gemini interviewer that adapts questions to interviewee responses
- **`/api/interview/observe`** — Gemini Vision frame scoring for confidence + cheating detection
- **`/api/interview/finalize`** — transcript + score consolidation, propagated to admin dashboard
- Per-IP token-bucket rate limiting + same-origin gating in Next.js `middleware.ts`
- LLM streaming for faster perceived latency
- Structured TikTok scraping with real engagement metrics (followers, ER, FYP-dominance correction)
- Impact-Score breakdown shown as tooltip on every creator card; click expands the formula
- Relevant-Eyes pricing model (cosine sim of fan comments to brand voice → payout fairness)

### Real data + assets
- 36 real scraped TikTok profile photos via curl + `avatarLarger` field (33/37 succeeded; 4 fall back to letter avatars)
- Real LinkedIn pfp for Aaron (`public/aaron.jpg`)
- 15-brand fitness/energy lane (Celsius, Alani Nu, Bucked Up, Ghost, Bloom, Ryse, Gorgie, C4, ON, Gnarly, Magic Mind, Liquid Death, Olipop, Create Wellness, Bucked Up Energy)
- Brand logos via Clearbit API (`logo.clearbit.com/<domain>`) → Google favicon fallback → colored letter avatar
- Logan's real resume (UCSB, gym/fitness niche)
- 412 TikTok+IG friends scraped from Logan's followings (30+ deeper-scraped for matching)
- 4 cited TikTok video URLs with full payload (captions, audio, location, top 30 comments)

### Demo video
- **`/aaron-demo.mp4`** — 43.4s production-quality demo video at 1920×1080 30fps, hosted at the Vercel root. No Ken Burns, no intro/outro frames, native framerate
- Cursor halo + click ripple effects baked into the recording (Playwright `addInitScript`)
- 8 caption overlays with fade-in/out (PIL-rendered transparent PNGs)
- xfade scene transitions (350ms)
- Live at https://musing-maxwell-84ed29.vercel.app/aaron-demo.mp4

### Branding & design system
- Mercor purple `#7857ff` accent throughout, design tokens in `globals.css`
- Inter font via `next/font/google` wired to `--font-sans`
- Mercor M wordmark, favicon, footer, logo
- Zero "Rally" branding in user-facing surfaces (legacy strings auto-flagged)
- Zero em/en dashes anywhere in the codebase (rule + test)
- Pipe `|` separator in title bars (never hyphen)
- All persistence under `mercor.*` localStorage namespace
- `data-test-id` attributes on every interactive surface for Playwright e2e

### Operational
- `auto-hotfix.sh` 24/7 watcher — recovers crashed dev server in <60s via SIGTERM-grace + .next wipe + restart
- Background visual-diff loop (Playwright + 4 acceptance gates: TikTok URL, Creators & Influencers, CUA Environments, Brainstorming Session)
- Hourly auto-snapshot commits + push to `claude/musing-maxwell-84ed29`
- Periodic merge-to-main routine (gated on green CI + smoke 200s)
- Vercel prod deploy at https://musing-maxwell-84ed29.vercel.app/
- `LIVE_STATUS.md` self-maintained with last visual-diff run, last auto-snapshot, top fix

---

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4
- **State:** React context + `localStorage` (no backend needed for the demo)
- **Charts:** Recharts (`/admin/campaigns/[id]` perf curves)
- **Icons:** lucide-react
- **AI:** `@anthropic-ai/sdk` for the live AI interviewer in `/interview/[slug]`
- **Build/runtime:** Node 20+ (the repo has been verified on 22.20.0)
- **Package manager:** pnpm preferred, npm works too

The Python files at the repo root (`api.py`, `scrapers/`, etc.) are from the original RallyEngine project. They are **not used by the demo**. The demo is entirely client-side under `frontend/`.

---

## Repo layout

```
RallyEngine/
├── frontend/                          ← THE DEMO. live next.js app
│   ├── src/
│   │   ├── app/                       ← routes (Next.js App Router)
│   │   │   ├── page.tsx               ← landing (mercor.com 1:1 mirror)
│   │   │   ├── explore/               ← brand campaign grid
│   │   │   ├── home/                  ← creator dashboard
│   │   │   ├── jobs/apply/[id]/       ← 4-step application stepper
│   │   │   ├── deliverables/          ← submit + SIMULATE TIME flow
│   │   │   ├── contracts/[id]/        ← Stripe-style contract page
│   │   │   ├── earnings/, profile/, referrals/
│   │   │   ├── admin/                 ← Aaron's flow
│   │   │   │   ├── page.tsx           ← KPIs + recent applicants
│   │   │   │   ├── creators/          ← creator pipeline
│   │   │   │   ├── match/             ← match workbench (RAG citations)
│   │   │   │   ├── outreach/          ← AI-drafted message queue (Creator + Brand sides)
│   │   │   │   └── campaigns/[id]/    ← live perf simulator
│   │   │   ├── interview/[slug]/      ← live AI video interview (Claude-powered)
│   │   │   └── api/interview/turn/    ← server route that calls Anthropic
│   │   ├── components/
│   │   │   ├── shell/                 ← Sidebar, AppShell, ToastContainer, MercorFooter, ResetDemoButton…
│   │   │   ├── explore/               ← OpportunityCard, JobDetailPanel
│   │   │   └── landing/               ← MeetCard, RoleCard, StatPill
│   │   └── lib/
│   │       ├── data/                  ← static seed data: brands, creators, campaigns, contracts, friends, logan-resume, seed-deliverables, creator-avatars
│   │       ├── state/                 ← React context (user, deliverables)
│   │       └── util/score.ts          ← impact + similarity formulas
│   └── public/
│       ├── avatars/                   ← 36 real TikTok pfps + Aaron + Logan
│       ├── mercor-logo.png            ← real Mercor M
│       └── mercor-favicon.ico
├── scripts/auto-hotfix.sh             ← background watcher that restarts dev server if it crashes
├── README.md                          ← THIS FILE
└── api.py, scrapers/, …               ← legacy RallyEngine python (not used by the demo)
```

---

## How the two demo flows actually work

### Creator flow (Logan Mann)

1. **`/`** → click `Log in` top-right → pick **Sign in as Logan Mann (creator)** → identity persists in `localStorage` under `mercor.identity.v1`.
2. **`/explore`** → 5-column grid of brand campaigns (Celsius, Bucked Up, Ghost Energy, Bloom Nutrition, etc.). Each card shows the brand logo, rate range, "hired this month" avatar stack, and total paid this month.
3. Click a card → right-rail `JobDetailPanel` slides in with the brief + application checklist + sticky `Continue Application`.
4. **`/jobs/apply/[id]`** → 4-step Mercor-style stepper:
   - **Resume** (auto-imported)
   - **Connect TikTok + Instagram** (mocked OAuth, returns Logan's real `@loganmann32` data)
   - **Creator Interview** (5 textareas)
   - **Work Authorization**
5. Submit → `/jobs/apply/[id]/submitted` confetti page → "Similar Opportunities" carousel.
6. **`/home`** → creator dashboard with `Contracts`, `Offers`, `Applications`, `Assessments`, `Saved` tabs.
7. **`/deliverables/[contractId]`** → submit a TikTok URL, hit `SIMULATE TIME` to fast-forward views/comments/payouts.
8. **`/referrals`** → Logan's TikTok+IG followings table (412 friends, 30+ deeper-scraped) with `Intro` + `Vouch` buttons.
9. **`/earnings`** → Mercor-style bar chart, Stripe Connected pill.
10. **`/profile`** → 6 tabs (Resume, Location, Availability, Work prefs, Communications, Account).

### Admin flow (Aaron Langerman)

1. Click avatar in sidebar bottom-left to switch persona, OR click the persona switcher in the top-right `Log in` dropdown → land on `/admin`.
2. **`/admin`** → KPIs (active campaigns, onboarded creators, pending review, GMV last 7d) + recent applicants table + `Pending / Onboarded / Applied / Auto-drafted / All` tabs.
3. **`/admin/creators`** → pipeline data table sorted by Impact Score.
4. **`/admin/match`** → manual matching workbench. Pick a brand → ranked creators with similarity, impact, suggested pay. Expand any row to see the cited TikTok URLs in the rationale paragraph. `?focus=loganmann32` pins Logan to the top so the cite-by-URL "wow moment" always works even though he's a small account.
5. **`/admin/outreach`** → AI-drafted message queue. Top toggle: `Creator outreach | Brand outreach`. Status tabs: `Pending / Sent / Replied / Negotiating`. Approve / Edit / Skip. Replies arrive simulated 4–8s after send.
6. **`/admin/campaigns/[id]`** → live perf simulator. Views tick every 8s. Avg comment relevance card. Pricing breakdown table.

---

## Key conventions (read before touching code)

- **Branding:** This is **Mercor demo prod**, not Rally. Anywhere the word `Rally` shows up in user-facing text is a bug — fix it. Logo is `/mercor-logo.png`. Favicon is `/mercor-favicon.ico`. Title bar separator is the **pipe** (`Mercor | …`), never a hyphen.
- **Em/en dashes:** **Zero** in the codebase. Use commas, parens, colons, or new sentences. There's a memory rule and a test for this.
- **Real photos:** Every creator avatar is a real scraped TikTok / Instagram profile photo. If you add a creator, scrape their real avatar; don't fall back to letter avatars unless you have to.
- **Design tokens:** Defined in `frontend/src/app/globals.css`. The accent purple is `--accent: #7857ff`. **Never hardcode colors** — always use a CSS variable.
- **Font:** Inter via `next/font/google`. Wired to `--font-sans` and used in the body `font-family` chain. **Don't replace Inter.**
- **State:** All persistence is `localStorage` under the `mercor.*` namespace (e.g. `mercor.identity.v1`, `mercor.deliverables.v1`). The bottom-right `RESET ALL FOR DEMO` button wipes every key under that namespace and reloads. **Use the `mercor.` prefix for any new state key** so the reset button picks it up automatically.
- **No comments unless WHY is non-obvious.** Don't write multi-line docstrings. Don't reference current task / fix / callers in comments.
- **Use `@/` aliased imports** (`@/lib/data/brands`, `@/components/shell/Sidebar`). Never relative `../../`.

---

## Common tasks

### Add a new brand campaign

1. Add the brand to [frontend/src/lib/data/brands.ts](frontend/src/lib/data/brands.ts) with a `category`, `brand_voice`, and a real logo URL (Clearbit or Google favicon).
2. Add the campaign to [frontend/src/lib/data/campaigns.ts](frontend/src/lib/data/campaigns.ts) referencing the new `brand_id`.
3. The `/explore` grid auto-renders. The `/admin/match` ranker auto-considers the new brand when you select it from the dropdown.

### Add a new creator

1. Append to [frontend/src/lib/data/creators.ts](frontend/src/lib/data/creators.ts) with a `niche`, `niche_tags`, `cited_posts`, and `followers`.
2. Scrape their TikTok / Instagram avatar to `frontend/public/avatars/<id>.jpg`.
3. Wire the avatar in [frontend/src/lib/data/creator-avatars.ts](frontend/src/lib/data/creator-avatars.ts) so `Avatar` and `getHiresForCampaign` pick it up.

### Tweak the AI interviewer

The interviewer at `/interview/[slug]` calls `POST /api/interview/turn` which proxies to Anthropic. To use your own Claude account, set `ANTHROPIC_API_KEY` in `frontend/.env.local`:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > frontend/.env.local
pnpm dev
```

Without a key, the interviewer falls back to a scripted 6-turn demo that still works on stage. The system prompt is in [frontend/src/app/api/interview/turn/route.ts](frontend/src/app/api/interview/turn/route.ts).

### Reset the demo state mid-presentation

Hit the floating `RESET ALL FOR DEMO` button bottom-right of any signed-in page. Confirms via `window.confirm`, wipes every `mercor.*` key, reloads to `/`. Use this between rehearsals so nothing carries over.

---

## Running it

### Local dev

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:3000
```

If the dev server crashes (it sometimes does after concurrent file edits — Next.js webpack cache corruption), the included watcher will recover it:

```bash
bash scripts/auto-hotfix.sh           # loop mode (blocks)
bash scripts/auto-hotfix.sh once      # one-shot (cron-friendly)
```

The script checks `localhost:3000/` and `/admin` every 60s. If either is unhealthy, it kills its own spawned dev server (with SIGTERM grace, then SIGKILL), wipes `.next`, restarts, and waits 7s.

### Type-check + smoke test

```bash
cd frontend
pnpm exec tsc --noEmit
curl -sS -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/ \
  http://localhost:3000/explore \
  http://localhost:3000/admin \
  http://localhost:3000/jobs/apply/celsius
```

All four should return `200`. If any return non-200, that route is broken.

### Production deploy

The intended target is Vercel:

```bash
cd frontend
pnpm build              # verify it builds
vercel deploy --prod    # ship
```

Domain `rallyai.org` should CNAME to the Vercel project. Backend (`api.py`) is not deployed for this demo — everything is client-side.

---

## PR + review workflow

Every PR I open is set up so a reviewer can sanity-check it in under five minutes.

| Field | Default |
|---|---|
| Assignee | `itsloganmann` (Logan) |
| Reviewer | `aarnavnaga` (Arnav) |
| Labels | `demo`, `frontend`, `enhancement` (or `bug`), `needs-bot-review`, `auto-merge` |
| Auto-merge | `gh pr merge <num> --auto --squash --delete-branch` |
| Description | Summary, test plan, rollback note |

Auto-merge fires the moment **CI green + Copilot/Bugbot green + Arnav approve**. To enable repo-level auto-merge, the repo owner needs to flip **Settings → Pull Requests → Allow auto-merge** in GitHub. Once on, every PR I open self-merges when reviews + CI go green.

### Branch protection on `main`

- All CI jobs must be green
- One approving review required (Arnav OR Copilot)
- Linear history
- No direct pushes

---

## When things break

| Symptom | First move |
|---|---|
| `localhost:3000` is down | `bash scripts/auto-hotfix.sh once` — kills + restarts |
| `Module not found: @/lib/data/...` | Check `frontend/.gitignore`. The root `data/` rule must be `/data/` (with the leading slash) so it doesn't match `frontend/src/lib/data/`. |
| Demo state stuck | Hit `RESET ALL FOR DEMO` (bottom-right floating pill) |
| Hard refresh bounces back to `/explore` | Already fixed — the `hydrated` flag in `UserProvider` waits for `localStorage` before deciding |
| Grammarly extension hydration warning | Already suppressed via `suppressHydrationWarning` on `<html>` and `<body>` |
| `/admin/match` doesn't show Logan Mann | Make sure the URL has `?focus=loganmann32`; he's pinned only when explicitly focused |
| AI interviewer keeps using the scripted fallback | Set `ANTHROPIC_API_KEY` in `frontend/.env.local` and restart `pnpm dev` |
| TypeScript errors on `frontend/src/lib/data/*` paths | Verify `tsconfig.json` `baseUrl: "./src"` and `paths: { "@/*": ["./*"] }` are intact |
| Dev server blames a `Decimal` overflow or sharp build script | Run `pnpm install --frozen-lockfile` again; the warnings are harmless |

---

## What's already done

- ✅ Landing page — mercor.com 1:1 mirror, persona switcher in top-right Log in dropdown
- ✅ Creator flow — `/explore`, application stepper, `/home`, `/referrals`, `/earnings`, `/profile`, `/deliverables` with SIMULATE TIME
- ✅ Admin flow — `/admin`, `/admin/creators`, `/admin/match`, `/admin/outreach` (Creator + Brand toggle), `/admin/campaigns/[id]` perf simulator
- ✅ AI interviewer — `/interview/[slug]` powered by Claude Haiku via `ANTHROPIC_API_KEY`
- ✅ Branding — Mercor M logo, system + Inter font, footer, no "Rally" anywhere
- ✅ Real photos — 24 Clearbit brand logos + 36 real TikTok creator pfps
- ✅ RESET ALL FOR DEMO floating pill (forward-compatible across `mercor.*` keys)
- ✅ Hard-refresh stays on the current page (hydration gate)
- ✅ `auto-hotfix.sh` 24/7 watcher — recovers crashed dev server in <60s
- ✅ Github PR automation — assignee, reviewer, labels, auto-merge wired

## What's still pending

- Vercel deploy + `rallyai.org` CNAME
- Render backend (only if we keep the Python bits live)
- Final 7-minute demo rehearsal on production
- README auto-update bot (this file should self-maintain on every PR)

---

## Internal contacts

- **Logan Mann** — `loganmann@ucsb.edu` — owner / build / demo presenter
- **Arnav Naga** — repo owner (`aarnavnaga`) — reviewer
- **Aaron Langerman** — Mercor Strategic Ops — pitch target

---

_This README is auto-maintained by a background bot that checks for drift on every push. If something here disagrees with the code, the code wins — file a one-line PR to fix the README and tag `@itsloganmann`._
