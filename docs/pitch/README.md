# Aaron Langerman pitch — doc set

Internal Mercor proposal for a new Expert Domain — *Creator Experts* — from Logan + Aarnav (both on the CUA-envs contract for Anthropic under Drew Geoly).

## Files

| File | Purpose |
|---|---|
| [`Mercor-Creators-Domain.pptx`](./Mercor-Creators-Domain.pptx) | The deck. 6 slides, Mercor-styled. |
| [`aaron-call-final.md`](./aaron-call-final.md) | **Live call script.** Verbatim numbers, button text, URLs from prod. What Logan says + what Logan clicks during the demo. |
| [`aaron-demo-day-checklist.md`](./aaron-demo-day-checklist.md) | **Day-of operating checklist.** T-15 pre-flight, mid-call recovery moves, T+0 wrap-up. |
| [`aaron-call-script.md`](./aaron-call-script.md) | Historical script — pitch-deck era, kept for reference. The `final` doc supersedes it. |
| `mercor-logo.png` | Logo asset embedded in the deck. |

## Slides

1. Cover — "Creator Experts." A new Expert Domain for Mercor.
2. Three numbers — $480B creator economy by 2027 (Goldman), 4× UGC ad CTR (Impact 2026), 74% of brands moving budget to creators (Influencer Marketing Factory 2026).
3. Why now — Handshake AI / brand-voice RLHF / Mercor's UGC spend leaking to Meta.
4. Proof + moat — Cluely $500K all-time vs Mercor $1.5M/day.
5. Plan — Summer intern build → Q4 deploy with eng + growth + 3 questions for Aaron.
6. Live demo — `musing-maxwell-84ed29.vercel.app`.

## Three questions for Aaron

1. Where does Creator Experts live inside Mercor?
2. Hourly pricing, or per-post with a relevant-eyes bonus?
3. Who handles brand-side sales — Mercor's team or ours during the pilot?

## Build

```bash
pip install python-pptx
python3 scripts/build_aaron_deck.py
# outputs docs/pitch/Mercor-Creators-Domain.pptx
```
