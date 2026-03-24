# Notifications System — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

The notifications system is the delivery layer that connects Crosby's proactive behavior to the user's attention. It's not a separate feature — it's the infrastructure that ensures briefings, nudges, watch alerts, and other proactive messages actually reach the user regardless of whether they're in the app.

There is no notification center or inbox. The chat timeline IS the notification center. Everything Crosby says lands in the timeline. Push notifications are the channel for getting the user's attention when they're not looking at the app.

---

## Notification Channels

| Channel | When used |
|---|---|
| Chat timeline | Always. Every notification, proactive message, briefing, nudge, and alert lands inline in the chat. This is the primary record. |
| Push notification (iOS) | When the user is not actively in the app. Delivered via APNs through Expo. |
| Browser notification (web) | When the user is not actively on the web app tab. Secondary to push. |

No badge counts on the app icon — too noisy.

---

## Delivery Tiers

### Immediate
- **Watch alerts** — "The reply you've been waiting for just arrived." Time-sensitive, deliver instantly.
- **Breakthrough rules** — User-configured exceptions that bypass quiet hours and batching. "Always notify me if Roger emails" or "break through if a deployment fails."

### Batched (3-minute window)
- **Everything else during active hours** — nudges, task reminders, email flags, proactive messages, deep research completion, overnight build presentations.
- If multiple things happen within a 3-minute window, they get bundled into one rich push notification.
- If only one thing happens, it sends as a single notification after the 3-minute window closes.

### Held until morning
- **Everything during quiet hours** — except breakthrough rules.
- Held notifications get absorbed into the morning briefing. No flood of individual notifications when quiet hours end.

---

## Quiet Hours

- **Default:** 9:00 PM – 7:00 AM (user's local time).
- **User-configurable:** The user can adjust the window in Settings, or tell Crosby to change it.
- **Hard cutoff by default.** Nothing gets through during quiet hours except breakthrough rules.
- **Breakthrough rules:** The user tells Crosby what should always get through. Examples:
  - "Always notify me if Roger emails"
  - "Break through if a deployment fails"
  - "Wake me up if there's a calendar conflict tomorrow morning"
- Breakthrough rules are stored and persist until the user removes them. The user can manage them via chat ("stop breaking through for Roger") or in Settings.

---

## Push Notification Content

### Design principle
Notifications feel like **messages from a person**, not alerts from a system. Rich, contextual, conversational. Crosby's personality comes through.

### Content rules
- Include surrounding context — don't just state the alert, add what Crosby knows and what it's done to help.
- **Not:** "Task due tomorrow: Review lease terms"
- **Instead:** "Reminder that the lease review is due tomorrow and we haven't started. I pulled up the lease doc to help us get started."
- **Not:** "3 items need attention"
- **Instead:** "A few things piling up — Roger's email from Tuesday still needs a reply, the vendor quote expires Friday, and your staffing plan is overdue. Want to knock these out?"

### Batched notification format
When multiple items are bundled into one push:
- Lead with the most important/urgent item
- Briefly mention the count of other items
- Keep it scannable — the user should get the gist without opening the app

---

## Tap Behavior

- **Tapping a push notification** → deep links to the specific message/context in the chat timeline.
- If the notification is batched (multiple items), it links to the first/most important item.
- **If the user ignores a notification** and opens the app later on their own, Crosby handles it through the living greeting/catch-up system. The notification content is woven into the natural flow, not replayed as a stale alert.

---

## Proactive Message → Push Flow

When Crosby sends any proactive message to the chat timeline (briefing, nudge, heads-up, catch-up, research completion, overnight build) and the user is not in the app:

1. The message lands in the timeline as usual.
2. A push notification is generated from the message content.
3. The push follows the delivery tier rules (immediate for watches, 3-minute batch for everything else, held during quiet hours).

When the user IS in the app, no push notification — the timeline message is sufficient.

---

## User Preferences (Settings)

Notification preferences live in Settings:

- **Quiet hours:** On/off, start time, end time.
- **Breakthrough rules:** List of active rules, ability to add/remove. Also manageable via chat.
- **Per-category toggles:** User can disable push notifications for specific categories (e.g., "don't push me for task reminders, I'll check those myself"). Categories:
  - Briefings
  - Nudges
  - Watch alerts
  - Email alerts
  - Task reminders
  - Research completion
  - Overnight builds
- **Disabling push entirely** is an option, but Crosby may gently note that it won't be able to reach the user proactively.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Briefings & nudges | Briefings, nudges, heads-ups, and catch-ups are the content. Notifications are the delivery. |
| Proactive messages | The proactive message taxonomy defines what gets sent. Notifications define how it reaches the user. |
| Mobile experience | Push notifications delivered via APNs through Expo. Deep linking to specific messages. |
| Quiet hours | Morning briefing absorbs everything held during quiet hours. |
| Watches | Watch alerts are the only content type that bypasses batching (immediate delivery). |
| Training & Learning | Learning from notification engagement (taps, dismissals, ignores) feeds back into what Crosby surfaces. |
| Chat timeline | Timeline is the notification center. No separate inbox. |
| Settings | Quiet hours, breakthrough rules, and per-category toggles live in Settings. |

---

## Ripple Effects

- **Settings page** — Needs notification preferences section (quiet hours, breakthrough rules, per-category toggles).
- **Briefings spec** — Morning briefing absorbs quiet-hours held notifications. Should reference this.
- **Background jobs** — 3-minute batching window needs a small queuing mechanism for pending notifications.
- **Watch spec** — Watch alerts are explicitly immediate-delivery, bypassing the batch window.

---

## Open Questions

- [ ] Should batched notifications show a preview of each item, or just a summary? ("3 things need attention" vs. listing all three in the push)
- [ ] Should there be a "do not disturb" mode that's separate from quiet hours? Like a manual toggle for "I'm in a meeting, hold everything for 2 hours"?
- [ ] Can the user tell Crosby "notify me about this in 2 hours" — scheduled one-off notifications?
- [ ] Should notification frequency adapt over time through Training & Learning? Like if the user ignores nudge notifications 90% of the time, should Crosby reduce their frequency automatically?
