# Aaron Langerman demo — day-of operating checklist

Logistics for the call. The script lives in `aaron-call-final.md` (what to say, what to click, what to do mid-demo if something visibly breaks). This doc covers the things that happen *around* the demo: pre-flight setup, recovery moves that don't fit naturally in the script, and the immediate wrap-up.

Live URL: **https://musing-maxwell-84ed29.vercel.app**

---

## T-15 minutes — pre-flight

Run through this once, in order. Every box is a 5-second check. Total: 60-90 seconds.

- [ ] **Laptop on charger.** Battery dead mid-call is the most expensive way to lose this.
- [ ] **Wi-Fi steady.** Run a 30-second speed test. If you're tethering, bring the hotspot up before the call so you're not fumbling.
- [ ] **Browser sanity.** One window. One tab. Close every other tab — favicons, leaks, accidental Cmd+Tab during a screen share, all gone.
- [ ] **Open the demo URL** in a fresh tab.
- [ ] **Sign in as Aaron** via top-right Log in → "I am on the Mercor team (Aaron)". Land on `/admin`. Confirm the avatar in the bottom-left of the sidebar is Aaron, not Logan.
- [ ] **Sidebar order:** Overview / Experts / Match / Inbox / Campaigns. If Match is missing, hard-refresh once.
- [ ] **Match dropdown locked on Celsius.** Click Match in the sidebar. Confirm the brand dropdown reads "Celsius · energy" and Logan Mann is row 1 (22.7K · 0.71 · 67 · $203).
- [ ] **DevTools closed.** Demo presenter shouldn't see the inspector pane mid-call.
- [ ] **Slack quiet.** Set status to "in a meeting", silence Slack notifications. macOS Focus mode ("Do Not Disturb") on for the call window.
- [ ] **Click RESET ALL FOR DEMO** (bottom-right corner) to wipe persona/deliverables/timers back to seed. Then re-sign-in as Aaron. This guarantees a clean state for the live walk.
- [ ] **Mute notifications inside Chrome too** — extensions, Gmail badge counts, calendar pop-ups. The screen share will catch all of them.
- [ ] **Test screen share** with the Zoom/Meet tile beforehand so you know which window to share.

If any of the above fails, fix it before joining the call. The pre-flight is the place to discover problems, not at minute 2 of the demo.

---

## During the call — when something visibly breaks

The call script (`aaron-call-final.md`) covers the in-script recovery for Gemini stalls. This section covers everything else.

| What you see | What to do | What to say |
|---|---|---|
| Page hangs for >5s on a navigation | Wait 3 more seconds. If still stuck, hit RESET, re-sign-in, jump back to the last verified stage. | "Vercel cold start — give it a beat." |
| Sidebar is missing the Match item | Hard-refresh once (Cmd+R). If still missing, RESET → re-sign-in → Match should appear. | "Live build — caching layer." (Don't lie about it; just keep moving.) |
| Match dropdown switched off Celsius | Click the dropdown, click Celsius. Logan only ranks #1 for Celsius. Other brands push him out of the visible top-14. | "Brand switcher — not relevant for what I'm showing you. Back to Celsius." |
| Haggler reply sounds like boilerplate | This is the brand-aware fallback (see call script). Don't apologize. | "Quota throttled — that one's the static fallback, the earlier ones were the real model." |
| Wrong persona showing (Logan instead of Aaron) | Click Aaron's avatar in the bottom-left of the sidebar — the Switch persona action toggles back. | "Quick toggle — same demo, brand-side view." |
| Console error visible (you cracked DevTools open) | Close DevTools. Don't draw attention to it. | (Say nothing. Move on.) |
| Live perf numbers on `/admin/campaigns/celsius-college-q2` aren't ticking | Wait 12 seconds. If still static, navigate away and back — the tick interval restarts on mount. | "Perf counter resets on each load — let me reload to show the live tick." |
| Apply page or any creator-side route shows "Redirecting..." for >2s | Persona is still admin. Avatar bottom-left → switch to Logan, then re-navigate. | (Just do the switch silently.) |

**Universal recovery:** the bottom-right RESET ALL FOR DEMO button. One click resets persona, deliverables, deal state, and timers back to seed. Use it between dry-runs, not during the live call unless you've already lost the thread.

**Don't:**
- Click Action Items on `/admin` — they navigate elsewhere and break the flow.
- Switch the brand dropdown on `/admin/match` away from Celsius.
- Open more than 4 outreach threads in a row (Gemini quota gets noisier; the fallback fires more often).
- Apologize for anything. The number of demos that crash because the presenter said "sorry, give me a sec" is ~100% in my experience.

---

## T+0 — immediately after the call

Before you do anything else, while the conversation is still in your head:

- [ ] **Send Aaron the demo URL** in Slack/email even though he just saw it: `https://musing-maxwell-84ed29.vercel.app`. Add the persona-switch hint: "Top-right Log in → 'I am on the Mercor team' to land on the admin view."
- [ ] **Capture his three questions** verbatim. Even if you already answered them on the call. The follow-up doc lives or dies on whether you got the questions right.
- [ ] **Capture his pushback** verbatim. The objection handler table in the call script is updated post-call from this list.
- [ ] **Note any new objections** he raised that weren't in the prep doc. These go straight into round 11 of the prep doc.
- [ ] **Log the meeting** in whichever CRM Mercor uses for warm convos (Notion / Linear / Slack thread — pick one and stick to it).
- [ ] **Schedule the next touch** within 30 minutes if the call ended on a yes-ish. Cold leads die in 48 hours; warm asks die in 24.
- [ ] **Close the demo tab.** Don't leave it open in a browser you might screen-share later for an unrelated thing.

If the call ended on a "no" or a soft no:
- [ ] Don't reply same-day. Sleep on it. Reply 24 hours later with one specific thing you'd change based on his feedback.
- [ ] If the no was "wrong scope" — that's an opening to come back smaller. Note what scope he'd actually entertain.

---

## Numbers to keep in your head (for live questions)

- **Logan row on Match:** 22.7K followers, 0.71 sim, 67 impact, $203 (range $700-$1,100)
- **Top-5 campaign total:** $6,241 (Logan $203, Jenny $1,507, Jen $1,510, Adrian $1,506, Cassey $1,515)
- **Comment relevance avg:** 38%
- **Pricing formula:** `max(base_floor, impact × 0.15) + relevant_eyes × 0.05`
- **Live tick interval on campaigns page:** every 8-12 seconds
- **Haggler reply latency:** 1-3 seconds (Gemini Flash Lite), <500ms server fallback if Gemini stalls
- **Goldman creator-economy projection:** $480B by 2027
- **Brand UGC vs agency CTR:** 4× higher at half the cost
- **% brands shifting budget to creator programs in 2026:** 74%

If Aaron asks "what would the second cohort cost?" or "what's the formula for sim score?", these numbers are what you should be reaching for.

---

_Last verified against prod on 2026-04-29._
