# Contradiction Detection — Algorithm Spec

*Last updated: 2026-03-25*

---

## What This Solves

Over time, Crosby accumulates semantic memories that may contradict each other:
- "Jason's accountant is Sarah" (March 2026)
- "Jason's accountant is Michael" (June 2026)

Without detection, both memories load into context, confusing the model. The contradiction detection system identifies these conflicts and supersedes the older memory.

---

## Detection Algorithm

### When It Runs
- **Weekly cron:** `/api/cron/memory-scan` processes all memories where `scanned_at IS NULL`
- **On extraction:** After a new memory is extracted, a lightweight check runs against recent memories in the same entity/topic space

### Step 1: Candidate Identification (Fast, No LLM)

For each unscanned memory:

1. **Entity overlap:** Find other memories that reference the same entities (people, places, organizations). Entity tags are stored on the memory row.
2. **Embedding similarity:** Find memories with cosine similarity > 0.8 to the new memory's embedding.
3. **Topic overlap:** Find memories with the same topic tags.

Union of all three = candidate set. Typically 3-10 candidates per memory.

### Step 2: LLM Contradiction Check (Batch, Cheap Model)

Run on Gemini Flash Lite (cheap, fast) with structured JSON output:

```
Given these memories about the same entity/topic, identify any contradictions.

Memory A (2026-03-15): "Jason's accountant is Sarah Chen at Deloitte"
Memory B (2026-06-20): "Jason's accountant is Michael Park"

Are these contradictory?
- YES_FULL: They directly contradict (same fact, different value)
- YES_PARTIAL: They partially conflict (overlapping but not identical claims)
- NO: They're compatible (different aspects of the same topic)
- UNCLEAR: Not enough context to determine

If contradictory, which is more likely current? (Usually the newer one, but not always —
the user might be referencing a past state.)
```

Response format:
```json
{
  "contradiction": "YES_FULL",
  "supersedes": "B supersedes A",
  "reason": "Same role (accountant), different person. B is newer.",
  "confidence": 0.9
}
```

### Step 3: Supersession

If contradiction detected with confidence > 0.7:

1. Set `superseded_at = NOW()` on the older memory
2. Set `superseded_by = newer_memory_id` on the older memory
3. The older memory is excluded from future retrieval (but not deleted — preserves history)
4. Log the supersession in `activity_log` for transparency

If confidence 0.5-0.7: flag for review but don't auto-supersede. The activity log shows "potential contradiction detected" and Crosby can mention it conversationally: "I noticed you mentioned Michael as your accountant — I had Sarah on file. Which is current?"

If confidence < 0.5: no action. Mark as scanned.

---

## Supersession Rules

| Scenario | Rule |
|----------|------|
| Same fact, newer date | Newer supersedes older |
| User explicitly corrects | Correction always wins regardless of date |
| Ambiguous (both could be true) | Don't supersede — both stay active |
| One is more specific | Specific doesn't supersede general (both stay) |
| User says "actually, it's X" | Immediate supersession, no cron needed |

---

## Edge Cases

**Temporal facts:** "Jason is going to Paris next week" doesn't contradict "Jason went to Tokyo last month." Both are true at different times. The LLM prompt explicitly distinguishes temporal vs. contradictory.

**Role changes:** "Sarah is the GM" followed by "Carlos is the GM" — these contradict IF they're about the same store. Entity resolution matters. The candidate identification step uses entity tags to scope correctly.

**Partial updates:** "The project budget is $500K" followed by "We got approval for an additional $200K" — these aren't contradictions, they're updates. The LLM prompt distinguishes additive updates from replacements.

---

## Cost

- Candidate identification: vector math only, negligible
- LLM check: ~100 tokens per pair × ~5 candidates per memory × Gemini Flash Lite pricing
- Weekly cron processes ~50-200 unscanned memories
- Estimated cost: < $0.10/week

---

## Inline Detection (Real-Time)

When Crosby extracts a new memory during conversation, a lightweight version runs immediately:

1. Find the top 3 most similar existing memories (embedding similarity > 0.85)
2. If any overlap on entities AND the facts differ, ask the user inline: "Just to make sure — you mentioned Michael as your accountant. I had Sarah on file from March. Did that change?"
3. User confirms → supersession happens immediately
4. User says "no, Sarah is still my accountant" → new extraction is discarded

This catches the most obvious contradictions in real-time. The weekly cron catches subtler ones.
