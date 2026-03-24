# Contact / Relationship Graph as a First-Class Primitive in Personal AI Assistants (2026)

*Research report compiled March 2026*

---

## 1. Personal CRM / Relationship Graph Architecture

### What a Personal CRM Is — and Isn't

Business CRMs (Salesforce, HubSpot) are built around pipeline stages, deal values, and team-wide shared records. A personal CRM serves a fundamentally different purpose: it stores the texture of human relationships — who someone is to you, how you know them, what you've talked about, and when you should reach out next. The emotional weight is different. A business CRM optimizes for conversion; a personal CRM optimizes for relationship health.

In 2026, the leading personal CRM tools — Clay (clay.earth), Folk, Attio, Yenesow, Table — all share a similar architectural approach: they sit on top of your existing communication channels (email, calendar, LinkedIn, WhatsApp) and build a unified person record by pulling interaction history from each one. They don't replace those channels; they index them.

### The Graph Layer vs. the Vector Store

This is the key architectural decision for Crosby v2: **what belongs in the structured graph, and what belongs in the vector store?**

The answer that production systems converge on is roughly:

**Structured graph (relational or graph DB):**
- Identity records: canonical person nodes with name, email(s), phone(s), company, role
- Relationship edges: how the user knows each person (client, vendor, employee, family, etc.)
- Explicit facts: known facts about a person (e.g., "has two kids," "moving to Austin in April")
- Interaction metadata: when last contacted, count of emails/calls/meetings, channels used
- Organization nodes: companies, teams, groups, and their edges to person nodes

**Vector store (pgvector / semantic index):**
- Full text of emails, messages, meeting notes — the raw interaction corpus
- Fuzzy retrieval: "what did Sarah say about the lease?" maps to actual message chunks
- Memory narratives: summarized episodic memories ("Mike and the contractor dispute, Feb 2026")

The key insight: **structured data goes in the graph because you need to traverse it and query it precisely; unstructured conversation history goes in vectors because you need to retrieve it semantically.** A hybrid architecture — graph for structure, vectors for content — is the right answer.

### Graph DB vs. Postgres

For a single-user personal assistant at Crosby's scale (likely <10K contact nodes, <100K edges), **a dedicated graph database like Neo4j is not necessary.** Postgres with recursive CTEs handles this scale with sub-millisecond traversal times. The operational overhead of running Neo4j alongside Postgres is not worth it at this scale.

The right approach is Postgres with:
- A `contacts` table for canonical person nodes
- A `contact_relationships` table for typed edges (user → person, company → person, person → person for "introduced by" chains)
- A `contact_facts` table for explicit facts with timestamps and sources
- A `contact_channels` table for cross-system identifiers (email addresses, phone numbers, LinkedIn URLs, HubSpot IDs)
- pgvector extension for embedding-based retrieval of interaction history

This is what research from the database-design reports in this workspace already recommends — a four-tier model that includes a graph tier built on Postgres, not a separate graph database.

---

## 2. Entity Resolution Across Channels

### The Core Problem

"Sarah Johnson" in Gmail, "SarahJ@uplandco.com" in the address book, "Sarah" in a text thread, "Sarah Johnson - Upland" in HubSpot, and a calendar invite from "s.johnson@uplandco.com" are all the same person. The system needs to know this without being told.

### Deterministic vs. Probabilistic Matching

Production entity resolution uses a layered approach that moves from high-confidence to lower-confidence signals:

**Deterministic (exact match) signals — high confidence, run first:**
1. Exact email address match across all sources
2. Exact phone number match (normalized: strip country code, spaces, dashes)
3. External system ID match (HubSpot contact ID, Google contact ID)

**Probabilistic signals — used to resolve remaining uncertainty:**
1. Name similarity (Jaro-Winkler or Levenshtein distance handles "Bob" vs "Robert", typos)
2. Email domain + name combination (s.johnson@uplandco.com + "Sarah Johnson" → high confidence same person as sarah.johnson@uplandco.com)
3. Shared co-occurrence context: two records that appear together in the same calendar event or email thread, with overlapping names, are likely the same person
4. Company + role overlap: "VP at Upland" + "Sarah" + "Upland" email domain = high-confidence merge candidate

**Shared domain edge cases:**
A shared email domain does NOT mean the same person. If patricia@smithfamily.com and bob@smithfamily.com are both in the system, they resolve to different people. The rule is: same email = same person; same domain + different name = different people, possibly related (flag the relationship).

**Implementation pattern:**
Use a confidence scoring system (0.0–1.0). Matches above 0.9 auto-merge silently. Matches between 0.7–0.9 create a "candidate merge" queue that can be surfaced to the user. Below 0.7, treat as distinct records. Never auto-merge on name-only matches.

### Key Field: The Canonical Email

Every person node should have a canonical email — the primary, most reliable identifier. When the same person is found with multiple email addresses (personal, work, old work), they all link to the same person node via the `contact_channels` table, but one is marked canonical. Resolution always anchors to canonical email first.

---

## 3. Relationship Context Injection for LLM Responses

### The Resolution Problem — What Happens at Query Time

When the user says "email John" or "what's the status with the Upland deal," the system must:

1. **Detect a person reference** (named entity, pronoun, role description like "my lawyer," organizational reference like "the Upland vendor")
2. **Resolve it to a contact node** in the graph
3. **Retrieve relevant context** — recent interactions, open threads, known facts
4. **Inject it into the model's context window** in a compact, structured format

### Token-Efficient Contact Card Format

The right injection format is a compact contact card, not a full data dump. Research from the infinite-conversation-memory report in this workspace validates an XML-style structured block:

```xml
<contact id="contact_abc123">
  <name>Sarah Johnson</name>
  <role>Client — Upland Co (lease negotiation)</role>
  <channels>sarah@uplandco.com | +1-555-210-4400</channels>
  <last_contact>2026-03-18 (email, re: lease amendment draft)</last_contact>
  <open_threads>Waiting on her response re: parking clause. Lease signing target: April 1.</open_threads>
  <known_facts>Has two kids. Prefers morning calls. Decision-maker, reports to CEO.</known_facts>
</contact>
```

This format is:
- About 80–120 tokens per contact (vs. 500+ if you dump raw interaction history)
- Structured enough that the model can reason about fields explicitly
- Scannable by the model for reference disambiguation

**How many contacts to inject:** Only inject cards for contacts directly relevant to the current query. If the user asks about Sarah, inject Sarah's card only. If the user asks "who do I have meetings with this week," inject cards for each person on those calendar events. Don't pre-load the full contact book — that's what the vector store is for (semantic retrieval on-demand).

### Handling Role References and Aliases

The user will often refer to people by role rather than name: "my lawyer," "the bookkeeper," "the Upland vendor," "my contractor." These need to resolve to specific contacts. The system should maintain a `contact_aliases` index: a mapping from natural-language descriptors to contact IDs, derived from the relationship type field and user-assigned tags. When the user says "my lawyer" and there's one contact tagged `role:lawyer`, resolve it automatically. When there are two, trigger disambiguation.

---

## 4. Relationship Memory and Updates — Staleness Model

### How Graph Memory Should Work

The best current architecture for this is Zep/Graphiti's temporal knowledge graph model, which published a formal paper in January 2025 and has become a reference implementation. The core concept:

**Every fact about a person is a graph edge with a validity window.** The edge stores:
- `valid_from`: when this fact became true
- `valid_until`: when it was superseded (null if still current)
- `source`: what produced this fact (conversation, email, calendar event, manual)
- `confidence`: 0.0–1.0

When a new fact contradicts an old one, the system doesn't delete the old fact — it closes its validity window and creates a new edge. This preserves history and enables the model to reason about how facts changed over time ("last I heard, Mike was still at Acme — but that was from February").

### What Triggers a Graph Update

Updates should be triggered by:
1. **Post-message extraction:** After each conversation turn, a background job scans for entity mentions and facts ("Sarah mentioned she's moving to a new office in May" → new fact on Sarah's node)
2. **Email/calendar sync events:** When a new email arrives from a known contact, update `last_contact` timestamp. When a meeting is confirmed, update `next_meeting`.
3. **Explicit user statements:** "Remember that Mike is now at Vertex" → immediate graph write, no LLM needed
4. **Periodic enrichment:** A background cron that re-fetches enrichment data (job title, company, LinkedIn) for contacts that haven't been updated in 90+ days

### Staleness Policy

Not all facts age at the same rate:
- **Fast-expiring facts:** job title, company, phone number — flag for re-verification after 180 days
- **Slow-expiring facts:** relationship type, how you know them, preferences — rarely expire, but can be superseded
- **Permanent facts:** how you first met, key history — never expires, only additive
- **Event-linked facts:** "waiting on her response about the lease" — auto-expires when the linked event closes (email thread resolved, meeting completed)

The system should surface staleness signals to the model: if a fact's `valid_from` is over a year old with no update, the model should caveat ("this might be out of date — Sarah was at Upland as of last year").

---

## 5. Production Examples — Who Has the Best "Knows Your People" Experience

### Clay (clay.earth) — The Gold Standard for Personal CRM

Clay is the most sophisticated personal relationship graph product in 2026. Its Nexus feature lets you query your network conversationally: "who do I know at a VC firm in NYC who focuses on SaaS?" and it traverses the graph and returns a ranked list. This is exactly the "your network as a queryable database" primitive that Crosby v2 needs.

Clay's architecture unifies contacts from Gmail, Calendar, LinkedIn, iMessage, and more into a single timeline per person. It shows relationship strength scores, last contact dates, and surfaces "who you should reconnect with." The AI assistant has full context on everyone you know and can draft outreach in your voice with the right context embedded.

The key lesson from Clay: **the relationship graph is a first-class product surface, not just a backend data layer.** It should be explorable and queryable by the user directly.

### Attio — AI-Native CRM with Automatic Enrichment

Attio builds relationship intelligence by connecting to email and calendar and auto-populating person and company records from communication history. It enriches them with public data (job titles, company info, social profiles) automatically, with no manual data entry. AI attributes summarize and classify records. The Research Agent does enrichment on-demand.

The key lesson from Attio: **enrichment should be automatic and continuous, not a one-time import.** Every new email contact should automatically get a basic record created and enriched.

### Folk — Unified Timeline, AI Drafting

Folk unifies email, calendar, LinkedIn, and WhatsApp on a single per-person timeline. The AI drafts outreach with full relationship context embedded. One-click enrichment populates company info and email from minimal seed data.

### Superhuman — Relationship Signals in Email

Superhuman's VIP system and Split Inbox are essentially lightweight relationship graph primitives: you classify contacts by importance, and the inbox routing reflects that. The "Auto Drafts" feature drafts replies in your voice by learning from past messages, implicitly learning relationship context.

The key lesson from Superhuman: **relationship context improves email workflows even when the underlying graph is shallow.** You don't need a full graph to start adding value.

### Zep / Graphiti — The Infrastructure Layer

Zep is not a user-facing product but a memory infrastructure layer increasingly used by AI agent builders. Its temporal knowledge graph achieves P95 retrieval latency of 300ms using hybrid search (semantic embeddings + BM25 full-text + direct graph traversal). Accuracy improvements of up to 18.5% on long-memory benchmarks vs. flat vector retrieval. This is the reference architecture for how an AI assistant should store and retrieve relationship memory.

---

## 6. The "Who Is This Person" Disambiguation Problem

### When Disambiguation Is Needed

Disambiguation is needed when:
- The user uses a first name only and there are multiple contacts with that name ("email John")
- The user uses a role description that maps to multiple contacts ("my lawyer" when the user has two lawyers)
- The user refers to a person who doesn't exist in the graph yet ("contact the person I met at the conference last week")
- The user's reference is ambiguous between a person and an organization ("talk to Upland" could mean Sarah at Upland or the whole company)

### Resolution Strategies

**Step 1: Graph lookup.** Query the contact graph for all records matching the name or alias. If exactly one match, use it.

**Step 2: Context-weighted ranking.** If multiple matches, rank by:
- Recency: who was mentioned or contacted most recently?
- Thread context: is this a continuation of an existing conversation about one of them?
- Relationship strength: who does the user interact with most?
- Topic relevance: if the user asks about "the lease," Sarah the real estate contact ranks above John the software engineer named John Lease

**Step 3: Inline clarification (last resort).** If context scoring is insufficient, surface a compact disambiguation question — not a generic "which John?" but a contextualized one: "Do you mean John Mitchell (your accountant, last emailed March 10) or John Parker (Vertex Capital, met February 2026)?"

**Step 4: Learn the disambiguation.** Once the user clarifies, store the context signal: in this topic domain, "John" means John Mitchell. This builds a contextual alias map over time.

### UX Principles for Disambiguation

- Never ask more than one clarifying question at a time
- Offer options with enough context to make the choice obvious (name + role + last contact date)
- Allow the user to correct after the fact ("I meant the other John") and update the alias map
- Prefer acting on the most likely interpretation and confirming inline ("Drafting for John Mitchell, your accountant — is that right?") rather than blocking on clarification

---

## Key Takeaways for Crosby v2

1. **Build the contact graph on Postgres, not Neo4j.** At Crosby's scale, Postgres with recursive CTEs, a proper edge table, and pgvector for semantic retrieval is the right stack. No new infrastructure, full compatibility with Supabase. The graph tier should be a first-class part of the data model — not an afterthought bolted onto the contacts table.

2. **Canonical email is the identity spine.** Every person in the system should have one canonical email that all other identifiers hang off of. Entity resolution should always anchor to email first, then use probabilistic scoring (Jaro-Winkler name similarity + domain + co-occurrence context) to merge records from other channels. Auto-merge only above 0.9 confidence; queue candidates between 0.7–0.9 for user review.

3. **Use compact contact cards for context injection, not raw data dumps.** A structured XML contact card (~100 tokens) should be the standard unit of relationship context injected into the model. Include: name, relationship type, last contact date, open threads, and 2–3 key known facts. Retrieve cards on-demand at query time — only inject cards relevant to the current message, not the full contact book.

4. **Implement a temporal fact model from the start.** Every fact about a contact should have `valid_from`, `valid_until`, `source`, and `confidence` fields. When facts change, close the old edge and open a new one — don't overwrite. This enables the model to reason about staleness, contradictions, and history. Zep/Graphiti is the reference implementation for this pattern.

5. **Extract contact facts continuously from conversations and email.** Every time the user has a conversation or an email arrives, a background job should scan for entity mentions and new facts about known contacts. This is what keeps the graph alive and current without requiring manual updates.

6. **Build a role-based alias resolver.** The user should be able to refer to contacts by role ("my lawyer," "the Upland vendor," "my bookkeeper") and have the system resolve those automatically. Store these mappings in a `contact_aliases` table, derived from relationship type tags and maintained by the user over time.

7. **Context-weighted disambiguation over generic clarification questions.** When "John" is ambiguous, rank candidates by recency + topic relevance + relationship strength before asking. Prefer confirming the most likely match inline ("Drafting for John Mitchell — right?") over blocking on a clarification prompt. Store disambiguation resolutions to build a contextual alias map over time.

8. **The relationship graph is a queryable surface, not just backend infrastructure.** Clay's Nexus feature is the right mental model: the user should be able to ask "who do I know at construction companies in Nashville?" and get a traversal result, not a blank stare. The graph should be a first-class query target that the assistant can traverse on the user's behalf.

---

## Sources

- [7 Best AI Personal CRM in 2026 — Folk](https://www.folk.app/articles/best-ai-personal-crm)
- [Personal CRM app Clay adds an AI helper — TechCrunch](https://techcrunch.com/2023/05/16/personal-crm-app-clay-introduces-an-ai-helper-to-help-you-navigate-your-relationships/)
- [Clay AI Review: The Future of Intelligent Relationship Management — AutoGPT](https://autogpt.net/ai-tool/clay-ai/)
- [Zep: A Temporal Knowledge Graph Architecture for Agent Memory — arXiv](https://arxiv.org/abs/2501.13956)
- [Graph Memory for AI Agents (January 2026) — Mem0](https://mem0.ai/blog/graph-memory-solutions-ai-agents)
- [Building AI Agents with Knowledge Graph Memory: A Guide to Graphiti — Medium](https://medium.com/@saeedhajebi/building-ai-agents-with-knowledge-graph-memory-a-comprehensive-guide-to-graphiti-3b77e6084dec)
- [Graphiti: Knowledge Graph Memory for an Agentic World — Neo4j](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/)
- [GitHub: getzep/graphiti — Real-Time Knowledge Graphs for AI Agents](https://github.com/getzep/graphiti)
- [What is Entity Resolution — Neo4j](https://neo4j.com/blog/graph-database/what-is-entity-resolution/)
- [Entity Resolution Explained Step by Step — Senzing](https://senzing.com/entity-resolution-explained/)
- [Building a Personal Knowledge Graph with PostgreSQL (no Neo4j needed) — DEV Community](https://dev.to/micelclaw/4o-building-a-personal-knowledge-graph-with-just-postgresql-no-neo4j-needed-22b2)
- [Attio CRM Review in 2026 — Folk](https://www.folk.app/articles/attio-crm-review-ai-powered-crm-for-modern-gtm-teams)
- [Mem0 vs Zep (Graphiti): AI Agent Memory Compared (2026) — Vectorize](https://vectorize.io/articles/mem0-vs-zep)
- [Context Engineering in Agents — LangChain Docs](https://docs.langchain.com/oss/python/langchain/context-engineering)
- [Notion 3.2: Mobile AI, new models, people directory — Notion Releases](https://www.notion.com/releases/2026-01-20)
- [Knowledge Graphs with PostgreSQL — ReadyTensor](https://app.readytensor.ai/publications/knowledge-graphs-with-postgresql-eQyINuo4ojwW)
- [What is AI agent disambiguation? — DialOnce](https://dialonce.ai/en/blog/trends/ai-agent-disambiguation.html)
