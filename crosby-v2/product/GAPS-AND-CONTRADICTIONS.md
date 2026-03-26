# Product Discovery — Gaps, Contradictions & Open Items

*Last updated: 2026-03-25*
*Generated from a full audit of all 21+ product specs.*
*All items resolved. Zero deferred items remain. Gap-closing specs added during product discovery (CONVERSATION-CONTINUITY.md, ACTIVITY-LOG.md) and architecture phase (PROCEDURAL-MEMORIES.md, CONTRADICTION-DETECTION.md, ROUTER-EVAL-PLAN.md, importance scoring in BACKGROUND-JOBS.md).*

---

## How to Use This File

Work through items top-to-bottom. When an item is resolved, mark it with the resolution and date. Items feed back into existing specs (update the relevant spec when resolved) or trigger new specs.

---

## Critical Gaps (Need Specs or Decisions)

### 1. Silos system has no product spec
- **Status:** RESOLVED (2026-03-24)
- **Issue:** Silos are referenced in Dashboard, Settings, Overview, and the product vision doc, but there's no dedicated product discovery spec defining what they are, how they work, or how users create them.
- **Files affected:** DASHBOARD-OVERNIGHT-BUILDER.md, SETTINGS.md, OVERVIEW.md, CROSBY-PRODUCT-VISION.md
- **Action needed:** Decide if silos get a full product spec now, or if the existing product vision coverage is sufficient and the spec comes during architecture phase.

### 2. Data deletion / privacy model missing
- **Status:** RESOLVED (2026-03-25)
- **Issue:** No spec covers what happens when you delete an Expert, contact, memory, artifact, or your entire account. No GDPR-style right-to-be-forgotten handling. No policy on how long superseded memories are retained.
- **Files affected:** All specs — deletion touches every system.
- **Resolution:** Full spec created at features/DATA-DELETION-PRIVACY.md. Covers per-entity deletion cascades, retention policies, account deletion with 24h grace period, procedural memory deletion = prompt removal.

### 3. Multi-device sync undefined
- **Status:** RESOLVED (2026-03-25)
- **Issue:** Mobile spec says "both platforms talk to the same backend" but doesn't address: real-time sync between web and mobile, local state persistence (sidebar tab, dashboard collapsed/expanded), offline handling, or conflict resolution if actions happen on both devices.
- **Files affected:** MOBILE-EXPERIENCE.md, SETTINGS.md
- **Resolution:** Purely server-side. Both clients read/write to the same Supabase DB — all meaningful state (messages, memories, experts, settings) lives server-side. UI-local state (sidebar tab, dashboard collapsed, scroll position) is per-device, no cross-device sync needed. No offline mode for v2.

---

## Contradictions to Resolve

### 4. Living greeting vs. catch-up message
- **Status:** RESOLVED (2026-03-24)
- **Issue:** PERSISTENT-MEMORY.md says the living greeting IS the catch-up from PROACTIVE-MESSAGES.md ("Same system, not two separate features"). But PROACTIVE-MESSAGES.md treats catch-up as a separate message type with its own delivery rules.
- **Files affected:** PERSISTENT-MEMORY.md, PROACTIVE-MESSAGES.md
- **Action needed:** Pick one. If they're the same, update PROACTIVE-MESSAGES to remove catch-up as a separate type and reference the living greeting. If they're different, clarify the distinction.

### 5. Working memory definition conflict
- **Status:** RESOLVED (2026-03-24)
- **Issue:** PERSISTENT-MEMORY.md says working memory has "no dedicated storage — this is the standard conversation context." NOTEPAD.md says "the notepad IS the implementation of working memory." These contradict. (Resolved in conversation: notepad = working memory. But the memory spec still has the old definition.)
- **Files affected:** PERSISTENT-MEMORY.md, NOTEPAD.md
- **Action needed:** Update PERSISTENT-MEMORY.md to reflect that working memory = notepad, not context window. Remove or rewrite the "Working Memory" section.

### 6. Quiet hours implementation status
- **Status:** RESOLVED (2026-03-24)
- **Issue:** NOTIFICATIONS.md defines quiet hours clearly (default 9PM–7AM, held notifications absorbed into morning briefing). BRIEFINGS-NUDGES.md says quiet hours have "no system default — the user decides" and marks urgent alerts during quiet hours as "TBD."
- **Files affected:** NOTIFICATIONS.md, BRIEFINGS-NUDGES.md
- **Action needed:** Reconcile. NOTIFICATIONS.md appears to be the later, more definitive spec. Update BRIEFINGS-NUDGES.md to match.

### 7. Event-driven nudges vs. heads-ups
- **Status:** RESOLVED (2026-03-24)
- **Issue:** BRIEFINGS-NUDGES.md describes "event-driven (reactive)" triggers for nudges. PROACTIVE-MESSAGES.md assigns event-driven messages to "heads-ups" as a separate type. Are event-driven nudges and heads-ups the same thing?
- **Files affected:** BRIEFINGS-NUDGES.md, PROACTIVE-MESSAGES.md
- **Action needed:** Clarify the taxonomy. If heads-ups are the event-driven type, then nudges should only be timer/cron-based. If they overlap, merge or distinguish clearly.

---

## Terminology Inconsistencies

### 8. Experts vs. Projects vs. Silos
- **Status:** RESOLVED (2026-03-24)
- **Issue:** Three terms used across specs for overlapping concepts. "Experts" in EXPERTS.md, "Projects" in FEATURES.md, "Silos" in OVERVIEW.md and product vision. Are these three names for the same thing, or three different concepts at different layers (product vs. architecture)?
- **Files affected:** EXPERTS.md, FEATURES.md, OVERVIEW.md, CROSBY-PRODUCT-VISION.md
- **Action needed:** Settle terminology. Likely answer: "Experts" is the user-facing product term. "Silos" is the architectural term for the capability module system. "Projects" is retired/absorbed into Experts.

### 9. Expert navigation location inconsistency
- **Status:** RESOLVED (2026-03-24)
- **Issue:** MOBILE-EXPERIENCE.md says Experts get a bottom nav tab. APP-STRUCTURE.md is unclear on where Experts live on web — asks "Where does the Experts list live if not in the nav?" EXPERTS.md also leaves the picker UI as an open question.
- **Files affected:** MOBILE-EXPERIENCE.md, APP-STRUCTURE.md, EXPERTS.md
- **Action needed:** Decide the Expert navigation model for both web and mobile. Mobile has a tab — does web match?

---

## Missing Interactions & Specs

### 10. Component library for dashboard widgets
- **Status:** RESOLVED (2026-03-24)
- **Issue:** DASHBOARD-OVERNIGHT-BUILDER.md references a "component library — predefined building blocks" that Crosby assembles widgets from, but the library itself is never defined. No list of block types, no API, no spec for how Crosby selects blocks for a given data source.
- **Files affected:** DASHBOARD-OVERNIGHT-BUILDER.md
- **Action needed:** This is likely an architecture/implementation spec, not a product spec. But the product spec should at least enumerate the block types available.

### 11. Importance scoring cron algorithm
- **Status:** RESOLVED IN ARCHITECTURE (2026-03-25)
- **Issue:** EXPERTS.md and ARTIFACTS.md reference a background cron that assigns importance scores to Expert content, but the algorithm is never specified. What triggers it? How often? What factors determine importance?
- **Files affected:** EXPERTS.md, ARTIFACTS.md
- **Resolution:** Algorithm defined in architecture/BACKGROUND-JOBS.md. Formula: `(recency * 0.3) + (access * 0.3) + (pin * 0.2) + (engagement * 0.2)`. Runs nightly as part of overnight cron. Pinned docs never drop below 0.2. Docs below 0.1 = archive suggestion candidates.

### 12. Artifact conflict resolution
- **Status:** RESOLVED (2026-03-24)
- **Issue:** ARTIFACTS.md notes that artifacts are two-way editable (user + Crosby) but asks "if Crosby and the user try to edit simultaneously, who wins?" Never answered.
- **Files affected:** ARTIFACTS.md
- **Action needed:** Product decision. Options: last-write-wins, user always wins, Crosby yields if user is editing, or real-time collaborative editing.

### 13. Background job concurrency model
- **Status:** RESOLVED (2026-03-24)
- **Issue:** Multiple specs reference background jobs (deep research, overnight builder, memory extraction, email scanning) but no spec defines concurrency. Can 5 deep research jobs run in parallel? Is there a queue? Rate limits?
- **Files affected:** WEB-SEARCH-DEEP-RESEARCH.md, DASHBOARD-OVERNIGHT-BUILDER.md, PERSISTENT-MEMORY.md
- **Action needed:** Likely an architecture decision, but product impact: should the user be told "I'm already working on something, I'll queue this" or should jobs just run in parallel?

### 14. Contact promotion cascades
- **Status:** RESOLVED (2026-03-24)
- **Issue:** CONTACTS-ENTITY-RESOLUTION.md describes shadow records promoting to full contacts silently, but doesn't address retroactive effects. When promoted, does Crosby: retroactively link existing memories to the contact? Backfill interaction metadata from email? Offer to enrich the record?
- **Files affected:** CONTACTS-ENTITY-RESOLUTION.md, PERSISTENT-MEMORY.md
- **Action needed:** Define what happens at promotion time. Likely: retroactive memory linking yes, backfill yes, user notification no (silent).

---

## Lower Priority Items

### 15. Email attachment storage ambiguity
- **Status:** RESOLVED (2026-03-24)
- **Resolution:** Email attachments are NOT auto-stored on the Documents page. Crosby reads all attachments for context (extracts text, understands content) but doesn't persist them by default. User can explicitly save ("save that attachment"). Crosby can infer importance and extract key info to memory/notepad without saving the full file. A lightweight metadata reference back to the email is kept for quick recall.

### 16. Artifact position in information hierarchy
- **Status:** RESOLVED (2026-03-24)
- **Resolution:** Artifacts are documents that Crosby created. Not memory, not notes. They live in the sidebar, appear on the Documents page (Artifacts tab), can be tied to Experts as context, and get RAG treatment. They're the output of Crosby's work — reports, plans, summaries, templates.

### 17. Expert artifact context tier
- **Status:** RESOLVED (2026-03-24)
- **Resolution:** Expert artifacts start as Tier 1 when the Expert is active (high-signal — created specifically for this Expert). Can demote to Tier 2 via importance scoring cron if old and never retrieved. Fresh artifacts stay Tier 1; stale ones sink.

### 18. Procedural memory trigger pattern format
- **Status:** RESOLVED IN ARCHITECTURE (2026-03-25)
- **Issue:** PERSISTENT-MEMORY.md says procedural memories use "trigger/keyword-based lookup" but never defines what a trigger pattern looks like or how they're created from behavioral signals.
- **Resolution:** Full spec at architecture/PROCEDURAL-MEMORIES.md. Triggers are natural language (not regex). Two-stage matching: (1) embedding similarity pre-filter against example_invocations, (2) inject matched triggers into system prompt for LLM to follow. Confidence scoring 0-1 with behavioral thresholds. Extraction via async post-response analysis.

### 19. Nudge escalation levels
- **Status:** RESOLVED (2026-03-24)
- **Issue:** PROACTIVE-MESSAGES.md shows 3+ escalation levels. BRIEFINGS-NUDGES.md asks "how many?" Never resolved.
- **Action needed:** Pick a number or define the rule (e.g., 3 levels, then Crosby stops unless it's a commitment).

### 20. Relationship type values for contacts
- **Status:** RESOLVED (2026-03-24)
- **Issue:** CONTACTS-ENTITY-RESOLUTION.md lists example relationship types but doesn't say if it's an enum or open-ended.
- **Action needed:** Quick decision — likely open-ended with common defaults.

### 21. Router / tool selection logic
- **Status:** RESOLVED IN ARCHITECTURE (2026-03-25)
- **Issue:** How Crosby chooses which tool to call is never defined at the product level. Mostly a prompt engineering / architecture concern, but product should define the intent.
- **Resolution:** Fully addressed in architecture/AI-PIPELINE.md (Stage 1 Router + Stage 4 Tool Executor). Router returns toolsNeeded[], confidence-based data loading (<0.5 = tools only, 0.5-0.8 = lightweight, 0.8+ = full). Map-based tool executor registry. Router eval plan with 100+ test cases at architecture/ROUTER-EVAL-PLAN.md.

### 22. "Something else" input location for structured questions
- **Status:** RESOLVED (2026-03-24)
- **Issue:** STRUCTURED-QUESTIONS.md asks whether tapping "something else" opens inline input in the card or focuses the main chat input. Unresolved.
- **Action needed:** UX decision.

### 23. Contradiction detection algorithm
- **Status:** RESOLVED IN ARCHITECTURE (2026-03-25)
- **Issue:** PERSISTENT-MEMORY.md describes contradiction handling (supersession chains, weekly cron) but never defines how contradictions are detected algorithmically.
- **Resolution:** Full spec at architecture/CONTRADICTION-DETECTION.md. Three-step process: (1) candidate identification via entity overlap + embedding similarity + topic overlap, (2) LLM contradiction check on Gemini Flash Lite with structured JSON, (3) supersession with confidence thresholds (>0.7 = auto-supersede, 0.5-0.7 = flag for review, <0.5 = no action). Inline detection for real-time catches. Weekly cron for subtler contradictions.

---

## Resolution Log

*Move items here when resolved, with date and outcome.*

| # | Item | Resolution | Date |
|---|------|-----------|------|
| 4 | Living greeting vs. catch-up | Same system. "Catch-up" renamed to "Living Greeting" in PROACTIVE-MESSAGES.md. Triggers on app load after 15+ min idle. Content-driven: stuff happened → catch-up summary; nothing happened → simple greeting; under 15 min → no greeting. Updated PERSISTENT-MEMORY.md and PROACTIVE-MESSAGES.md. | 2026-03-24 |
| 5 | Working memory definition | Working memory = notepad. Updated PERSISTENT-MEMORY.md to redirect to NOTEPAD.md instead of saying "no dedicated storage." | 2026-03-24 |
| 6 | Quiet hours implementation | NOTIFICATIONS.md is authoritative. Default 9PM–7AM, held notifications absorbed into morning briefing, breakthrough rules for exceptions. Updated BRIEFINGS-NUDGES.md to match. | 2026-03-24 |
| 7 | Event-driven nudges vs. heads-ups | Nudges = timer/cron-based (accountability). Heads-ups = event-driven (something just happened). Added clarifying note to BRIEFINGS-NUDGES.md. | 2026-03-24 |
| 1 | Silos system has no product spec | Created SILOS.md. Three tiers: core capabilities (native), marketplace (pre-built templates), custom (agentic builder). Silos = capabilities, Experts = context. Cross-silo interactions via "tunnels." Self-healing with dedicated repair agent. | 2026-03-24 |
| 8 | Experts vs. Projects vs. Silos | "Experts" = user-facing context workspaces. "Silos" = capability modules (tools, data, sync). "Projects" = retired, absorbed into Experts. Terms are distinct, not interchangeable. | 2026-03-24 |
| 9 | Expert navigation location | Web: left sidebar below 3 main pages (Home, Documents, Settings) with color-coded dots and + button. Mobile: bottom nav tab. Updated APP-STRUCTURE.md. | 2026-03-24 |
| 10 | Component library | Use an existing dashboard component library (Tremor or similar) instead of building custom blocks. Crosby composes from the library's components. Updated DASHBOARD-OVERNIGHT-BUILDER.md. | 2026-03-24 |
| 11 | Importance scoring cron | Algorithm defined in architecture/BACKGROUND-JOBS.md. Formula: (recency * 0.3) + (access * 0.3) + (pin * 0.2) + (engagement * 0.2). Runs nightly. | 2026-03-25 |
| 12 | Artifact conflict resolution | User always wins. Behavioral editing lock — user editing = Crosby can't write. Queued updates presented when user stops: [Apply] [Show me first] [Skip]. Mid-generation holds as proposed update. Updated ARTIFACTS.md. | 2026-03-24 |
| 13 | Background job concurrency | Max ~3 concurrent background jobs. Extras queued. Crosby tells user: "I've got 3 running — I'll queue the rest." | 2026-03-24 |
| 14 | Contact promotion cascades | Silent retroactive linking. On promotion: scan existing memories and tag with contact entity, backfill interaction metadata from email history. No user notification. | 2026-03-24 |
| 15 | Email attachment storage | Not auto-stored. Crosby reads all for context but doesn't persist. User can explicitly save. Crosby extracts key info to memory/notepad. Metadata reference kept for recall. | 2026-03-24 |
| 16 | Artifact hierarchy | Artifacts are documents Crosby created. Not memory, not notes. Sidebar + Documents page (Artifacts tab) + Expert context + RAG. | 2026-03-24 |
| 17 | Expert artifact context tier | Starts Tier 1 when Expert active. Can demote to Tier 2 via importance scoring if old and never retrieved. | 2026-03-24 |
| 18 | Procedural memory triggers | Full spec at architecture/PROCEDURAL-MEMORIES.md. Natural language triggers, two-stage matching, confidence scoring. | 2026-03-25 |
| 19 | Nudge escalation levels | 3 levels, then stop for non-commitments. Commitments never stop — user promised someone. | 2026-03-24 |
| 20 | Contact relationship types | Open-ended with common defaults (client, vendor, employee, friend, family, lawyer, etc.). Any label valid. | 2026-03-24 |
| 21 | Router / tool selection | Fully addressed in AI-PIPELINE.md + ROUTER-EVAL-PLAN.md. Router returns toolsNeeded[], confidence-based activation. | 2026-03-25 |
| 22 | "Something else" input | Tapping "something else" focuses the main chat input. No inline text field in the card. | 2026-03-24 |
| 23 | Contradiction detection | Full spec at architecture/CONTRADICTION-DETECTION.md. Three-step: candidate ID, LLM check, supersession with confidence thresholds. | 2026-03-25 |
| 2 | Data deletion / privacy model | Full spec created (features/DATA-DELETION-PRIVACY.md). Per-entity deletion cascades, retention policies, account deletion with 24h grace, procedural memory = prompt removal. | 2026-03-25 |
| 3 | Multi-device sync | Purely server-side. Both clients hit the same Supabase DB. UI-local state is per-device. No offline mode for v2. | 2026-03-25 |
