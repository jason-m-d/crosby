# Product Discovery — Status & Outstanding Items

*Claude keeps this file current as discovery progresses.*

---

## What We're Doing

We're conducting product discovery for Crosby v2 — a ground-up rebuild. The goal is to produce a micro-detailed PRD that covers every feature, flow, and edge case, detailed enough that Claude Code could one-shot the implementation.

The process: structured interview, one feature area at a time, going deep on each. Every resolved decision gets filed into a dedicated product doc. Open questions and ripple effects are tracked.

---

## Completed Feature Areas

| Feature | Doc | Status |
|---|---|---|
| Feature inventory (17 features) | FEATURES.md | First pass complete — living doc |
| Experts / Projects | EXPERTS.md | Core model resolved (two access modes, context tiers, lifecycle) |
| Chat timeline model | CHAT-TIMELINE.md | Core model resolved (mixed-content timeline, inline interactive cards) |
| App structure | APP-STRUCTURE.md | 3 default pages, chat-native everything else, "edit own UI" concept parked |
| Email management | EMAIL-MANAGEMENT.md | Deep pass complete (scanning, drafting, attachments, watches integration) |
| Calendar integration | CALENDAR-INTEGRATION.md | Deep pass complete (confirmation cards, pre-meeting prep, own-calendar only) |
| Watches & monitors | WATCHES-MONITORS.md | Deep pass complete (auto-creation, resolution, watch vs monitor, staleness) |
| Briefings & nudges | BRIEFINGS-NUDGES.md | Deep pass complete (visual distinction, batching, quiet hours, learning from all actions) |

---

## Currently Discussing

**Ready for next feature area.** Artifacts and proactive messages complete. Pick any from the backlog below to continue.

---

## Feature Areas Still To Cover

- [ ] Notifications system (push, in-app, batching, preferences) — mostly covered in PROACTIVE-MESSAGES.md, may need technical pass
- [x] ~~Commitment tracking~~ → same system as tasks with behavioral flag, faster escalation, accountability tone
- [x] ~~Decision tracking~~ → quiet capture, drift detection, pattern recognition ("last time we did X")
- [ ] Persistent memory (architecture, what's stored, memory browser, contradiction handling)
- [ ] Contacts (auto-creation, enrichment, relationship scoring, UI)
- [ ] Notepad (ephemeral vs persistent, auto-expire, user visibility)
- [ ] Deep research (background execution, report format, delivery)
- [ ] Web search (quick vs deep tiers, inline vs report)
- [ ] Training & learning (what Crosby learns, how, feedback loops)
- [ ] Push notifications (technical: PWA vs native, delivery infrastructure)
- [ ] Settings page (what's configurable, structure)
- [ ] Onboarding / cold start (first-time experience, what Crosby needs to get started)
- [ ] Mobile experience (responsive web, PWA, native?)
- [ ] Text/SMS integration (if in scope for v2)

---

## Key Decisions Made So Far

- 3 default pages: Chat, Documents, Settings. Everything else is chat-native.
- Experts have two access modes (Direct + Ambient) with Tier 1/Tier 2 context loading.
- Chat is a mixed-content timeline — cards, messages, alerts all inline and scrollable.
- Email: full inbox access, continuous scanning, auto-task creation, inline draft editing with Send/Draft buttons.
- Calendar: confirmation cards by default for event creation, pre-meeting prep via briefing + session open + push.
- Watches: auto-created from context, resolve with notification + card + follow-up context, staleness is AI-determined.
- Briefings: 2-3x/day (morning/afternoon/evening), structured dashboard cards, customizable by conversation.
- Proactive messages taxonomy: briefings (scheduled), nudges (cron, escalating), heads-ups (event-driven, never batched), catch-ups (session open after 2hr idle).
- Briefings absorb catch-ups when they overlap. Anti-overwhelm is a core design constraint.
- Nudges escalate over time (gentle → direct → "do it, delegate it, or drop it").
- Crosby learns from every user action — not just dismissals, also engagement, taps, reads.
- Artifacts: Crosby-created documents, displayed in side panel, two-way editable (user + Crosby), interactive elements (checkboxes etc.), tied to Experts as context. Documents page gets Documents tab + Artifacts tab.
- Tasks & commitments: same underlying system, commitment flag changes escalation speed and nudge tone. Commitments never silently expire — Crosby flags first.
- Decisions: quietly logged, surfaced on drift detection, on request, or when similar situations arise.
- Documents: flat list with search, all uploads appear regardless of source, tagged by origin.
- Crosby learns from dismissals to avoid becoming annoying.
