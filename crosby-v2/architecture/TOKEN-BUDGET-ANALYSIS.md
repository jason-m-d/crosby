# Token Budget Analysis — Worst-Case Math

*Last updated: 2026-03-25*

---

## Model Target
- **Claude Sonnet 4.6:exacto** via OpenRouter — 200K context window
- **Usable budget:** ~150K after API overhead
- System prompt uses `cache_control: { type: "ephemeral" }` so the cached prefix doesn't count against per-request token costs (but still counts against context window)

---

## Budget Allocations (from AI-PIPELINE.md)

| Component | Budget % | Absolute (at 200K) |
|-----------|----------|---------------------|
| System Prompt (cached) | 5% | ~10,000 |
| Context Summary | 2% | ~4,000 |
| Memories (all types) | 2% | ~4,000 |
| Recent Messages | 5-15% | ~10,000-30,000 |
| Expert Tier 1 | 10-15% | ~20,000-30,000 |
| On-demand retrieval | Remaining | ~40,000-80,000+ |

## Hard Caps

| Component | Limit |
|-----------|-------|
| Context summary | 2,000 tokens max |
| Expert Tier 1 | 4,000 tokens per Expert |
| Minimum recent messages | 10 turns (never drops below) |
| Tool calls per response | 8 max |

---

## Typical Request (~30K tokens)

| Component | Tokens |
|-----------|--------|
| Base system prompt | 8,000 |
| Context summary | 1,500 |
| Memories (5-8 relevant) | 1,000 |
| Recent messages (15 turns) | 12,000 |
| Tool schemas (5 active tools) | 2,500 |
| Data blocks (1 specialist, lightweight) | 1,000 |
| **Total** | **~26,000** |

Leaves ~124K for response generation. Very comfortable.

---

## Worst Case (~51K tokens)

Everything active at once:

| Component | Tokens |
|-----------|--------|
| Base system prompt | 10,000 |
| Context summary | 2,000 |
| Memories (all types, 15+ retrieved) | 2,000 |
| Recent messages (20 turns) | 20,000 |
| Expert Tier 1 (1 active) | 4,000 |
| Tool schemas (10 active tools) | 5,000 |
| Data blocks (email + calendar + tasks) | 3,000 |
| Message RAG results | 2,000 |
| Tool results (mid-response retrieval) | 3,000 |
| **Total** | **~51,000** |

Leaves ~99K for response. Still safe.

---

## Stress Test (~56K tokens)

Long conversation, 2 active Experts, heavy RAG:

| Component | Tokens |
|-----------|--------|
| Base system prompt | 10,000 |
| Procedural triggers | 1,000 |
| Expert 1 Tier 1 (shared pool) | 2,000 |
| Expert 2 Tier 1 (shared pool) | 2,000 |
| Context summary | 2,000 |
| Memories | 2,000 |
| Recent messages (trimmed to 15) | 15,000 |
| Tool schemas (12 tools, both Experts) | 10,000 |
| Data blocks (multiple specialists) | 5,000 |
| Document RAG (heavy) | 5,000 |
| Message search results | 2,000 |
| **Total** | **~56,000** |

Leaves ~94K. Still safe. Built-in graceful degradation kicks in: messages trim from 20 to 10, Expert Tier 1 shrinks, RAG results truncate.

---

## Tool Schema Costs

~20 tools total. Each schema = 300-800 tokens depending on complexity.

Router-driven activation means only relevant tools are included per request:
- Typical: 5-10 tools = ~2,500-8,000 tokens
- Worst case: 15 tools = ~12,000 tokens
- All 20 tools: ~16,000 tokens (shouldn't happen — router should filter)

---

## Verdict

**The token budget is safe.** Even worst-case stress scenarios use <30% of the context window. The percentage-based allocations with hard caps provide graceful degradation if things get tight.

**One thing to validate during Phase 2:** The actual system prompt size after all specialist sections, procedural triggers, and data formatting. The 10K estimate for the base prompt is reasonable but should be measured once the prompt builder is implemented.

**Risk scenario to watch:** If the system prompt grows beyond 15K (feature creep in prompt sections), it starts eating into message history and memory budgets. Keep the prompt lean.
