# Calendar Integration — Product Discovery Notes

*Last updated: 2026-03-23*

---

## Core Capabilities

- Read Google Calendar (full access)
- Check availability
- Create and modify events
- Cross-reference meetings with contacts, tasks, email threads, and Expert context

---

## Event Creation & Modification

- By default, Crosby presents a **confirmation card** inline in the chat before creating/modifying events
- Card shows: event title, date/time, location, invitees, description
- Buttons: **"Add to Calendar"** / **"Edit"**
- This is **configurable** — power users can tell Crosby to just create events without confirmation
- Rationale: calendar mistakes are harder to undo than email drafts, especially with invitees

---

## Pre-Meeting Context

Crosby surfaces relevant context before meetings through **multiple channels**:

### Morning Briefing
- Today's meetings are listed in the briefing with key context (who's in the meeting, what's relevant)
- Each meeting entry is **clickable/tappable** — user can ask Crosby to serve a **fuller prep** from the briefing card
- Fuller prep pulls from: recent emails with attendees, related tasks, relevant Expert context, past meeting notes, contact relationship history

### Session Open / Catch-Up
- When the user opens the app before a meeting, Crosby proactively surfaces a **prep card**
- This is part of the catch-up/notification flow — not a separate feature, just smart timing

### Push Notification
- For high-importance meetings (determined by: new attendees, open action items related to the meeting, recent email threads with attendees), Crosby can send a push notification with a prep summary

---

## Scheduling with Others

- **Not in initial scope** — Crosby manages the user's own calendar only
- Eventually: check user's availability, propose times to external people, send invites
- This is a significant scope expansion (requires sending emails or calendar invites on behalf of the user) — park it

---

## Ripple Effects

- **Contacts**: Every calendar event with attendees creates or enriches Contact records. Meeting frequency is a strong signal for relationship importance scoring.
- **Tasks**: Meetings often generate action items. Post-meeting, Crosby could prompt "anything come out of that meeting?" or auto-detect action items if meeting notes are shared.
- **Email**: Meeting-related email threads should surface in pre-meeting prep. After a meeting, related follow-up emails should be connected.
- **Experts**: If a meeting is related to an active Expert (e.g., a property showing for the House Hunter expert), that Expert's context should load into the prep.
- **Memory**: Meeting patterns feed into Crosby's understanding of the user (who they meet with, how often, what topics). This is passive — no explicit feature, just enriches the memory layer.
- **Briefings**: Calendar is a primary data source for the morning briefing. The briefing needs to be smart about what's worth highlighting vs. routine meetings.

---

## Open Questions

- [ ] Does Crosby detect meeting conflicts and alert the user proactively?
- [ ] How far in advance does the prep card appear — 30 min? 1 hour? Configurable?
- [ ] Can Crosby read meeting notes or transcripts (from Zoom, Google Meet, etc.) and extract action items?
- [ ] Multiple calendar support — personal + work calendars?
- [ ] Recurring events — does Crosby treat each instance separately for prep, or learn patterns?
