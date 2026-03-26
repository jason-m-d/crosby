# Settings Page — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

Settings is the visual interface for viewing and managing Crosby's configuration. It's organized into grouped tabs — not a single long scrollable page.

Everything in Settings can also be changed by telling Crosby in chat. Chat is always the primary interaction; Settings is for when the user wants to browse, review, or manage everything in one place.

---

## Navigation

Settings is one of the four bottom nav tabs on mobile (Chat, Documents, Experts, Settings) and a top-level page on web.

Within Settings, content is organized into tabbed groups.

---

## Groups

### Account

- **Profile:** Name, timezone, language
- **Subscription:** Current plan, billing, upgrade/downgrade
- **Data:** Export data, delete account

### Connections

- **Connected accounts:** Gmail, Google Calendar — status, reconnect, disconnect for each
- **iMessage:** Enable/disable toggle, helper app connection status, setup wizard trigger
- **Silo connections:** Any user-created silo integrations — status, credentials management, disable/remove
- Each connection shows: status (connected/disconnected/error), last synced timestamp, and a manage button

### Notifications

- **Quiet hours:** On/off toggle, start time, end time
- **Breakthrough rules:** List of active rules with ability to add/remove. ("Always notify me if Roger emails", "Break through for deployment failures")
- **Per-category toggles:** Enable/disable push notifications for each category:
  - Briefings
  - Nudges
  - Watch alerts
  - Email alerts
  - Task reminders
  - Research completion
  - Overnight builds

### Memory & Learning

- **Memory browser:** View memories grouped by type (facts, events, patterns). Search, view details. Editing and deletion done via chat ("forget that", "actually that's wrong").
- **What Crosby has learned:** Read-only list of learned behavioral rules, grouped by category (email, briefings, tasks, tone, etc.). Each entry shows: the learned behavior, confidence level, and roughly when/how it was learned. Plain language. Changes made by telling Crosby in chat.

### Preferences

- **Tone:** Casual / professional / balanced (default: balanced). Crosby also learns this through Training & Learning, but the user can set an explicit baseline.
- **Response length:** Concise / standard / detailed (default: standard). Same — Crosby adapts, but this sets the starting point.
- **Language:** Primary language for Crosby's responses.
- **Briefing cadence:** Morning / morning + afternoon / morning + afternoon + evening. Which briefings the user receives and approximate times.
- **Dashboard:** Overnight builder on/off toggle (default: on). Whether Crosby autonomously builds dashboard widgets.
- **Quiz sessions:** Enable/disable Crosby's weekly teaching sessions (default: on).

### Activity Log

- **Full diagnostic log** of everything Crosby does behind the scenes. Reverse-chronological, filterable, searchable, read-only.
- **Filter by type:** Cron jobs, background jobs, router decisions, errors, proactive message decisions, integration health
- **Filter by status:** Success, failed, skipped, degraded
- **Filter by date range**
- Each entry is a compact row that expands on tap to show full details. Color-coded: green (success), yellow (skipped/degraded), red (failed/error).
- See ACTIVITY-LOG.md for the full spec.

---

## Design Principles

- **Simple and scannable.** Each group fits on one screen without overwhelming the user. No nested settings three levels deep.
- **Read-mostly.** Most settings are set once and forgotten. The page is optimized for reviewing what's configured, not constant tweaking.
- **Chat is always an option.** Every setting has a note or affordance indicating it can also be changed by telling Crosby. This reinforces chat as the primary interaction.
- **No internal plumbing exposed.** The user sees "What Crosby has learned: You prefer short email subject lines" — not "procedural_memory_id_47, confidence: 0.87, trigger: email.draft."
- **Connection status is honest.** If something is broken (OAuth expired, helper app disconnected, silo erroring), it shows clearly with a way to fix it.

---

## Interaction Model

| Action | Settings | Chat |
|---|---|---|
| View memories | Browse grouped list | "What do you remember about me?" |
| Delete a memory | Not directly — tells user to ask Crosby | "Forget that I prefer morning meetings" |
| View learned behaviors | Browse read-only list | "What have you learned about how I work?" |
| Change a learned behavior | Not directly — tells user to ask Crosby | "Actually, I want you to flag all vendor emails again" |
| Adjust quiet hours | Toggle + time pickers | "Change quiet hours to 10pm to 7am" |
| Add breakthrough rule | Add button + input | "Always notify me if Sarah emails" |
| Connect/disconnect account | Manage button → OAuth flow or disconnect confirmation | "Connect my calendar" / "Disconnect Gmail" |
| Change tone preference | Selector | "Be more casual" / "Keep it professional" |
| Change briefing cadence | Selector | "I only want morning briefings" |

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Memory | Memory browser lives in Settings. Editing/deletion via chat. |
| Training & Learning | "What Crosby has learned" section lives in Settings. Read-only, changes via chat. |
| Notifications | Quiet hours, breakthrough rules, per-category toggles all in Settings. |
| Connections (email, calendar, SMS) | Connection management in Settings. OAuth flows use bottom sheet browser. |
| Silos | User-created silo connections appear in the Connections group. |
| Briefings | Cadence preferences in Settings affect when briefings are delivered. |
| Dashboard | Overnight builder toggle in Settings. |
| Quiz sessions | Enable/disable in Settings. |
| App manual | Manual should document all settings and what they do. |
| Activity log | Diagnostic log tab in Settings. Full spec in ACTIVITY-LOG.md. |

---

## Ripple Effects

- **Mobile layout** — Settings is a bottom nav tab. Groups are tabs within the page. Needs to work well on phone screens.
- **Web layout** — Settings is a full page. Groups could be sidebar nav + content area, or horizontal tabs.
- **All features with user preferences** — Every configurable feature needs to check Settings for the user's preference. Chat-based changes need to update the same underlying settings.
- **Onboarding** — Some settings get their initial values during onboarding (timezone, language, connected accounts).

---

## Open Questions

- [ ] Should there be a "Reset to defaults" option for preferences? Or is that overkill?
- [ ] Does the Account group need a "connected devices" section showing where the user is logged in?
- [ ] Should Settings show usage stats? Like "Crosby has processed 1,247 emails and created 83 tasks this month." Fun but potentially noisy.
- [ ] Is there a "danger zone" section for destructive actions (clear all memory, disconnect everything, delete account)?
