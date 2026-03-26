# Build Plan — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

This is the phased build order for Crosby v2. Each phase produces a working, testable increment. Phases are ordered by dependency — later phases depend on earlier ones. Within each phase, independent tasks can be parallelized across agents.

The goal: each phase can be one-shot by spawning parallel agents with clear interface contracts.

---

## Phase 0: Foundation

**What:** Monorepo scaffolding, database schema, auth, basic UI shell.
**Why first:** Everything else depends on the project structure, database, and auth.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 0.1 — Initialize monorepo (pnpm, Turborepo, tsconfig) | Nothing | Yes |
| 0.2 — Create packages/shared (types, constants) | Nothing | Yes |
| 0.3 — Create packages/supabase (client setup, admin client) | 0.1 | Yes |
| 0.4 — Run database migrations (all tables) | 0.3 | No (sequential SQL) |
| 0.5 — Generate Supabase types | 0.4 | No (needs tables) |
| 0.6 — Scaffold apps/web (Next.js, Tailwind, shadcn/ui) | 0.1 | Yes |
| 0.7 — Implement auth (Supabase Auth, middleware, OAuth callback) | 0.3, 0.4, 0.6 | No |
| 0.8 — Build app shell (layout, navigation, auth-gated routes) | 0.6, 0.7 | No |
| 0.9 — Scaffold apps/mobile (Expo, React Navigation) | 0.1, 0.2 | Yes |
| 0.10 — Create packages/api-client (typed HTTP client) | 0.2 | Yes |

**Parallel strategy:** Tasks 0.1–0.3 and 0.6, 0.9, 0.10 can all run in parallel. Then 0.4–0.5 sequentially. Then 0.7–0.8 sequentially.

**Verification:**
- `pnpm turbo build` passes
- `pnpm turbo typecheck` passes
- Auth flow works (sign up, log in, log out)
- App shell renders with navigation
- Database tables exist with RLS policies

---

## Phase 1: Chat Core

**What:** Basic chat that streams responses. No router, no specialists, no tools — just send a message and get a streamed response.
**Why second:** The chat pipeline is the backbone. Get it working simply, then layer complexity.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 1.1 — Chat API route (POST /api/chat, SSE streaming) | Phase 0 | No |
| 1.2 — System prompt builder (base prompt only, no specialists) | 0.2 | Yes |
| 1.3 — OpenRouter client setup (model configs, fallback chains) | 0.2 | Yes |
| 1.4 — Message storage (insert user + assistant messages) | 0.4 | Yes |
| 1.5 — Chat UI (web) — message list, input, streaming display | 0.8 | Yes |
| 1.6 — Chat UI (mobile) — same, using api-client | 0.9, 0.10 | Yes |
| 1.7 — Session management (auto-create, auto-close) | 1.4 | No |

**Parallel strategy:** 1.2, 1.3, 1.4, 1.5, 1.6 all in parallel. Then 1.1 (needs 1.2, 1.3, 1.4). Then 1.7.

**Verification:**
- Send a message, get a streamed response
- Messages stored in DB
- Works on both web and mobile
- Sessions auto-create and auto-close

---

## Phase 2: Router + Specialists + Tools

**What:** Message classification, specialist activation, tool execution. This is where Crosby becomes useful.
**Why third:** Needs working chat pipeline from Phase 1.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 2.1 — Router implementation (Gemini Flash Lite call) | Phase 1 | No |
| 2.2 — Regex fallback classifier | 0.2 | Yes |
| 2.3 — Specialist definitions (core, email, calendar, tasks, documents, artifacts, texts) | 0.2 | Yes |
| 2.4 — Specialist resolver (match router output to specialist definitions) | 2.1, 2.3 | No |
| 2.5 — Tool definitions (all tool schemas) | 0.2 | Yes |
| 2.6 — Tool registry (Map-based executor dispatch) | 0.2 | Yes |
| 2.7 — Tool executors: tasks | 0.4 | Yes |
| 2.8 — Tool executors: contacts | 0.4 | Yes |
| 2.9 — Tool executors: artifacts + notepad | 0.4 | Yes |
| 2.10 — Tool executors: web search (Perplexity) | 0.2 | Yes |
| 2.11 — Tool executors: system tools (request_additional_context, search_conversation_history, query_activity_log) | 0.4 | Yes |
| 2.12 — Context loader (parallel data block loading) | 0.4, 2.4 | No |
| 2.13 — Prompt builder (specialist sections with populated data) | 2.3, 2.12 | No |
| 2.14 — Wire it all into chat route | 2.1–2.13 | No |
| 2.15 — Card track rendering (interactive cards in timeline) | 1.5 | Yes |

**Parallel strategy:** 2.2, 2.3, 2.5–2.11, 2.15 all in parallel (they're independent type/definition/executor work). Then 2.1, 2.4, 2.12, 2.13, 2.14 sequentially.

**Verification:**
- Router classifies messages correctly
- Specialists activate based on router output
- Tools execute and results appear in chat
- Fallback works when router times out

---

## Phase 3: Integrations

**What:** Gmail, Google Calendar, iMessage connections. The data that makes Crosby useful.
**Why fourth:** Needs tool executors from Phase 2.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 3.1 — Gmail client (OAuth token management, API calls) | 0.4, 0.7 | Yes |
| 3.2 — Gmail tool executors (search, draft, send) | 2.6, 3.1 | No |
| 3.3 — Email scan cron | 3.1 | No |
| 3.4 — Google Calendar client | 0.4, 0.7 | Yes |
| 3.5 — Calendar tool executors (get events, create, find availability) | 2.6, 3.4 | No |
| 3.6 — Calendar sync cron | 3.4 | No |
| 3.7 — iMessage client (helper app interface) | 0.4 | Yes |
| 3.8 — Text tool executors (search texts) | 2.6, 3.7 | No |
| 3.9 — Integration health tracking | 0.4 | Yes |
| 3.10 — Progressive OAuth scope requests | 0.7, 3.1 | No |
| 3.11 — Contact auto-creation from email/calendar (shadow records, entity resolution) | 3.3, 3.6, 2.8 | No |

**Parallel strategy:** 3.1, 3.4, 3.7, 3.9 in parallel. Then their dependents. 3.11 after email/calendar scans are working.

**Verification:**
- Email search and drafting works
- Calendar shows events, can create new ones
- Integration health tracked and displayed
- Shadow contacts auto-created from emails and calendar attendees

---

## Phase 4: Memory System

**What:** Memory extraction, retrieval, procedural triggers, rolling context summary.
**Why fifth:** Needs working chat + integrations to have content to extract memories from.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 4.1 — Embedding pipeline (OpenAI via OpenRouter) | 0.2 | Yes |
| 4.2 — Memory extraction (async, post-response) | Phase 1, 4.1 | No |
| 4.3 — Semantic memory retrieval (vector + entity + recency + RRF) | 0.4, 4.1 | Yes |
| 4.4 — Episodic memory retrieval | 0.4, 4.1 | Yes |
| 4.5 — Procedural memory trigger matching | 0.4 | Yes |
| 4.6 — LLM recall gating | 4.3 | No |
| 4.7 — Rolling context summary (generation + refresh) | Phase 1 | Yes |
| 4.8 — Message embedding (async, for conversation history RAG) | 4.1 | Yes |
| 4.9 — search_conversation_history tool executor | 4.8 | No |
| 4.10 — Embed cron (batch embed unembedded messages + docs) | 4.1, 4.8 | No |
| 4.11 — Contradiction detection cron | 4.3 | No |
| 4.12 — Wire memories into context loader + prompt builder | 4.2–4.6, Phase 2 | No |

**Parallel strategy:** 4.1, 4.3, 4.4, 4.5, 4.7, 4.8 in parallel. Then wire them together.

**Verification:**
- Memories extracted after messages
- Memory retrieval returns relevant results
- Procedural triggers fire correctly
- Rolling summary generates and refreshes
- Contradiction detection runs without errors

---

## Phase 5: Expert System

**What:** Expert creation, activation modes, Tier 1/Tier 2 context loading, Expert Drift UI.
**Why sixth:** Needs memory and context loading from Phase 4.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 5.1 — Expert CRUD API routes | Phase 0 | Yes |
| 5.2 — Expert activation (direct mode) | 5.1 | No |
| 5.3 — Expert ambient confidence tracking | 5.1, Phase 2 | No |
| 5.4 — Expert Tier 1 context loading | 5.1, Phase 4 | No |
| 5.5 — Expert Tier 2 retrieval | 5.1, Phase 4 | No |
| 5.6 — Ambient → Active transition (offer flow) | 5.3 | No |
| 5.7 — Expert Drift UI (color tinting, SSE events) | 5.3, Phase 1 | Yes |
| 5.8 — Expert sidebar UI (list, activation, management) | 5.1, Phase 0 | Yes |
| 5.9 — Expert overnight research (knowledge gap detection + Perplexity) | 5.1, Phase 3 | No |
| 5.10 — Wire Expert context into prompt builder | 5.4, 5.5, Phase 2 | No |

**Verification:**
- Create Expert, activate it, see Tier 1 context loaded
- Expert Drift color tinting works in chat
- Ambient detection activates from conversation content
- Overnight research generates findings

---

## Phase 6: Proactive Messaging + Notifications

**What:** Briefings, nudges, heads-ups, living greeting, push notifications.
**Why seventh:** Needs integrations (email, calendar) and memory for content generation.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 6.1 — Briefing generation | Phase 3, Phase 4 | Yes |
| 6.2 — Nudge generation + escalation | Phase 2 (tasks) | Yes |
| 6.3 — Living greeting | Phase 4 (summary, memories) | Yes |
| 6.4 — Proactive outbox (dedup) | 0.4 | Yes |
| 6.5 — Push notification delivery (Expo + Web Push) | 0.4, 0.9 | Yes |
| 6.6 — 3-minute batch window | 6.5 | No |
| 6.7 — Quiet hours + breakthrough rules | 0.4 | Yes |
| 6.8 — Briefing cron | 6.1, 6.4, 6.5 | No |
| 6.9 — Nudge cron | 6.2, 6.4, 6.5 | No |
| 6.10 — Deep linking (mobile notification → specific message) | 0.9, 6.5 | No |

**Verification:**
- Morning briefing generates and appears in timeline
- Nudges fire with escalation
- Push notifications arrive on phone
- Quiet hours hold notifications
- Breakthrough rules bypass quiet hours

---

## Phase 7: Document Pipeline + RAG

**What:** Document upload, chunking, embedding, search, artifacts.
**Why eighth:** Needs embedding pipeline from Phase 4.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 7.1 — Document upload route + Supabase Storage | Phase 0 | Yes |
| 7.2 — PDF text extraction (unpdf + Gemini OCR fallback) | 0.2 | Yes |
| 7.3 — Document chunking | 0.2 | Yes |
| 7.4 — Document embedding | 4.1 | No |
| 7.5 — Document search (vector + reranking) | 7.4 | No |
| 7.6 — Documents page UI (list, upload, search bar, filter) | Phase 0 | Yes |
| 7.7 — Artifact creation + management | 0.4 | Yes |
| 7.8 — Artifact sidebar UI | Phase 0 | Yes |
| 7.9 — Server-side artifact pre-execution | 7.7, Phase 2 | No |

**Verification:**
- Upload a PDF, see it chunked and embedded
- Search returns relevant document chunks
- Artifacts create and display in sidebar

---

## Phase 8: Dashboard + Background Jobs

**What:** Dashboard widgets, overnight builder, background job system.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 8.1 — Background job dispatcher | 0.4 | Yes |
| 8.2 — Job queue helpers (queue, cancel, status) | 8.1 | No |
| 8.3 — Deep research executor (Perplexity) | 8.1, Phase 3 | Yes |
| 8.4 — Dashboard collapsible UI | Phase 0 | Yes |
| 8.5 — Widget rendering (component library) | 8.4 | No |
| 8.6 — Widget data refresh (polling, staggered) | 8.5 | No |
| 8.7 — Overnight builder | 8.1, Phase 4 | No |
| 8.8 — Jobs cron (dispatcher, hung job detection) | 8.1 | No |
| 8.9 — Overnight cron | 8.7, Phase 5 | No |

**Verification:**
- Background jobs queue, dispatch, and complete successfully
- Deep research produces artifacts
- Dashboard renders with widgets, collapses/expands
- Widget data refreshes on schedule
- Overnight builder proposes widgets (status = 'proposed'), user can approve
- Jobs cron detects and kills hung jobs

---

## Phase 9: Settings + Activity Log + Remaining UI

**What:** Settings page, activity log, contacts UI, watches UI, onboarding.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 9.1 — Settings page (all 6 tabs) | Phase 0 | Yes |
| 9.2 — Activity log tab + API route | 0.4 | Yes |
| 9.3 — Contacts side panel | Phase 2 | Yes |
| 9.4 — Notepad sidebar tab | Phase 2 | Yes |
| 9.5 — Onboarding conversational flow | Phase 0, Phase 3 | No |
| 9.6 — Error handling UI (status banners, reconnect flow) | Phase 3 | Yes |
| 9.7 — Watches/monitors UI (if dedicated view exists). Note: monitors are a watch variant with `watch_type = 'monitor'`, persistent triggers, and repeat-fire behavior. | Phase 2 | Yes |
| 9.8 — Contact promotion cron + alias resolution | 3.11, Phase 4 | No |
| 9.9 — Memory management UI (view, edit, delete memories) | Phase 4 | Yes |

**Verification:**
- Settings page renders all tabs, changes persist and reflect in chat behavior
- Activity log shows cron runs, tool calls, router decisions with correct timestamps
- Contacts side panel displays promoted contacts, search works, edit/delete works
- Notepad shows entries filtered by Expert
- Onboarding flow runs end-to-end (greeting, email connect, calendar connect, wow moment)
- Error banners appear for degraded integrations, reconnect flow works
- Memory management UI shows all memory types, edit/delete works

---

## Phase 10: Polish + QA + Mobile Parity

**What:** Mobile feature parity, cross-device testing, performance optimization, style guide, accessibility audit.

### Tasks

| Task | Depends on | Parallelizable |
|---|---|---|
| 10.1 — Mobile feature parity (all screens matching web) | All phases | No |
| 10.2 — Style guide creation | Phase 0 | Yes |
| 10.3 — Accessibility audit (WCAG 2.1 AA) | All UI phases | No |
| 10.4 — Performance optimization (bundle size, load time) | All phases | No |
| 10.5 — App manual seeding (RAG-embedded feature docs) | All phases | No |
| 10.6 — End-to-end QA (all user flows) | All phases | No |

---

## Agent Parallelization Strategy

For each phase, the "Parallelizable = Yes" tasks can be assigned to separate agents running simultaneously. Each agent gets:

1. **The architecture specs** (relevant to their task)
2. **The shared types** (interface contracts they must conform to)
3. **The product spec** (feature requirements)
4. **A clear output target** (file paths, function signatures, expected behavior)

### Agent isolation rules
- Each agent works in its own files (no two agents editing the same file)
- Shared types are read-only during agent execution (defined upfront in Phase 0)
- Integration points are defined by types, not by reading each other's code
- After parallel tasks complete, a sequential "wiring" task connects the pieces

### Example: Phase 2 parallelization

```
Agent A: Tool definitions (all schemas)          → src/lib/chat/tools/definitions/
Agent B: Tool executors: tasks                   → src/lib/chat/tools/executors/tasks.ts
Agent C: Tool executors: contacts                → src/lib/chat/tools/executors/contacts.ts
Agent D: Tool executors: artifacts + notepad     → src/lib/chat/tools/executors/artifacts.ts
Agent E: Tool executors: web search              → src/lib/chat/tools/executors/web-search.ts
Agent F: Tool executors: system tools            → src/lib/chat/tools/executors/system.ts
Agent G: Specialist definitions                  → src/lib/specialists/definitions/
Agent H: Regex fallback classifier               → src/lib/ai/router-fallback.ts
Agent I: Card track rendering (UI)               → src/components/chat/card-tracks/

── then sequentially ──
Agent J: Router implementation                   → src/lib/ai/router.ts
Agent K: Specialist resolver                     → src/lib/specialists/registry.ts
Agent L: Context loader                          → src/lib/chat/context-loader.ts
Agent M: Prompt builder                          → src/lib/ai/prompt/builder.ts
Agent N: Wire into chat route                    → src/app/api/chat/route.ts
```

---

## Success Criteria

Each phase is complete when:
1. `pnpm turbo build` passes
2. `pnpm turbo typecheck` passes
3. `pnpm turbo lint` passes
4. Phase-specific verification checks pass (listed in each phase)
5. No regressions in previous phases

---

## Summary

| Phase | Description | Key dependency |
|---|---|---|
| 0 | Foundation (monorepo, DB, auth, shell) | Nothing |
| 1 | Chat core (streaming, messages) | Phase 0 |
| 2 | Router + specialists + tools | Phase 1 |
| 3 | Integrations (Gmail, Calendar, iMessage) | Phase 2 |
| 4 | Memory system (extraction, retrieval, summary) | Phase 1 |
| 5 | Expert system (activation, Tier 1/2, drift) | Phase 4 |
| 6 | Proactive messaging + notifications | Phase 3, 4 |
| 7 | Document pipeline + RAG | Phase 4 |
| 8 | Dashboard + background jobs | Phase 4, 5 |
| 9 | Settings + activity log + remaining UI | Phase 0+ |
| 10 | Polish + QA + mobile parity | All |

**Note:** Phases 3, 4, and 7 can partially overlap since they have different dependency chains. Phases 6, 7, 8, 9 can all run in parallel once their dependencies are met.

---

## Explicitly Post-v2.0

These features are fully spec'd in the product docs but NOT scheduled for the v2.0 build. Do not implement them during this build cycle:

- **Training & Learning** (TRAINING-LEARNING.md) — engagement tracking, behavioral signal capture, quiz sessions, confidence-based learning pipeline. The `training_signals` table is created in Phase 0 (schema), but the observation pipeline and quiz system are post-launch. Memory extraction (Phase 4) covers the core learning loop for v2.0.
- **Silo marketplace + custom builder** (SILOS.md) — pre-built templates and user-created silos via agentic builder. Core silos (email, calendar, tasks, etc.) ship as specialists in Phase 2. Marketplace and custom builder are growth features.
- **Trust escalation** (CONSTITUTION.md) — bypass confirmation mode for trusted external actions. v2.0 always confirms external actions.
- **Contact full/private mode** (CONSTITUTION.md) — user choice on contact intelligence depth. v2.0 ships with full mode (single user).
