# Procedural Memory — Trigger Format & Matching

*Last updated: 2026-03-25*

---

## What Procedural Memories Are

Procedural memories are "if X then Y" rules Crosby learns from observing user behavior. Examples:
- "When Jason says 'send the numbers', he means email the weekly sales report to the ops team"
- "Jason always wants a calendar block after scheduling a vendor call"
- "When a task is marked done, Jason likes a one-line acknowledgment, not a paragraph"

They're different from semantic memories (facts) and episodic memories (events). They're behavioral rules with trigger conditions.

---

## Trigger Pattern Format

Stored in the `procedural_memories` table as:

```
trigger_pattern: TEXT — natural language description of the trigger condition
action_pattern: TEXT — what Crosby should do when triggered
example_invocations: TEXT[] — 3-5 real messages that triggered this pattern
confidence: FLOAT — 0.0-1.0, increases with repeated observation
observation_count: INT — how many times this pattern was observed
```

**Example row:**
```
trigger_pattern: "User asks to 'send the numbers' or 'send the report' or references weekly sales data"
action_pattern: "Draft an email to ops@company.com with the latest sales report attached"
example_invocations: ["send the numbers", "can you send the weekly report", "get the numbers to the team"]
confidence: 0.85
observation_count: 7
```

**The trigger pattern is natural language, not regex.** This is deliberate — the matching is done by semantic similarity + LLM classification, not string matching. Natural language patterns are more flexible and capture intent rather than exact wording.

---

## Matching Algorithm

Procedural memories are matched in two stages:

### Stage 1: Lightweight Pre-filter (Fast, Cheap)
Run on every message before the main LLM call:

1. Embed the incoming message
2. Compare against embeddings of `example_invocations` (cosine similarity)
3. If any example scores > 0.75 similarity, flag that procedural memory as a candidate
4. Also check for entity overlap (same contact names, same project references)

This stage is fast because it's just vector math — no LLM call.

### Stage 2: LLM Confirmation (Only for Candidates)
Only runs if Stage 1 found candidates:

1. Include the candidate trigger patterns in the system prompt as a "behavioral rules" section
2. The main LLM naturally follows these rules when generating its response
3. No separate LLM call needed — the rules are injected into context

**Format in the system prompt:**

```
## Learned Behavioral Patterns
When these conditions are met, follow the associated action:

- TRIGGER: User asks to "send the numbers" or references weekly sales data
  ACTION: Draft an email to ops@company.com with the latest sales report
  CONFIDENCE: 0.85

- TRIGGER: User schedules a vendor call
  ACTION: Also create a 15-minute prep block before the call
  CONFIDENCE: 0.72
```

---

## Confidence Scoring

| Confidence | Behavior |
|------------|----------|
| 0.0-0.3 | Not shown to the model. Still learning. |
| 0.3-0.6 | Shown with a qualifier: "You've noticed Jason sometimes..." |
| 0.6-0.8 | Shown as a guideline: "Jason typically prefers..." |
| 0.8-1.0 | Shown as a rule: "Always do this when..." |

Confidence increases by +0.1 each time the pattern is confirmed (user doesn't correct it). Decreases by -0.2 each time the user corrects the behavior.

---

## Extraction

Procedural memories are extracted asynchronously post-response by the memory extraction pipeline:

1. After Crosby responds, the extraction job analyzes the exchange
2. If Crosby took an action and the user didn't correct it → potential procedural memory
3. If the user explicitly says "always do X when Y" → immediate procedural memory (confidence 0.7)
4. If a similar pattern was observed 3+ times → promote to procedural memory (confidence 0.5)

The extraction prompt asks:
```
Did this exchange reveal a behavioral preference or pattern?
If yes, describe:
- The trigger condition (when does this apply?)
- The expected action (what should you do?)
- 2-3 example phrasings that would trigger this
```

---

## Deactivation

- User says "stop doing that" or "don't do that anymore" → confidence set to 0.0 (effectively deactivated)
- Confidence drops below 0.1 naturally → removed from retrieval
- User can see and manage procedural memories in Settings > Memory & Learning
