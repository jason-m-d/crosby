# API Route Map — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

All backend logic lives in Next.js API routes under `apps/web/src/app/api/`. The mobile app calls these via the `api-client` package. Cron jobs hit dedicated cron routes authenticated by a shared secret.

---

## Route Index

### Chat

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/chat` | User | Main chat endpoint. Streams SSE response. Runs router → context loading → LLM stream → tool execution → memory extraction. |
| POST | `/api/chat/prefetch` | User | Pre-classification while user types. Returns specialist predictions + autocomplete suggestions. Cached server-side. |

### Documents

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/documents/upload` | User | Upload document(s). Stores in Supabase Storage, creates `documents` row, triggers async chunking + embedding. |
| GET | `/api/documents` | User | List user's documents. Supports filters (source, expert_id, search query). |
| GET | `/api/documents/[id]` | User | Get single document with metadata. |
| DELETE | `/api/documents/[id]` | User | Delete document (hard delete with tombstone). |
| POST | `/api/documents/search` | User | Semantic search across document chunks. |

### Experts

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/experts` | User | List user's Experts with activation state. |
| POST | `/api/experts` | User | Create new Expert. |
| PATCH | `/api/experts/[id]` | User | Update Expert (name, description, instructions, color, pinned docs). |
| DELETE | `/api/experts/[id]` | User | Delete Expert (hard delete, tags retained on artifacts/memories). |
| POST | `/api/experts/[id]/activate` | User | Directly activate an Expert (set is_active = true). |
| POST | `/api/experts/[id]/deactivate` | User | Deactivate an Expert. |

### Tasks

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks` | User | List tasks. Supports filters (status, priority, is_commitment, expert_id). |
| POST | `/api/tasks` | User | Create task (also used for commitments with is_commitment flag). |
| PATCH | `/api/tasks/[id]` | User | Update task (status, priority, due_date, etc.). |
| DELETE | `/api/tasks/[id]` | User | Delete task (hard delete). |

### Contacts

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/contacts` | User | List promoted contacts. Optional: include shadow contacts. |
| POST | `/api/contacts` | User | Create contact (manual or promotion from shadow). Also used by tool executors. |
| GET | `/api/contacts/[id]` | User | Get single contact with interaction history and channels. |
| PATCH | `/api/contacts/[id]` | User | Update contact details. |
| DELETE | `/api/contacts/[id]` | User | Delete contact (hard delete, memory entity tags retained as text). |

### Artifacts

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/artifacts` | User | List artifacts. Supports filters (type, expert_id, include_deleted). |
| GET | `/api/artifacts/[id]` | User | Get artifact with version history. |
| PATCH | `/api/artifacts/[id]` | User | Update artifact content (creates new version). |
| DELETE | `/api/artifacts/[id]` | User | Soft delete (moves to holding bay). |
| POST | `/api/artifacts/[id]/restore` | User | Restore from holding bay. |

### Notepad

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/notepad` | User | List notepad entries. Supports filter by expert_id. |
| PATCH | `/api/notepad/[id]` | User | Update entry (content, pin status). |
| DELETE | `/api/notepad/[id]` | User | Delete entry (hard delete). |

### Watches

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/watches` | User | List watches/monitors. Supports filter by status, type. |
| PATCH | `/api/watches/[id]` | User | Update watch (dismiss, resolve manually). |

### Memories

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/memories` | User | List memories. Supports filters (type: semantic/episodic/procedural, entity_tag, date range). Paginated. |
| GET | `/api/memories/[id]` | User | Get single memory with full detail. |
| PATCH | `/api/memories/[id]` | User | Update memory (content, importance). Semantic memories create a new version via supersession. |
| DELETE | `/api/memories/[id]` | User | Delete memory. Semantic: sets superseded_at (soft). Episodic/procedural: hard delete. |

### Training Signals

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/training-signals` | User | List training signals. Supports filters (signal_type, category, processed/unprocessed). Paginated. |
| DELETE | `/api/training-signals/[id]` | User | Delete a signal (hard delete). |

### Settings

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/settings` | User | Get user_profiles row (all settings). |
| PATCH | `/api/settings` | User | Update settings (partial update). |

### Dashboard Widgets

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/widgets` | User | List visible widgets. Supports filter by expert_id, status. Ordered by position. |
| POST | `/api/widgets` | User | Create widget (manual). Sets status = 'active'. |
| PATCH | `/api/widgets/[id]` | User | Update widget (position, config, visibility, approve/reject proposed widget). |
| DELETE | `/api/widgets/[id]` | User | Soft delete (moves to holding bay). |
| POST | `/api/widgets/[id]/refresh` | User | Force refresh widget data. Returns updated config. |

### Silos (Scaffolded — Core Silos Only for v2.0)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/silos` | User | List silos (core silos are read-only, shows status and sync health). |
| GET | `/api/silos/[id]` | User | Get silo detail with tools, trigger rules, sync status. |
| PATCH | `/api/silos/[id]` | User | Update silo config (enable/disable, adjust sync schedule). |

*Note: POST and DELETE for silos are post-v2.0 (marketplace + custom builder). Core silos are system-created.*

### Activity Log

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/activity-log` | User | Query activity log. Supports filters (log_type, status, date range). Paginated. |

### Auth

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/callback` | None | OAuth callback handler. Creates profile on first sign-up. |
| POST | `/api/auth/google` | User | Initiate Google OAuth (incremental scope request). Returns auth URL. |

### Webhooks (External → Crosby)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/webhooks/gmail` | Google | Gmail push notification (new email arrived). Validates via Google's push verification. |
| POST | `/api/webhooks/expo-push` | Expo | Push notification delivery receipts. |

### Push Notifications

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/push/register` | User | Register push token (iOS or web). |
| POST | `/api/push/unregister` | User | Unregister push token. |

### Health

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | None | Health check. Returns 200 if app is running. |

---

## Cron Routes

All cron routes are GET endpoints authenticated by the `CRON_SECRET` header. They process all users (single user in v2, but the pattern supports multi-user).

| Route | Schedule | Description |
|---|---|---|
| `/api/cron/email-scan` | Every 15 min | Scan Gmail for new emails. Check against watches/monitors. Extract context. Also runs iMessage scan if configured. |
| `/api/cron/calendar-sync` | Every 15 min | Sync Google Calendar events via syncToken. |
| `/api/cron/briefing` | 3x daily (0 13,20,1 UTC) | Generate morning/afternoon/evening briefings. Check user's briefing_cadence setting. **v2.0 note:** UTC times tuned for America/Los_Angeles. Multi-user would need per-user delivery times or more frequent cron. |
| `/api/cron/nudge` | Every 2 hours | Check for stale tasks, overdue commitments. Generate nudge messages with escalation. |
| `/api/cron/overnight` | 1x nightly | Run overnight dashboard builder + Expert research. Respects max job limits. |
| `/api/cron/embed` | Every 15 min | Embed new messages and document chunks that don't have embeddings yet. |
| `/api/cron/memory-scan` | Weekly | Run contradiction detection on new memories (scanned_at IS NULL). |
| `/api/cron/jobs` | Every minute | Dispatch queued background jobs. Check for hung jobs (past timeout). |

---

## Chat Route Detail

The chat route is the most complex endpoint. Here's the full pipeline:

```
POST /api/chat
  Body: { message: string, expertId?: string, attachmentIds?: string[] }

1. AUTH
   → Verify user session (cookie or Bearer token)
   → Get user_id

2. SESSION CHECK + STORE MESSAGE
   → Query current session: SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1
   → If no session OR session.message_count >= 30 OR (NOW() - last message created_at) > 2 hours:
     - Close old session: SET ended_at = NOW()
     - Queue lightweight job: context_summary_refresh (generates session summary async)
     - Create new session
   → Insert user message into messages table with session_id
   → Increment session.message_count

3. ROUTER (parallel with step 4)
   → Call Gemini Flash Lite with: message + last 3 messages + Expert list
   → Returns: intent, specialists[], experts[], dataNeeded[], toolsNeeded[], ragQuery, complexity
   → Timeout: 3 seconds → fallback to regex classifier
   → Log router decision to activity_log

4. CONTEXT SUMMARY CHECK (parallel with step 3)
   → Check if rolling summary needs refresh (token threshold or 24hr timer)
   → If yes: queue refresh as lightweight background job

5. LOAD CONTEXT (based on router output)
   → Parallel fetch:
     - Always-on data blocks (critical tasks, active watches, procedural memories)
     - Router-specified data blocks (emails, calendar, contacts, etc.)
     - Expert Tier 1 content (if Expert active/ambient at high confidence)
     - Semantic + episodic memories (hybrid retrieval: vector + entity + recency)
     - Rolling context summary
     - RAG results (if router specified rag_query)
     - Recent messages (~20 most recent)

6. ASSEMBLE SYSTEM PROMPT
   → Base prompt (soul, routing rules, core instructions)
   → Active specialist sections (with {{placeholders}} populated)
   → Expert instructions (if active)
   → Loaded data blocks formatted into sections
   → Procedural memory triggers
   → Context summary

7. ASSEMBLE TOOLS
   → Core tools (always available)
   → Active specialist tools
   → Expert-specific tools
   → Deduplicate (prevent 400 error from duplicate tool names)

8. STREAM RESPONSE
   → Call OpenRouter (Sonnet/GPT-5.4/selected model) with streaming
   → Model: configurable, with fallback chain
   → Stream SSE events to client:
     - text_delta: streaming text tokens
     - tool_use: tool call started
     - tool_result: tool execution result
     - card_track: interactive card data
     - artifact_open: open sidebar with artifact
     - expert_drift: Expert confidence update
     - done: stream complete

9. TOOL EXECUTION LOOP
   → When model emits tool_use:
     - Look up executor in registry Map
     - Execute server-side
     - Inject tool_result into conversation
     - Continue streaming (model sees the result)
   → Loop limit: 8 tool calls per response
   → Timeout: 30 seconds total for the streaming + tool loop

10. POST-RESPONSE (fire-and-forget, not in response critical path)
    → Store assistant message in messages table
    → Async memory extraction (semantic + episodic)
    → Async message embedding
    → Update Expert ambient confidence (if router returned Expert scores)
    → Update session message count
    → Log any tool calls to activity_log
```

---

## SSE Event Format

The chat stream uses Server-Sent Events with typed event names:

```typescript
// Event types — camelCase to match SHARED-TYPES.md SSEEvent union
type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; content: string }
  | { type: 'card_track'; cardType: string; data: Record<string, unknown> }
  | { type: 'artifact_open'; artifactId: string }
  | { type: 'expert_drift'; expertId: string; confidence: number }
  | { type: 'error'; message: string }
  | { type: 'done' }
```

The client (web and mobile) parses these events to render the streaming UI:
- `text_delta` → append to message bubble
- `tool_use` → show tool status indicator
- `tool_result` → update tool status
- `card_track` → render interactive card (email draft, calendar event, task)
- `artifact_open` → open sidebar with artifact
- `expert_drift` → update Expert color tinting
- `done` → finalize message, enable input

---

## Error Handling

### API Route Errors

All routes follow a consistent error pattern:

```typescript
// Standard error response
function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status })
}

// Usage
if (!user) return errorResponse(401, 'Unauthorized')
if (!document) return errorResponse(404, 'Document not found')
```

### Chat Route Errors

- **Router timeout** → use regex fallback, continue normally. No error to user.
- **LLM stream failure** → retry once with simplified context. If retry fails → send error message (NOT saved to messages table).
- **Tool execution failure** → inject error result into conversation. Model sees the error and can adapt.
- **Auth failure** → 401 response. Client redirects to login.

### Cron Route Errors

- **Individual user failure** → log to activity_log, continue processing other users.
- **Full cron failure** → log to activity_log with error type, return 500 (Vercel marks cron as failed).

---

## Rate Limiting

| Endpoint | Limit | Window |
|---|---|---|
| `/api/chat` | 30 messages | Per minute per user |
| `/api/documents/upload` | 10 uploads | Per minute per user |
| `/api/chat/prefetch` | 60 requests | Per minute per user |
| All other endpoints | 100 requests | Per minute per user |
| Cron routes | N/A | Protected by CRON_SECRET |

**v2.0 decision: Skip rate limiting.** Single-user product, no abuse risk. Rate limiting is a multi-user concern — add it when Crosby goes multi-user (Vercel KV or Upstash Redis). The limits above are documented for future reference.

---

## Relationship to Product Specs

| Product spec | Routes |
|---|---|
| CONVERSATION-CONTINUITY.md | `/api/chat` (context loading, summary refresh) |
| ROUTER.md | `/api/chat` (step 3), `/api/chat/prefetch` |
| EXPERT-CONTEXT-LOADING.md | `/api/chat` (step 5), `/api/experts/[id]/activate` |
| BACKGROUND-JOBS.md | `/api/cron/jobs` (dispatcher) |
| ACTIVITY-LOG.md | `/api/activity-log` |
| NOTIFICATIONS.md | `/api/push/*`, `/api/cron/briefing`, `/api/cron/nudge` |
| AUTH-ACCOUNT.md | `/api/auth/*` |
| ERROR-HANDLING.md | Error patterns across all routes |
| DOCUMENTS spec | `/api/documents/*` |
| WATCHES-MONITORS.md | `/api/watches/*`, `/api/cron/email-scan` (watch checking) |
