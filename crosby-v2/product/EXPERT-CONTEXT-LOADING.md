# Expert Context Loading — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

This spec defines how Crosby assembles its context window when an Expert is involved — what gets loaded, how much room it gets, how activation works, and how Experts transition between states. This is the mechanical backbone of the Expert system.

---

## Design Principles

- **Model-agnostic.** Token budgets are defined as percentages of available context, not hard numbers. When the underlying model changes (bigger context window, better instruction following), the system scales automatically. Actual token counts are config values, not product decisions.
- **Priority stack, not fixed slices.** The context window is assembled by priority. Non-negotiable items load first, then flexible items fill remaining space. Nothing is a rigid allocation.
- **Retrieval over stuffing.** Even with a massive context window, dumping everything in degrades response quality. The two-tier system (always-loaded vs. retrieved-on-demand) exists to keep context focused, not just to manage space.

> **Note — Model selection:** Model selection is locked in `crosby-v2/architecture/AI-PIPELINE.md` (primary: `anthropic/claude-sonnet-4.6:exacto`, 200K context). This product spec is intentionally model-agnostic — the percentage-based budget system works regardless of model choice. Larger context windows mean more absolute tokens per tier, not a different system.

---

## Context Window Budget

### Priority stack (loaded in order)

| Priority | Content | Budget | Flexibility |
|---|---|---|---|
| 1 — Non-negotiable | System prompt, soul doc, routing rules, tool definitions | ~3-5% | Fixed. Cannot be compressed. |
| 2 — Non-negotiable | Rolling context summary (see CONVERSATION-CONTINUITY.md) | ~1-2% | Capped at max length. Refreshes compress it. |
| 3 — Non-negotiable | Retrieved memories (semantic + episodic + procedural triggers) | ~1-2% | LLM recall gating keeps this lean. |
| 4 — High priority | Recent messages (conversation history) | ~5-15% | Flexible. Default ~20 turns, can trim to ~10 if Expert context needs room. |
| 5 — High priority | Expert Tier 1 context (always-loaded when active) | ~10-15% | Flexible. Grows if conversation history is short, shrinks if it's heavy. |
| 6 — On demand | Expert Tier 2, message RAG results, tool call results, document RAG | Remaining space | Retrieved per-request as needed. |

### How the stack adapts

The system assembles context top-down. Priorities 1-3 are fixed. Priorities 4-5 share a flexible pool — they negotiate based on the current state:

- **Long conversation, simple Expert:** Recent messages take more, Expert Tier 1 takes less.
- **Short conversation, heavy Expert:** Expert Tier 1 takes more, fewer recent messages needed.
- **Two active Experts:** Each Expert's Tier 1 gets a smaller share of the pool. See multi-Expert section below.
- **No active Expert:** The entire flexible pool goes to recent messages and on-demand retrieval.

Priority 6 fills whatever's left. If a tool call returns a massive result, it may push out some Tier 2 content — that's fine, it can be re-retrieved later.

---

## Tier 1: Always-Loaded Context

### What's in Tier 1
When an Expert is active, Tier 1 loads automatically:

- **Expert description/instructions** — the Expert's personality, scope, and behavioral rules (written by the user or Crosby during Expert creation)
- **Pinned documents** — user-designated critical reference material ("always have the lease terms handy")
- **Top artifacts** — most recent and highest-importance Crosby-created artifacts tied to this Expert
- **Overnight research findings** — recent proactive research results (see Expert Self-Improvement below)

### What determines the cut
When Tier 1 content exceeds the budget:
1. Expert description/instructions — always included (non-negotiable within Tier 1)
2. Pinned documents — always included (user explicitly said these matter)
3. Remaining budget filled by importance score — recent, frequently-accessed, high-importance content wins
4. Everything that doesn't fit drops to Tier 2 (still retrievable, just not always-loaded)

### Prompt caching benefit
Tier 1 content is stable across messages within the same Expert session. The description, pinned docs, and top artifacts don't change turn-to-turn. This makes Tier 1 an excellent prompt caching target — the cached prefix stays warm as long as the Expert is active, reducing latency and cost.

---

## Tier 2: Retrieved On Demand

### What's in Tier 2
Everything tied to the Expert that doesn't fit in Tier 1:

- Older documents
- Lower-importance artifacts
- Historical research reports
- Content from other Experts that might be tangentially relevant

### How it's retrieved
- **Automatic RAG:** When the user's message is relevant to Tier 2 content (detected via embedding similarity), it's pulled into context for that request only.
- **`request_additional_context` tool:** If the router missed something and Crosby realizes mid-response that it needs more context, it can call this tool to fetch additional Expert data. This is the self-correction mechanism.
- **Retrieval-time Expert boosting:** Memories and documents semantically similar to the active Expert's description get a ranking boost during retrieval (see PERSISTENT-MEMORY.md).

### Tier 2 is not second-class
Tier 2 content is fully accessible — it's just not pre-loaded. For many questions, Tier 2 retrieval is better than Tier 1 stuffing because it's targeted to the specific question. The tiers are about **latency and focus**, not importance.

---

## Expert Invocation Modes

### 1. Direct Activation
The user explicitly activates an Expert.

**Triggers:**
- Taps an Expert in the sidebar
- Says "switch to Real Estate" or "let's work on the restaurant stuff"
- Selects an Expert from a structured question card

**What happens:**
- Expert Tier 1 loads immediately
- Expert appears as "selected" in the sidebar (highlighted, name visible)
- UI shows the Expert's color (per EXPERT-DRIFT.md)
- Expert stays active until the user explicitly switches away or deactivates

**Stickiness:** Direct activation is **sticky**. The Expert stays loaded even if the conversation drifts to unrelated topics for a few messages. The user made a deliberate choice — Crosby respects it. Deactivation only happens when:
- User activates a different Expert
- User says "done with Real Estate" or similar
- User explicitly deactivates (taps the active Expert to toggle off)

### 2. Ambient Activation (Expert Drift)
The router detects that the conversation is relevant to an Expert without the user explicitly activating it. See EXPERT-DRIFT.md for the visual treatment.

**Confidence levels and what loads:**

| Confidence | Visual | Context loaded | Behavior |
|---|---|---|---|
| Low (0.2-0.4) | Subtle color tint in timeline | Nothing extra. Retrieval-time memory boosting only. | Crosby is noticing relevance but not committing. |
| Medium (0.4-0.7) | Noticeable color tint | Partial Tier 1 — Expert description + most important pinned doc. | Enough context to give informed answers without full commitment. |
| High (0.7-0.9) | Strong color tint | Full Tier 1 loaded. | Crosby is effectively operating as if the Expert is active, but the UI doesn't show it as "selected." |
| Confirmed (0.9+) | Strong tint + offer to activate | Full Tier 1 loaded + Crosby offers to make it official. | Transition point — see below. |

**Confidence builds incrementally.** Each message that's relevant to the Expert nudges confidence up. Each unrelated message nudges it down. Confidence never jumps from 0 to 0.9 in one message — it's a gradient.

**Deactivation in ambient mode:** If confidence drops below 0.2 over several messages, the tint fades and context unloads. No announcement. The Expert just quietly recedes.

### 3. Ambient → Active Transition
This is the bridge between Crosby noticing relevance and the user committing to an Expert.

**When it triggers:** Confidence reaches 0.9+ (sustained over 2-3 messages, not a one-message spike).

**What Crosby does:** Offers to activate via a natural, low-pressure prompt. This is NOT a structured question card — it's woven into the response:

- "Feels like we're deep in Real Estate territory — want me to pull up all that context?"
- "This is definitely a [Expert name] conversation. I've got some docs that would help — want me to load them up?"

**User responses:**
- **Confirms** (says yes, taps a confirm chip, or just keeps talking about the topic) → Expert transitions to Direct Activation. UI updates to show it as selected. Full Tier 1 stays loaded. Now sticky.
- **Ignores** (doesn't acknowledge, keeps talking) → Crosby treats this as soft confirmation. Stays at high ambient. Does NOT ask again for this stretch of conversation.
- **Declines** ("no, don't need that") → Confidence drops. Expert unloads to low ambient. Crosby won't offer again unless the topic comes back strongly in a later session.

**Key rule:** Crosby asks **at most once per topic stretch.** If it offers and the user ignores it, Crosby doesn't nag. The context is already partially loaded at high ambient anyway — the user isn't missing much.

### 4. Deactivation
How an Expert goes from active to inactive.

**From Direct Activation:**
- User activates a different Expert → current one deactivates
- User explicitly deactivates ("done with Real Estate", taps to toggle off)
- Tier 1 unloads, color fades, Expert is no longer "selected"

**From Ambient:**
- Conversation drifts away → confidence naturally decays → tint fades → context unloads
- No announcement, no transition. Just a quiet fade.

**What persists after deactivation:**
- Memories created during the Expert session retain their entity tags (retrieval-time boosting still works in future)
- Notepad entries tagged with the Expert remain (visible in notepad, surface when Expert is next active)
- Nothing is lost — the Expert just isn't occupying context space anymore

---

## Multi-Expert Scenarios

Can two Experts be active simultaneously? **Yes, but with a shared budget.**

**When it happens:**
- User is in Real Estate but mentions a Sales contact → Sales Expert has ambient relevance
- User explicitly activates two Experts (rare but possible)
- A message spans two Expert domains ("draft an email to the vendor about the lease")

**How the budget works:**
- Two active Experts share the Tier 1 budget. Each gets roughly half.
- The "primary" Expert (directly activated or higher confidence) gets priority if content competes for space.
- More than two simultaneous Experts is theoretically possible but practically unlikely. The system handles it by further subdividing the budget, but quality may degrade — this is acceptable.

**Router awareness:**
The router knows which Experts are active and loads tools/data accordingly. If both Email and Real Estate are active, the tool set includes both Expert-relevant tools.

---

## Expert Self-Improvement (Overnight Research)

Experts don't just hold context — they grow smarter over time through proactive overnight research.

**How it works:**
- A background cron job (overnight, alongside the dashboard builder) identifies Experts that have been active recently
- For each active Expert, it analyzes recent conversations for **knowledge gaps** — questions Crosby couldn't fully answer, topics where it fell back to web search, areas where the user corrected it or provided information Crosby should have known
- Crosby runs targeted deep research (via Perplexity) on those gap areas
- Findings are stored as Expert-tagged artifacts (research reports) and added to the Expert's Tier 1/Tier 2 content
- The morning briefing mentions the research: "I did some reading on commercial lease buyout clauses last night — I'm better prepared if that comes up again"

**Constraints:**
- Shares the overnight job budget with the dashboard builder (max 2 overnight builds + research combined — or this limit may need to expand)
- Only researches Experts that were active in the last week (not dormant ones)
- Research depth is proportional to the gap severity — a small factual gap gets a quick search, a major knowledge area gets a deeper dive
- User can disable overnight research per-Expert in Settings, or globally

**Why this matters:**
- Makes Experts feel alive — they're not static, they're learning
- Reduces the "Crosby doesn't know enough about my domain" problem over time
- Ties into training & learning (Crosby identifies its own weaknesses) and the soul doc (always working for you)

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Expert Drift (EXPERT-DRIFT.md) | Visual treatment of ambient activation. This spec covers the context loading mechanics behind the visuals. |
| Persistent Memory (PERSISTENT-MEMORY.md) | Retrieval-time Expert boosting. Memory retrieval gets a relevance boost based on active Expert's description. |
| Conversation Continuity (CONVERSATION-CONTINUITY.md) | Expert context is one layer in the context window, alongside rolling summary, memories, and recent messages. |
| Router | Router classifies intent and determines which Experts are relevant. Router output drives ambient confidence scores. |
| Overnight Builder (DASHBOARD-OVERNIGHT-BUILDER.md) | Shares overnight job budget with Expert self-improvement research. |
| Training & Learning (TRAINING-LEARNING.md) | Gap detection feeds overnight research. Learning signals inform which Experts need improvement. |
| Artifacts (ARTIFACTS.md) | Expert-tagged artifacts are primary Tier 1 content. Importance scoring determines which artifacts make the cut. |
| Structured Questions (STRUCTURED-QUESTIONS.md) | The ambient → active offer may use a lightweight confirm chip. |

---

## Ripple Effects

- **Overnight builder budget** — may need to expand the "max 2 overnight jobs" limit to accommodate Expert research alongside dashboard builds. Or Expert research counts as one of the 2.
- **Importance scoring** — the algorithm that ranks Expert content for Tier 1 inclusion needs to be defined (currently deferred to architecture). Inputs: recency, access frequency, explicit pins, user engagement.
- **Prompt caching** — Tier 1 stability makes it a prime caching target. Architecture should design the prompt structure to maximize cache hits (Expert context in a stable prefix position).
- **Settings** — needs per-Expert toggle for overnight research. Also a global toggle.
- **Morning briefing** — needs to include overnight research results when they exist.

---

## Open Questions

- [ ] Should there be a maximum number of pinned documents per Expert? (Prevents a user from pinning 50 docs and blowing the Tier 1 budget)
- [ ] Should ambient confidence decay be time-based (decays even if no messages are sent) or only message-based (only decays when unrelated messages arrive)?
- [ ] When two Experts are active and the user deactivates one, should the remaining Expert immediately expand to fill the full Tier 1 budget, or wait until next message?
- [ ] Should overnight research findings be presented for approval (like overnight builds) or just added silently?
- [ ] How does the overnight research budget interact with the dashboard builder's "max 2 per night" limit? Shared pool or separate?
