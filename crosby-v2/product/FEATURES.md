# Crosby v2 — Feature Inventory

*Living document. Updated as product discovery continues.*
*Last updated: 2026-03-23*

---

## What Crosby Is

A single-user personal AI assistant that feels like a trusted relationship built over time. Not a chatbot. Not a tool you open when you need something. An always-on presence that has eyes on everything, remembers everything, and proactively surfaces what matters — without being asked.

The core promise: **Crosby knows you. It's always watching. It never drops the ball.**

---

## Feature Inventory

### 1. Email Management
- Scans inbox automatically in the background
- Flags action items from email body and attachments
- Extracts key information (dates, amounts, names, commitments) from emails
- Drafts emails on request
- Tracks unanswered threads in both directions (waiting on you, waiting on others)
- Email automation (rules, auto-responses, patterns)
- "Always has eyes on email" — catches things the user may have missed
- Surfaces relevant emails in conversation context automatically

### 2. Action Items / Tasks
- Creates tasks when user mentions something that needs to happen (even casually in conversation)
- Tracks and follows up on tasks
- Nudges on stale items, overdue items, items approaching due date
- Learns from dismissals — if a category of action item keeps getting dismissed, stops suggesting it
- Can proactively research action items in the background (without being asked) when confident it would be helpful

### 3. Calendar Integration
- Reads Google Calendar
- Checks availability
- Creates and modifies events
- Cross-references meetings with contacts, open action items, notes, and context
- Surfaces relevant context before meetings

### 4. Watches & Monitors
- Tracks things the user is waiting on
- When user mentions they reached out to someone or are expecting a response, auto-creates a watch
- When the watched reply arrives: push notification + heads-up in chat
- Monitors for email patterns the user cares about (customizable)

### 5. Briefings
- Morning briefing by default — covers everything from the previous day, what happened overnight, what's going on today
- Customizable cadence (morning, evening, whenever)
- Customizable content (what categories to include)
- Delivered as a structured message in the chat at the top of a new session

### 6. Proactive Nudges
- Runs on a configurable interval in the background
- Checks for: stale tasks, overdue items, commitments made, unanswered emails, things that fell through the cracks
- Sends a brief nudge with top 3-5 things needing attention
- Delivers a push notification alongside the in-chat nudge
- This is the "alive" feature — makes Crosby feel agentic, not reactive

### 7. Commitment Tracking
- When user says "I'll do X by Friday" in conversation, Crosby captures it as a commitment
- Follows up and holds user accountable
- Commitments auto-expire after they age out (configurable threshold)
- Distinct from tasks — commitments are things the user promised (to themselves or others)

### 8. Decision Tracking
- Records strategic decisions made in conversation (with context and alternatives considered)
- Surfaces decisions later so Crosby never re-asks something already decided
- Keeps Crosby consistent with the user's established direction
- Prevents drift — "you decided X in January" when a related topic comes up

### 9. Document Storage & Search
- File browser — user can upload any document
- Extracts content, chunks it, makes it searchable via RAG
- Relevant document content surfaces automatically in conversation when relevant
- Scanned PDFs get OCR'd automatically
- Supports any file type with text content

### 10. Experts (Projects / Workspaces)
- Workspaces for specific topics or ongoing projects
- Each expert has its own:
  - Knowledge base
  - Uploaded files
  - Bookmarks
  - Custom prompts / instructions
  - Conversation context
- When working in an expert context, Crosby loads the relevant knowledge automatically
- Functionally like "modes" — a legal matter, a business deal, a research project, a restaurant location

### 11. Persistent Memory
- Crosby remembers everything across the entire relationship
- Stores: preferences, key contacts, past decisions, context, patterns
- Never re-asks something it already knows
- Memory improves over time — the longer you use it, the better it knows you

### 12. Contacts
- Stores contacts with roles, emails, and context
- Auto-adds contacts as they come up in conversation or via email
- Knows the user's "key people" and their relationship context
- Used to enrich email, calendar, and conversation responses

### 13. Notepad
- Quick internal scratchpad for Crosby to use during sessions
- Used for short-lived working notes (things Crosby wants to remember mid-task)
- Auto-expires after X days unless pinned by the user
- Not the same as persistent memory — this is ephemeral working context

### 14. Deep Research
- Runs in the background — user can continue chatting while it works
- Delivers a structured report when complete
- Triggered by user request on a topic
- Uses web search + document context + memory

### 15. Web Search
- Two tiers (potentially):
  - **Quick**: fast factual lookups, inline in conversation
  - **Deep**: full research mode (see Deep Research above)

### 16. Push Notifications
- Delivered to phone via PWA or native app
- Triggers: nudges, commitment reminders, watch alerts, briefing delivery
- Configurable per category

### 17. Training & Learning
- Crosby continuously learns user preferences
- Learns what matters and what doesn't from behavior (dismissals, engagement, corrections)
- Preference extraction runs in the background
- Informs: nudge categories, email flagging thresholds, task capture sensitivity, response style

---

## Open Questions (to resolve in discovery)

- [ ] How does an "Expert" differ from a project? Is it a project? Do projects have their own conversation threads or do they load context into the main conversation?
- [ ] What does the contacts UI look like? Is there a contacts page or is it purely behind-the-scenes?
- [ ] What are the "email patterns" in Watches — how does the user define them?
- [ ] How does deep research surface — as a message in the main chat? As a document in the file browser?
- [ ] Is the notepad visible to the user or purely internal to Crosby?
- [ ] What's the distinction between a commitment and a task? When does one become the other?
- [ ] How do push notifications work today vs. v2 — PWA or going native?
- [ ] Does Crosby have a mobile-specific UI or is it responsive web only?
- [ ] What does "email automation" mean specifically — rules engine, templated responses, something else?

---

## Features NOT in Scope (for now)
*To be filled in as we clarify what v2 is and isn't*

---

## Discovery Notes

- The "watches & monitors" feature is underrated — the automatic detection of "I'm waiting on X" and the watch creation is a differentiator
- The commitment/decision split is important and subtle: decisions are strategic (don't re-ask), commitments are accountability (follow up)
- The learning from dismissals is key to the product not becoming annoying over time
- "Experts" need more definition — they feel like the most complex feature and the most powerful one
