# Crosby Prompt Engineering Backlog

This doc tracks prompt and UX improvements for CC to implement. Each section is a self-contained task with context, the problem, and what to change. Work through these in order - earlier items are higher priority.

---

## 1. Cron Message Visual Design System

**Problem:** All cron-generated messages (briefing, nudge, alert, watch matches, heads up) look different from each other in inconsistent ways. They blend in with regular chat messages. Some render broken markdown (`**Heads up**` showing raw asterisks). There's no unified design language.

**Goal:** All cron messages should:
- Look visually distinct from regular chat messages (they're system-generated, not conversational)
- Share a consistent structure but be color-coded or visually distinguishable by type
- Never show raw markdown artifacts

**Current message types and their prefixes:**

| Type | Current Prefix | Source |
|------|---------------|--------|
| Morning Briefing | `☀️ **Morning Briefing - {date}**` | `morning-briefing` cron |
| Nudge | `📌 **Nudge**` | `nudge` cron |
| Alert | `⚡ **Alert**` | `email-scan` cron (`maybeGenerateAlert`) |
| Watch Match (high confidence) | `**Heads up** - {text}` | `email-scan` cron (`buildWatchMessage`) |
| Watch Match (medium confidence) | `**Possible match** - {text}` | `email-scan` cron (`buildWatchMessage`) |
| iMessage Bridge Status | `**Heads up** —` or `**iMessage bridge...**` | `text-heartbeat-monitor` cron |
| Email Heads Up | `**Heads up** - {sender} just emailed...` | `email-scan` cron |

**What to change:**

### Backend: Add a `message_type` field
- Add a `message_type` column to the `messages` table (nullable string, values like `briefing`, `nudge`, `alert`, `watch_match`, `email_heads_up`, `bridge_status`)
- When `insertProactiveMessage()` is called, pass the message type so it gets stored
- Update all cron jobs to pass their type when inserting

### Backend: Standardize message format
All cron messages should follow this structure:
```
{emoji} {Type Label}

{body text - no more than 3-5 bullet points}
```
No inline `**bold**` mid-sentence. The type label is handled by the frontend via the `message_type` field, not by markdown in the content.

### Frontend: Render cron messages differently
- Use the `message_type` field to apply distinct styling
- Each type gets a subtle left-border color (like the alert screenshot already has):
  - Briefing: warm gold/amber
  - Nudge: muted pink/coral
  - Alert: red
  - Watch Match: blue
  - Email Heads Up: blue (same as watch)
  - Bridge Status: gray
- Type label rendered as a styled chip/badge above the message body
- Message body renders in a card with slight background tint matching the border color

### Files to modify:
- `src/lib/proactive.ts` - update `insertProactiveMessage()` to accept and store `message_type`
- `scripts/` - migration to add `message_type` column to `messages`
- `src/app/api/cron/morning-briefing/route.ts` - pass type
- `src/app/api/cron/nudge/route.ts` - pass type
- `src/app/api/cron/email-scan/route.ts` - pass type for alerts, watch matches, heads up
- `src/app/api/cron/text-heartbeat-monitor/route.ts` - pass type
- Frontend chat message component - conditional rendering based on `message_type`

---

## 2. Fix Broken Markdown Rendering in Watch Messages

**Problem:** `**Heads up**` and `**Possible match**` render with raw asterisks instead of bold text.

**Root cause:** `buildWatchMessage()` in the email-scan cron generates these as inline markdown within a plain text message. The chat frontend either doesn't render inline markdown, or the message format isn't being parsed.

**Quick fix (do this first, before the design system):** In `src/app/api/cron/email-scan/route.ts`, find `buildWatchMessage()` and change the format to use the emoji prefix pattern that already works:
- `**Heads up** -` becomes `📬 Heads up -` (or move to the standardized format from task #1)
- `**Possible match** -` becomes `🔍 Possible match -`

**Better fix:** Implement task #1's design system so the frontend handles type labels visually instead of relying on markdown in the content.

---

## 3. No Tool Calls in Cron Messages

**Problem:** The Alert cron generated an `ask_structured_question` tool call asking "Do you want me to handle the PCI renewal paperwork now?" - but alerts are one-way notifications delivered via push. There's no user present to respond to a structured question.

**Root cause:** `maybeGenerateAlert()` in `src/app/api/cron/email-scan/route.ts` has a very short system prompt that doesn't prohibit tool calls. The model sometimes generates tool call syntax in its text output even though it's not actually calling tools (it's just including the text pattern).

**Fix:** Update the alert generation prompt in `maybeGenerateAlert()`:
```
Current: "Write a very short alert (2-3 sentences max) for Jason DeMayo. Be direct, no fluff. Use hyphens not em dashes."

Add: "This is a one-way notification - Jason may not be looking at the app when this arrives. Do NOT include questions, tool calls, or anything that requires an immediate response. Just state what needs attention and why it's urgent. If action is needed, state what the action is - don't ask if he wants to do it."
```

**Also check:** The nudge and morning briefing prompts for the same issue. Any cron-generated message should be informational, not conversational.

**Files:** `src/app/api/cron/email-scan/route.ts` (maybeGenerateAlert function)

---

## 4. Group Related Items in All Cron Messages

**Problem:** When there are multiple invoices from the same vendor, or multiple action items for the same store, each gets listed separately. This makes messages unnecessarily long and harder to scan.

**Examples from today:**
- Nudge listed "TLC Power Washing invoices" across Stevens Creek, Prospect, Aborn, Winchester, Hollenbeck separately when it could say "TLC Power Washing - 5 overdue invoices across 5 stores (Oct 2025-present)"
- If there were 3 overdue items for the same store, they should be grouped under that store

**Fix:** Update the system prompts for these cron jobs to explicitly instruct grouping:

### Morning Briefing (`buildBriefingPrompt()` in `src/lib/system-prompt.ts`):
Add to the briefing instructions:
```
"Group related items together. If multiple action items relate to the same vendor, store, or topic, combine them into one bullet with a count (e.g., 'TLC Power Washing - 5 overdue invoices across 5 stores' instead of listing each separately). Same for emails from the same person or thread, calendar events in sequence, etc."
```

### Nudge (`src/app/api/cron/nudge/route.ts`):
Add to the system prompt:
```
"Group related items. Multiple invoices from the same vendor = one bullet with a count. Multiple items for the same store = group under that store. Don't list the same thing 5 times when you can say 'x5 across these locations'."
```

### Alert (`maybeGenerateAlert()` in email-scan):
Same principle - if multiple stores trigger an alert threshold, group them.

---

## 5. Reduce Wordiness Across All Cron Messages

**Problem:** Messages are longer than they need to be. Jason scans these on his phone - every extra word is friction.

**Targets:**
- Morning Briefing: currently "up to 400 words" - reduce to 250 max
- Nudge: currently "under 200 words" - reduce to 100 max
- Alert: currently "2-3 sentences" - keep this, it's good
- Watch matches: currently include full email preview text - trim to one line

**Fix:** Update word count limits in each prompt and add a directive like:
```
"Shorter is better. Jason reads these on his phone between meetings. State the fact, not the context he already knows. No preambles like 'Jason, you have several pending items' - just list the items."
```

### Specific prompt changes:

**Morning Briefing** - change `max 400 words` to `max 250 words`. Add: "Skip any section that has nothing noteworthy. Don't say 'No new emails' - just omit the email section."

**Nudge** - change `under 200 words` to `max 100 words`. Add: "No opening line. No sign-off. Just the bullets."

**Watch matches** (`buildWatchMessage()`) - trim the email preview to first 80 chars instead of the full preview. Drop the "This is what you were waiting for" line - the watch context is enough.

---

## 6. Rewrite Watch Match Messages - Stop Being Computery

**Priority: HIGH** - This is one of the most user-facing features and it reads like a database dump right now.

**Problem:** Watch match messages expose internal system language to Jason. They read like log output, not like a chief of staff giving a heads up. Examples of what's wrong:

Current:
```
**Possible match** - This is a direct follow-up from Courtney Randick, who is identified
in the watch as the person Jason is deferring final marketing decisions to for his
Wingstop project.. Hi! Was so great to meet you in person...

May be related to your Waiting for Courtney Randick to provide feedback on marketing
strategies including bounceback coupon percentages, lunch deal details, and mailer strategy..
```

Problems:
1. "This is a direct follow-up from Courtney Randick, who is identified in the watch as the person Jason is deferring..." - nobody talks like this. It's describing its own internal matching logic.
2. "May be related to your Waiting for Courtney Randick to provide feedback on..." - it's dumping the raw action item/watch title as a sentence. Jason doesn't see internal action item names, so this is meaningless to him.
3. Double periods ("project.."), misspelling "May be" context.
4. The email preview just runs into the system text with no visual separation.
5. Overall tone is sterile/robotic instead of conversational.

**What it SHOULD say:**
```
Courtney Randick got back to you about the Earthquakes marketing meeting:

"Hi! Was so great to meet you in person. That's exciting you already have the meeting set.
Can't wait to hear how it goes. I would let them know your ultimate goal is to build
traffic to your res..."

This lines up with the marketing strategy feedback you're waiting on - bounceback coupons,
lunch deals, mailer timing.
```

**Rules for watch match messages:**
1. Lead with WHO did WHAT - "Courtney got back to you about X" not "This is a direct follow-up from Courtney who is identified in the watch as..."
2. The email content should be visually quoted/indented, not run into the system text
3. The watch context should be translated into plain English. Don't dump the watch/action item title. Say what it means: "the marketing strategy feedback you're waiting on" not "your Waiting for Courtney Randick to provide feedback on marketing strategies including..."
4. Never expose internal field names, match types, confidence levels, or system logic to the user
5. Keep it to 3 lines max: who + what happened, the email excerpt, and one line of context connecting it to what Jason cares about

**What to change:**

### `buildWatchMessage()` in `src/app/api/cron/email-scan/route.ts`

This function currently uses template strings to concatenate match metadata. It needs to either:

**Option A (quick fix):** Rewrite the templates to use natural language:
- Instead of `This is a direct follow-up from {sender}, who is identified in the watch as {watchContext}`
- Use: `{senderFirstName} got back to you about {humanReadableTopic}:`
- Instead of `May be related to your {watchContext}`
- Use: `This lines up with {plainEnglishContext}`

**Option B (better fix):** Pass the match data through an AI call (Gemini Flash Lite, keep it cheap) with a prompt like:
```
"You're Crosby, Jason's AI assistant. Rewrite this watch match notification in a natural,
conversational tone. Lead with who emailed and what it's about. Quote the relevant part of
the email. Connect it briefly to what Jason is waiting on. Never mention watches, matches,
confidence levels, or system internals. 3 lines max.

Sender: {sender}
Subject: {subject}
Email preview: {preview}
Watch context: {watchContext}
Match type: {matchType}"
```

Option B is more robust because it handles edge cases (weird subjects, long context strings, etc.) without needing to anticipate every template variation. The cost is one extra Gemini Flash Lite call per watch match, which is negligible since watch matches are rate-limited to 3/hour.

---

## 7. Unified Outbox - Make Cron Jobs Aware of Each Other and of Jason

**Priority: HIGH** - This is the architectural change that makes everything above work properly.

**Problem:** Every cron job runs independently. The morning briefing doesn't know what the nudge will say. The nudge doesn't know the briefing already covered those items. And NONE of them know what Jason actually discussed with Crosby in chat. Result: the same overdue invoices show up in the briefing, then the nudge, then an alert - even if Jason already said "I'm handling those tomorrow."

**Goal:** Crosby should feel like one person with one brain, not five separate cron jobs.

### Message Type Definitions (Clear Distinctions)

| Type | Trigger | What it means | Example |
|------|---------|---------------|---------|
| **Alert** | External event just happened | "This just happened, look at it" | "Kristal emailed about sales account mapping - needs your input for R365" |
| **Heads up** | Crosby connecting dots proactively | "You should know this before it becomes a problem" | "The Earthquakes partnership follow-up is due tomorrow and you haven't prepped" |
| **Nudge** | Inaction over time | "You're dropping the ball on this" | "You told Roger you'd respond 3 days ago - still haven't" |
| **Briefing** | Scheduled daily | "Here's your day" | Morning briefing |

Key difference: Alerts are reactive (something external happened). Heads ups are proactive (Crosby noticed something). Nudges are accountability (Jason forgot/delayed something).

### Architecture: Shared Outbox with Conversation Awareness

#### Step 1: Create a `proactive_outbox` table
```sql
CREATE TABLE proactive_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL, -- 'alert', 'heads_up', 'nudge', 'briefing'
  content TEXT NOT NULL,
  source_cron TEXT, -- which cron generated it
  related_item_ids TEXT[], -- action_item IDs, watch IDs, email IDs referenced
  related_topics TEXT[], -- keywords/topics for dedup ('tlc_invoices', 'pci_compliance')
  status TEXT DEFAULT 'sent', -- 'sent', 'acknowledged', 'dismissed', 'muted'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ, -- when Jason discussed it in chat
  dismissed_at TIMESTAMPTZ -- when Jason explicitly dismissed it
);
```

#### Step 2: Before generating any cron message, check the outbox
Each cron job queries the outbox before deciding what to include:
- "Was this topic already surfaced today?" - skip it
- "Was this topic discussed in chat?" - mark acknowledged, skip it
- "Was this topic dismissed?" - skip it for N days
- "Was this action item already nudged in the last 24h?" - skip it

#### Step 3: Conversation awareness
After each chat exchange, run a lightweight check:
- Did Jason discuss any topics that match items in the outbox? Mark them `acknowledged`
- Did Jason say something like "I don't care about that" or "stop reminding me"? Mark `dismissed`
- Did Jason say "I'll handle it tomorrow"? Snooze the nudge for 24h

This doesn't need to be a separate cron - it can be a post-response hook in the chat route, or part of the memory extraction pipeline that already runs after each exchange.

#### Step 4: Dedup across message types
The outbox enables cross-type dedup:
- If the morning briefing mentioned overdue TLC invoices at 6am, the nudge at 11am should NOT mention them again unless there's new info
- If an alert fires about an email, the nudge shouldn't also surface that same email as "unanswered"
- If a watch match triggered a heads up about Courtney's email, the nudge shouldn't also flag "waiting on Courtney"

#### Step 5: Priority + delivery decisions
The outbox can also control HOW messages are delivered:
- High urgency (alert, something time-sensitive) - push notification + chat message
- Medium urgency (heads up, connecting dots) - chat message only, no push
- Low urgency (nudge about something 5+ days stale) - queue it, include in next nudge batch instead of standalone message

### Implementation Phases

**Phase 1: Outbox table + dedup within same type**
- Create `proactive_outbox` table
- Log every cron message to the outbox with `related_topics`
- Each cron checks: "did I already send something about this topic today?" If so, skip
- This alone fixes the "same items in briefing and nudge" problem

**Phase 2: Cross-type dedup**
- Crons check ALL outbox entries, not just their own type
- Nudge skips topics already in today's briefing
- Alert skips topics already nudged in last 2 hours

**Phase 3: Conversation awareness**
- Post-chat hook checks recent outbox entries against chat content
- Marks items as acknowledged/dismissed
- Nudge respects acknowledged status (doesn't re-nudge what Jason already discussed)

**Phase 4: Smart delivery**
- Urgency-based delivery (push vs chat-only)
- Batching low-priority items instead of individual messages
- "Quiet hours" awareness (don't nudge at 10pm)

### Files to modify:
- `scripts/` - migration for `proactive_outbox` table
- `src/lib/proactive.ts` - update `insertProactiveMessage()` to log to outbox
- `src/app/api/cron/nudge/route.ts` - check outbox before generating
- `src/app/api/cron/email-scan/route.ts` - check outbox before alerts and watch messages
- `src/app/api/cron/morning-briefing/route.ts` - log topics to outbox after sending
- `src/app/api/chat/route.ts` or `src/lib/chat/memory-extraction.ts` - post-chat acknowledgment hook

---

## 8. Grouped Cron Messages on App Open ("While You Were Away")

**Priority: HIGH** - This is the first thing Jason sees when he opens the app. If it's a wall of cron messages, it feels like spam, not an assistant.

**Problem:** If Jason hasn't opened the app in a few hours, he might come back to 4-5 separate cron messages stacked in the chat - a briefing, a nudge, two watch matches, and an alert. Each one takes up space, and the chat looks like a notification dump instead of a conversation. It undermines the "one brain" feel from task #7.

**Goal:** When multiple cron messages have accumulated since Jason last interacted, they should be presented as a single grouped unit - not as individual chat bubbles scattered through the timeline.

### Behavior Rules

**Threshold:** If there are 2+ unread cron messages when Jason opens the app (or returns after inactivity), group them.

**Single cron message:** Render normally as it does today. No grouping needed.

**2+ cron messages:** Collapse into a single "catch-up" card:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3 updates while you were away
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Alert - Kristal emailed about R365 account mapping
📌 Nudge - TLC invoices still unresolved (5 stores)
📬 Watch - Courtney replied re: Earthquakes marketing

  [Expand all]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Each line is a one-line summary of the full message. Tapping a line (or "Expand all") reveals the full message content inline.

### Design Details

**The card replaces individual messages, not supplements them.** The grouped cron messages should NOT also appear as separate bubbles above or below the card. The card IS the presentation layer.

**Ordering within the card:** Most important first, not chronological. Priority order:
1. Alerts (something just happened)
2. Heads ups (proactive, connecting dots)
3. Watch matches (someone replied to something you're tracking)
4. Nudges (accountability reminders)
5. Briefing (scheduled daily summary)

**If the briefing is one of them:** The briefing is already a summary of the day. If a briefing + other messages are grouped, the briefing should be listed last since the other messages are more actionable. Or even better - if the other messages were already covered IN the briefing (which they should be, per task #7's outbox dedup), just show the briefing and skip the redundant items.

**Expanded state:** Once Jason expands the card (or individual items), they stay expanded for that session. He shouldn't have to re-expand every time he scrolls past.

**After expansion:** Once expanded, each message renders with the same visual treatment from task #1 (color-coded left border, type badge, card background). The grouping card is just the collapsed view.

**"Mark all read" / dismiss:** A subtle "Dismiss" or "Got it" action on the grouped card that collapses it down to a single line like "3 updates - dismissed" so it doesn't keep taking up space as the conversation continues.

### How "Unread" Is Determined

**Option A (simple):** Track the timestamp of Jason's last message or last app open. Any cron messages with `created_at` after that timestamp are "unread."

**Option B (better, ties into outbox):** The `proactive_outbox` table from task #7 already has `status` and `acknowledged_at`. Messages with `status = 'sent'` and no `acknowledged_at` are unread. When the catch-up card renders, mark them as `acknowledged`. This gives you outbox-level tracking for free.

### Interaction with the Outbox (Task #7)

The outbox should handle dedup BEFORE messages reach the grouping layer. So by the time 3 messages are grouped, they should already be non-redundant (the outbox filtered out duplicates). The grouping card is purely a UI concern - it doesn't need its own dedup logic.

However, if somehow two messages about the same topic slip through (outbox phase 1 might not catch everything), the grouping card's one-line summaries will make the redundancy obvious. That's actually a feature - it surfaces outbox dedup failures visually so they can be fixed.

### Frontend Implementation

**New component:** `CronMessageGroup` (or `CatchUpCard`)
- Takes an array of unread cron messages
- Renders the collapsed summary card by default
- Handles expand/collapse state
- Uses `message_type` from task #1 for ordering and styling

**Chat message list changes:**
- Before rendering the message list, partition messages into: regular messages + unread cron batch
- If unread cron batch has 2+ items, render a single `CronMessageGroup` at the appropriate position in the timeline (where the first cron message would have appeared)
- If 0-1 unread cron messages, render normally

**Last-active tracking:**
- Store `last_active_at` timestamp (could be a simple cookie, localStorage, or a DB field on the user)
- Update on every message send or app focus event
- Query cron messages with `created_at > last_active_at` to determine the unread batch

### Files to modify:
- New component: `src/components/chat/CronMessageGroup.tsx` (or similar)
- `src/components/chat/` - wherever the message list renders, add partition logic
- `src/lib/proactive.ts` or a new `src/lib/cron-grouping.ts` - logic for determining unread cron batch
- Ties into `message_type` from task #1 and `proactive_outbox` from task #7

---

## 9. [PLACEHOLDER] More improvements coming

Jason has more thoughts. Add them here as they come up.
