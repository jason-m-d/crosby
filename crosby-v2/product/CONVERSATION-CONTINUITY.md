# Conversation Continuity & History — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

Crosby is one infinite conversation. There are no threads, no "new chat" button, no conversation list. Every message Jason ever sends lives in a single, continuous timeline. This spec defines how Crosby maintains context across that infinite history — how it "remembers" what was said, stays coherent across months of conversation, and never loses the thread.

Three layers work together to give Crosby its sense of continuity, each serving a different kind of recall:

1. **Rolling context summary** — "what's been going on lately" (broad, recent context)
2. **Message RAG** — "what did we say about X?" (precise, searchable history)
3. **Memory system** — "what do I know about Jason?" (durable facts, patterns, events)

Plus raw recent messages (~20) as the immediate conversation buffer.

---

## Layer 1: Rolling Context Summary

### What it is
A single living document — a narrative summary of recent conversation activity. It's not a transcript. It's a compressed, continuously-updated picture of "what we've been talking about, what's in flight, what's unresolved."

### How it works
- **No session IDs.** There is no concept of a "session" in the context summary. It's one rolling document that Crosby overwrites every time it refreshes.
- **Refresh triggers:**
  - **Token threshold:** When the conversation context approaches ~80K tokens (well before the model's limit), the summary regenerates to compress older material.
  - **Time threshold:** If 24 hours have passed since the last refresh, regenerate regardless of token count. This keeps the summary fresh even during quiet periods.
- **Overwrites itself.** Each refresh produces a new summary that replaces the previous one. There's no stack of summaries or version history — just one current document.
- **Injected into system prompt.** The summary is part of every request's system prompt, giving Crosby ambient awareness of recent context without needing to retrieve it.

### What the summary contains
- Active topics and threads (what we've been discussing)
- Unresolved questions or decisions in progress
- Recent actions taken (emails sent, tasks created, watches set)
- Commitments and deadlines mentioned recently
- Emotional context if relevant (frustrated about a vendor, excited about a deal)

### What the summary does NOT contain
- Verbatim quotes (that's what message RAG is for)
- Durable facts about Jason (that's memory)
- Historical events from weeks ago (that's episodic memory)

### Failure mode
If the summary refresh fails (AI timeout, server error), Crosby continues with the stale summary. A stale summary is better than no summary. The next successful refresh will catch up.

---

## Layer 2: Message RAG (Searchable History)

### What it is
Every message — both Jason's and Crosby's — is embedded and stored for vector search. This is the "search conversation history" capability. When Jason asks "what did we say about the Upland lease?" or Crosby needs to recall a specific exchange, this is the layer that answers.

### How it works
- **Every message embedded:** Both user messages and Crosby's responses get vector embeddings (same embedding model as the document pipeline — OpenAI text-embedding-3-small).
- **Searchable via tool:** Crosby has a `search_conversation_history` tool that queries this index. It returns relevant message snippets with timestamps and surrounding context.
- **Not in the system prompt.** Unlike the rolling summary, message RAG results are retrieved on-demand, not injected into every request. This keeps the base context lean.

### When Crosby uses this layer
- Jason asks about a past conversation: "What did we decide about the lease?"
- Jason references something vaguely: "That thing you told me about the vendor" — Crosby searches for vendor-related messages
- Crosby needs to verify its own past statements: "Did I already tell Jason about the calendar conflict?"
- Deep research or analysis that requires reviewing past discussions

### What gets embedded
- Full message content (both sides of the conversation)
- Metadata: timestamp, which Expert was active (if any), whether it was a proactive message

### What does NOT get embedded separately
- Tool call internals (the raw JSON of tool calls is not independently searchable — the message that contains the tool result is)
- System prompt content
- Rolling context summaries

---

## Layer 3: Memory System

### What it is
The persistent memory system (fully specced in PERSISTENT-MEMORY.md). Durable facts, events, and behavioral patterns extracted from conversation and stored permanently.

### Role in continuity
Memory is the **long-term knowledge layer.** It answers "what do I know?" not "what did we say?" The distinction matters:

| Question type | Layer that answers |
|---|---|
| "What's Jason's wife's name?" | Memory (semantic) |
| "What happened in the lease meeting last Tuesday?" | Memory (episodic) |
| "When Jason says 'send the numbers' what does he mean?" | Memory (procedural) |
| "What did we talk about yesterday?" | Rolling context summary |
| "What exactly did I say about the vendor offer?" | Message RAG |
| "What's been going on with the Anderson deal?" | Memory + Message RAG (hybrid) |

### Cross-reference
See PERSISTENT-MEMORY.md for the full memory model, extraction pipeline, retrieval system, and lifecycle rules.

---

## Layer 4: Raw Recent Messages

### What it is
The most recent ~20 messages (user + assistant turns) are included verbatim in the conversation history sent to the model. This is standard LLM conversation context — no summarization, no retrieval, just the raw recent exchange.

### Why ~20
- Enough to maintain conversational coherence (follow-up questions, clarifications, multi-turn reasoning)
- Small enough to leave room for the system prompt, rolling summary, retrieved memories, and tool results
- The exact number may flex based on message length — it's a token budget, not a hard message count

### Handoff to summary
When messages age out of the raw buffer (pushed past the ~20 mark by newer messages), they're already embedded for Message RAG. The rolling summary captures their thematic content on its next refresh. Nothing is lost — the information just moves from verbatim to compressed/searchable.

---

## System Prompt Routing Guidance

This is the most critical section. Ambiguity in which layer to use for which question is the #1 risk for bad responses. The system prompt must include explicit routing rules:

### Rules injected into system prompt

```
CONTEXT RETRIEVAL RULES — follow these exactly:

1. RECENT CONVERSATION (last few hours, "what did we just discuss"):
   → Use your conversation history and rolling summary. Do NOT search.

2. SPECIFIC PAST QUOTE ("what did I say about X", "what exactly did you tell me"):
   → Use search_conversation_history tool. Return the actual words, not a summary.

3. FACTS ABOUT JASON ("what's my wife's name", "which store is in Pasadena"):
   → Use retrieved memories. These are already in your context if relevant.
   → If not in context, this is a memory gap — say "I might be fuzzy on that."

4. PAST EVENTS ("what happened in the lease meeting", "when did we talk about hiring"):
   → Use retrieved memories (episodic) FIRST, then search_conversation_history for detail.

5. BEHAVIORAL PATTERNS ("how do I usually handle X", "what's my preference for Y"):
   → Use procedural memories. These are trigger-matched and already in context.

6. BROAD TOPIC RECALL ("what's the status of the Anderson deal", "catch me up on hiring"):
   → Use memories (semantic + episodic) for the knowledge layer.
   → Use search_conversation_history for specific recent discussions.
   → Use rolling summary for what's actively in flight.
   → Synthesize across all three — don't pick just one.

7. NEVER say "let me search my memory" or "checking my records."
   Just know it, or say "I might be fuzzy on the details."
```

### Why these rules matter
Without explicit routing, the model will default to whatever's in its immediate context — usually the rolling summary and recent messages. This means:
- It'll paraphrase instead of quoting when asked for exact words
- It'll miss old facts that aren't in the summary
- It'll hallucinate details from the summary instead of searching for the real exchange
- It'll fail to synthesize across layers for complex recall questions

The routing rules prevent all of these by telling the model exactly which tool/source to use for each question pattern.

---

## How the Layers Interact

### On every request
1. System prompt includes: rolling context summary + procedural memory triggers + routing rules
2. Conversation history includes: ~20 recent messages (verbatim)
3. Memory retrieval runs: semantic + episodic memories relevant to the current message are injected
4. Message RAG is available: via `search_conversation_history` tool, used on-demand

### On summary refresh (token threshold or 24hr timer)
1. LLM reads the current summary + messages since last refresh
2. Produces a new summary that overwrites the old one
3. Summary is written to a single DB row (not appended — replaced)

### On message send
1. Message is stored in the messages table (standard)
2. Message is embedded asynchronously (for Message RAG)
3. Memory extraction runs asynchronously (for persistent memory)
4. If token threshold crossed → summary refresh triggers asynchronously

All async operations (embedding, extraction, summary refresh) happen after the response streams back. None are in the critical path.

---

## Data Model (High Level)

| Entity | Storage | Refresh |
|---|---|---|
| Rolling context summary | Single row in a `context_summaries` table (or similar). One per user. | Overwritten on threshold or timer |
| Message embeddings | Vector column on the `messages` table (pgvector) | On every message, async |
| Memories | Dedicated tables per type (see PERSISTENT-MEMORY.md) | Async extraction after each message |
| Raw recent messages | Standard `messages` table, loaded by recency | Always current |

---

## Relationship to Sessions

Crosby v2 uses "sessions" as **chapters** within the infinite conversation — a session closes after 30 messages or 2 hours of idle time. Sessions exist for:
- Organizing the timeline visually (chapter markers, dividers)
- Scoping the rolling summary refresh (what happened in this chapter vs. earlier)
- Analytics (how long are sessions, what topics)

Sessions do NOT affect continuity. There is no context reset between sessions. The rolling summary, memories, and message RAG all span across session boundaries seamlessly. A session ending is invisible to the user in terms of Crosby's awareness.

---

## Ripple Effects

- **Rolling summary refresh** — needs a background job mechanism (cron or triggered). Must not block the chat response path.
- **Message RAG** — shares the embedding pipeline with documents. Same model (text-embedding-3-small), same infrastructure.
- **System prompt size** — the rolling summary adds to the system prompt. Need to enforce a max summary length (e.g., ~2K tokens) to leave room for other context.
- **Memory retrieval** — already specced in PERSISTENT-MEMORY.md. The routing rules here are the glue between memory and the other layers.
- **Living greeting** — the greeting system (PROACTIVE-MESSAGES.md) uses the rolling summary + recent activity to generate its content. Continuity is what makes the greeting feel natural.
- **Search tool UX** — when Crosby uses `search_conversation_history`, results should be presented naturally ("You mentioned last Tuesday that..."), not as search results.

---

## Open Questions

- [ ] Should the rolling summary have a maximum token length? (Proposed: ~2K tokens to leave room in the system prompt)
- [ ] Should message embeddings include metadata filters (date range, Expert context) for more targeted search?
- [ ] How should the summary handle multi-topic days? Compress everything into one narrative, or break into topic sections?
- [ ] Should Crosby proactively surface "it's been a while since we discussed X" for topics that drop out of the rolling summary?
