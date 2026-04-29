# Aaron Langerman — call script

**6 slides + live demo. ~7–8 min total.**
**Tone:** how Aaron's debate kids talked when they had a clean case. No hedging, no tech jargon, no marketing words.

---

## OPEN — Logan, ~15s

> "Aaron — Aarnav and I are both on the CUA-envs contract for Anthropic, under Drew. This isn't a separate company. It's an internal proposal: add a new Expert Domain to Mercor called **Creator Experts**. Six slides, then I'll show you the demo at musing-maxwell-84ed29.vercel.app."

---

## SLIDE 1 — Cover — skip, 5s

> "You'll see by slide 5 why we want to build it over the summer and ship at the start of Q4."

---

## SLIDE 2 — Three numbers — Logan, ~30s

> "Three external numbers, none of them ours.
>
> Goldman: $480B creator economy by 2027.
>
> Impact's 2026 study: UGC ads from creators get 4× the click-through of polished agency ads, at half the cost.
>
> 74% of brands are moving budget into creator programs this year.
>
> Three signals, same direction. The market is bigger than the model."

---

## SLIDE 3 — Why this. Why now — Aarnav, ~50s

> "Three windows opened in the last six months.
>
> **One.** Handshake AI launched. 18 million college students priced as cheap RLHF labor. They're aiming directly at Mercor's college funnel.
>
> **Two.** Brand-voice RLHF — the data type that teaches a model what a Celsius ad sounds like — has no vendor. Anthropic and OpenAI both need it inside six months. Surge can't run it. Scale can't run it. The labor pool isn't engineers. It's creators.
>
> **Three.** Mercor's own marketing is paying Meta to find creators who already exist on TikTok. That spend leaks. The marketplace could absorb it.
>
> All three windows close in roughly two quarters."

---

## SLIDE 4 — Proof + moat — Logan, ~35s

> "Cluely paid out $500K to creators through their bounty program. **All-time.** That's the proof the play works.
>
> Mercor pays $1.5M **every day** in contractor wages. The marketplace, the contracts, the Stripe rails — already shipped.
>
> Cluely proved it. Mercor has the moat. We just point the existing machine at a different labor pool.
>
> Aarnav and I have already run small versions of this through UCSB and fraternity networks. It made real revenue. Mercor runs it bigger."

---

## SLIDE 5 — The plan — Aarnav, ~70s

> "Two phases.
>
> **Summer.** Bring Logan and me on as interns. We build the Domain row, ship the application stepper, close 5–10 brand customers, and run the first campaigns. By August: real revenue and clean PMF data.
>
> **Q4.** Hand it to Mercor's eng and growth teams. They review what worked, fold the Domain row into the product, deploy.
>
> No new headcount line. No outside funding. We're already on payroll for CUA-envs.
>
> Three questions for you, Aaron. We don't take these to anyone else without your read first.
>
> 1. Where does Creator Experts live inside Mercor — whose org owns it?
> 2. Hourly pricing, or per-post with a relevant-eyes bonus?
> 3. Who closes brand deals — Mercor's GTM, or do Logan and I run it during the pilot and hand off?"

---

## SLIDE 6 — Demo — Logan, ~10s

> "That's the case. The demo's the rest of it. I'll walk it as a creator first — me, real 22.7K TikTok — then switch to your account in admin."

**Live at:** `musing-maxwell-84ed29.vercel.app`

---

## DEMO — Logan, ~3 min total

Format: **[click]** = what Logan does. *Italic* = what Logan says. Bracketed UI cues are landmarks Aaron should see.

### Part 1 — Logan as creator (~90s)

**[click]** Top-right persona dropdown → **"I am a creator (Logan)"**. Lands on `/home`. Click **Explore** in the sidebar.

> *"Your Explore page. Same grid you use today. Look at the Domain filter — we added one row: Creators & Influencers. The cards are real brand campaigns. Celsius, Bucked Up, Bloom, Ghost — all advertising on TikTok today."*

**[click]** Celsius card. Right-rail panel slides in.

> *"Right-rail panel — your exact pattern. Posted by Celsius. Application checklist: Resume, social connect, creator interview, work auth. Your stepper. Different question bank."*

**[click]** `Continue Application` → stepper Step 2: **Connect TikTok**.

> *"I'm signed in as me — @loganmann32, real account, 22.7K followers, 411K likes."*

**[click]** Submit through the rest of the steps fast. Land on confetti page.

> *"Your existing UI. New Domain. Zero new code on your side."*

**[click]** Sidebar → `Referrals`.

> *"412 friends just got pulled in from my TikTok and Instagram. Most of them are STEM kids at UCSB and Stanford — your exact ICP for the 1,000-a-week hiring funnel. Same Mercor referrals UI. TikTok and IG icons instead of LinkedIn."*

> *"This is the meta-moat: every creator I onboard brings their network into Mercor's hiring pipeline. The same audience watching my gym TikToks is the audience you're paying Meta to find."*

### Part 2 — Switch to Aaron as Mercor admin (~90s)

**[click]** Bottom-left sidebar avatar (tooltip says **Switch persona**). Lands on `/admin`.

> *"Now I'm signed in as you. Top of the page — Brand-voice fit, Comment-relevance, Audience overlap, Auto-draft queue. Below that, the GMV chart trends to ~$24K week-over-week. Mercor's dashboard pattern, just for the brand side."*

**[click]** Sidebar → `Match`. Pick **Celsius** from the brand dropdown.

> *"Manual matching workbench. Pick Celsius. Logan is pinned #1 with high similarity, high impact, and a suggested rate that scales with his impact score."*

**[click]** Expand the Logan row. Rationale paragraph appears.

> *"Watch this. The rationale cites my actual posts back by URL — `tiktok.com/@loganmann32/video/7608429326211501326` — the 'Average quant' video. Hashtags `#janestreet #math #quant #ucsb` quoted as the audience-overlap signal. No black box. Brendan's bar."*

**[click]** Pick 5 creators → `Generate outreach`. Lands on `/admin/outreach`.

> *"The opener cites Logan's Average-quant video by URL and Celsius's college-ICP positioning — that's the RAG payoff. Approve sends. Edit fine-tunes."*

**[click]** Open an in-flight haggler. Type **"$700?"** in the reply box.

> *(reply lands fast — typically 1-3 seconds via Gemini Flash Lite, with a brand-aware fallback if the upstream stalls)* *"'Love the ICP fit — can we do a study-session + gym clip combo? Would land on FYP for sure.' Persona-aware sim. The CRM at 1,000-hires-a-week scale, just for the brand side."*

**[click]** Sidebar → `/admin/campaigns/[id]`. Live perf curve ticking.

> *"Live campaign. Views tick every 8-12 seconds. The pricing breakdown card shows the formula: Base floor + impact term × 0.15 + relevant-eyes × 0.05. Call out whatever the live numbers show — the point is the payout is grounded in comment relevance, not just sales. Fair to creator and brand."*

### Close — Logan, ~10s

> *"Real creator, real brands, real RAG citing real posts, transparent pricing, persona-aware ops. Mercor's UI. Half a day of integration. That's the case."*

---

## If Aaron pushes back — pre-prepared

| Pushback | Answer |
|---|---|
| *Is the campaign sim real?* | "Performance numbers are simulated from the similarity formula. Every creator, brand, post, and comment in the demo is real and verifiable from your phone. Only the email send is mocked." |
| *Why an internship? Why not a hire?* | "Lowest commitment for Mercor. Summer ships clean PMF, we move. If it doesn't, we wrap. No headcount line opens, no separate brand sits over it." |
| *What if Mercor's GTM should sell brands?* | "Then we run the first 5–10 deals during the pilot, hand off the playbook, Mercor's team takes the rest. We just need a clear line." |
| *Why not Handshake?* | "Handshake is a job board. They don't have Mercor's contracts, Stripe Connect, or AI lab relationships. Adding a creator side to Handshake means rebuilding everything Mercor already has. Adding it here is one PR." |
| *Why bring this to me, not Brendan?* | "Three reasons. You taught Brendan how to argue. You see the marketplace gaps daily. And we'd rather have a clean answer to the three questions before they go to anyone else." |

---

## Cut-cards if we run long

- Drop the Cluely card narration on slide 4 — the numbers do the work.
- Skip the "Mercor's UGC spend" timer on slide 3 if Aaron is already nodding.
- Hard floor: slides 2, 4, 5 + the demo. Everything else is optional.

---

**Total:** ~4 min spoken on the deck, ~3 min demo. Buffer 5 min Q&A. Cap at 15 min.

---

## Demo hazards — do not do these

- **Don't change the brand dropdown off Celsius on `/admin/match`.** Logan is only pinned for `celsius` (`pin_first_for: ["celsius"]` in `creators.ts`). For any other brand he ranks by raw cosine + impact and almost certainly drops off the visible top-14 list. The wow moment evaporates.
- **Don't hard-refresh `/admin` mid-demo.** AppShell waits for hydration before rendering, but the sidebar may briefly show creator nav (~80ms) before flipping to admin nav. Cosmetic, but distracting on stage.
- **Don't open `/admin/interviews/<id>` unless rehearsed.** The page is reachable from `/admin/match` row links; it isn't part of the scripted flow. Renders fine for creators with cached interviews; behavior with no interview history is unverified.
- **Don't dry-run the haggler reply minutes before the call.** Gemini Flash Lite quota throttles fast. The route now falls back to a brand-aware static template (server-side, returns 200 not 502), so the demo never shows an error — but the fallback voice is fixed text, not LLM-generated.
- **Don't skip clicking Explore in the sidebar after creator login.** Creator login lands on `/home`, not `/explore`. Click Explore to start the warmup tour.
