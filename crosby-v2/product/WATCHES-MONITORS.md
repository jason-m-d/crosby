# Watches & Monitors — Product Discovery Notes

*Last updated: 2026-03-23*

---

## What a Watch Is

A Watch is something Crosby is keeping an eye on — usually waiting for a specific event to happen (a reply, a deadline, a condition being met). Watches are the "always watching" feature in action.

---

## Auto-Creation

Crosby creates watches automatically by understanding context, not just explicit requests. Triggers include:

- **Explicit**: "Let me know when John replies" → obvious watch
- **Implicit from action**: "I sent the contract to Sarah" → Crosby infers a response is expected based on context (it's a contract, not a newsletter)
- **Implicit from conversation**: "Let me know when you hear back from the vendor" → watch on vendor reply
- **From email scanning**: Crosby detects the user sent an email that contextually requires a response → auto-creates watch

The key insight: Crosby doesn't need the user to say "watch for this." It reads context and understands that certain actions imply a need to follow up. "I sent this to so and so" is often enough — Crosby knows whether that email needs a response based on the content and relationship.

---

## Watch Resolution

When the watched condition is met (reply arrives, event happens):

1. **Push notification** — immediate alert
2. **Inline chat card** — persistent record in the timeline
3. **Context + follow-up from Crosby** — not just "John replied," but actual context: what John said, whether it answers the original question, and potentially follow-up questions ("John confirmed the meeting but didn't mention the budget — want me to follow up on that?")

Resolution is **automatic** — Crosby detects the condition was met and resolves the watch. No user confirmation needed.

---

## Custom Monitors

Users can set up monitors for ongoing patterns, not just one-time watches:

- "Let me know whenever I get an email from the IRS"
- "Watch for any email mentioning the Anderson deal"
- "Alert me if anyone emails about the Upland property"
- "Flag any emails from my accountant"

These are **persistent** — they don't resolve after one match. They keep watching until the user turns them off.

**Distinction:**
- **Watch** = waiting for a specific thing to happen (one-time, resolves when condition met)
- **Monitor** = ongoing pattern detection (persistent, fires every time the pattern matches)

---

## Watch Lifespan & Staleness

- Watches **do not have a fixed expiration**
- Crosby determines staleness based on context — how long is reasonable to wait for this type of thing?
  - Waiting on a casual email reply: might flag as stale after a few days
  - Waiting on a contract: might wait weeks before flagging
  - Waiting on a government response: might wait months
- When a watch goes stale, Crosby **escalates** — "It's been 2 weeks and you still haven't heard back from John about the contract. Want me to draft a follow-up?"
- Staleness escalation surfaces in nudges and briefings
- User can dismiss a stale watch ("don't worry about that anymore") and Crosby learns from the dismissal

---

## Ripple Effects

- **Email scanning**: The email scanner is the primary resolution mechanism for watches. Every incoming email needs to be checked against active watches — this is a hot path that needs to be fast.
- **Tasks**: A stale watch might become a task ("follow up with John"). Watch-to-task conversion is a natural escalation path.
- **Contacts**: Watches are often about specific people. Watch activity (created, resolved, went stale) enriches the Contact's relationship profile.
- **Notifications**: Watches share the push notification pipeline. Watch resolution notifications should feel different from nudge notifications — they're answering something specific the user was waiting for, so they should feel more urgent/important.
- **Monitors vs. email automation**: Custom monitors ("alert me whenever X emails") overlap conceptually with email automation rules. Need to keep these distinct — monitors are about awareness, automation is about action.
- **Memory**: Watch patterns feed into Crosby's understanding of how the user works. If the user frequently watches for replies from a specific person, that person is important. If watches about a topic always go stale, maybe that topic is low priority.

---

## Open Questions

- [ ] Is there a UI to see all active watches, or is it purely surfaced through chat/nudges/briefings?
- [ ] Can the user manually create a watch from the chat? ("Watch for X") — yes obviously, but what's the UX?
- [ ] How does Crosby determine staleness thresholds? Fixed heuristics, or learned from user behavior over time?
- [ ] Do monitors have their own notification settings separate from watches?
- [ ] Can watches be created from calendar events? ("Let me know if the contractor confirms the Thursday meeting")
