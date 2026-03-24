# Chat Timeline Model — Product Discovery Notes

*Last updated: 2026-03-23*

---

## The Core Model

The chat is not a message log. It's a **mixed-content timeline**.

Regular conversation messages, briefing cards, nudge cards, watch alerts, research reports, action item lists — all live inline in the same scrollable timeline. Each content type has its own visual treatment, but nothing breaks out into a separate view. Everything scrolls away naturally like regular messages.

This is intentional. Keeping everything in the timeline preserves context — you can see a briefing card, respond to it inline, and the conversation continues without a context switch.

---

## Content Types in the Timeline

| Type | Visual Treatment | Interactive? |
|---|---|---|
| Regular message (user) | Standard chat bubble | No |
| Regular response (Crosby) | Standard chat bubble | No |
| Morning briefing | Card — dashboard-like, structured sections | Yes |
| Proactive nudge | Card — compact, list of items | Yes |
| Watch alert | Card — single item, action buttons | Yes |
| Research report | Card — expandable, sections | Yes |
| Action item list | Card — checkable items | Yes |
| Commitment reminder | Card — single commitment, action buttons | Yes |

---

## Key Design Principles

- **Visually distinct but inline** — cards look different from message bubbles but stay in the same timeline
- **Interactive inline** — user can act on a card (check off a task, dismiss a nudge item, reply to a watch alert) without leaving the chat
- **Scrollable** — cards scroll away like any other message; they don't pin or persist unless pinned
- **Contextually connected** — a nudge card can be responded to immediately and the conversation picks up from there

---

## Open Questions

- [ ] Do cards have a "seen" or "acted on" state that changes their appearance?
- [ ] Can the user pin a card so it doesn't scroll away?
- [ ] What happens when a briefing card is very long — does it collapse/expand inline?
- [ ] Do nudge cards expire visually if the items are resolved before the user sees them?
- [ ] Is there a way to filter the timeline (show only briefings, show only nudges, etc.)?
