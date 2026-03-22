# Crosby Prompt Engineering Backlog

This doc tracks prompt and UX improvements for CC to implement. Each section is a self-contained task with context, the problem, and what to change. Work through these in order - earlier items are higher priority.

---

## ✅ 1. Cron Message Visual Design System — DONE

`CronMessageCard` with color-coded left bars, type badges, per-type body renderers, and `CronMessageGroup` for catch-up grouping are all built. `message_type` field is in the DB and wired end-to-end.

---

## ✅ 2. Fix Broken Markdown Rendering in Watch Messages — DONE

`resolveMessageType()` correctly identifies old `**Heads up**` / `**Possible match**` messages and routes them to `CronMessageCard`. `stripCronPrefix()` in `cron-message-card.tsx` now includes an inline bold prefix strip for these old-format messages (`\*{1,2}(?:Heads up|Possible match)\*{1,2}\s*[-–—]\s*`). New watch messages pass through `rewriteForTone()` before insert so they arrive as clean prose.

---

## ✅ 3. No Tool Calls in Cron Messages — DONE

`maybeGenerateAlert()` calls `anthropic.messages.create()` with no `tools` array — tool calling is structurally impossible. No prompt change needed. The system prompt already says "this is a one-way notification — state what needs attention, no questions."

---

## ✅ 4. Group Related Items in All Cron Messages — DONE

Both the nudge and morning briefing prompts include grouping instructions: "Group related items (multiple invoices same vendor = one bullet with count)."

---

## ✅ 5. Reduce Wordiness Across All Cron Messages — DONE

- Nudge: 80 words max
- Morning Briefing: 250 words max
Both are already below the targets specified in this plan.

---

## ✅ 6. Rewrite Watch Match Messages — DONE

`rewriteForTone()` in `src/lib/proactive.ts` is called in `email-scan/route.ts` (line 582) before `insertProactiveMessage()`. It uses Gemini Flash Lite with a prompt that enforces: lead with who did what, quote the email, connect to what Jason cares about in plain English, no system internals, 3 lines max.

---

## ✅ 7. Unified Outbox — DONE (Phases 1–3)

- `proactive_outbox` table with `status`, `acknowledged_at`, `related_topics`, `related_item_ids`
- `wasTopicSurfacedRecently()` and `getRecentOutboxEntries()` used by crons for cross-type dedup
- Phase 3 (conversation awareness): `acknowledgeOutboxTopics()` in `src/lib/proactive.ts` runs fire-and-forget after every chat exchange. It checks recent unacknowledged outbox entries, extracts matching topics from the conversation using Gemini Flash Lite, and marks matched entries as `acknowledged`.

**Not built:** Phases 4 (urgency-based delivery, batching, quiet hours). Low priority.

---

## ✅ 8. Grouped Cron Messages on App Open — DONE

`CronMessageGroup` component built and wired into `chat-messages.tsx`. Shows collapsed "X updates while you were away" card with one-liner per message, priority ordering (alert > heads up > watch > nudge > briefing > bridge), expand/collapse, dismiss all.

---

## 9. [PLACEHOLDER] More improvements coming

Jason has more thoughts. Add them here as they come up.
