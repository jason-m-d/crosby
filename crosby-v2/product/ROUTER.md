# Router — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

The router is a fast, cheap LLM call that runs on every incoming message before Crosby responds. It classifies the user's intent, determines which specialists and Experts are relevant, and decides what data, tools, and context to load. The main chat model then gets a clean, focused context window tailored to the specific message.

The router is the single most important piece of infrastructure in the system. If it classifies well, Crosby feels smart and fast. If it classifies poorly, Crosby feels confused regardless of how good the main model is.

---

## Why a Separate Router

Three alternatives were considered:

1. **No classification — stuff everything into context.** Even with large context windows, dumping all tool definitions, all specialist context, and all data into every request degrades response quality. The model gets confused by 50 tools when it needs 3. Cost goes up. Quality goes down. This is how most chatbot apps work and it's why they feel generic.

2. **Let the main model self-classify.** The main model (Sonnet, GPT-5.4, etc.) could do its own classification as part of reasoning. But you can't load context before the model starts — you'd need a two-pass system where the model first says "I need calendar data" and then gets it. That's a router with extra steps and more latency.

3. **Fast cheap router + focused main model.** A small, fast model (Gemini Flash Lite or similar) classifies in ~200ms. The main model gets a clean context. Self-correction handles misses. **This is the approach.**

The router exists so the main model can focus on being good at responding, not good at figuring out what it needs.

---

## What the Router Returns

For every incoming message, the router returns a structured JSON response:

### Classification output

| Field | Description | Example |
|---|---|---|
| `intent` | Primary intent classification | `calendar_query`, `email_draft`, `general_chat`, `task_create` |
| `specialists` | Array of specialists to activate, each with a confidence score | `[{ "name": "calendar", "confidence": 0.9 }, { "name": "email", "confidence": 0.6 }]` |
| `experts` | Array of Experts detected as relevant, each with a confidence score | `[{ "name": "Real Estate", "confidence": 0.75 }]` |
| `data_requirements` | What data to load before the main model runs | `["calendar_events_next_48h", "email_recent_from_roger"]` |
| `tools` | Which tools to make available to the main model | `["get_calendar_events", "create_event", "search_emails", "draft_email"]` |

### Multi-intent handling
Messages often contain multiple intents: "Check my calendar for tomorrow and draft a reply to Roger's email." The router returns multiple specialists with individual confidence scores. All activated specialists contribute their tools and data to the context.

---

## Confidence Scoring

The router assigns a confidence score (0.0–1.0) to each specialist and Expert it identifies as relevant.

### What confidence means

Confidence represents how certain the router is that this specialist/Expert is needed to answer the message well. It drives two things:
1. **How much context to load** (more confidence = more data)
2. **Expert Drift visual treatment** (see EXPERT-DRIFT.md and EXPERT-CONTEXT-LOADING.md)

### Confidence thresholds

| Confidence | Specialist behavior | Expert behavior |
|---|---|---|
| Below 0.2 | Not activated. Not relevant enough. | No visual treatment. No context loaded. |
| 0.2–0.5 | Activated with lightweight loading — tool definitions available, no heavy data preload. | Subtle color tint. Retrieval-time memory boosting only. No Tier 1 loading. |
| 0.5–0.8 | Full activation — tools + data loaded. | Noticeable tint. Partial Tier 1 (description + top pinned doc). |
| 0.8+ | Full activation + priority data loading. | Strong tint. Full Tier 1 loaded. At 0.9+ sustained, Crosby offers to activate (see EXPERT-CONTEXT-LOADING.md). |

### Confidence builds incrementally for Experts
A single message can push a specialist to high confidence (it's clearly a calendar question). But Expert confidence builds over multiple messages — it's a rolling score that increases with each relevant message and decays with each unrelated one. This prevents Experts from flickering on and off.

Specialist confidence resets per-message (each message is independently classified). Expert confidence persists across messages within a session.

---

## Fallback Behavior

### Timeout fallback
The router has a **3-second timeout.** If the router LLM call doesn't return within 3 seconds:
- Fall back to regex-based classification (the v1 `classifyIntent()` system)
- Regex classification is worse but fast and reliable
- The response proceeds with regex-determined specialists and tools
- The timeout is logged in the activity log (see ACTIVITY-LOG.md) for diagnostics

### Malformed response fallback
If the router returns garbage (malformed JSON, missing fields, nonsensical classification):
- Same regex fallback
- Error logged

### Double failure fallback
If both the router AND regex classification fail (extremely unlikely):
- Activate core specialist only (basic conversational chat)
- All standard tools available but no specialist-specific data loaded
- Crosby can still respond — just without specialized context
- This is a degraded but functional state

### Fallback is invisible to the user
The user never sees "routing failed" or "using fallback mode." Crosby just responds. The response might be less precisely targeted, but it's never broken.

---

## Router Model

### Requirements
- **Fast:** Must return in under 500ms consistently. 200ms is the target.
- **Cheap:** Runs on every message. Cost per classification must be negligible.
- **Structured output:** Must return valid JSON reliably. Use `response_format` with `json_schema` and the response-healing plugin.
- **Good at classification:** Needs to understand natural language intent, detect multiple intents, and identify relevant Experts by name/description.

### Model selection
The router model is separate from the main chat model. In v1, it's Gemini Flash Lite. The architecture phase will evaluate options, but the requirements are: fast, cheap, reliable structured output. The main chat model (Sonnet, GPT-5.4, etc.) is never used for routing — it's too slow and expensive.

---

## Router Prompt

The router prompt is the **single highest-leverage piece of prompt engineering in the entire system.** A bad router prompt means bad classification, which means bad context, which means bad responses — regardless of how good the main model is.

### What the router prompt contains
- List of all available specialists with descriptions
- List of all user-created Experts with names and descriptions
- Current Expert state (which Experts are ambient/active and at what confidence)
- Classification instructions with examples
- Output schema definition

### What the router prompt does NOT contain
- Conversation history (too expensive for a classification call)
- Memory content
- Document content
- The user's full message history

The router sees only: the current message, the list of available specialists/Experts, and the current activation state. This keeps the classification call fast and cheap.

### Few-shot examples
The router prompt should include 10-15 few-shot examples covering:
- Single-intent messages ("What's on my calendar tomorrow?")
- Multi-intent messages ("Check my calendar and draft a reply to Roger")
- Ambiguous messages that need multiple specialists ("What's going on with the Anderson deal?")
- Messages that look like one specialist but need another ("Send the numbers" → procedural memory → email specialist)
- Expert-relevant messages ("How's the lease negotiation going?" → Real Estate expert)
- Messages that need no specialist ("How are you doing?" → core only)

---

## Self-Correction: `request_additional_context`

When the router misclassifies and the main model realizes mid-response that it needs data that wasn't loaded, it can call the `request_additional_context` tool. This tool:

1. Fetches the requested data (calendar events, email search results, document content, etc.)
2. Injects it into the current context
3. The model continues its response with the new data

### Logging router misses
Every `request_additional_context` call is a signal that the router got it wrong. These misses are logged:

| Field | Example |
|---|---|
| Original router classification | `{ intent: "general_chat", specialists: [{ name: "core", confidence: 0.9 }] }` |
| What was actually needed | `calendar_events` (requested via `request_additional_context`) |
| User message | "Am I free Thursday?" |
| Timestamp | 2026-03-25 14:30:00 |

### Learning from misses
Router miss logs are reviewed during prompt engineering iterations. Patterns in misses (e.g., "the router keeps missing calendar queries that don't use the word 'calendar'") inform router prompt improvements. This is a manual feedback loop in v2 — automated router fine-tuning is a future consideration.

---

## Performance Requirements

| Metric | Target | Hard limit |
|---|---|---|
| Router latency (p50) | 200ms | — |
| Router latency (p95) | 400ms | — |
| Router latency (p99) | — | 3000ms (timeout) |
| Classification accuracy | 90%+ | — |
| Fallback rate (timeout + malformed) | < 5% | — |
| Self-correction rate (`request_additional_context` usage) | < 10% of messages | — |

These are targets, not guarantees. The architecture phase will validate feasibility with the chosen router model.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Expert Context Loading (EXPERT-CONTEXT-LOADING.md) | Router confidence scores drive Expert activation and Tier 1/Tier 2 loading decisions. |
| Expert Drift (EXPERT-DRIFT.md) | Router Expert confidence drives the visual color tinting. |
| Specialists | Router activates specialists and determines which tools/data are available per message. |
| Activity Log (ACTIVITY-LOG.md) | Every router decision is logged. Timeouts and fallbacks are logged as errors. |
| Conversation Continuity (CONVERSATION-CONTINUITY.md) | Router operates before context assembly. Its output determines what gets assembled. |
| Training & Learning (TRAINING-LEARNING.md) | Router miss patterns inform prompt engineering improvements. |
| Prefetch (architecture concept) | A future `/api/chat/prefetch` endpoint could run the router while the user types, pre-classifying intent and pre-loading data. |

---

## Ripple Effects

- **System prompt assembly** — the router's output is the blueprint for how the system prompt is assembled. Architecture must define the assembly pipeline that takes router output → loads data → builds prompt → sends to main model.
- **Tool registry** — tools are registered per-specialist. The router's specialist activation determines which tools are in the tools array for each request. Must prevent duplicate tool names (see CLAUDE.md note about 400 errors from duplicates).
- **Prefetch opportunity** — if the router runs while the user is still typing (via a prefetch endpoint), the main model can start with pre-loaded context, reducing perceived latency. This is an architecture optimization, not a product requirement.
- **Router prompt maintenance** — as specialists and Experts change (new silos, new user Experts), the router prompt must stay current. The prompt should be dynamically assembled, not hardcoded.

---

## Open Questions

- [ ] Should the router see the last 1-2 messages for context, or only the current message? Adding context improves multi-turn classification ("it" → "the calendar event we were just discussing") but adds cost and latency.
- [ ] Should router confidence scores be exposed anywhere in the UI beyond Expert Drift color? (e.g., a developer/debug mode that shows "Router: calendar 0.9, email 0.3")
- [ ] Should the prefetch system be part of v2 launch, or is it an optimization for later?
- [ ] How often should the router prompt be regenerated? On every new Expert creation? On every silo installation? Or on a schedule?
