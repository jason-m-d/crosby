# Email Management — Product Discovery Notes

*Last updated: 2026-03-23*

---

## Access & Scanning

- **Full inbox read access** by default — Crosby can see everything
- User can refine scope in Settings or by telling Crosby ("don't scan my personal emails", "only watch work email")
- **Continuous scanning** — real-time via Gmail push notifications (Pub/Sub), not periodic polling
- Scope preferences are stored and respected across sessions

---

## What Crosby Does With Email (Automatically)

### Action Item Extraction
- Scans incoming emails for things that need doing
- **Auto-creates tasks** from extracted action items — doesn't wait for user approval
- Sends a **push notification** when a task is created from email
- Also flags email-sourced tasks in **nudges and briefings**
- All of this is customizable — user can dial down sensitivity, turn off auto-creation for certain senders/categories, etc.

### Watch Auto-Creation
- When Crosby detects the user sent an email and is likely waiting for a reply, it auto-creates a Watch
- When the watched reply arrives: push notification + heads-up in chat

### Contact Auto-Addition
- New email correspondents are automatically added to Contacts with whatever context Crosby can extract (name, email, role, company, relationship to user)

### Attachment Handling
- Crosby reads **all email attachments** — PDFs (including scanned/image-only via OCR), spreadsheets, documents, images
- Extracted content is ingested into Crosby's knowledge layer (indexed and searchable via RAG)
- Whether attachments also appear as entries on the Documents page is TBD — at minimum, the content is available to Crosby for context and retrieval

### Information Extraction
- Dates, amounts, names, commitments, deadlines — all extracted from email body and attachments (including attachment content)
- This feeds into: Tasks, Calendar (potential conflicts), Commitments, and Memory

---

## Email Drafting

- User asks Crosby to draft an email in the chat
- Crosby presents the draft **inline in the chat** in a code-block style container
- Draft includes a **"Send to Gmail"** button that pushes it to Gmail as a draft (or sends directly — TBD)
- User can **edit the draft inline** directly in the chat card before sending
- User can also ask Crosby to revise it conversationally ("change the tone", "make it shorter")
- Two action buttons: **"Save as Draft"** (pushes to Gmail drafts) and **"Send Now"** (sends immediately)
- This means Crosby needs **Gmail write permissions** (create draft + send)

---

## The "Always Watching" Promise

When something important happens in email:
1. **Push notification** goes out immediately (if the user isn't in the app)
2. **In-chat card** appears when the user next opens Crosby
3. Both happen — notification is the real-time alert, chat card is the persistent record

This is the same notification infrastructure used by nudges, briefings, watch alerts, and commitment reminders.

---

## Unanswered Thread Tracking

Crosby tracks unanswered threads in **both directions**:
- **Waiting on you** — emails you received but haven't replied to (where a reply seems expected)
- **Waiting on others** — emails you sent where a reply seems expected but hasn't arrived

These surface in nudges and briefings. The "waiting on others" case auto-creates a Watch.

---

## Email Automation (Future)

- Rules, auto-responses, patterns — not fully defined yet
- Could mean: "auto-archive newsletters", "always flag emails from [person]", "draft a standard response to scheduling requests"
- This is the most open-ended part of email management — park it for now

---

## Ripple Effects

- **Tasks system**: Email is a major source of auto-created tasks. Need a `source` field on tasks (email, chat, calendar, manual) so the user can see where a task came from.
- **Watches system**: Email scanning auto-creates watches. Watch resolution triggers when the reply email arrives — so the email scanner needs to check incoming emails against active watches.
- **Contacts system**: Every email interaction potentially creates or updates a contact. Contact deduplication matters here — same person emailing from multiple addresses.
- **Notifications**: Email alerts share the push notification pipeline with nudges, briefings, and watch alerts. Need a unified notification system, not per-feature notification code.
- **Permissions**: Gmail write access (for drafts/sending) is a bigger OAuth scope than read-only. Consider asking for write permissions only when the user first tries to send, not on initial connect.
- **Settings**: Email is the feature most likely to need fine-grained user controls (scan scope, auto-task sensitivity, notification preferences per category). Settings architecture needs to support this.
- **Privacy/sensitivity**: Full inbox access means Crosby sees everything — medical emails, financial emails, personal emails. May need sensitivity detection to handle certain emails differently (don't auto-extract tasks from a breakup email).

---

## Open Questions

- [x] ~~Does "Send to Gmail" create a draft or send immediately?~~ → Two buttons: "Save as Draft" and "Send Now"
- [x] ~~Can the user edit the draft inline in the chat?~~ → Yes, inline editing directly in the card
- [x] ~~How does Crosby handle email attachments?~~ → OCR + full content extraction, ingested into knowledge layer. Whether they appear on Documents page TBD.
- [ ] Email automation rules — how are they created? Through conversation only, or also through a Settings UI?
- [ ] Sensitivity detection — should Crosby treat certain email categories differently (medical, financial, legal)?
- [ ] Multi-account support — can Crosby watch multiple Gmail accounts?
