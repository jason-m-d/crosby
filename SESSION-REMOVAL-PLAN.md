# Session Removal & Context Window Architecture

## The Problem

Sessions are causing bugs: timeout race conditions, orphaned messages (21.7% have no session_id), stale context bleeding in, message_count not incrementing, cron messages breaking session continuity. The root cause is that `getOrCreateSession()` runs in the critical path of every message, does 3 sequential DB queries with a tight timeout, and when it fails, the fallback loads wrong history.

## The Insight

Crosby already extracts the important stuff from conversations - memories, action items, commitments, decisions, project context, watches, processes. The extraction pipeline IS the long-term memory. Raw message history is scaffolding - once the signal is extracted, the messages themselves are low-value for future context.

The LLM conversation should work like a normal LLM conversation. Messages accumulate in the context window naturally. The backend reconstructs this on each request by loading messages from the DB (since Next.js serverless is stateless per-request). The only question is: which messages to load?

Answer: everything since the last summarization point. A background cron handles summarization when the conversation gets long, not the chat route.

## Architecture Overview

```
User sends message
  -> Chat route loads: latest rolling summary + all messages after summary pointer
  -> Router analyzes message, pulls relevant structured data (projects, memories, action items, contacts, documents)
  -> Full prompt = system prompt + rolling summary + messages + structured data
  -> Send to API via OpenRouter
  -> Response streamed back to user
  -> Message stored in DB
  -> [Background] Extraction crons pull out memories, action items, commitments, etc. (UNCHANGED - stays live, not coupled to summarization)
  -> [Background] Summarization cron compresses old messages when token threshold hit
  -> [Background] Embedding cron embeds messages for RAG search
```

## Implementation Steps

### Step 1: Create the `conversation_summaries` table

```sql
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  summary_text TEXT NOT NULL,
  summarized_through_message_id UUID NOT NULL REFERENCES messages(id),
  summarized_through_at TIMESTAMPTZ NOT NULL,
  token_count_at_summarization INT, -- how many tokens were in the window when we summarized
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_summaries_conv_id ON conversation_summaries(conversation_id);
CREATE INDEX idx_conv_summaries_created ON conversation_summaries(created_at DESC);
```

Each row = one summarization snapshot. `summarized_through_message_id` is the pointer: "everything before this message (inclusive) has been compressed into `summary_text`." The chat route loads the latest summary + all messages after that pointer.

### Step 2: Remove sessions from the chat route critical path

**File: `src/app/api/chat/route.ts`**

Remove:
- The `getOrCreateSession()` call and its timeout race
- The `session_id` parameter from the user message insert
- The session-scoped history query (`.eq('session_id', sessionId)`)
- The 4-hour recency fallback
- The `HISTORY_CHAR_BUDGET` / `reduceRight` trimming logic
- The `previousSessionSummary` injection into the system prompt
- Any `increment_session_message_count` calls

Replace the history loading with:

```typescript
// Load the latest rolling summary for this conversation
const { data: latestSummary } = await supabaseAdmin
  .from('conversation_summaries')
  .select('summary_text, summarized_through_at')
  .eq('conversation_id', convId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

// Load all messages AFTER the summary pointer (or all messages if no summary exists)
const historyQuery = supabaseAdmin
  .from('messages')
  .select('role, content, created_at, tool_calls, tool_results')
  .eq('conversation_id', convId)
  .order('created_at', { ascending: true })

if (latestSummary) {
  historyQuery.gt('created_at', latestSummary.summarized_through_at)
}

const { data: history } = await historyQuery
```

No message limit. No character budget. No session filter. Load everything that hasn't been summarized.

Inject the rolling summary into the system prompt where `previousSessionSummary` used to go:

```typescript
if (latestSummary) {
  systemPrompt += `\n\n<conversation_context>\nSummary of earlier conversation:\n${latestSummary.summary_text}\n</conversation_context>`
}
```

### Step 3: Update proactive message insertion

**File: `src/lib/proactive.ts`**

The `insertProactiveMessage()` function currently looks up the open session to tag messages with `session_id`. Remove that entirely:

```typescript
export async function insertProactiveMessage(conversationId: string, content: string) {
  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content,
    // No session_id. Messages belong to the conversation, period.
  })

  await supabaseAdmin
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}
```

### Step 4: Build the summarization cron

This is the critical new piece. Create a new cron route (or add to an existing one) that runs every hour.

**File: `src/app/api/cron/summarize-conversation/route.ts`** (new file)

Logic:

1. Load the main conversation
2. Load the latest `conversation_summaries` row to find the current pointer
3. Load all messages after the pointer
4. **Token counting:** Estimate token count of those messages. Use a simple heuristic: `Math.ceil(text.length / 4)` for English text. This doesn't need to be exact - it's a threshold check, not a billing calculation. The threshold should account for the model being used - Sonnet has 200K context, but we want to leave plenty of room for the system prompt + router-injected data (projects, memories, action items, document chunks). **Start with a 80K token threshold** (roughly 320K characters). That leaves ~120K tokens for system prompt + structured data + the model's response.
5. If estimated tokens < threshold, do nothing. Exit early.
6. If estimated tokens >= threshold: summarize the OLDEST messages (everything except the most recent ~20 messages) into a rolling summary using Gemini Flash Lite
7. The summary should be additive - if a previous summary exists, include it as context so the new summary builds on it rather than replacing it:

```typescript
const summarizationPrompt = `You are summarizing a conversation between Jason (CEO of DeMayo Restaurant Group and Hungry Hospitality Group) and his AI assistant Crosby.

${previousSummary ? `Previous summary of older conversation:\n${previousSummary}\n\n` : ''}

Summarize the following messages into a concise context brief. Focus on:
- Decisions made and their reasoning
- Action items discussed (who needs to do what)
- Topics covered and current status
- Any unresolved questions or open threads
- Key facts or numbers mentioned

Keep it under 2000 words. Write it as a narrative brief, not bullet points. This summary will be injected into future conversations so Crosby has context about what happened before.

Messages to summarize:
${messagesToSummarize.map(m => `[${m.role}]: ${m.content}`).join('\n\n')}`
```

8. Insert the new summary into `conversation_summaries` with the pointer set to the last message that was summarized
9. **Time-based fallback:** If it's been 24+ hours since the last summary, summarize regardless of token count. This prevents conversations that are mostly router-injected data (which doesn't count toward message tokens) from never getting summarized.

**Model:** Use `google/gemini-3.1-flash-lite-preview` with fallback to `google/gemini-3-flash-preview`, `sort: 'price'`. Same as all background jobs.

**Cron schedule:** Every hour. Add to `vercel.json`:
```json
{ "path": "/api/cron/summarize-conversation", "schedule": "0 * * * *" }
```

### Step 5: Build the message embedding cron

Create a cron that periodically embeds recent messages for RAG search. This is the safety net for retrieving old conversation content after it's been summarized and dropped from the context window.

**File: `src/app/api/cron/embed-messages/route.ts`** (new file)

Logic:

1. Find messages that haven't been embedded yet. Add an `embedded_at` column to the messages table (nullable timestamp), or use a separate `message_embeddings` table - whichever is cleaner for the existing schema.
2. Batch unembedded messages (last 50 at a time to stay within rate limits)
3. For each message, chunk if needed (most chat messages are short enough to embed as-is, but long assistant responses with tool results might need chunking)
4. Generate embeddings using the existing `generateEmbedding()` from `src/lib/embeddings.ts`
5. Store in a `message_embeddings` table (or reuse the existing document embeddings table with a `source_type = 'message'` column)
6. Skip embedding very short messages (< 20 chars) and system/error messages

**Cron schedule:** Every 30 minutes.

### Step 6: Add message RAG search as a tool

The router needs to be able to trigger message history search. Two ways this happens:

**A. Automatic (router-triggered):** The router detects conversational back-references in the user's message - phrases like "what did we talk about," "go back to," "remember when," "earlier today," "what I said about," "our conversation about." When detected, the router includes a `message_search_query` in its response, and the chat route runs a vector search over message embeddings before building the prompt.

**B. Explicit (tool-based):** Add a `search_conversation_history` tool that the LLM can call mid-response if it realizes it needs past conversation context. This is the manual override.

```typescript
// Tool definition
{
  name: 'search_conversation_history',
  description: 'Search through past conversation messages to find what was discussed about a topic. Use when the user references a past conversation or when you need context from a previous discussion that is not in your current context window.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'What to search for in past conversations'
      }
    },
    required: ['query']
  }
}
```

The tool executor generates a query embedding, runs a vector similarity search against `message_embeddings`, and returns the top 5-10 matching message chunks.

### Step 7: Clean up session references

**IMPORTANT: Do NOT couple extraction to summarization.** The extraction pipeline (commitments, decisions, watches, processes, notepad entries) currently runs on session close. This needs to stay live/near-real-time - do NOT move it to the summarization cron. Extraction should continue to run where it currently runs, or be moved to a more frequent trigger (e.g., every message or a fast cron), but never gated behind the summarization threshold.

What to do:
- Make `session_id` nullable on the `messages` table (if not already)
- Remove `getOrCreateSession()` from `src/lib/chat/session.ts` (or delete the file if nothing else uses it)
- Keep the extraction logic from `summarizeSession()` but decouple it from sessions entirely. Move it to run on a frequent schedule (every 15-30 min) or trigger it from the chat route after each message. The extraction should look at recent unextracted messages, not wait for session close or summarization.
- Remove `increment_session_message_count` RPC
- Keep the `sessions` table in the DB for now (existing data, foreign keys) but stop writing to it from the chat route
- Update the `session-summary` cron to become the new `summarize-conversation` cron (step 4)

### Step 8: Update the system prompt

**Before making changes: read the current system prompt and check what actually references sessions.** Don't blindly delete - some rules may be tied to session terminology that need careful rewording.

General direction:
- Remove "Previous Session Summary" section
- Add "Conversation Context" section where the rolling summary gets injected
- Update any instructions that reference session boundaries
- Verify the "conversation vs. session" terminology doesn't break any existing prompt rules

## Token Counting Notes

Jason's concern: token counting needs to be accurate, and it depends on the model. He's right that different models tokenize differently. However:

- We're using the token count as a **threshold check**, not for billing. Being off by 10-20% is fine.
- The `chars / 4` heuristic works well for English text with the Claude/GPT family of tokenizers
- For more accuracy, use the `tiktoken` library (works for OpenAI models) or Anthropic's token counting API
- The threshold (80K tokens) has plenty of buffer built in - even if the estimate is off by 20%, we're still well within the 200K context window
- **Recommendation:** Start with `chars / 4`. If we see context window issues in production, switch to `tiktoken` or add a model-specific multiplier

## What This Eliminates

- `getOrCreateSession()` from the critical path (kills the timeout race condition)
- Session-scoped history queries (kills orphaned message bugs)
- `HISTORY_CHAR_BUDGET` / `reduceRight` trimming (replaced by summarization cron)
- 4-hour recency fallback (unnecessary when there's no session scoping)
- `increment_session_message_count` (unnecessary)
- The entire class of "stale context from old sessions" bugs
- Cron messages breaking session continuity (they're just messages now, no session_id needed)

## What This Preserves

- The messages table (unchanged - still stores every message)
- Memory/action item/commitment/decision/watch extraction (**UNCHANGED - stays live, NOT coupled to summarization**)
- The router and specialist system (unchanged)
- All cron jobs (unchanged, just simpler since no session_id needed)
- The frontend chat display (unchanged - still shows full conversation history)
- Document embedding/RAG pipeline (unchanged, message embedding reuses it)

## What's New

- `conversation_summaries` table
- `summarize-conversation` cron (replaces session-summary cron)
- `embed-messages` cron
- `message_embeddings` table (or column)
- `search_conversation_history` tool
- Router awareness of conversational back-references

## Implementation Order

Do ALL of these. This is the full architecture, not a phased rollout.

1. Create `conversation_summaries` table (migration)
2. Create `message_embeddings` table or add `embedded_at` column to messages (migration)
3. Remove `getOrCreateSession()` from chat route, replace history loading with summary-pointer approach
4. Update `insertProactiveMessage()` to stop looking up sessions
5. Build summarization cron
6. Build message embedding cron
7. Add `search_conversation_history` tool + router back-reference detection
8. Decouple extraction from sessions (keep it live/frequent, just remove the session dependency)
9. Clean up remaining session references in codebase
10. Update system prompt (after reading current prompt to check what references sessions)
11. Test thoroughly

## Testing Checklist

- [ ] Send a message - does it load history correctly (no session scoping)?
- [ ] Send multiple messages back and forth - does conversational flow work naturally?
- [ ] Talk about weather, switch topics, reference the weather again - is it still in context?
- [ ] Receive a cron message, then send a message - does the cron message show up in context without breaking anything?
- [ ] After summarization cron runs - does the summary get injected? Are post-summary messages still loaded?
- [ ] Reference an old conversation topic after summarization - does the router trigger message RAG search?
- [ ] Use "search_conversation_history" tool explicitly - does it return relevant results?
- [ ] Check that extraction (memories, action items, commitments, decisions, watches) still runs in near-real-time, not delayed until summarization
- [ ] Verify no session_id is being written to new messages
- [ ] Verify proactive/cron messages insert cleanly without session lookup
