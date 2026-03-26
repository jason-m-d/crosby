# Error Handling & Graceful Degradation

*How Crosby behaves when things go wrong — AI providers, integrations, background jobs, and stale data.*

---

## Philosophy

Silence is worse than an error. Crosby is a relationship — if something is broken, the user should know, but it should never feel like an alarm going off. Non-intrusive, easily dismissed or solved. The system keeps working around failures; it doesn't grind to a halt.

---

## AI Unavailability (OpenRouter down, all providers failing)

**What the user sees:** A status banner at the top of the chat area. Not a modal, not a toast — a persistent, dismissible banner that stays until the issue resolves.

**Banner behavior:**
- Appears after a failed chat request (not preemptively)
- Copy should be honest and calm: "I'm having trouble connecting right now. I'll keep trying." (not technical jargon)
- Dismissible — user can close it, but it reappears if they send another message and it still fails
- Auto-removes when connectivity is restored

**Message handling during outage:**
- User messages are accepted and stored — they don't vanish
- When connectivity returns, Crosby processes the queued message(s) naturally
- No "replaying 3 messages" UI — just respond to the latest state

---

## Integration Failures (Gmail, Calendar, iMessage, etc.)

**Granularity:** Per-integration health tracking. Each integration has its own health state independent of others. Email being down doesn't affect Calendar or Chat.

**What the user sees:** A non-intrusive inline notification in the timeline — like a proactive message but visually distinct (system-level, not Crosby-speaking). Something the user can glance at, dismiss, or act on.

**Examples:**
- "I can't reach your email right now. I'll keep trying and catch up when it reconnects."
- "Your Google Calendar connection expired. [Reconnect] to keep your schedule in sync."

**Notification rules:**
- Only notify once per failure episode — not on every retry
- If the user dismisses it, don't re-notify until the issue changes (e.g., resolves then fails again)
- Actionable when possible (reconnect button for auth expiry, nothing to do for a temporary API outage)

**Reconnection → Backfill:**
- When a flaky integration comes back, Crosby backfills what it missed (see Error Recovery Flows section below for full details)
- Email: scan the gap period (capped at 7 days), process new messages
- Calendar: re-sync events via syncToken (near-instant)
- Crosby mentions the backfill naturally in conversation — no system banner, but the user knows it's happening

---

## Retry Policy

**Default: 2 retries** per failed operation (3 total attempts).

- Retry with exponential backoff (e.g., 1s, 3s)
- After 2 retries fail, mark the operation as failed and surface it appropriately (banner for AI, timeline notification for integrations, log for background jobs)
- No infinite retry loops

**Auth failures (401/403):** Don't retry — surface the reconnect prompt immediately. Retrying with an expired token is pointless.

**Rate limits (429):** Respect `Retry-After` header. Count toward retry budget.

---

## Background Job Failures (crons, email scan, briefing generation, memory extraction)

**Retry:** Same 2-retry policy. If all retries fail, log the error in the background_jobs table with a clear error message.

**User notification:** Generally silent. Background job failures are invisible to the user unless:
1. The failure affects something the user is about to see (e.g., briefing didn't generate → don't send an empty briefing, just skip it)
2. The failure persists across multiple cycles (e.g., email scan has failed for 3 consecutive runs → surface a timeline notification)

**Escalation threshold:** 3 consecutive failures of the same job type → notify the user via timeline message.

---

## Stale Data Awareness

When Crosby's data is stale due to integration failures, it should **mention the issue** — not just caveat the timestamp.

**Wrong:** "Based on what I last saw at 8am, you have 3 unread emails."
**Right:** "I haven't been able to check your email since 8am — there might be a connection issue. From what I last saw, you had 3 unread emails. Want me to try again?"

**Rules:**
- If data is stale and Crosby knows why (integration failure), mention the issue and offer to retry
- If data is stale but the reason is unclear, mention the staleness and suggest checking the connection
- Don't silently serve stale data as if it's current — that erodes trust
- Staleness thresholds vary by integration:
  - Email: stale after 30 min without successful scan
  - Calendar: stale after 1 hour (events change less frequently)
  - Texts: stale after 1 hour

---

## Partial Degradation

Crosby should always remain functional even when parts are broken. The health model is per-integration:

| Component | Down | User impact | Crosby behavior |
|-----------|------|-------------|-----------------|
| OpenRouter (AI) | Yes | Can't chat | Status banner, queue messages |
| Gmail | Yes | No email data | Timeline notification, other features work normally |
| Calendar | Yes | No calendar data | Timeline notification, other features work normally |
| iMessage | Yes | No text data | Timeline notification (if previously connected) |
| Supabase | Yes | Everything broken | Status banner — this is catastrophic |
| Embedding service | Yes | No RAG retrieval | Silently degrade — use memory/context without document search |
| Perplexity (web search) | Yes | No web search | Tell user in response: "I can't search the web right now" |

**Key principle:** A failure in one integration should never cascade to others. If email scanning throws an error, Calendar, Tasks, Memory, and Chat all keep working.

---

## Health Model

Each integration maintains a simple health state:

```
healthy → degraded → down
```

- **healthy:** Last operation succeeded
- **degraded:** Last operation failed, retries in progress
- **down:** All retries exhausted, waiting for next scheduled check or manual reconnect

Transitions:
- Any successful operation → `healthy` (and trigger backfill if coming from `down`)
- Failed operation → `degraded` (start retries)
- All retries exhausted → `down` (notify user if first time entering `down` for this episode)
- Scheduled re-check succeeds → `healthy` + backfill

---

## Error Recovery Flows

What the user does to fix a problem, and what happens during and after the fix.

### Gmail / Calendar Reconnection

1. User sees the issue: status banner, timeline notification, or Crosby mentions stale data
2. User taps **[Reconnect]** (in the banner, in Settings → Connections, or tells Crosby "reconnect my email")
3. Bottom sheet OAuth opens (stays in-app, per ONBOARDING.md)
4. User re-authorizes → connection re-established → health state goes to `healthy`
5. Backfill scan starts immediately as a background job

### Backfill After Reconnection

- Crosby scans everything it missed during the outage, **capped at 7 days.** Beyond 7 days, the volume is too high and the relevance drops. If the outage was longer, Crosby notes: "I caught up on the last week of emails. Anything older than that you'll want to check directly."
- Backfill runs as a **background job** — never blocks the chat
- While backfilling, Crosby mentions it naturally in conversation: "I'm catching up on emails I missed while disconnected. Give me a few minutes."
- When done: "All caught up. 23 emails scanned, 2 need your attention." Woven into conversation, not a system alert.
- If backfill fails partway: retry once, then report honestly: "I couldn't scan some older emails from the outage period. Recent stuff is all synced."
- Calendar backfill is simpler — re-sync events from the Google Calendar syncToken. This is near-instant.

### AI Outage Recovery (OpenRouter)

- **No replay of failed messages.** If the user sent a message during the outage and got "I'm having trouble connecting," that error message is NOT stored as conversation history (per CLAUDE.md error response rule).
- When connectivity returns, Crosby offers to pick up: "I wasn't able to respond earlier — want me to pick up where we left off?" Only if the user's last message went unanswered.
- Queued background jobs (briefings, nudges, memory extraction) that were blocked **resume automatically.** No user action needed.
- No special announcement — Crosby just starts working again. The status banner auto-dismisses.

### iMessage Helper Offline → Back Online

- Covered in TEXT-SMS.md (graceful degradation). When the Mac reconnects, the helper app sends queued messages.
- Crosby processes them as a batch — extracts context, checks against watches, updates commitments.
- No special UX. Texts just start flowing again.
- If the Mac was off for an extended period (7+ days), Crosby processes recent texts and notes: "Your Mac was offline for a while — I've caught up on recent texts."

### User-Initiated Recovery via Chat

The user can always tell Crosby to fix things:
- "Reconnect my email" → triggers OAuth reconnection flow
- "Try again" (after a failed response) → Crosby retries the last message
- "What's broken?" → Crosby checks integration health and reports status
- "Why didn't I get a briefing?" → Crosby queries the activity log (see ACTIVITY-LOG.md)

---

## Open Questions

- **Health dashboard in Settings?** Should the Settings → Connections page show real-time health status for each integration? Probably yes — gives the user a place to go when something feels off.
- **Status banner design:** Exact visual treatment TBD — needs to be visible but not alarming. Maybe a thin bar above the input area rather than a full-width banner at the top.
