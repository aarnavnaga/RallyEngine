# Source of Truth — Aaron Iteration v3

**Canonical** numbers and copy. Every surface (deck, demo, script, prep
doc) imports from here. M3 (cross-cutting coordinator) owns this file.
Workers MUST NOT hardcode any of these values — import from
`frontend/src/lib/data/source-of-truth.ts` for runtime use.

---

## Day-1 revenue mechanics (slide 6 + cross-surface)

Anchor deal: **Logan × Celsius** signed in the demo seed data.

| Component | Pct | Base | Dollar amount | Cited |
|---|---|---|---|---|
| Placement fee on close | 20% | $850 base contract | **$170** | Headhunter contingent benchmark [27][28][29] |
| Performance kicker (per-post) | 5% | View-bonus pool | **$0–$50** | Lumanu pattern [22] |
| RL data licensing (per rubric pair) | — | Illustrative | flagged as illustrative | Mercor RL Studio market [8][9] |

**Headline phrase (verbatim across surfaces):**

> "Logan × Celsius signed: $170 placement + $0–$50 perf kicker + per-task
> RL revenue when this becomes a Mercor world."

**Take-rate constants (use these — do NOT round in surfaces):**

- `PLACEMENT_FEE_PCT = 0.20`
- `PERFORMANCE_KICKER_PCT = 0.05`
- `LOGAN_CELSIUS_BASE_USD = 850`
- `LOGAN_CELSIUS_PLACEMENT_USD = 170`  (= 0.20 × 850)
- `LOGAN_CELSIUS_KICKER_RANGE_USD = [0, 50]`

**Path-to-$1M unit math (growth slide 9):**

20% × 60 deals/month × $850 average × 12 months = **$1,224,000**.
Round to **$1.22M** in deck copy.

---

## Slide-2 broken workflow stats

- **70% of brands say finding the right creators is their biggest
  bottleneck** — Aspire, *State of Influencer Marketing 2025* (7th
  Annual). [Citation 15]
- **39% of brands still rely on manual research** — IMH/Sprout Q1 2025
  Pulse. [Citation 16]

5-step horizontal flow copy (verbatim):

1. **Brand brief** → marketing manager opens a doc
2. **DM agents** → searches IG/TikTok DMs
3. **Manual scroll** → opens 40 profiles, evaluates by eye
4. **Email volley** → 3-5 round-trips per creator
5. **Sign or pass** → guess at fit, sign contract, hope

---

## Slide-3 "Why now" stats

1. *Manual review doesn't scale when content explodes* — YouTube
   Jan 2026 enforcement: 16 channels removed, 35M subs, 4.7B views
   erased (Neal Mohan, 2026-01-12). [Citation 21]
2. *Surface signals are getting noisier* — Only 26% of consumers
   prefer AI-generated creator content today, down from 60% in 2023
   (Billion Dollar Boy *Muse Two*, 2025-11-20). [Citations 19, 20]
3. *Ad costs climbing* — Meta Q3 2025 +10% YoY price-per-ad,
   "increased advertiser demand" (Susan Li, 2025-10-29). [Citation 17]

---

## Slide-4 SIGNAL ledger

Anchor stat (REPLACED — was 78% UNVERIFIED):

- **68% of brand-creator contracts include performance metrics, up
  from 42% in 2023** — Lumanu $1B+ payouts dataset. [Citation 22]

THE MOAT row:

- *"Predictor delta vs follower-baseline +18% (last 90d)"*. Mock for
  v1; framed as a Prove-by-August proof point.

---

## Slide-5 VERIFICATION ladder

Stats:

- **37.2% of influencer followers are fake/inauthentic; ~$4.6B/yr
  brand waste** — SociaVault 100K-account audit 2025. [Citation 24]
- **55% of Instagram influencers have engaged in fraudulent activity**
  — HypeAuditor State of Influencer Marketing 2024. [Citation 25]
- **FTC max civil penalty: $53,088 per violation** (Final Rule
  banning fake reviews effective 2024-10-21). [Citation 26]

4-step ladder:

1. **Handle ownership** — verify the TikTok/IG handle resolves to a
   live profile with matching display name.
2. **Fingerprint** — scrape recent post timestamps + caption style to
   confirm consistent authorship.
3. **Niche claim** — compare self-declared niche tags to last 30 posts'
   actual content (slide 5 honestly labels: *manual review for v1*).
4. **Audience truth** — sampled audience demographics check (slide 5
   honestly labels: *manual review for v1*).

---

## Slide-6 day-1 revenue

See top of file. The slide MUST show $170 placement + $0–$50 perf +
RL licensing for the Logan × Celsius signed deal.

---

## Slide-7 Prove-by-August

Four falsifiable proof points:

1. Workflow pain real (10 brand interviews).
2. Verification works (1,000 creators screened).
3. Quality scoring beats baseline (vs follower-count on 5 brands).
4. Outcome prediction holds (predicted vs actual on 10 finished
   campaigns).

Verdict gate copy: *"4 of 4 → strategic adjacency. 2 of 4 → kill it."*
Plus *"Paid like a headhunter. Placement on signed deals."*

---

## /admin overview tile copy

- Tile 1: *Campaigns run · 47 · brand-side outcomes feed the model*
- Tile 2: *Outcomes recorded · 31 · predictor delta vs follower-baseline +18% (last 90d)*
- Tile 3: *RL tasks graded · 312 · expert-rated rubric pairs licensed to AI labs*

5-node pipeline footer: **Source → Verify → Match → Outreach → Evaluate → ROI**

---

## /admin/outreach copy

- AUTOMATED pill text: `AUTOMATED`
- Counter copy: *"47 of 50 outreach drafts sent without edits"*
- Revenue micro-strip on contract preview: *"Placement fee on close:
  $170 · Per-post performance kicker: $0–$50."*

---

## RL Studio empty-state copy (W3)

Verbatim from `studio.mercor.com/start/`:

> *"Welcome to Studio. No projects assigned yet. Contact the Mercor team to get started."*

Worlds list (creator vertical): **Beauty / Fitness / Gaming / Food / Fashion**.
Demo defaults to Fitness for the Logan × Celsius project.

Status pill cycle: `Pending → In Review → Approved → Needs Edits → Discarded`
Roles: `Writer · Reviewer` (Reviewer is default for Aaron's view).
Rating UI: pairwise A/B with 1–5 winner radio + 1–7 Likert sliders +
free-text *"improvement areas."*

---

## Mercor growth-team SF roster (§12.1)

| # | Name | Title | Lean into |
|---|---|---|---|
| 1 | Luna Aizarani | GM, Growth | Slide 6 day-1 revenue + Slide 7 Prove-by-August |
| 2 | Eugene Ling | GM, GTM | Slide 1 thesis reframe + RL licensing line on Slide 6 (caveat: Scale AI lawsuit defendant — public record only) |
| 3 | Eddie Huang | PM, Growth | Growth slide #9 unit math (20% × 60 × $850 × 12 = $1.22M) |
| 4 | Eda Topuz | PM, Growth | RL Studio emulation page + Slide 4 *signal* framing |
| 5 | Neil Banerjee | Growth Ops | Creator-intake honesty + verification queue |

Open roles to namecheck: Growth Partnerships Lead, Senior Growth Lead,
Growth Marketing Lead, 2× PMM. Recent leadership: Sundeep Jain
(President), Foody+Hiremath (Co-CEOs) per Forbes 2026-04-15.

---

*Last updated: 2026-04-29. Edit this file FIRST when changing any
canonical number — workers re-import on next run.*
