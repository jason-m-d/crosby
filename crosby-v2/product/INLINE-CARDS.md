# Inline Cards — Product Spec

*Last updated: 2026-03-25*

---

## What Inline Cards Are

Inline cards are interactive UI elements that appear inside the chat timeline alongside regular messages. They're how Crosby shows structured information, confirms actions, asks questions, and delivers proactive content — all without breaking the conversational flow.

Cards are **not messages.** They're visual elements attached to messages or inserted between them. They scroll naturally with the timeline and never persist or pin (the dashboard handles persistent information).

---

## Card Categories

There are four categories of inline cards, each with different purposes and visual weight.

### 1. Receipt Cards

**Purpose:** Confirm that Crosby did something. A compact visual record that an action happened.

**When they appear:** After any tool execution that creates, modifies, or deletes something — tasks, email drafts, contacts, bookmarks, artifacts, projects, dashboard widgets, notification rules, preferences.

**Behavior:**
- Appear immediately after the tool completes, below Crosby's text response
- Full size on arrival: icon + label + key detail + optional secondary info
- **Shrink after 2 minutes** — compress to just icon + key detail, tighter padding, no label text. The receipt did its job; now it gets out of the way.
- Non-interactive by default. Exceptions:
  - **Task receipt** has a checkbox — tap to mark done right there
  - **Artifact receipt** is tappable — opens the artifact in the side panel
- Multiple receipts from the same response stack vertically with tight spacing

**Visual treatment:**
- Surface: `--surface-card` background, `rounded-2xl`, `p-3`
- No border (follows card system)
- Icon: `size-3.5`, inherits context color. Status-colored only for status-meaningful operations (success green for "created", error red for "failed", amber for "updated")
- Label: `font-mono text-label-sm uppercase text-[--text-tertiary]` — e.g., "DRAFT CREATED", "TASK ADDED", "BOOKMARK SAVED"
- Detail: `font-body text-body-sm text-[--text-secondary]` — the subject line, task title, contact name, etc. Truncated with ellipsis if long
- Secondary info: `font-mono text-mono-xs text-[--text-tertiary]` — e.g., "to sarah@...", "due Mar 28"
- Layout: single horizontal row. Icon → label → detail → secondary (right-aligned)

**Shrunk state (after 2 minutes):**
- Icon + detail only, no label
- Padding reduces: `p-2`
- Transition: 400ms ease-out opacity + height change

**Receipt types:**

| Type | Icon | Label | Detail | Secondary |
|------|------|-------|--------|-----------|
| Task created | `CirclePlus` | TASK ADDED | Task title | Due date if set |
| Task completed | `CircleCheck` | DONE | Task title | — |
| Task dismissed | `CircleX` | DISMISSED | Task title | — |
| Email draft | `MailPlus` | DRAFT CREATED | Subject line | "to [recipient]" |
| Email draft failed | `MailX` | DRAFT FAILED | Error message | — |
| Contact saved | `UserPlus` | CONTACT SAVED | Name | Phone or email |
| Contact updated | `UserPen` | CONTACT UPDATED | Name | Changed field |
| Bookmark added | `Link2` | BOOKMARK SAVED | Title or URL | — |
| Bookmark removed | `Trash2` | BOOKMARK REMOVED | Title | — |
| Artifact created | `NotebookPen` | ARTIFACT CREATED | Artifact name | Type badge |
| Artifact updated | `Pencil` | ARTIFACT UPDATED | Artifact name | — |
| Project created | `FolderPlus` | PROJECT CREATED | Project name | — |
| Project updated | `FolderPen` | PROJECT UPDATED | Project name | — |
| Project archived | `FolderX` | PROJECT ARCHIVED | Project name | — |
| Dashboard widget | `LayoutDashboard` | WIDGET PINNED / UPDATED / REMOVED | Widget title | — |
| Notification rule | `Bell` | ALERT RULE CREATED / ENABLED / PAUSED / REMOVED | Rule description | — |
| Preference set | `SlidersHorizontal` | PREFERENCE SET | key = value | — |
| Gmail search | `Search` | SEARCHED GMAIL | Query text | "N results" |
| Context added | `FolderOpen` | CONTEXT ADDED / UPDATED | Project name | — |
| Training signal | `GraduationCap` | TRAINING | Stats or feedback label | — |

---

### 2. Proactive Cards

**Purpose:** Deliver information Crosby initiates — briefings, nudges, heads-ups, the living greeting.

**When they appear:** On scheduled cron triggers, event-driven alerts, or app load after idle.

**Grid vs. list behavior:**
- **Single proactive message:** Renders as a full-width card in the timeline (list mode)
- **Multiple proactive messages** (e.g., user was away and 3+ accumulated): Render as a **grid** — compact summary cards tiled 2-wide on desktop, stacked on mobile. Tap a card to expand it inline to full content.

**Four proactive card types:**

#### Briefing Card
- **Visual weight:** Heaviest. This is the morning dashboard.
- **Surface:** `--surface-card`, `rounded-2xl`, `p-4`
- **Header:** `font-display text-display-sm text-[--text-primary]` — e.g., "Wednesday Morning"
- **Sections:** Calendar, emails, action items, watches, Expert updates — each with its own labeled section
- **Section labels:** `font-mono text-label-sm uppercase text-[--text-tertiary]`
- **Interactive:** Each section's items are tappable (action items have done/snooze/dismiss, calendar events open detail, emails open thread)
- **Feedback footer:** "Adjust this" — opens inline text input to save a preference about briefing content

#### Nudge Card
- **Visual weight:** Medium. Compact accountability prompt.
- **Surface:** `--surface-card`, `rounded-2xl`, `p-4`
- **Color indicator:** 2px left border in status color — pink/rose for accountability tone
- **Header:** `font-mono text-label-md uppercase` — e.g., "3 ITEMS NEED ATTENTION"
- **Content:** Bulleted list of items with priority indicators
- **Interactive:** Each item has done/snooze/dismiss actions on hover (desktop) or swipe (mobile)
- **Escalation visual:** Escalation level affects tone of header text (gentle → direct → confrontational), not the card structure
- **Feedback footer:** "Adjust this"

#### Heads-Up Card
- **Visual weight:** Medium-high. Something just happened.
- **Surface:** `--surface-card`, `rounded-2xl`, `p-4`
- **Color indicator:** 2px left border — color by source type (blue for email, amber for watch, red for urgent)
- **Header:** `font-mono text-label-md uppercase` — type label + timestamp
- **Content:** Single item with context. For email: sender + subject + key quote. For watch: what resolved + summary.
- **Interactive:** Contextual action buttons below content ("Ask about this", "Open email", "See details")
- **No feedback footer** — heads-ups are event-driven, not behavior-tunable

#### Living Greeting Card
- **Visual weight:** Medium. Welcome back + catch-up.
- **Surface:** `--surface-card`, `rounded-2xl`, `p-4`
- **Header:** `font-display text-display-sm text-[--text-primary]` — time-of-day greeting
- **Content:** Personalized greeting text (from soul doc voice), then structured sections for anything that needs attention
- **Sections:** Action items (overdue, due today), calendar next-up, recent emails, watch resolutions — only sections with content appear
- **Interactive:** Action items have done/snooze/dismiss. Calendar and email items are tappable for detail. Each item has actions appropriate to its type.
- **Mutates in place** until user responds (per PERSISTENT-MEMORY.md spec). Freezes into permanent card once user sends a message.
- **Absorbed by briefing** if a scheduled briefing fires within the greeting window

**Grid mode (multiple proactive messages):**
- Each card shows: type label (mono uppercase) + color indicator + one-line summary + timestamp
- `--surface-card`, `rounded-2xl`, `p-3`
- 2-column grid on desktop (`grid grid-cols-2 gap-3`), 1-column stack on mobile
- Tap to expand: card smoothly animates to full-width, full-content version (Motion AnimatePresence + layoutId)
- The greeting card, if present, always renders full-width above the grid — it's never compressed

---

### 3. Interactive Cards

**Purpose:** Ask the user a question or get a decision before acting.

**Two sub-types, as defined in STRUCTURED-QUESTIONS.md:**

#### Clarifying Question Card (Timeline)
- **When:** Crosby needs disambiguation or multi-step clarification before acting
- **Surface:** `--surface-card`, `rounded-2xl`, `p-4`
- **Question text:** `font-body text-body-md text-[--text-primary]`
- **Option chips:** `font-body text-body-sm`, `bg-[--surface-elevated] rounded-[10px] px-3 py-2`
  - Default state: `text-[--text-secondary]`
  - Hover: `brightness-[1.15] -translate-y-[1px]` (follows button hover pattern)
  - Selected: `bg-[--accent-muted] text-[--accent]`
  - Unselected after choice: `opacity-30`
- **"Something else" chip:** `border border-dashed border-[--divider] text-[--text-tertiary]` — tapping focuses main chat input (per resolved decision)
- **Multi-select:** Chips toggle independently, checkmark icon appears in selected chips
- **Resolution:** Card smoothly transitions — chips collapse, replaced by formatted "Q: ... A: ..." text in `text-[--text-secondary]`. Answered state is permanent in the timeline.
- **Chaining:** Multiple cards can appear in sequence. No progress indicator — questions appear naturally one after another (per open question, going with "ask naturally" approach).

#### Quick Confirm Chips (Input Area)
- **When:** Simple yes/no or approve/cancel decisions
- **Location:** Above the chat input bar, not in the timeline
- **Chips:** Same visual style as clarifying question chips but horizontally centered above input
- **Ephemeral:** Disappear after selection or if user starts typing in the input
- **Resolution:** Selected action executes. Result appears as a receipt card + Crosby's response in timeline.

---

### 4. Progress Cards

**Purpose:** Show that Crosby is working on something that takes time.

**When they appear:** During deep research, Expert builds, overnight dashboard generation, silo syncs, document embedding — any background task triggered by the user in this session.

**Behavior:**
- **Active state:** Pulsing indicator (3s cycle, per loading state spec) + task label + topic
- **Completed state:** Smoothly transitions to a receipt card (same category 1 pattern)
- No ambient glow, no shimmer, no elapsed timer. Just a pulse and a label.

**Visual treatment:**
- Active: `--surface-card`, `rounded-2xl`, `p-3`
  - Pulsing dot: `size-2 rounded-full bg-[--accent]` with `animate-pulse-slow`
  - Label: `font-mono text-label-md uppercase text-[--text-tertiary]` — "RESEARCHING", "BUILDING WIDGET", "SYNCING"
  - Topic: `font-body text-body-sm text-[--text-secondary]` — truncated, one line
- Completed: transitions (400ms fade) to a receipt card. Research → artifact receipt ("RESEARCH COMPLETE" + report name, tappable to open). Widget → dashboard receipt. Etc.

---

## Shared Patterns

### Card Entrance Animation
All cards use the standard entrance: fade up, 600ms, 40px distance, `cubic-bezier(0, 0, 0.34, 1)`. Multiple cards in the same response stagger at 100ms.

### Card Exit / Dismissal
Cards that can be dismissed (individual nudge items, greeting items) exit with: fade out + translate-x -8px, 300ms. The remaining items close the gap smoothly.

### Hover Actions (Desktop)
Action buttons (done/snooze/dismiss) appear on hover as an overlay, right-aligned with a subtle `--surface-card` gradient fade on the left so they don't cover text abruptly. `opacity-0 → opacity-100` on group hover, 200ms transition.

### Touch Actions (Mobile)
Swipe gestures for common actions. Swipe right = done (green reveal). Swipe left = dismiss (red reveal). Tap for detail/expand. Touch targets minimum 44x44px per iOS guidelines.

### CollapsibleCards Wrapper
When a response includes more than 3 cards of the same type (e.g., 8 receipt cards from a bulk operation), show the first 3 and collapse the rest behind a "Show N more" toggle. `font-mono text-label-sm text-[--text-tertiary]`.

### Accessibility
- All interactive cards are keyboard navigable (Tab to focus, Enter/Space to activate)
- Option chips are radio group or checkbox group (Radix primitives via shadcn/ui)
- Cards announce their type via `aria-label` (e.g., "Briefing card, Wednesday Morning")
- Hover-revealed actions also reachable via keyboard (appear on focus-within)
- Action buttons have `aria-label` descriptions ("Mark task done", "Snooze 3 days", "Dismiss")
- Loading/progress cards use `aria-live="polite"` to announce state changes
- Reduced motion: all card transitions degrade to opacity crossfade per style guide

---

## Data & Type Integration

### SSE Events

Cards are delivered via SSE events during the chat stream. The existing `SSEEvent` type in SHARED-TYPES.md needs a new event type:

```typescript
// Add to SSEEvent union in packages/shared/src/types/chat.ts
| { type: 'receipt_card'; receiptType: ReceiptCardType; data: Record<string, unknown> }
| { type: 'progress_start'; taskId: string; taskType: string; topic: string }
| { type: 'progress_complete'; taskId: string; receiptType: ReceiptCardType; data: Record<string, unknown> }
```

The existing `card_track` event type covers proactive cards and interactive cards. Receipt and progress cards are new event types.

### Receipt Card Type

```typescript
export type ReceiptCardType =
  | 'task_created' | 'task_completed' | 'task_dismissed'
  | 'email_draft' | 'email_draft_failed'
  | 'contact_saved' | 'contact_updated'
  | 'bookmark_added' | 'bookmark_removed'
  | 'artifact_created' | 'artifact_updated'
  | 'project_created' | 'project_updated' | 'project_archived'
  | 'dashboard_widget_pinned' | 'dashboard_widget_updated' | 'dashboard_widget_removed'
  | 'notification_rule_created' | 'notification_rule_enabled' | 'notification_rule_paused' | 'notification_rule_removed'
  | 'preference_set'
  | 'gmail_search'
  | 'context_added' | 'context_updated'
  | 'training_signal'
  | 'research_complete'
  | 'widget_build_complete'
```

### Training Signals

Card interactions feed the Training & Learning system:

| Signal | Trigger |
|--------|---------|
| `card_engaged` | User taps a receipt, selects a chip, acts on a proactive card item |
| `card_dismissed` | User dismisses a nudge item, swipes away a card |
| `card_ignored` | Proactive card scrolls past without interaction (detected via intersection observer after 30s visibility) |

These signals already exist in the `SignalType` enum in SHARED-TYPES.md.

---

## Layout: Grid vs. List

Cards that display grouped items (action items in a greeting, emails in a briefing, contacts from a search) use:

- **Grid:** For compact, scannable items where each card is roughly the same shape — tasks, contacts, bookmarks. 2 columns on desktop, 1 on mobile. `grid grid-cols-1 sm:grid-cols-2 gap-3`
- **List:** For items that need more detail per row — emails (sender + subject + preview), calendar events (time + title + location + attendees). Full-width rows. `flex flex-col gap-2`

The card type determines the layout, not a user setting. Within a single briefing or greeting card, different sections can use different layouts (action items in a grid, calendar in a list).

---

## Relationship to Other Systems

| System | How Inline Cards Interact |
|--------|---------------------------|
| **Chat timeline** | Cards are timeline content types. They render within the message stream, scroll naturally, follow the same entrance animation. |
| **Dashboard** | Dashboard widgets are persistent. Cards are ephemeral. A receipt card confirms "widget pinned to dashboard" but the widget itself lives in the dashboard, not the timeline. |
| **Artifacts** | Artifact receipt cards are tappable — they open the artifact in the right side panel. Research completion cards do the same for research report artifacts. |
| **Structured questions** | Clarifying question cards and quick confirm chips are defined here but the behavioral logic (when to ask, confidence thresholds, learning) is in STRUCTURED-QUESTIONS.md. |
| **Proactive messages** | Proactive card types (briefing, nudge, heads-up, living greeting) are the visual implementation of the proactive messages taxonomy in PROACTIVE-MESSAGES.md. |
| **Training & learning** | Every card interaction generates a training signal. Dismissals, engagements, and ignores all feed learning. |
| **Notifications** | Push notifications reference inline cards — "you got a heads-up" links to the heads-up card in the timeline via deep link. |
| **Tool executor** | Every tool in the registry can optionally return a `receiptCard` in its `ToolResult`. The chat pipeline renders it as a receipt card. |
| **Background jobs** | Long-running jobs show progress cards. When the job completes, the progress card transitions to a receipt card. |

---

## Ripple Effects

1. **SHARED-TYPES.md** — Add `receipt_card`, `progress_start`, `progress_complete` to `SSEEvent` union. Add `ReceiptCardType` enum. Add optional `receiptCard` field to `ToolResult` interface.
2. **CHAT-TIMELINE.md** — Update content types table to include receipt cards and progress cards. Mark "suggested actions" as dropped from v2.
3. **BUILD-PLAN.md** — Phase 1 (Chat Core) needs basic receipt card rendering. Phase 2 (Router + Tools) needs receipt cards for each tool. Phase 5 (Proactive) needs all proactive card types + grid mode. Phase 1 task 1.5 (Chat UI) should include the card component foundation.
4. **AI-PIPELINE.md** — Tool executor `ToolResult` type gains `receiptCard` field. Post-response pipeline emits receipt card SSE events.
5. **PROACTIVE-MESSAGES.md** — Reference this doc for visual implementation of all proactive card types. Resolve open question about "attached/grouped" offline heads-ups — answer: grid mode.
6. **STRUCTURED-QUESTIONS.md** — Reference this doc for card component specs. Resolve open question about chip count rendering — answer: flex-wrap, as many as needed.
7. **DESIGN-DIRECTION.md** — "Data Cards (Inline Artifacts)" section now has a full spec here. No update needed, but this doc is the implementation reference.

---

## Open Questions

- [ ] Should receipt cards be tappable to expand into more detail? Currently only artifact and task receipts are interactive. Could all receipts show a detail popover on tap?
- [ ] Should the 2-minute shrink timer on receipts be configurable? Or should it be tied to scroll position (shrink once scrolled past)?
- [ ] For the proactive card grid, should there be a "Expand all" button to show all cards at full size simultaneously?
- [ ] Do proactive cards in grid mode show an unread indicator (dot) until tapped/expanded?
