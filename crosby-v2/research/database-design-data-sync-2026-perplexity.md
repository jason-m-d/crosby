> **Original Prompt:** "You are helping me plan the architecture for Crosby v2. This is an AI personal assistant built on Next.js (App Router) + TypeScript + Supabase, with Claude as the LLM routed through OpenRouter. It integrates with Gmail, Google Calendar, a CRM, tasks, SMS, and documents. I need production-focused research on the following 4 domains of database design and data sync for AI personal assistants in 2026: (1) Data model — how to structure data for a multi-integration AI assistant, unified vs. per-source schemas, contact/people entity resolution, conversation history schema, context tracking for LLM observability; (2) External data sync patterns — Gmail sync (Pub/Sub), Google Calendar sync (syncToken), sync job frequency and failure handling; (3) RAG architecture in 2026 — one vector store vs. separate collections, chunking strategies by content type, hybrid search (vector + BM25), reranking; (4) Supabase in 2026 — platform maturity for AI apps, pgvector HNSW, Supabase vs. Neon/Pinecone, RLS for multi-tenancy."

---

# Database Design & Data Sync for AI Personal Assistants (2026)

## Executive Summary

Building a production-quality AI personal assistant that spans Gmail, Google Calendar, CRM, tasks, documents, and SMS requires deliberate choices at the data model, sync, and RAG layers. The right architecture uses a hybrid entity model — a canonical `people` table for cross-source identity resolution, per-source raw tables for fidelity, and a unified `activities` table for timeline queries. For sync, Gmail's Pub/Sub push model combined with Google Calendar's `syncToken` pattern is the modern standard. For RAG in 2026, hybrid vector + BM25 search running entirely inside Postgres/pgvector is production-ready and eliminates the need for a separate vector database at personal-assistant scale. Supabase remains a strong choice for this stack, with meaningful 2025–2026 improvements, though Neon is worth considering for pure database needs with separate services.

***

## Part 1: Data Model for Multi-Integration Assistants

### Unified vs. Per-Source Schema

The most durable pattern for multi-integration data is **not** a single flat unified table, but a **three-layer model**:

1. **Raw source tables** — Store the original, provider-specific payload (e.g., `gmail_messages`, `gcal_events`, `crm_deals`). These tables preserve provider-specific fields and act as an append-only event log. Denormalize aggressively here; storage is cheap.
2. **Canonical entity tables** — A resolved `people`, `organizations`, and `activities` layer where records from multiple sources are merged via entity resolution (covered below). These tables are where your LLM reads from.
3. **Sync metadata tables** — Track per-source sync state, tokens, freshness timestamps, and error logs. Critical for incremental sync and debugging.

This structure gives you clean separation between "what Google told us" and "what we've resolved to be true about this person," which matters enormously for debugging and for feeding accurate context to the LLM.

### Contact and People Entity Resolution

The hardest modeling problem in this stack is resolving that "sarah@acme.com" in Gmail, "Sarah Johnson" in your CRM, and "+1 (555) 555-0100" in your text messages are the same person. The canonical pattern is:[^1][^2]

- A `people` table that holds your resolved, authoritative view of each person with fields for canonical name, primary email, primary phone, organization, and source-of-truth metadata
- `people_identifiers` — a separate table mapping (`people_id`, `identifier_type`, `value`, `source`) where `identifier_type` is `email`, `phone`, `linkedin_url`, etc. This is what makes multi-source joins feasible
- Foreign keys from `gmail_messages.from_people_id → people.id`, `gcal_events` attendee junction table, `crm_contacts.resolved_people_id`, etc.

**Resolution strategy (deterministic first, probabilistic fallback):**[^1]
- **Tier 1 (exact match):** If email addresses match exactly across sources, auto-merge with high confidence. This resolves ~70–80% of cases.
- **Tier 2 (normalized match):** Normalize phone numbers to E.164, lowercase emails, strip suffixes from names, then match. Catches `+1 555 5550100` vs. `5555550100`.
- **Tier 3 (fuzzy/probabilistic):** For remaining ambiguity (same name, different employers), use a `merge_candidates` table with a confidence score. Surface these to the user or resolve via recency/co-occurrence signals.

Store `merge_confidence` and `merge_source` on each resolved entity. This is essential for debugging hallucinations that trace back to bad entity merges.

### Conversation History Schema

For a personal assistant handling thousands of messages over months, the schema must handle three distinct concerns: storage efficiency, LLM replay fidelity, and observability. A production-grade schema:

```sql
-- Core conversation thread
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Individual turns (human, assistant, tool)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT,                    -- Human-readable content
  content_parts JSONB,             -- Structured parts for multimodal
  tool_call_id TEXT,               -- Links tool result back to call
  tool_name TEXT,                  -- Name of tool invoked
  tool_input JSONB,                -- Parameters passed to tool
  tool_output JSONB,               -- Raw tool result
  token_count INT,
  model_version TEXT,              -- e.g., 'claude-3-7-sonnet-20250219'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sequence_num INT NOT NULL        -- Ordering within conversation
);

-- LLM call observability (one row per actual API call)
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  message_id UUID REFERENCES messages(id),
  model TEXT NOT NULL,
  prompt_tokens INT,
  completion_tokens INT,
  latency_ms INT,
  context_snapshot_id UUID,        -- FK to context_snapshots
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cost_usd NUMERIC(10,6)
);
```

**Key design decisions:**
- Keep `tool_call_id` on messages so you can reconstruct the tool-call ↔ tool-result chain exactly as the model saw it. OpenAI and Anthropic both use this ID to link calls and results in multi-turn conversations.
- Store `content_parts JSONB` separately from `content TEXT` to support multimodal content without schema changes.
- `sequence_num` is critical — do not rely on `created_at` ordering alone; clock skew and async writes will cause subtle bugs.
- Partition `messages` by month (`PARTITION BY RANGE (created_at)`) once you exceed a few hundred thousand rows.

### Context Tracking for LLM Observability

Every LLM call should record exactly what context was injected. The pattern is a `context_snapshots` table:[^3][^4]

```sql
CREATE TABLE context_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llm_call_id UUID REFERENCES llm_calls(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- What retrieval queries were run
  retrieval_queries JSONB,          -- Array of {query, domain, results_count}
  -- Which chunks were injected and their source
  context_chunks JSONB,             -- Array of {chunk_id, source_type, source_id, score}
  -- Full assembled prompt (or hash if too large)
  prompt_hash TEXT,
  prompt_token_count INT,
  -- Conversation history included
  history_messages_included INT,    -- How many prior messages
  history_truncated BOOLEAN,
  -- Which external data was fetched
  external_data_refs JSONB          -- e.g., [{type: 'email', id: '...'}, ...]
);
```

This table is your primary debugging instrument. When the assistant gives a wrong answer, you query `context_snapshots` for that call and see exactly which chunks were retrieved, whether conversation history was truncated, and which external records were referenced.[^3]

***

## Part 2: External Data Sync Patterns

### Gmail Sync in 2026

The definitive Gmail sync architecture in 2026 is **push-based (Pub/Sub) + incremental pull on notification:**[^5][^6]

1. **Initial full sync**: On OAuth connect, fetch the last N months of messages using `messages.list` with `q` filters. Store raw message IDs, thread IDs, labels, and basic metadata.
2. **Ongoing: Gmail Watch + Pub/Sub push**: Call `users.watch()` on the user's mailbox targeting a Cloud Pub/Sub topic. Gmail sends a push notification (containing only the `historyId` that changed) to your endpoint whenever any mailbox change occurs. Your endpoint then calls `history.list` with the last known `historyId` to get the actual changes incrementally.[^7][^5]
3. **Watch renewal**: Gmail Watch subscriptions expire after 7 days. Maintain a cron job that renews watches at ~6 days for active users.

**What to store locally vs. fetch on demand:**
- **Store locally:** Message ID, thread ID, from/to/cc headers, subject, date, label IDs, snippet (first 200 chars), internal date. This covers 95% of assistant queries without re-fetching.
- **Fetch on demand:** Full message body, attachments. Cache in Supabase Storage for 30 days after first fetch.
- **Always embed:** Subject + snippet (for RAG retrieval). Full body on demand after fetch.

**Deduplication:** Maintain a `processed_history_ids` set to prevent duplicate processing when multiple notifications arrive close together.[^6]

**Rate limits to respect:** Gmail API is 15,000 quota units per user per minute, with most operations costing 5–10 units. Push notifications eliminate polling overhead entirely.[^8][^6]

### Google Calendar Sync in 2026

Google Calendar provides a native `syncToken` mechanism designed exactly for this use case:[^9][^10]

1. **Initial full sync**: Call `events.list` with desired `timeMin`/`timeMax`. Store the `nextSyncToken` from the final page of results.
2. **Incremental sync**: Call `events.list?syncToken=<stored_token>`. The API returns only events modified, created, or deleted since the last sync. Deleted events are returned with `status: "cancelled"`.
3. **Webhook (push channel) for real-time**: Set up a Calendar Push Channel via `events.watch()`. When any event changes, Google sends a notification with the `channelId` and a `resourceState`. On notification receipt, run the incremental sync using the stored `syncToken`.
4. **Token expiry handling**: When the server returns HTTP 410 (Gone), the sync token has expired. Wipe the local calendar store for that calendar and re-run a full sync. Design your schema to support this gracefully — keep source data separate from resolved data so a full calendar wipe doesn't cascade into destroying entity resolutions.[^10][^9]

**Recurring events are the hard part.** A single recurring event in Google Calendar is represented as a parent event plus exception instances. Store parent `recurrenceId` and handle `originalStartTime` for exceptions.[^11]

**Conflict resolution:** For a personal assistant (single source of truth = Google Calendar), last-write-wins is acceptable. If you allow the assistant to write back to Calendar, add an `assistant_created` flag and a `local_last_modified_at` timestamp.

### Sync Job Frequency and Failure Handling

| Data Source | Recommended Sync Frequency | Approach |
|---|---|---|
| Gmail | Event-driven (Pub/Sub) | Push + incremental on notification |
| Google Calendar | Event-driven + 15-min fallback poll | Push channel + syncToken |
| CRM | Webhook + 30-min poll | Provider-specific webhooks |
| SMS/Twilio | Event-driven | Webhooks per message |
| Documents | On upload/edit event | Storage trigger |

**Freshness indicators** are critical for AI agents that act on stale data. Add to each source table:[^12]

```sql
ALTER TABLE gmail_messages ADD COLUMN synced_at TIMESTAMPTZ;
ALTER TABLE gcal_events    ADD COLUMN synced_at TIMESTAMPTZ;
-- Per-source sync state
CREATE TABLE sync_state (
  source TEXT PRIMARY KEY,             -- 'gmail', 'gcal', 'crm'
  last_successful_sync_at TIMESTAMPTZ,
  last_attempted_sync_at TIMESTAMPTZ,
  sync_token TEXT,                     -- Source-specific (historyId, syncToken)
  status TEXT,                         -- 'healthy' | 'degraded' | 'failed'
  consecutive_failures INT DEFAULT 0,
  last_error TEXT
);
```

When the assistant is about to answer a query about recent emails, check `sync_state.last_successful_sync_at`. If it's more than 10 minutes stale, inject a disclaimer into the context: "Note: email sync last completed 23 minutes ago — very recent emails may not be included."

**Partial sync and retry strategy:** Use exponential backoff with jitter for failed sync jobs (10s → 60s → 5m → 30m → dead-letter queue). After 5 consecutive failures, mark the source as `failed` and surface this in the assistant's system prompt so it can communicate uncertainty to the user.

***

## Part 3: RAG Architecture in 2026

### One Vector Store vs. Separate Collections Per Domain

The recommended architecture in 2026 for a personal assistant is a **single Postgres/pgvector instance with namespace/domain filtering** rather than separate vector databases per data type. The reasons:[^13][^14]

- Cross-domain queries require a single retrieval pass with metadata filters, not fan-out across multiple vector stores followed by manual merging
- ACID consistency between your relational data and vector data is valuable — when you delete an email, the embedding is deleted transactionally
- At personal-assistant scale (single user, millions of chunks max), pgvector with HNSW indexing handles this comfortably[^15][^16]

The key design decision is a well-structured `chunks` table with domain-typed metadata:

```sql
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  -- Source reference
  source_type TEXT NOT NULL,    -- 'email' | 'calendar' | 'document' | 'sms' | 'crm_note'
  source_id TEXT NOT NULL,      -- FK to the source record
  -- Content
  content TEXT NOT NULL,
  content_hash TEXT,            -- For dedup
  chunk_index INT,              -- Position within source document
  chunk_total INT,
  -- Vector
  embedding vector(1536),       -- OpenAI text-embedding-3-small dimensions
  -- Searchable metadata
  created_at TIMESTAMPTZ,
  people_ids UUID[],            -- Resolved people mentioned in this chunk
  -- Full-text search
  content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  -- Sync
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_fts ON chunks USING GIN (content_tsv);
CREATE INDEX chunks_source ON chunks (user_id, source_type, source_id);
CREATE INDEX chunks_people ON chunks USING GIN (people_ids);
```

The `people_ids` array on each chunk is what enables the query "What did Sarah email me?" — resolve Sarah to her `people_id`, then filter `chunks WHERE people_ids @> ARRAY[sarah_id]` combined with `source_type = 'email'`.

### Embedding Models in 2026

| Model | MTEB Score | Dimensions | Cost | Best For |
|---|---|---|---|---|
| Voyage AI voyage-3-large | ~67.8% | 1024 | $0.18/1M tokens | Highest retrieval accuracy[^17] |
| OpenAI text-embedding-3-large | ~64.6% | 3072 | $0.13/1M tokens | Strong general-purpose, broad ecosystem[^18][^17] |
| OpenAI text-embedding-3-small | ~62.3% | 1536 | $0.02/1M tokens | Cost-efficient for high-volume ingestion[^17] |
| Cohere embed-v4 | ~63.1% | 1024 | $0.10/1M tokens | Best multilingual, includes rerank API[^18] |
| BGE (self-hosted) | ~63.9% | 1024 | $5–20/1M infra | Maximum control, no vendor dependency[^17] |

**Practical recommendation for a personal assistant:** Start with `text-embedding-3-small` (1536 dims, $0.02/1M tokens). At personal assistant scale — even a power user with 5 years of archived email — you're unlikely to embed more than 10–20M tokens total, making cost a non-issue. Upgrade to `text-embedding-3-large` or `voyage-3-large` if retrieval quality is the bottleneck.

### Chunking Strategy by Content Type

Different content types have fundamentally different optimal chunking strategies:[^19][^20][^21][^22]

**Emails:** Treat each email as its own document. For short emails (<500 tokens), store as a single chunk. For long emails, split on paragraph boundaries with ~100 token overlap. Always include subject line and from/to metadata at the start of every chunk. Thread emails get chunked individually but share a `thread_id` metadata field.

**PDFs and documents:** Page-level chunking wins for structured PDFs (reports, proposals, contracts). Handle tables separately as structured markdown chunks rather than raw text. For long prose documents, semantic chunking yields ~9% better recall at higher compute cost.[^19]

**Calendar events:** Each event is a single chunk containing: title, description, attendees (resolved display names), time, location. The key is metadata richness — all attendee `people_ids` and the event time should be stored as indexed columns.

**SMS messages:** Individual messages are too short to chunk individually; group by conversation thread + rolling 30-minute window. Embed the group with participant names prepended.

**Web pages / notes:** Recursive character splitting at 400–512 tokens with 10–20% overlap is the safe default.[^22][^19]

### Hybrid Search (Vector + BM25) in 2026

Hybrid search is no longer optional for production RAG — it is the baseline. Vector-only search fails on:[^14][^23]
- Exact keywords (error codes, IDs, proper names like "Johnson proposal")
- Recent content where embeddings may not yet reflect updated context
- Short queries where semantic signal is weak

The implementation inside Postgres uses **Reciprocal Rank Fusion (RRF)** to combine pgvector cosine similarity ranking with BM25 keyword ranking. Two approaches are available in 2026:

**Option A: Native Postgres (tsvector + pgvector)**[^24]

```sql
WITH semantic AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $query_vec) AS rank
  FROM chunks
  WHERE user_id = $uid
  ORDER BY embedding <=> $query_vec
  LIMIT 50
),
keyword AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, query) DESC) AS rank
  FROM chunks, to_tsquery('english', $query_text) query
  WHERE user_id = $uid AND content_tsv @@ query
  ORDER BY ts_rank(content_tsv, query) DESC
  LIMIT 50
)
SELECT c.id, c.content, c.source_type,
  COALESCE(1.0/(60+s.rank), 0) + COALESCE(1.0/(60+k.rank), 0) AS rrf_score
FROM chunks c
LEFT JOIN semantic s ON c.id = s.id
LEFT JOIN keyword k ON c.id = k.id
WHERE s.id IS NOT NULL OR k.id IS NOT NULL
ORDER BY rrf_score DESC
LIMIT 20;
```

**Option B: ParadeDB pg_search (true BM25)**[^25][^23]
ParadeDB's `pg_search` extension adds a true BM25 index to Postgres with proper IDF weighting, stemming, and field boosting. This is meaningfully more accurate than `tsvector` for document-heavy workloads and runs entirely within Postgres. Recommended for production deployments where retrieval quality matters.

A weighted score (e.g., 70% vector + 30% keyword) often outperforms pure RRF for domain-specific queries. Tune these weights based on query type.[^25]

### Multi-Domain Context Assembly

For the query "What did Sarah email me about the Johnson proposal last week?", the retrieval pipeline is:

1. **Intent decomposition** (via LLM or heuristic): Extract entities (`Sarah`, `Johnson proposal`), time range (`last week`), domain (`email`)
2. **Entity resolution**: Resolve `Sarah` to `people_id`, `Johnson proposal` to a candidate `crm_deal_id` or keyword
3. **Domain-filtered hybrid search**: Run the hybrid query with `source_type = 'email'`, `people_ids @> ARRAY[sarah_people_id]`, `created_at > NOW() - INTERVAL '7 days'`
4. **Optionally expand**: If results are sparse, widen to include calendar events and CRM notes mentioning "Johnson" in the same time range
5. **Rerank**: Pass top-20 candidates through a reranker to surface the 5–8 most relevant

The `people_ids` array on each chunk is what makes step 3 fast without a JOIN — it's a precomputed denormalization that's worth maintaining at ingestion time.[^2]

### Reranking in 2026

Reranking is absolutely worth it for production RAG. First-stage retrieval (vector + BM25) optimizes for recall; reranking optimizes for precision.[^26]

**Current model landscape (March 2026):**[^27]

| Model | ELO Score | Context Window | Latency | Best For |
|---|---|---|---|---|
| Zerank-2 | ~1650 | 8K | ~200ms (CPU) | Best overall |
| Cohere Rerank 4 Pro | 1627 | 32K | ~200ms | Long docs, enterprise |
| Voyage Rerank 2.5 | ~1580 | 16K | ~150ms | Balanced |
| Cohere Rerank 4 Fast | 1506 | 32K | ~80ms | High throughput |

**Practical guidance:** For a personal assistant, Cohere Rerank 4 Fast at ~80ms per query is the sweet spot. The 32K context window means it can handle long emails without truncation. Pass top-20 semantic+keyword results through the reranker, return top-5 to the LLM. This two-stage approach (broad retrieval → precise reranking → generation) is the current production standard.[^27][^26]

***

## Part 4: Supabase in 2026

### Platform Maturity and AI-Relevant Features

Supabase is mature and production-ready for AI applications in 2026. Key relevant improvements:[^28][^15]

- **pgvector HNSW support**: Full HNSW indexing is available, making approximate nearest-neighbor search fast enough for production RAG workloads at millions-of-vectors scale[^29][^15]
- **PostgREST v14**: 20% faster requests per second; schema loading is 350x faster (from 7 minutes down to 2 seconds for large schemas)[^28]
- **pgvector + auto-embedding**: Supabase's AI toolkit supports automatic embedding generation and integrated RAG pipelines with native OpenAI, Anthropic, and Hugging Face integrations[^29][^28]
- **Edge Functions**: Useful for running sync webhook receivers and lightweight preprocessing without spinning up separate services
- **Supabase MCP Server**: AI assistants can now read schemas, run queries, and manage migrations directly — a meta-feature worth knowing about for your own development workflow[^30]

The key architectural advantage of keeping vectors in Postgres (pgvector) vs. a separate service like Pinecone is transactional consistency — when you delete an email, the embedding row can be deleted in the same transaction, with no sync lag.[^31]

### Supabase vs. Alternatives

| Feature | Supabase | Neon | Postgres + Pinecone |
|---|---|---|---|
| Vector search | pgvector (native, HNSW) | pgvector (native) | Pinecone (purpose-built) |
| Auth | Built-in (JWT, OAuth, RLS) | External required | External required |
| Realtime subscriptions | Yes (built-in) | No[^32] | No |
| Edge Functions | Yes | No | No |
| Auto-suspend / scale-to-zero | No | Yes[^33] | N/A |
| DB branching | Slower (migration-based) | Fast (copy-on-write)[^33] | N/A |
| Vector scale ceiling | ~5–10M vectors well-tuned | ~5–10M vectors well-tuned | 100M+ vectors[^16] |
| Best for | Full-stack AI backend | Pure DB, Vercel apps | Billion-scale vector search |

**For a personal assistant (single user):** Supabase is the clear choice. The built-in auth, realtime subscriptions, and Edge Functions eliminate significant glue code. The vector scale ceiling of "well-tuned pgvector" (5–10M vectors) is far above what a personal assistant will ever need for a single user.

**Neon** is compelling if you want database branching for dev/test workflows and don't need auth or realtime — but you'd need to add Clerk/Auth.js and build realtime separately.[^34][^35][^33]

**Pinecone** only makes sense if you're scaling to hundreds of millions of vectors. A personal assistant with 5 years of email, calendar, and documents will have at most a few million chunks. With pgvectorscale (Timescale's extension), PostgreSQL achieves 28x lower p95 latency and 16x higher throughput vs. Pinecone at 25% the cost.[^36][^16]

### Row Level Security for Single-User → Multi-Tenant Migration

Design your RLS from day one as if you'll be multi-tenant, because retrofitting it is painful. The right pattern:[^37][^38][^39]

```sql
-- Enable RLS on every table
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
-- etc.

-- Single-user policy (also works for multi-tenant — just add user_id column everywhere)
CREATE POLICY "user_owns_data" ON chunks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Key architectural decisions for future multi-tenancy:**[^38][^37]

- Add `user_id UUID NOT NULL` to every data table from day one — even though you only have one user now. Adding this column later requires a table rewrite.
- Wrap permission-checking logic in `SECURITY DEFINER` functions rather than inlining the logic in every policy. When you add role-based access, you change the function, not 50 policies.
- Create a `is_owner(resource_user_id UUID)` helper function that today just returns `resource_user_id = auth.uid()`, but later can incorporate org membership checks.
- Index every table on `user_id` — RLS policies that filter by `auth.uid()` need this index to avoid sequential scans.[^38]

**Performance note:** Complex RLS policies (multiple EXISTS subqueries) can cause query planner issues at scale. The mitigation is to wrap membership checks in `SECURITY DEFINER` functions that PostgreSQL can cache and inline efficiently. Test your policies with `EXPLAIN ANALYZE` before going to production.[^39]

***

## Architecture Summary

| Concern | Recommended Approach | Notes |
|---|---|---|
| Contact identity | Canonical `people` table + `people_identifiers` junction | Deterministic first, probabilistic fallback |
| Conversation storage | `messages` table with `tool_call_id`, partitioned by month | Separate `llm_calls` for cost tracking |
| Observability | `context_snapshots` per LLM call | Links exact chunks retrieved to each response |
| Gmail sync | Pub/Sub push + `history.list` incremental | 7-day watch renewal cron required |
| Calendar sync | `syncToken` + push channel | Handle 410 → full re-sync gracefully |
| Sync failure | Exponential backoff, `sync_state` table with freshness | Inject staleness warning into LLM context |
| Vector store | Supabase pgvector, single `chunks` table with `source_type` filter | HNSW index, 1536-dim embeddings |
| Hybrid search | pgvector + ParadeDB BM25 with RRF fusion | 70/30 vector/keyword weighting as starting point |
| Embedding model | OpenAI `text-embedding-3-small` (start) | Upgrade to voyage-3-large if recall is bottleneck |
| Reranking | Cohere Rerank 4 Fast (~80ms) | Top-20 → rerank → top-5 to LLM |
| Infrastructure | Supabase (pgvector + Auth + Realtime + Edge Functions) | Add `user_id` everywhere for eventual multi-tenancy |

---

## References

1. [What is Entity Resolution? - RudderStack](https://www.rudderstack.com/blog/what-is-entity-resolution/)
2. [Stop buying agents. Start building them. | Pouyan Salehi - LinkedIn](https://www.linkedin.com/posts/pouyansalehi_stop-buying-agents-start-building-them-activity-7435037970086260736-22Ih)
3. [LLM Tracing 101: What It Is, Why It Matters](https://aipmguru.substack.com/p/llm-tracing-101-what-it-is-why-it)
4. [LLM Observability Explained: Prevent Hallucinations, Manage Drift](https://www.splunk.com/en_us/blog/learn/llm-observability.html)
5. [Configure push notifications in Gmail API - Google for Developers](https://developers.google.com/workspace/gmail/api/guides/push)
6. [Building a Real-Time Gmail Processing Pipeline with Pub/Sub Webhooks](https://smythos.com/developers/agent-integrations/building-a-real-time-gmail-processing-pipeline-with-pub-sub-webhooks/)
7. [Configuring Pub/Sub for Gmail API Webhooks | Aurinko](https://docs.aurinko.io/unified-apis/webhooks-api/configuring-pub-sub-for-gmail-api-webhooks)
8. [Usage limits | Gmail - Google for Developers](https://developers.google.com/workspace/gmail/api/reference/quota)
9. [Synchronize resources efficiently | Google Calendar](https://developers.google.com/workspace/calendar/api/guides/sync)
10. [Settings: list | Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/settings/list)
11. [Why Unified APIs Don't Solve Sync Logic - Aurinko API](https://www.aurinko.io/blog/hidden-cost-of-internal-integrations/)
12. [Stale Data: Causes, Detection, and How to Set Freshness SLAs](https://tacnode.io/post/what-is-stale-data)
13. [RAG Architecture Patterns: Building Reliable AI Applications - Tetrate](https://tetrate.io/learn/ai/rag-architecture-patterns)
14. [10 RAG Architectures in 2026: Enterprise Use Cases & Strategy](https://www.techment.com/blogs/rag-architectures-enterprise-use-cases-2026/)
15. [MongoDB vs Firebase vs Supabase for AI Apps in 2026 - Groovy Web](https://www.groovyweb.co/blog/mongodb-vs-firebase-vs-supabase-ai-apps-2026)
16. [pgvector vs Pinecone: Which Vector Database to Choose in 2026](https://encore.dev/articles/pgvector-vs-pinecone)
17. [Embedding Models Comparison 2026: OpenAI vs Cohere vs Voyage](https://reintech.io/blog/embedding-models-comparison-2026-openai-cohere-voyage-bge)
18. [Best Embedding Models (2026): 6 Tested for RAG, Search & Cost](https://pecollective.com/tools/best-embedding-models/)
19. [Best Chunking Strategies for RAG (and LLMs) in 2026 - Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
20. [Chunking Strategies to Improve LLM RAG Pipeline Performance](https://weaviate.io/blog/chunking-strategies-for-rag)
21. [Chunk Twice, Retrieve Once: RAG Chunking Strategies Optimized for Different Content Types](https://infohub.delltechnologies.com/es-es/p/chunk-twice-retrieve-once-rag-chunking-strategies-optimized-for-different-content-types/)
22. [Develop a RAG Solution - Chunking Phase - Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-chunking-phase)
23. [Hybrid Search in PostgreSQL: The Missing Manual - ParadeDB](https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual)
24. [I implemented Hybrid Search (BM25 + pgvector) in Postgres to fix RAG retrieval](https://www.reddit.com/r/Rag/comments/1pcvtan/i_implemented_hybrid_search_bm25_pgvector_in/)
25. [From ts_rank to BM25. Introducing pg_textsearch - Tiger Data](https://www.tigerdata.com/blog/introducing-pg_textsearch-true-bm25-ranking-hybrid-retrieval-postgres)
26. [From Noise to Signal: How Cohere Rerank-4 Improves RAG](https://orq.ai/blog/from-noise-to-signal-how-cohere-rerank-4-improves-rag)
27. [Cross-Encoder Reranking Improves RAG Accuracy by 40% - Ailog](https://app.ailog.fr/en/blog/news/reranking-cross-encoders-study)
28. [Supabase: An Agile Open Source Alternative - Aplyca](https://www.aplyca.com/en/blog/blog-supabase-an-agile-open-source-alternative)
29. [The Postgres Vector database and AI Toolkit - Supabase](https://supabase.com/modules/vector)
30. [Supabase Wrapped 2025](https://supabase.com/wrapped)
31. [AI-Ready Apps Made Simple: Why Supabase is the Ultimate Backend for Intelligent Startups](https://gaincafe.com/blog/why-supabase-is-the-ultimate-backend-for-intelligent-startups)
32. [Neon vs Supabase: A Comprehensive Comparison and Analysis](https://chat2db.ai/resources/blog/neon-vs-supabase)
33. [Neon vs Supabase: Benchmarks, Pricing & When to Use Each](https://designrevision.com/blog/supabase-vs-neon)
34. [Neon vs Supabase Free Tier: Comprehensive Comparison - LinkedIn](https://www.linkedin.com/pulse/neon-vs-supabase-free-tier-comprehensive-comparison-rahul-raut-n6nuc)
35. [Neon vs. Supabase: Which One Should I Choose - Bytebase](https://www.bytebase.com/blog/neon-vs-supabase/)
36. [Pgvector vs. Pinecone: Vector Database Comparison - TigerData.com](https://www.tigerdata.com/blog/pgvector-vs-pinecone)
37. [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
38. [Supabase RLS Guide: Policies That Actually Work - DesignRevision](https://designrevision.com/blog/supabase-row-level-security)
39. [Enforcing Row Level Security in Supabase: A Deep Dive](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
