# Chat Route Hang — Incident Report (2026-03-18)

## What Broke

Production chat stopped working completely after shipping the intent classifier
(selective context injection). Every message timed out with a 504 or showed
"something went wrong." Local worked fine.

## Root Cause (Found)

**Supabase `sessions` table queries hang indefinitely in production.**

`getOrCreateSession()` is called at the start of every chat request. It makes
2-4 sequential Supabase queries against the `sessions` table. In production,
query 1 (find open session) never completes — it just hangs forever until
Vercel kills the function at the 60s `maxDuration` limit.

The same queries run instantly in local and directly via psql. This points to a
connection-level issue in the Vercel serverless environment, not a bad query.

### Why It Looked Like the Intent Classifier Was the Problem

The intent classifier shipped the same day. But it's called *after*
`getOrCreateSession` and is pure synchronous code — no DB calls. It was a red
herring. The sessions hang was already lurking; the classifier deployment just
coincided with the break becoming visible.

### What Made It Hard to Diagnose

1. **Vercel logs truncate to one line per request.** The MCP tool only surfaces
   the first log line from each serverless invocation. All the checkpoint logs
   added during debugging (`[Session] query 1 done`, `[Chat] Promise.all done`,
   etc.) were invisible — only the first `[Chat] getOrCreateSession start` ever
   showed up.

2. **The function returned 504, masking the real error.** Later, after moving
   setup inside the stream (so the HTTP connection opened immediately), the real
   error surfaced: a `400` from OpenRouter caused by 31 consecutive user messages
   with no assistant reply — a second bug caused by all the prior timeouts
   stacking up in the DB.

3. **Two bugs compounded each other.** Even after the sessions hang was worked
   around, the poisoned conversation history (31 unanswered "hey" messages) was
   causing a 400. Both had to be fixed.

## Fixes Shipped

### 1. Stream starts immediately (architectural improvement)
Moved all pre-OpenRouter setup inside `ReadableStream.start()` so the HTTP
response begins instantly. Previously the route did 4+ seconds of blocking work
before returning any response, which made timeouts look like hard failures.

**Commit:** `8db2916` — `debug: move all chat setup inside stream, emit ping immediately on connect`

### 2. Deduplicate consecutive same-role messages
Before sending history to OpenRouter, collapse consecutive messages from the
same role. The 31 stacked "hey" messages caused a 400 (Anthropic rejects
consecutive user turns with no assistant reply between them).

**Commit:** `b39ff36` — `fix: collapse consecutive same-role messages before sending to OpenRouter`

### 3. 5-second timeout on `getOrCreateSession` (workaround)
Wrapped all session DB queries in a `Promise.race` with a 5s timeout. If
Supabase doesn't respond in time, `sessionId` is `null` and chat continues
without session tracking. Messages are saved without `session_id`, history
loads from the full conversation instead.

**Commits:** `f4be183`, `d284362`

## What Is Still Broken / Left to Investigate

### Sessions table queries hang in production (ROOT CAUSE — UNRESOLVED)

The workaround makes chat functional, but session tracking is completely
disabled. Every request times out on the sessions query and falls back to
`sessionId: null`. Messages are being saved without session IDs.

**Things to investigate:**

- **Supabase connection pooling.** The `supabase.ts` client creates a new
  `createClient()` instance at module load with no connection pool config. In
  serverless environments, each function invocation may create a new connection.
  If prior timed-out invocations left connections open/stale, new queries may
  queue behind them. Supabase's default connection limit is 60. Consider using
  `pgbouncer` (transaction mode) via the Supabase pooler URL
  (`db.xxx.supabase.co:6543`) instead of the direct connection
  (`db.xxx.supabase.co:5432`).

- **Why only the sessions table?** Other Supabase queries (action_items,
  conversations, messages, etc.) work fine. The sessions table has only 2 rows
  and indexed columns. It's possible there's a long-running transaction or lock
  on the sessions table from a prior crashed invocation. Check
  `pg_stat_activity` and `pg_locks` for blocked queries.

- **RLS policies.** Sessions uses `POLICY "Allow all for authenticated"` scoped
  to `TO authenticated`. `supabaseAdmin` uses the service role key which should
  bypass RLS. But worth verifying the policy isn't somehow interfering.

- **The `increment_session_message_count` RPC.** This fires as a fire-and-forget
  `void` call. If the RPC has a bug or creates a long transaction, it could be
  holding a lock that blocks subsequent session queries. Worth checking if this
  RPC exists and what it does.

### Session tracking is disabled

With `sessionId = null`, the following features are broken or degraded:

- Session message counting (`message_count` on sessions table never increments)
- Session-scoped conversation history (falls back to full conversation history)
- Session summarization (already removed from hot path — needs nudge cron anyway)
- `context_domains` inheritance still works (saved on messages, read back in history query)

### Debug logs need cleanup

A lot of `console.log` checkpoints were added during debugging and are still in
`src/app/api/chat/route.ts`:
- `[Chat] step 1: create/get conversation`
- `[Chat] getOrCreateSession start/done`
- `[Chat] step 3/4/5/6`
- `[Session] query 1/2/3`
- `[Chat] Promise.all done`
- `[Chat] building system prompt...`
- `[Chat] system prompt built, length: ...`
- `[Chat] chatMessages count: ...`
- `[Chat] calling OpenRouter, model: ...`
- `[Intent] ... → domains: [...] | tools: ...`

The Intent log is useful to keep. The rest can be removed once sessions are fixed.

## Key Files

- `src/app/api/chat/route.ts` — chat route, `getOrCreateSession()` around line 2478
- `src/lib/supabase.ts` — Supabase client init (no pool config)
- `scripts/` — migration SQL files
