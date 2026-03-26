# Activity Log & Diagnostics — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

A user-visible log of everything Crosby does behind the scenes. Lives in the Settings page under its own tab. Shows cron runs, background jobs, router decisions, errors, proactive message decisions, and integration health — everything that would normally be invisible.

Three purposes:
1. **User transparency** — Jason can see what Crosby has been doing, not just what it said in chat
2. **Crosby self-awareness** — Crosby can query its own activity log to debug issues ("why didn't my morning briefing fire?")
3. **Testing aid** — during development and QA, the log provides a clear audit trail of system behavior

---

## What Gets Logged

### Cron Job Runs
Every scheduled cron execution, whether it succeeded, failed, or was skipped.

| Field | Example |
|---|---|
| Job type | `morning_briefing`, `email_scan`, `memory_contradiction_scan`, `overnight_builder` |
| Status | `success`, `failed`, `skipped` |
| Trigger time | `2026-03-25 07:00:00 UTC` |
| Duration | `3.2s` |
| Outcome summary | "Morning briefing generated. 3 email highlights, 2 calendar items, 1 stale watch." |
| Error (if failed) | "OpenRouter timeout after 30s" |
| Skip reason (if skipped) | "No new data since last run" |

### Background Job Execution
Any non-cron background work — deep research, memory extraction, embedding generation, overnight builds.

| Field | Example |
|---|---|
| Job type | `deep_research`, `memory_extraction`, `document_embedding`, `overnight_build` |
| Status | `queued`, `running`, `success`, `failed` |
| Trigger source | `user_request`, `cron`, `system` |
| Duration | `45s` |
| Outcome summary | "Deep research on 'California commercial lease law 2026' — 12 sources, report generated" |
| Error (if failed) | "Perplexity rate limit hit, retrying in 60s" |

### Router Decisions
How Crosby classified each incoming message and what it activated.

| Field | Example |
|---|---|
| Message preview | "What's on my calendar tomorrow?" |
| Classified intent | `calendar_query` |
| Specialists activated | `["calendar", "core"]` |
| Data loaded | `["calendar_events", "recent_messages"]` |
| Tools made available | `["get_calendar_events", "create_event", "update_event"]` |
| Router method | `ai_router` or `regex_fallback` |
| Router latency | `180ms` |

### Error Events
Any error that occurred in the system — API failures, timeouts, integration disconnects.

| Field | Example |
|---|---|
| Error type | `api_timeout`, `auth_expired`, `rate_limit`, `parse_error` |
| Service | `openrouter`, `gmail`, `google_calendar`, `supabase` |
| Message | "OpenRouter returned 429 — rate limited on anthropic/claude-sonnet-4.6" |
| Impact | "Chat response failed — showed connection error message" |
| Auto-recovery | `true` — "Retried with fallback model, succeeded" |

### Proactive Message Decisions
Every time the proactive message system evaluated whether to send something — including when it decided NOT to.

| Field | Example |
|---|---|
| Message type | `briefing`, `nudge`, `heads_up`, `living_greeting` |
| Decision | `sent`, `skipped`, `absorbed`, `held` |
| Reason | "Sent morning briefing. 5 items." |
| Reason (skipped) | "Nudge for 'follow up with Sarah' skipped — same item was in morning briefing 2 hours ago (dedup)" |
| Reason (absorbed) | "Living greeting absorbed into morning briefing" |
| Reason (held) | "Nudge held — quiet hours active. Will absorb into next morning briefing." |

### Integration Health
Connection status for each external integration.

| Field | Example |
|---|---|
| Integration | `gmail`, `google_calendar`, `imessage` |
| Status | `healthy`, `degraded`, `disconnected` |
| Last successful sync | `2026-03-25 06:45:00 UTC` |
| Last error | "OAuth token refresh failed at 06:30 — retried at 06:45, succeeded" |
| Uptime (24h) | `99.8%` |

---

## Where It Lives

### Settings → Activity Log tab
A dedicated tab in the Settings page. This is the full, browsable log.

**Layout:**
- Filter bar at top: filter by log type (cron, background job, router, error, proactive, integration), date range, status
- Reverse-chronological list of log entries
- Each entry is a compact row that expands on tap to show full details
- Color-coded status indicators: green (success), yellow (skipped/degraded), red (failed/error)

**Design:**
- Utilitarian, not decorative. This is a diagnostic tool, not a dashboard.
- Dense information display — lots of entries visible at once
- Search within logs (keyword search across all fields)

### Crosby Can Query It
Crosby has access to its own activity log via a tool. When Jason asks "why didn't my morning briefing fire?" or "what happened with the email scan last night?", Crosby queries the log and explains what happened in plain language.

The tool is something like `query_activity_log` — takes a natural language question, translates it to a log query, and returns relevant entries.

---

## User Experience

### What Jason sees
The log is **read-only**. Jason can browse, filter, and search, but can't edit or delete entries. It's a window into Crosby's operations, not a control panel.

### What Crosby does with it
When Jason asks about system behavior, Crosby:
1. Queries the activity log
2. Reads the relevant entries
3. Explains in plain language what happened

Examples:
- "Why didn't I get a briefing this morning?" → Crosby checks the log, finds "morning_briefing skipped — no new data since last run" → explains: "Nothing new came in overnight, so I skipped the briefing. If you want one regardless, I can send one now."
- "Is my email still connected?" → Crosby checks integration health → "Gmail is healthy. Last sync was 10 minutes ago."
- "What have you been doing in the background?" → Crosby queries recent background jobs → summarizes the last few hours of activity

### Privacy note
The activity log contains operational metadata, not message content. Router decisions show a message preview (first ~50 chars) for context, but the full message isn't stored in the log — it's in the messages table. The log is about system behavior, not conversation content.

---

## Retention

- **Activity log entries:** 90 days, then auto-purged.
- **Integration health snapshots:** Rolling 30-day window. Older snapshots collapsed into daily summaries kept for 90 days.
- **Error events:** 90 days, matching the background job log retention from DATA-DELETION-PRIVACY.md.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Background jobs | Every background job writes to the activity log on start, completion, and failure |
| Cron system | Every cron execution writes to the activity log |
| Router | Every message classification writes to the activity log |
| Error handling | Error events (from ERROR-HANDLING-GRACEFUL-DEGRADATION.md) surface in the activity log |
| Proactive messages | Every send/skip/absorb/hold decision writes to the activity log |
| Integration health | Health status changes write to the activity log; the error handling spec's per-integration health model feeds this |
| Settings page | Activity Log is a tab within Settings (SETTINGS.md) |
| Chat (Crosby self-query) | Crosby uses a tool to query the log for self-diagnostic questions |

---

## Ripple Effects

- **Settings page** — gets a new "Activity Log" tab as a 6th top-level tab group. Updated in SETTINGS.md.
- **Background jobs table** — the existing `background_jobs` table in v1 already captures some of this. The activity log is a superset — it adds router decisions, proactive message decisions, and integration health that the background_jobs table doesn't cover.
- **Error handling spec** — ERROR-HANDLING-GRACEFUL-DEGRADATION.md defines the per-integration health model (healthy/degraded/down). That model feeds the integration health section of the activity log. Cross-reference, not duplication.
- **System prompt** — Crosby needs awareness that it can query its own activity log. The `query_activity_log` tool should be in the core tool set, always available.
- **App manual** — the self-aware app manual should document what the activity log shows and how to use it.

---

## Open Questions

- [ ] Should the activity log be accessible from chat as a side panel (like Artifacts/Contacts/Notepad), or only in Settings?
- [ ] Should integration health show a simple status badge on the Settings → Connections page in addition to the full log?
- [ ] How verbose should router decision logging be? Every message adds a log entry — at scale, this could be noisy. Should there be a "compact" vs "verbose" mode?
- [ ] Should Crosby proactively surface activity log issues? ("Heads up — your Gmail sync has failed 3 times in the last hour. I'm retrying, but you might want to re-authorize.")
  - Note: this overlaps with the error handling spec's status banner. The activity log is the detailed record; the status banner is the real-time alert.
