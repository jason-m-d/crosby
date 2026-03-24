# Proactive Messages — Product Discovery Notes

*Last updated: 2026-03-23*

---

## What Proactive Messages Are

Proactive messages are everything Crosby initiates on its own — not in response to the user. They're what makes Crosby feel alive and agentic rather than reactive. They are cron job messages, event-driven alerts, and session-aware check-ins.

---

## The Four Types

### 1. Briefing
- **Trigger:** Scheduled (morning/afternoon/evening)
- **Energy:** "Here's your world"
- **Content:** Comprehensive — calendar, email highlights, active watches, tasks, commitments, weather, news, Expert updates
- **Cadence:** 2-3x/day, user-configured times (default ~8am morning)
- **Visual:** Structured dashboard card with sections, interactive
- **Key rule:** If a briefing fires before a catch-up would, the briefing **absorbs** the catch-up content. No double-delivery.

### 2. Nudge
- **Trigger:** Cron / timer-based
- **Energy:** "You said you'd do this — you haven't"
- **Content:** Accountability — stale tasks, overdue items, commitments approaching or past deadline, unanswered emails the user should have replied to
- **Cadence:** Configurable interval (default TBD)
- **Visual:** Compact card, calmer treatment than heads-ups
- **Escalation model:**
  - First nudge: gentle ("Just a reminder — you mentioned you'd send the proposal to Sarah")
  - Second nudge: more direct ("The proposal for Sarah has been sitting for 5 days")
  - Third+: escalated ("This has been on your plate for 2 weeks. Want to do it, delegate it, or drop it?")
- **Learning:** Crosby learns from every interaction — dismissals reduce frequency for that category, engagement increases it. Escalation resets if the user acknowledges.

### 3. Heads-Up
- **Trigger:** Event-driven (real-time)
- **Energy:** "That thing you were watching just happened"
- **Content:** Watch resolutions, monitor matches, urgent email arrivals, calendar alerts
- **Cadence:** Immediate — never batched (these are the urgent ones)
- **Visual:** Distinct treatment from nudges — feels more urgent/important
- **Delivery:** Push notification immediately + inline card in timeline
- **When offline:** Stays as a standalone card in the timeline. Not folded into catch-ups. The catch-up might reference it but doesn't swallow it.

### 4. Catch-Up
- **Trigger:** Session open after idle period
- **Energy:** "Here's what happened while you were gone"
- **Content:** Bundle of everything that occurred during idle — emails received, watches resolved, tasks completed by others, calendar changes, Expert activity
- **Cadence:** Once per return from idle (default: 2 hours of no messaging to start, eventually smart/learned)
- **Visual:** Bundled card — one consolidated view, not a flood of individual items
- **Key rule:** If a scheduled briefing fires first, the briefing absorbs catch-up content. Catch-ups only fire independently when the user returns at a non-briefing time.

---

## Anti-Overwhelm Principle

**The user should never open the app to a wall of proactive messages.** This is a core design constraint. The system needs to be smart about consolidation:

- Briefings absorb catch-ups when they'd overlap
- Heads-ups stay standalone but are visually "attached" or grouped when multiple fired while offline — not scattered as separate cards flooding the timeline
- Nudges batch on the timer interval
- When catch-up + heads-ups both exist, the catch-up can reference the heads-ups ("you also got a heads-up about X — see below") while the heads-ups remain their own cards

The goal: when you open the app after being away, you see **one cohesive summary** (catch-up or briefing) plus any standalone heads-ups, grouped cleanly. Not 12 separate cards.

---

## Summary Table

| Type | Trigger | Batched? | Absorbs others? | Push notification? |
|---|---|---|---|---|
| Briefing | Scheduled | N/A | Absorbs catch-up | Yes |
| Nudge | Timer/cron | Yes (~5min window) | No | Yes (batched) |
| Heads-Up | Event-driven | Never | No (standalone) | Yes (immediate) |
| Catch-Up | Session open after idle | N/A (is itself a bundle) | Absorbed by briefing if overlap | No (user is opening the app) |

---

## Ripple Effects

- **Notification infrastructure:** Three of the four types push notifications. Needs a unified notification system with urgency tiers — heads-ups are immediate, nudges are batched, briefings are scheduled, catch-ups don't push (user is already opening the app).
- **Training/learning:** Every proactive message type feeds the learning system. Dismissals, engagement, escalation responses — all signals. The system must track per-type and per-category engagement.
- **System prompt:** When generating any proactive message, Crosby needs context about what other proactive messages were recently sent. Don't nudge about something that was just in the briefing 20 minutes ago.
- **Timeline UI:** Four distinct visual treatments needed. Plus the "attached/grouped" treatment for multiple heads-ups that fired while offline. The timeline renderer needs to handle grouping logic.
- **Idle detection:** Catch-up needs to know when the user was last active. Start simple (2 hours since last message), eventually learn patterns.
- **Deduplication:** A single item (e.g., a stale task) could theoretically appear in a briefing, a nudge, AND a catch-up. Need dedup logic — if it was in the briefing this morning, don't nudge about it 2 hours later.

---

## Open Questions

- [ ] Default nudge cron interval?
- [ ] How many escalation levels for nudges? 3? Or open-ended based on time elapsed?
- [ ] Heads-up grouping when offline — what does "attached" look like visually? Stacked cards? A mini-timeline within the catch-up?
- [ ] Can the user configure which types of proactive messages they receive? (e.g., "I don't want nudges, just briefings and heads-ups")
- [ ] Should catch-ups eventually learn idle patterns? ("Jason usually opens the app at 7am and again at 1pm — prep catch-up content accordingly")
- [ ] Dedup rules — how aggressively should items be deduped across proactive message types?
