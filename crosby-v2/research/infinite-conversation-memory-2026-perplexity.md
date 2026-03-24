> **Original Prompt:** "I'm building a personal AI assistant where the core UX promise is that it feels like one continuous, never-ending conversation — like texting a friend who remembers everything. Not a chatbot where you start fresh each time, not a series of disconnected sessions. One relationship, one thread, forever.
>
> [Full prompt describes current architecture: single long-running conversation, sessions as invisible chapter markers (30 messages / 2hr idle), rolling summary + live messages + extracted memories loaded per request, memory extraction after every message, post-session extraction of decisions/commitments. Lists specific breakdowns: lossy rolling summary over months, recency-only memory retrieval (50 most recent), no hierarchical summarization, no contradiction detection, fragile cross-topic context, no progressive consolidation.]
>
> Research domains: (1) State of the Art in Long-Term LLM Memory (2026) — TiMem, Zep/Graphiti, MemOS, what production products (ChatGPT/Claude/Gemini) are actually doing, MemGPT/Letta status; (2) Memory Architecture Patterns — four-tier model (working/episodic/semantic/procedural), indexing strategies, memory consolidation, contradiction handling, retrieval strategies; (3) Summarization Strategies for Infinite Conversations — hierarchical summaries, preventing summarization drift, topic-entity summaries vs. time-period summaries; (4) Retrieval-Augmented Memory — embedding strategies for conversational memory, hybrid retrieval (vector + BM25 + temporal + entity), separate conversation memory index; (5) The 'Feeling' of Continuity — UX patterns, gap-aware greetings, executive assistant mental model; (6) Technical Implementation Patterns — XML context injection, retrieval latency management, memory job scheduling; (7) Production Examples and Case Studies — mem0, Zep, Nemori, Letta, TiMem, A-MEM status in 2026. Constraint: single-user personal assistant, Postgres/pgvector, standard LLM API via OpenRouter, background jobs on Vercel."

---

# Infinite Continuous Conversation: Long-Term LLM Memory Architecture in 2026

## Executive Summary

The state of the art in long-term LLM memory has advanced dramatically in the past 18 months. The core shift: the field has moved away from flat retrieval-augmented approaches toward **temporal-hierarchical memory trees**, **knowledge graph-based temporal reasoning**, and **OS-inspired memory schedulers**. For a single-user personal assistant building toward a "decade-long relationship" feeling, the winning pattern combines a five-tier hierarchical summarization system (raw → session → day → week → profile), topic-scoped episodic memory indexed per-entity, hybrid retrieval using BM25 + vector embeddings via Reciprocal Rank Fusion, and a versioned contradiction resolution layer. Everything described here is buildable with Postgres/pgvector and background jobs on Vercel via Inngest.

---

## 1. State of the Art in Long-Term LLM Memory (2026)

### Research Landscape

Three research systems have set the current benchmark as of early 2026:

**TiMem** (published January 2026) represents the current performance leader, achieving 75.30% on the LoCoMo benchmark and 76.88% on LongMemEval-S — outperforming all evaluated baselines while simultaneously *reducing recalled context by 52.20%*. Its core insight is treating temporal structure as a first-class organizational principle rather than auxiliary metadata. TiMem organizes memories through a **Temporal Memory Tree (TMT)** with five explicit levels: segment, session, day, week, and profile. Each level uses level-specific prompts to produce a different abstraction: factual distillation at L1–L2, behavioral pattern extraction at L3–L4, and stable persona synthesis at L5.[^1]

**Zep/Graphiti** (January 2025) takes a different approach via a temporally-aware knowledge graph. Nodes represent entities; edges represent relationships with explicit validity time windows. On the LongMemEval benchmark, Zep achieves 18.5% accuracy improvements over baselines while simultaneously reducing response latency by 90%. The temporal graph architecture is particularly powerful for handling contradictions — when "Jason said he was considering selling Store X" is superseded by "Jason decided to keep Store X," the old edge is marked as expired and the new edge becomes the active fact.[^2]

**MemOS** (July 2025) takes the operating-system metaphor further than MemGPT ever did, introducing a fundamental unit called the **MemCube** — a memory with content, provenance, and versioning metadata. The system manages three memory types (plaintext, activation, parameter) through a three-layer architecture, and its Next-Scene Prediction mechanism proactively preloads relevant memory before inference begins. On LoCoMo, MemOS achieves a 159% improvement in temporal reasoning over OpenAI's global memory, with a 38.97% overall accuracy gain and a 60.95% reduction in token overhead.[^3]

### What Production Products Are Actually Doing in 2026

**ChatGPT** launched project-only memory in August 2025. Projects get isolated memory spaces — automatic memory logs extracted from conversations within that project, scoped separately from general memories. The system decides what to extract (not the user), but users can view/edit saved memories. This is the closest production analog to your single-user continuous conversation.[^4]

**Claude** rolled out automatic persistent memory to all paying subscribers in October 2025, positioning it as a transparency-first system: users see exactly what's remembered, can toggle individual memories, and can establish distinct memory spaces for different contexts. Notably, Claude allowed users to import memories from ChatGPT to reduce lock-in friction.[^5]

**Letta** (formerly MemGPT) launched "sleeptime compute" in late 2025 — a pattern where subconscious background agents run continuously, reasoning over and reorganizing memory even when the user isn't actively conversing. This is the production realization of the "OS-like memory management" vision from the original MemGPT paper.[^6]

### The MemGPT/Letta Question

MemGPT's core "OS-like" metaphor — treating the LLM context window as RAM and external storage as disk — remains conceptually valid and is shipping in production. Letta is the cleaner, productionized version of that vision. For your use case (single-user personal assistant, Vercel/Postgres stack), Letta's full agent framework is heavier than you need, but the architectural principles — agentic self-editing of memory, sleeptime consolidation jobs — are directly applicable and worth implementing as background jobs.[^7]

---

## 2. Memory Architecture: The Four-Tier Model

### The Correct Taxonomy

Human cognitive science offers the right mental model. Four memory types map cleanly to LLM system design:[^8]

| Memory Type | What It Stores | Retrieval Pattern | Storage |
|---|---|---|---|
| **Working memory** | Current session context | Always present in context | In-context |
| **Episodic memory** | Specific events ("last Tuesday Jason was frustrated with the P&L email draft") | Temporal + semantic search | pgvector + BM25 |
| **Semantic memory** | Accumulated facts/preferences ("Jason runs 5 pizza restaurants, prefers bullet points") | Entity-indexed lookup + vector | Postgres structured + pgvector |
| **Procedural memory** | Behavioral patterns ("when Jason says 'send the numbers'…") | Tag/keyword lookup + LLM matching | Postgres structured table |

### Semantic Memory: Facts and Preferences

Semantic memory should be stored as structured records, not just embeddings. Each memory has: content text, importance score (1–10, LLM-rated), entity tags (people, businesses, topics), creation timestamp, last-accessed timestamp, superseded flag, and a confidence score. Retrieval combines vector similarity with entity-based filtering — when the user asks about Store #1008, the entity filter narrows the candidate set before scoring.

The key pattern from A-MEM is **memory evolution**: when a new memory arrives, the system doesn't just add it — it analyzes the existing memory network for related memories and updates their contextual representations. "Jason opened Store #1008 in 2022" gains a new connection and contextual note when "Store #1008 hit $2M revenue in 2025" is added. This creates a living knowledge network rather than a static fact dump.[^9]

### Episodic Memory: Event-Centric Indexing

Nemori's approach is the most elegant here. Raw conversation segments are transformed into narrative episode objects with: a title ("Jason and Crosby draft the partner P&L email"), a third-person narrative preserving salient context, keywords, entities, importance score, and a timestamp range. The indexing philosophy is crucial: episodes represent **human-scale events**, not individual messages. An LLM boundary-detection prompt identifies topic shifts (2 prompts total: boundary detection + episode generation). The resulting episodes are indexed with BM25 first (fast, no embeddings needed for the base case), with vector embeddings added as a hybrid layer for semantic matching.[^10]

This is the mechanism that solves your "returning to Project A after 2 weeks on Project B" problem — a query about Project A retrieves its episodes directly rather than needing them to appear in the rolling summary.

### Procedural Memory: Behavioral Routines

Procedural memory deserves its own table, not the same storage as facts. These are essentially named macros: a name, trigger pattern (natural language description), action description, example invocations, and a confidence score. When the assistant parses a new message, a lightweight classifier checks for procedural pattern matches before sending to the main LLM. This is also where you store meta-preferences: "never ask Jason to clarify his restaurant names — he'll say 'my pizza place' meaning Mr. Pickles."

---

## 3. The Hierarchical Summarization Solution

### Why Rolling Summaries Fail at Scale

Your current system fails because it compresses a 3-month conversation into the same 400-word summary as a 1-week conversation. Each summarization pass loses signal — this is the "summarization drift" problem. Research consistently shows that flat summarization approaches, even with good prompts, degrade substantially beyond a few weeks of conversation.[^1][^3]

### The Five-Level Temporal Hierarchy

TiMem's TMT structure is the right model to adopt. Translated to your architecture:[^1]

| Level | Granularity | Content Type | Trigger |
|---|---|---|---|
| **L1 Segment** | ~5–10 turns | Factual distillation of the exchange | Online, after each session |
| **L2 Session** | 1 session (30 messages / 2hr idle) | Non-redundant event summary | On session close |
| **L3 Daily** | 1 day | Routine contexts, recurrent interests | Daily cron |
| **L4 Weekly** | 1 week | Behavioral patterns, preference evolution | Weekly cron |
| **L5 Profile** | Ongoing (updated monthly) | Stable personality, values, long-term preferences | Monthly cron |

**Critical property**: each level's temporal interval strictly contains its children's intervals. The weekly summary covers everything in its daily children; daily covers sessions. This is what makes hierarchical recall work — you can always trace a high-level insight back to the raw segments that generated it.

The summarization prompt at each level is deliberately different. L1–L2 use factual prompts: "Extract key facts, decisions, commitments, and notable events." L3–L4 use pattern prompts: "What behavioral patterns, recurring preferences, and evolving interests are visible?" L5 uses persona prompts: "Describe the person's stable values, working style, priorities, and core relationships."

### Preserving Topic-Specific Context

The most important insight for your "cross-topic context is fragile" problem: **do not only summarize by time period**. Supplement the temporal hierarchy with **topic-entity summaries**. For each significant entity (a project, a person, a property, a restaurant location), maintain a rolling "entity summary" that captures everything known about that entity. When Store #1008 comes up after 6 weeks of silence, the entity summary for Store #1008 is retrieved directly — it doesn't need to be in the recent rolling summary.

GoDaddy's production pattern is instructive here: they break conversations into 5–10 turn chunks, summarize each with structured LLM tool calls (extracting key entities, actions, open issues, and facts with grounding quotes to reduce hallucination), then merge incrementally into a rolling summary. They also track sentiment trends across windows to detect frustration or emotional shifts.[^11]

### Multi-Resolution Context Assembly

When a user returns after 6 months, the assembled context should look like this:

1. **Profile summary** (L5): ~200 tokens — who Jason is, his key priorities, working style
2. **Recent period summary** (L4 weekly, last 2 weeks): ~400 tokens — what's been happening
3. **Active entity summaries**: summaries for any entities likely to come up — ~100 tokens each
4. **Last session's live messages** (L2): the unsummarized recent messages — ~500 tokens
5. **Retrieved episodic memories**: top-K episodes retrieved for the current query — ~300 tokens

This is multi-resolution context: rich detail on recent events, compressed but lossless coverage of stable identity, and on-demand depth for any topic via retrieval.

---

## 4. Memory Retrieval: Hybrid Scoring with Temporal Decay

### The Scoring Formula

The Park et al. "Generative Agents" scoring formula remains foundational and works well in production:[^12][^13]

```
score(m, q) = α · recency(m) + β · importance(m) + γ · relevance(m, q)
```

where:
- **Recency**: exponential decay — `exp(-λ · Δt)` where Δt is time since last access (decay factor ~0.995 per unit time)[^12]
- **Importance**: LLM-assigned score at write time (1–10 scale, rated against mundanity/significance axis)
- **Relevance**: cosine similarity between query embedding and memory embedding

Normalize each component to [0,1] before summing. Tune α, β, γ based on your use case — for a personal assistant serving someone who routinely references old commitments, increase β (importance) weight.[^1]

### Reciprocal Rank Fusion for Hybrid Retrieval

The best production pattern for memory retrieval is Reciprocal Rank Fusion (RRF), which combines rankings from multiple independent retrieval signals without needing to normalize scores across incompatible metrics:[^14][^15]

```
RRF(d) = Σ 1 / (k + r(d))
```

where k = 60 (empirically optimal), r(d) is the document's rank in retrieval list r. Run three independent searches in parallel:
1. **Dense vector search** (pgvector cosine similarity)
2. **Sparse BM25 search** (pg_textsearch or ParadeDB extension)[^16]
3. **Entity-filtered lookup** (structured Postgres query for named entities in the message)

Fuse with RRF, then apply an LLM recall gating step (from TiMem) that filters the top-N candidates down to the truly relevant ones for this specific query. This gating step is surprisingly powerful: it eliminates the noise of retrieving vaguely-related memories and reduces context length substantially.[^1]

**Complexity-adaptive retrieval** (from TiMem): classify each query as simple/hybrid/complex before retrieval. Simple queries (factual lookups) search L1 segments + L5 profile only. Complex multi-hop queries search all five levels. This reduces token consumption for straightforward exchanges without sacrificing depth for complex ones.[^1]

### The Separate Conversation Memory Index

Maintain a **dedicated conversation memory index** separate from your document/knowledge RAG index. These serve different purposes and require different retrieval strategies:[^17]

| Dimension | Document RAG | Conversation Memory |
|---|---|---|
| Data | Static docs, emails, calendar | Dynamic conversation history |
| Retrieval | Semantic similarity to documents | Semantic + recency + entity + temporal |
| Structure | Unstructured text chunks | Structured entities, events, relationships |
| Update frequency | Occasional | Every conversation turn |

Mixing these degrades both. Keep separate pgvector tables: `conversation_memories`, `episodic_events`, `entity_summaries`, `procedural_patterns`.

---

## 5. Contradiction Detection and Resolution

### The Supersede Pattern

The recommended production pattern for contradiction handling is **temporal versioning with supersession**, not deletion:[^18][^17]

```sql
CREATE TABLE semantic_memories (
  id uuid PRIMARY KEY,
  content text,
  entity_tags text[],
  importance_score int,
  created_at timestamptz,
  superseded_at timestamptz,      -- NULL = currently active
  superseded_by uuid REFERENCES semantic_memories(id),
  confidence float,
  embedding vector(1536)
);
```

When a new memory contradicts an existing one:
1. The LLM recall gating step detects the conflict (compare new memory embedding to existing memories; if NLI conflict score > threshold, flag it)
2. Mark the old memory as `superseded_at = NOW()` and link it to the new memory
3. Store the new memory as the active version
4. Preserve the old version for historical queries ("Jason said he was considering selling Store X in January")

**Temporal weighting** should be the default: recent statements override older ones by default. Do not require explicit user confirmation for every contradiction — this creates friction. Reserve confirmation for high-stakes contradictions (e.g., facts about major decisions or commitments).[^17]

For the Zep/Graphiti approach: edges in the knowledge graph carry temporal validity windows `[valid_from, valid_to]`. Querying for the current state of an entity returns only edges with `valid_to IS NULL`. Querying for historical state at time T is a natural temporal query. This is more powerful than simple supersession but requires the knowledge graph infrastructure.[^2]

### The Selective Forgetting Benchmark

Recent research (the FactConsolidation benchmark, March 2026) specifically evaluates agents' ability to reason over contradictory facts in long sequences. The finding: agents must be explicitly prompted to "prioritize later information in case of conflict and reason based on the final memory state." This should be a standing instruction in your system prompt for memory recall.[^18]

---

## 6. Context Injection: Format and Structure

### XML Blocks Win for Structured Memory

For injecting long-term memory into the LLM context window, structured XML with semantic tags outperforms both plain natural language and JSON for most production models:[^19][^20]

```xml
<memory>
  <profile>
    Jason DeMayo. Restaurant owner (Mr. Pickles franchise, 5 locations in Los Angeles area).
    Building a sports analytics platform. Prefers bullet points over prose.
    Direct communication style. Makes decisions quickly once he has data.
  </profile>

  <recent_context period="last_2_weeks">
    Focused on Q1 P&L review and potential lease renewal for Store #1008.
    Discussed sports platform naming (leading candidate: "GridIQ").
    Expressed frustration with vendor pricing for commercial freezer units.
  </recent_context>

  <active_entities>
    <entity name="Store #1008" summary="Highest-revenue location, lease up March 2027, considering expansion"/>
    <entity name="GridIQ" summary="Sports analytics platform in development, currently building data pipeline"/>
  </active_entities>

  <key_facts>
    - Weekly P&L email sent every Monday to partners
    - "Send the numbers" means the weekly P&L email
  </key_facts>

  <open_commitments>
    - Follow up on commercial freezer quote from vendor (mentioned 3 days ago)
    - Review lease terms for Store #1008 before end of month
  </open_commitments>

  <retrieved_memories query_context="current">
    [2026-01-14] Discussed GridIQ data provider options; leaning toward SportRadar over Stats Perform on cost.
    [2025-11-03] Agreed to table the Store #1022 expansion discussion until Q2.
  </retrieved_memories>
</memory>
```

**Token efficiency considerations**: YAML provides ~30–40% smaller footprint than JSON for structured data. XML is more verbose but models (especially Claude) parse it with higher reliability for complex nested structures. For a personal assistant, the difference is acceptable — the memory block at 1.5–3K tokens is well within budget.[^21]

**Critical**: context compression starts degrading at ~32K tokens even in large-window models due to "lost in the middle" attention effects. Keep memory blocks concise and rely on retrieval rather than cramming everything in.[^21]

### The Optimal Context Assembly Order

Research on long-context attention suggests this ordering for maximum attention quality:

1. System prompt (role, personality, standing instructions)
2. Structured memory block (profile → recent context → active entities → key facts → open commitments)
3. Retrieved episodic memories (most relevant, recency-sorted)
4. Relevant external data blocks (calendar, emails, documents via RAG)
5. Live conversation history (most recent N messages)
6. Current user message

Put the most important context at the beginning and end of the window — models attend best to these positions.

---

## 7. Summarization Drift Prevention

### The Anti-Drift Principle: Anchor with Quotes

The most effective technique to prevent signal loss through successive summarization passes is **grounding every summary with exact quotes for key decisions and commitments**. GoDaddy's production system demonstrated this: summaries that include verbatim grounding quotes for important facts reduce hallucination and preserve fidelity through re-summarization. The quote serves as an anchor that survives compression.[^11]

At the L1/L2 levels, your summarization prompt should output:
- Free-form narrative summary
- Structured extraction: `decisions[]`, `commitments[]`, `key_facts[]`, `open_questions[]`
- Grounding quotes for each extracted item (verbatim from the transcript)

The structured extraction is stored separately in a Postgres table and never re-summarized — it's the factual bedrock. Only the narrative summary goes through further compression at higher levels.

### Preventing Topic Loss

When a topic is discussed extensively and then goes quiet, standard summarization will compress it out of the rolling window within weeks. The solution is the **topic/entity island** pattern:

1. At summarization time, extract mentioned entities/topics as structured tags
2. For each entity with sufficient discussion depth (e.g., more than 3 mentions in a session), create/update an entity summary record
3. Entity summaries are retrieved on-demand based on query content, not time

This means that a deep legal discussion from 8 months ago doesn't need to live in the rolling summary — it lives in the entity summary for that legal matter and is retrieved when the topic resurfaces.

---

## 8. Open-Source Tools and Their Status in 2026

### Tool Comparison for Postgres/Vercel Stack

| Tool | Approach | Postgres Compatible | Status | Best For |
|---|---|---|---|---|
| **mem0** | Dense vectors + optional knowledge graph (mem0g) | Yes (pgvector backend) | Active, production-ready | Drop-in semantic memory layer; easiest to adopt |
| **Zep/Graphiti** | Temporal knowledge graph | External (own storage) | Active, shipping | Best contradiction handling; requires more infrastructure |
| **Nemori** | BM25-first episodic memory | Yes (DuckDB → Postgres) | Open-source, active | Episodic layer; remarkably lightweight |
| **A-MEM** | Self-organizing Zettelkasten notes | Agnostic | Research paper, not fully productionized | Architecture inspiration |
| **Letta** | Full agent with persistent memory + sleeptime compute | External | Production-ready agent platform | Full agent framework; overkill for single-user assistant |
| **TiMem** | Temporal hierarchy tree | Agnostic (described in paper) | Research, January 2026 | Architectural blueprint |

**Practical recommendation for your stack**:
- Use **mem0** with pgvector backend as the semantic/fact memory layer (3-day integration)
- Implement **Nemori-style** episodic indexing in your own Postgres tables (1-week build)
- Implement the **TiMem hierarchy** as a background job system (2-week build)
- Skip Zep/Graphiti unless cross-entity temporal reasoning becomes a significant pain point

---

## 9. Background Job Architecture on Vercel

### The Memory Pipeline

Vercel's serverless architecture creates a specific constraint: raw background goroutines are killed at function timeout. Use **Inngest** as the background job layer — it's the standard pattern for Vercel + Next.js projects and handles retries, step functions, and long-running workflows by chaining HTTP invocations. **QStash** (Upstash) is the simpler alternative for pure HTTP-based jobs.[^23][^24][^25]

**Event-driven memory pipeline**:

```
User sends message
  → LLM responds (synchronous, <3s)
  → inngest.send("memory/message.processed", { messageId, sessionId })

[Background - Inngest]
memory/message.processed:
  Step 1: Extract entities + importance score (LLM call, ~1s)
  Step 2: Upsert semantic memories with supersession check
  Step 3: Update entity summaries if entities have sufficient mass
  Step 4: Store to episodic BM25 index

Session closes (30 messages or 2hr idle):
  → inngest.send("memory/session.closed", { sessionId })

[Background - Inngest]
memory/session.closed:
  Step 1: Generate L1 segment summaries for each ~5-turn chunk
  Step 2: Generate L2 session summary from segments
  Step 3: Extract decisions[], commitments[], key_facts[]
  Step 4: Update open commitments table
  Step 5: Trigger entity summary refresh for mentioned entities

[Cron jobs]
Daily:   Generate L3 daily summaries from L2 sessions
Weekly:  Generate L4 weekly patterns from L3 dailies
Monthly: Regenerate L5 profile from L4 weeklies
         + Run contradiction detection pass on semantic memories
```

### Memory Retrieval Latency

Pre-fetching is the key to sub-200ms retrieval latency. Implement a **hot-tier prefetch** pattern: at session start, proactively load the user's profile summary, recent weekly context, and any entities mentioned in the last session into a Redis-backed hot tier. At query time, the retrieval path for these hot items is a cache hit.[^17]

For cold retrieval (the user references something unexpected from 6 months ago), run the hybrid RRF query in parallel to the LLM call using Promise.all — start the retrieval the moment the user message arrives, before the LLM call completes its first tokens.

**Target latency budget**: profile + recent context (hot cache): <50ms; hybrid RRF search: 100–300ms; LLM recall gating: runs during streaming, adds 0 perceived latency.

---

## 10. UX Patterns That Maintain the Continuity Illusion

### Returning User Protocols

The moment that most breaks the illusion of a continuous relationship is the first message after a gap. Human executive assistants handle this naturally — they say "Good morning, before we get into today's agenda, I noticed the vendor quote from last week is still open." Your assistant should do the same.[^26]

**Gap-aware greeting patterns** by absence duration:
- **Same day, new session**: No special acknowledgment. Just pick up the thread.
- **1–7 days**: Brief reference to where you left off. "Last time we were working through the lease renewal — anything new there?"
- **1–4 weeks**: Acknowledge the gap, briefly surface the most active open thread. "It's been a few weeks — looks like the GridIQ data pipeline was the last thing we were deep on. Pick up there or something new?"
- **1+ months**: More explicit re-grounding. Offer a brief "Here's where we are" summary of active entities, open commitments, and anything the user should know.

The critical principle: **always make the first move**. Don't wait for the user to ask "what were we doing?" — that question exposes the seams of the system.

### Graceful Handling of "I Told You This Already"

When a user says "I already told you this" or implies the assistant should have known something:[^26]
1. **Acknowledge without gaslighting**: "You're right, I should have had that. Let me make sure it's locked in."
2. **Reinforce the memory**: explicitly save it with higher importance score
3. **Never argue** about whether the user said it — even if retrieval failed, the social contract requires accepting the user's claim
4. **Self-diagnose quietly**: log the retrieval failure for analysis; don't explain your memory architecture to the user

### Making Memory Visible Without Breaking the Flow

The illusion is strongest when memory feel like natural conversational callbacks, not database lookups. The difference:

| Breaks the Illusion | Maintains the Illusion |
|---|---|
| "According to my memory from 3 months ago, you said..." | "I remember you mentioned Store #1008 had lease issues — how did that resolve?" |
| "I have no record of that in my memory system" | "I might be fuzzy on the details — can you remind me of the specifics?" |
| "What did we talk about last time?" answered generically | Proactively surface the most relevant context without being asked |
| Long silence, then a perfect recall | Brief acknowledgment of uncertainty when confidence is low |

The key framing: the assistant is a person who remembers, not a database that retrieves.[^27][^28]

### The Executive Assistant Mental Model

A decade-long executive assistant maintains continuity through several practices that translate directly to system design:[^29][^26]

- **Strategic pattern recognition**: connects dots across disconnected pieces of information to surface non-obvious implications ("Three of your vendors raised prices this quarter — is there a supply chain issue we should plan around?")
- **Proactive callbacks**: surfaces open commitments before the deadline, not after ("You mentioned the Upland property offer expires Friday — did you want to move on that?")
- **Calibrated uncertainty**: acknowledges the limits of recall gracefully rather than hallucinating or going silent
- **Peer relationship model**: honest collaboration that pushes back when appropriate, rather than pure sycophantic agreement[^30]
- **Institutional memory**: maintains context about relationships, decisions, and history that would take a new hire months to learn

---

## 11. Implementation Roadmap for Your Stack

### Phase 1: Fix What's Broken (1–2 weeks)

**Problem → Fix**:

1. **Recency-only memory retrieval** → Add importance score (LLM-rated at write time) and entity-based filtering. Change retrieval from "50 most recent" to top-30 by RRF(recency + importance + semantic relevance)
2. **No contradiction detection** → Add a supersession check on every memory write: embed the new memory, retrieve the top-5 most semantically similar existing memories, run a lightweight NLI check; if conflict detected, mark old as superseded
3. **No episodic layer** → Add a `conversation_episodes` table. On session close, run the 2-prompt Nemori pipeline (boundary detection + narrative generation) and build a BM25 index over the resulting episodes

### Phase 2: Hierarchical Summarization (2–3 weeks)

1. Implement the 5-level TMT as Inngest jobs triggered by session close + cron
2. Add topic/entity summary tables updated at L2 summary time
3. Add grounding quotes to all L1/L2 summaries
4. Modify context assembly to use multi-resolution injection (profile + recent weekly + entity summaries + live messages + retrieved episodes)

### Phase 3: Full Hybrid Retrieval (1–2 weeks)

1. Add ParadeDB or pg_textsearch for BM25 scoring alongside pgvector
2. Implement RRF fusion in a SQL CTE query
3. Add LLM recall gating step (post-RRF filter)
4. Implement complexity classification to route simple vs complex queries to different retrieval depths

### Phase 4: Sleeptime Consolidation (ongoing)

1. Weekly Inngest cron: re-scan all semantic memories for patterns, update entity summaries
2. Monthly cron: regenerate L5 profile summary, run full contradiction scan, promote/demote importance scores based on access patterns
3. "Memory strengthening": increase importance score of a memory every time it's accessed; allow un-accessed memories to gradually decay
