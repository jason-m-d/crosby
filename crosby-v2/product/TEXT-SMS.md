# Text / SMS Integration — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

Optional iMessage monitoring that gives Crosby context and commitment tracking from text conversations. Off by default. Power-user feature that requires a Mac — not part of the core experience, but available for users who want it.

For users without a Mac or who don't want the integration, the fallback is simple: tell Crosby about texts in conversation. "Roger just texted me he can't make Thursday." Crosby captures it, creates tasks/watches, tracks commitments — no integration needed.

---

## Why It's Limited

Apple doesn't offer an iMessage API. There's no elegant, non-techy way to get real-time iMessage access. The only reliable approach is a local macOS helper that monitors the Messages database and forwards new texts to Crosby's API.

This means:
- Requires a Mac that's running
- Apple could break it with an OS update
- It's inherently a power-user feature

Given these constraints, this is framed as an optional add-on — not a core feature.

---

## Setup Experience

The goal: once the user decides they want it, setup is as painless as possible. One-click to start, guided wizard does the rest.

### Setup wizard

1. **User enables it** — "Enable iMessage monitoring" toggle in Settings, or tells Crosby "set up text monitoring."
2. **Crosby explains** — Before anything happens, Crosby explains how it works and the requirements:
   - "This lets me see your text messages so I can track commitments, watch for replies, and keep context from your conversations."
   - "It requires your Mac to be running. I'll install a small background app that watches for new messages and sends them to me."
   - "Your Mac needs to be on for this to work. If it's off, I just won't receive texts until it's back on."
3. **User approves** — Structured question card: [Set it up] [Not right now]
4. **Guided install** — Crosby walks through step by step:
   - Download the helper app (lightweight macOS menu bar app)
   - Open and authorize it (grant access to Messages database)
   - Confirm it's connected
5. **Confirmation** — "You're set up. I can see your texts now. I'll use them for context, commitments, and watches — same as email."

### The helper app

- Lightweight macOS menu bar app — runs in the background, invisible after setup.
- Monitors the local iMessage SQLite database for new messages.
- Forwards new messages to Crosby's API (encrypted in transit).
- Shows a small menu bar icon with connection status.
- Auto-launches on login (configurable).
- Minimal resource usage — just watches for database changes, no heavy processing.

---

## What Crosby Does With Texts

Once connected, texts are treated like another communication channel — similar to email but lighter weight.

### Context
- Text conversations are available as context when relevant. If the user asks "what did Roger say?", Crosby can reference recent texts.
- Text content is searchable — "find the text where Sarah mentioned the lease."

### Commitment tracking
- Crosby extracts commitments from texts the same way it does from email and conversation. "I'll send that over tomorrow" → tracked commitment.
- Watch creation — "I texted the vendor about pricing" → Crosby watches for a reply.

### Cross-channel correlation
- Crosby correlates texts with email, calendar, and contacts. If Roger texts about a meeting that's on the calendar, Crosby connects them.
- Entity resolution applies — "Roger" in texts is the same Roger in email and contacts.

### What Crosby does NOT do with texts
- **Cannot send texts.** Read-only. Crosby can draft a text response as a suggestion in chat, but the user sends it manually from their phone.
- **Does not store full text history.** Crosby processes recent texts for context and commitments, but doesn't build a permanent archive. The user's Messages app is the archive.

---

## Graceful Degradation

- **Mac is off:** Crosby notes it hasn't received texts recently but doesn't error or nag. "I haven't seen any texts since yesterday — your Mac might be off. No worries, just let me know if anything came up."
- **Helper app disconnects:** Crosby surfaces a gentle note, not an alarm. "Heads up — I lost my connection to your texts. You may need to check the helper app on your Mac."
- **User without a Mac:** Feature doesn't appear in Settings (or appears grayed out with explanation). The manual fallback (telling Crosby about texts) always works.
- **Integration breaks after OS update:** Crosby detects the disconnection and explains what happened. "Looks like a macOS update may have broken the text connection. I'll let you know when there's a fix."

---

## Privacy & Security

- Text content is sent encrypted to Crosby's API (HTTPS).
- Texts are processed for context and commitments, not stored as a permanent archive.
- The user can disable the integration at any time — toggle in Settings or tell Crosby "stop monitoring my texts."
- The user can exclude specific contacts from monitoring if desired.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Email management | Texts are a parallel communication channel. Same commitment extraction, watch creation, and cross-referencing patterns. |
| Contacts & entity resolution | Text senders are resolved against the contact graph. Same person across texts, email, and calendar. |
| Watches | "I texted the vendor" can create a watch for a reply, same as email. |
| Tasks & commitments | Commitments extracted from texts are tracked the same as email/conversation commitments. |
| Memory | Crosby does NOT write text content to persistent memory automatically. The user can explicitly say "remember what Roger said about the lease" to promote specific text content. |
| App manual | Manual should document this as an optional feature, explain requirements, and cover the manual fallback. |
| Settings | Toggle for enable/disable, helper app connection status, contact exclusions. |

---

## Ripple Effects

- **macOS helper app** — A separate build artifact. Lightweight menu bar app that needs its own development, distribution, and update mechanism.
- **Settings page** — New section for text/SMS integration with toggle, connection status, and setup wizard trigger.
- **API** — New endpoint to receive forwarded texts from the helper app. Authentication between helper app and Crosby's API.
- **Contact entity resolution** — Phone numbers from texts need to be matched to contacts.

---

## Open Questions

- [ ] Should the helper app be distributed through the Mac App Store (easier install, harder to get approved) or direct download (easier to ship, user has to trust it)?
- [ ] How far back does the initial sync go? Just new texts from setup onward, or does it backfill recent history (last week, last month)?
- [ ] Should there be an Android equivalent? Google Messages might be more API-friendly, but that's a separate effort.
- [ ] Could a future iOS Shortcut / Automation approach replace the Mac helper? Apple has been expanding Shortcuts — worth monitoring.
- [ ] Group texts — does Crosby monitor group chats or just 1:1? Group chats could be noisy.
