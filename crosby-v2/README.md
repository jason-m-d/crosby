# Crosby v2 — Research & Planning Hub

This folder contains all research, thinking, and planning for a ground-up rebuild of Crosby. Nothing here is code. It's a living workspace that Claude Code maintains and organizes.

---

## How This Folder Works

Claude Code is responsible for keeping this folder organized. Here's the system:

### Folder Structure

```
crosby-v2/
├── README.md              ← this file, always current
├── OVERVIEW.md            ← high-level vision, core principles, what we're building and why
├── research/              ← external research reports, competitive analysis, reference material
│   └── [topic].md
├── product/               ← product discovery: features, flows, UX decisions
│   └── FEATURES.md        ← master feature inventory (living doc)
├── decisions/             ← key architectural and product decisions, with rationale
│   └── [topic].md
├── architecture/          ← technical design: data model, system design, AI pipeline, etc.
│   └── [topic].md
└── features/              ← individual feature specs and thinking
    └── [feature-name].md
```

### How Claude Maintains This

- When Jason shares research, adds ideas, or gives feedback, Claude files it in the right place.
- New documents go in the most specific applicable subfolder.
- `OVERVIEW.md` is updated whenever the core direction shifts.
- `README.md` (this file) stays current with the file index.
- Claude does not ask "where should I put this" — it decides and files it.

### File Index

| File | Summary | Last Updated |
|------|---------|--------------|
| OVERVIEW.md | Core vision and principles for v2 | 2026-03-23 |
| product/FEATURES.md | Master feature inventory — 17 features with descriptions, open questions, discovery notes | 2026-03-23 |
| product/EXPERTS.md | Expert/project workspace model — two access modes, context loading hierarchy, lifecycle, Experts vs. Contacts distinction | 2026-03-23 |
| product/CHAT-TIMELINE.md | Chat timeline model — mixed-content timeline, content types and visual treatments, inline interactive cards | 2026-03-23 |
| product/APP-STRUCTURE.md | App structure — 3 default pages (Chat, Documents, Settings), what lives inside Crosby vs. nav, "Crosby edits its own UI" concept | 2026-03-23 |
| product/EMAIL-MANAGEMENT.md | Email management — full inbox scanning, auto-task creation, inline drafting with send-to-Gmail, always-watching notification model, ripple effects across tasks/watches/contacts/notifications | 2026-03-23 |
| product/CALENDAR-INTEGRATION.md | Calendar integration — confirmation cards for event creation, pre-meeting prep (briefing + session open + push), own-calendar-only for now, ripple effects across contacts/tasks/email/experts | 2026-03-23 |
| product/WATCHES-MONITORS.md | Watches & monitors — auto-creation from context, resolution with context + follow-up, watch vs monitor distinction, staleness escalation, ripple effects | 2026-03-23 |
| product/BRIEFINGS-NUDGES.md | Briefings & nudges — scheduled briefings (morning/afternoon/evening), timer-based + event-driven nudges, distinction table, notification batching, learning from dismissals | 2026-03-23 |
| product/TASKS-COMMITMENTS.md | Tasks & commitments — same system with behavioral distinction, commitment = higher accountability/faster escalation, decision tracking (quiet capture, drift detection, pattern recognition) | 2026-03-23 |
| product/ARTIFACTS.md | Artifacts — Crosby-created documents, side panel display, two-way editing, interactive elements, Expert integration, Documents vs Artifacts distinction | 2026-03-23 |
| product/PROACTIVE-MESSAGES.md | Proactive messages taxonomy — briefings, nudges, heads-ups, catch-ups; anti-overwhelm principle, escalation model, absorption/grouping rules, dedup | 2026-03-23 |
| product/PERSISTENT-MEMORY.md | Persistent memory — four-type model (semantic/episodic/procedural/working), async extraction, hybrid retrieval with RRF + LLM gating, retrieval-time Expert boosting, living mutable greeting, contradiction handling with supersession, email stays in own DB, hover-to-save, known failure modes | 2026-03-23 |
| product/CONTACTS-ENTITY-RESOLUTION.md | Contacts & entity resolution — two-tier contact model (shadow + promoted), layered entity resolution, role aliases, queryable graph, chat-native UI with side panel browse, ripple effects across email/calendar/memory/watches/experts | 2026-03-24 |
| product/NOTEPAD.md | Notepad — Crosby's visible working memory, sidebar tab alongside Artifacts + Contacts, Crosby-set expiry, Expert-tagged, "noted" indicator in timeline, classification rules for memory vs notepad | 2026-03-24 |
| product/TRAINING-LEARNING.md | Training & learning — all-signal observation, procedural memory with confidence model, uncertainty-driven quiz sessions, quiet vs announced changes, settings visibility | 2026-03-24 |
| product/DASHBOARD-OVERNIGHT-BUILDER.md | Dashboard & overnight builder — collapsible canvas above chat, component library widgets, Expert-aware reordering, 3 creation paths, 2-week pattern threshold, max 2 overnight builds, always-approve, soft-delete with spec retention | 2026-03-24 |
| product/WEB-SEARCH-DEEP-RESEARCH.md | Web search & deep research — all search via Perplexity (Sonnet never has web search), quick inline + background deep research, reports as artifacts with RAG, three delivery modes by user state | 2026-03-24 |
| product/STRUCTURED-QUESTIONS.md | Structured questions & quick confirms — two levels (timeline cards for clarification + input area chips for confirms), confidence-based asking, per-user learning, chaining, Q&A resolution format | 2026-03-24 |
| product/MOBILE-EXPERIENCE.md | Mobile experience — React Native + Expo native iOS app, monorepo with web, bottom nav, split-view sidebar, rich contextual push notifications, deep linking to specific messages | 2026-03-24 |
| product/APP-MANUAL.md | Self-aware app manual — RAG-embedded internal docs, one doc per feature area, auto-generated on deploy, source of truth for capability questions, system prompt defers to manual | 2026-03-24 |
| product/NOTIFICATIONS.md | Notifications system — no notification center (timeline is inbox), 3 delivery tiers (immediate/batched/held), 3-min batching, quiet hours with breakthrough rules, rich push content, per-category settings | 2026-03-24 |
| product/TEXT-SMS.md | Text/SMS integration — optional power-user feature, macOS helper app, guided setup wizard, read-only iMessage monitoring, context + commitments, graceful degradation | 2026-03-24 |
| product/ONBOARDING.md | Onboarding / cold start — amber threshold screen, progressive UI reveal, two-path first message (connected vs skipped), pre-auth OAuth offer, conversational onboard, email "wow" moment, completeness score, silent graduation | 2026-03-25 |
| product/SETTINGS.md | Settings page — 5 tab groups (Account, Connections, Notifications, Memory & Learning, Preferences), everything also configurable via chat, read-mostly design | 2026-03-24 |
| product/SILOS.md | Silos — capability modules (tools, data connections, sync, prompt context). Three tiers: core/marketplace/custom. Agentic builder, cross-silo tunnels, self-healing, credential management | 2026-03-24 |
| product/ERROR-HANDLING-GRACEFUL-DEGRADATION.md | Error handling & graceful degradation — status banner for AI outages, per-integration health model (healthy/degraded/down), 2-retry policy, stale data mentions the issue, backfill on reconnect, partial degradation matrix | 2026-03-25 |
| product/CONVERSATION-CONTINUITY.md | Conversation continuity & history — three-layer context system (rolling summary + message RAG + memory), system prompt routing rules for which layer answers which question, session-transparent continuity | 2026-03-25 |
| product/ACTIVITY-LOG.md | Activity log & diagnostics — user-visible log in Settings showing cron runs, background jobs, router decisions, errors, proactive message decisions, integration health. Crosby can self-query via tool. 90-day retention | 2026-03-25 |
| product/BACKGROUND-JOBS.md | Background jobs — heavy vs lightweight categorization, max 3 concurrent heavy jobs, 5-min/30-sec timeouts, queue with priority (user > system), pause/cancel, cancellation UX | 2026-03-25 |
| product/ROUTER.md | Router — fast cheap LLM classification on every message, confidence scoring, specialist/Expert activation, fallback chain (timeout → regex → core-only), self-correction logging, performance targets | 2026-03-25 |
| product/EXPERT-CONTEXT-LOADING.md | Expert context loading — percentage-based token budgets, priority stack, Tier 1/Tier 2 mechanics, four invocation modes (direct/ambient/transition/deactivation), multi-Expert, overnight self-improvement research | 2026-03-25 |
| product/AUTH-ACCOUNT.md | Authentication & account management — Supabase Auth, Google OAuth preferred path, progressive scope requests, biometric unlock on mobile, persistent sessions, no team/SSO/2FA for v2 | 2026-03-25 |
| product/INLINE-CARDS.md | Inline cards — 4 card categories (receipt, proactive, interactive, progress), component specs, visual treatments, grid/list layout rules, shrink-after-time receipts, SSE event types, training signals, accessibility | 2026-03-25 |
| product/GAPS-AND-CONTRADICTIONS.md | Audit results — gaps, contradictions, and open items across all specs, prioritized and tracked for resolution | 2026-03-25 |
| product/DISCOVERY-STATUS.md | Product discovery status — completed areas, current discussion, outstanding feature areas, key decisions made | 2026-03-25 |
| research/llm-architecture-best-practices-2026-gemini.md | Gemini research report: system prompt architecture, tool design, context management, routing, observability, streaming/error handling | 2026-03-23 |
| research/llm-architecture-best-practices-2026-perplexity.md | Perplexity research report: same topics, with specific tool/provider recommendations (Exa, LiteLLM, Langfuse, Vercel AI SDK 6, semantic tool retrieval) | 2026-03-23 |
| research/nextjs-realtime-architecture-2026-perplexity.md | Perplexity report: streaming (Vercel AI SDK 6), real-time (Supabase Realtime), background jobs (Inngest), codebase structure, Vercel Fluid Compute | 2026-03-23 |
| research/nextjs-realtime-architecture-2026-gemini.md | Gemini report: same topics, with ReAct framework framing, memory tiering, TanStack Virtual, hybrid Vercel+Railway deployment | 2026-03-23 |
| research/database-design-data-sync-2026-perplexity.md | Perplexity report: three-layer data model, entity resolution, conversation schema with context_snapshots, Gmail Pub/Sub sync, calendar syncToken, hybrid RAG with ParadeDB, reranking, Supabase vs Neon/Pinecone | 2026-03-23 |
| research/database-design-data-sync-2026-gemini.md | Gemini report: same topics, with four-tier data model (including graph tier), "Memory Ladder" for conversation history, agentic loop observability, RLS optimization patterns | 2026-03-23 |
| research/plugin-silo-systems-2026-perplexity.md | Perplexity report: MCP as de facto standard (USB-C for AI), silo manifest schema, OAuth-as-a-service (Nango/Composio comparison), Hookdeck webhook ingestion, RLS multi-tenancy, token vault with envelope encryption, security risks (tool poisoning, prompt injection) | 2026-03-23 |
| research/plugin-silo-systems-2026-gemini.md | Gemini report: same topics, with MCP Apps extension (SEP-1865, interactive iframe UIs), Double Hop Tax + Context Window Bloat problems, UTCP as alternative, Progressive Discovery for tool schemas, OAuth 2.1 + PKCE for remote MCP, Nango/Scalekit for OAuth-as-a-Service, multi-tenant Pool/Bridge/Silo models | 2026-03-23 |
| research/testing-qa-strategy-2026-perplexity.md | Perplexity report: DeepEval ToolCorrectnessMetric, behavioral property assertions, LLM-as-judge scoring, shadow evaluation, Langfuse self-hosted stack, implicit failure signals (repetition/correction/abandonment detection), 4-phase implementation roadmap | 2026-03-23 |
| research/testing-qa-strategy-2026-perplexity-v2.md | Perplexity report (second, longer version): three-tier tool verification (structural/logical/semantic), taxonomy of invisible failures (Confidence Trap/Death Spiral/Walkaway/Partial Recovery), Reflexion Pattern for self-correction, Rhesis AI "Penelope Agent" for conversational testing, EU AI Act compliance requirements | 2026-03-23 |
| research/infinite-conversation-memory-2026-perplexity.md | Perplexity report: TiMem 5-level temporal hierarchy (segment→session→day→week→profile), Zep/Graphiti temporal knowledge graph, MemOS MemCube architecture, four-tier memory model (working/episodic/semantic/procedural), RRF hybrid retrieval, supersession-based contradiction handling, XML context injection format, gap-aware greeting UX patterns, Nemori episodic indexing, mem0 + Inngest implementation roadmap | 2026-03-23 |
| SOUL-v2.md | **Canonical soul doc for v2.** Voice references (Bourdain, Fey, Letterman), calibration scenarios, anti-traits, prompt engineering rules (12 rules). Supersedes v1 SOUL.md. | 2026-03-25 |
| product/PRODUCT-VISION.md | Original product vision doc (copied from project root). North star: silos, overnight builder, consumer product direction, competitive landscape, phased roadmap. Individual product specs supersede when in conflict. | 2026-03-25 |
| features/EXPERT-DRIFT.md | Expert Drift — ambient expert activation via color tinting, confidence-to-opacity mapping, inline chapter markers, activation/deactivation flow, implementation phases | 2026-03-25 |
| features/DATA-DELETION-PRIVACY.md | Data deletion & privacy model — deletion cascades by entity type, retention policies, account deletion, tombstones, design rationale | 2026-03-25 |
| research/proactive-ai-behavior-2026.md | Research report: four-gate interruption model, ChatGPT Pulse + Gemini Personal Intelligence analysis, CHI 2025 findings on notification fatigue, four-tier trigger taxonomy (interrupt/session/digest/log), sleep-time compute architecture (Letta), "should I send?" LLM judge pattern, deduplication/cooldown mechanisms, executive assistant proactive communication patterns, 8 specific takeaways for Crosby v2 | 2026-03-23 |
| research/contact-relationship-graph-2026.md | Research report: personal CRM graph architecture (Postgres vs Neo4j), entity resolution across channels (deterministic + probabilistic matching), contact card injection format for LLMs, temporal fact model (Zep/Graphiti pattern), staleness policy, production examples (Clay, Attio, Folk, Superhuman, Zep), disambiguation UX patterns, 8 actionable Crosby v2 takeaways | 2026-03-23 |
| architecture/MONOREPO-STRUCTURE.md | Monorepo architecture — pnpm + Turborepo, apps/web (Next.js) + apps/mobile (Expo RN) + packages/shared + packages/api-client + packages/supabase. Folder layout, API routes, cron consolidation, lib organization, deployment strategy | 2026-03-25 |
| architecture/DATABASE-SCHEMA.md | Database schema — all tables with columns, indexes, RLS policies, RPC functions. Covers messages, 3-type memory, experts, tasks, contacts, watches, documents, artifacts, email, calendar, texts, jobs, activity log, dashboard, silos, notifications | 2026-03-25 |
| architecture/AUTH-SESSION.md | Auth & session architecture — Supabase Auth setup, OAuth flows, progressive scopes, session management (web cookies, mobile Keychain + biometrics), middleware, cron auth, mobile API client auth | 2026-03-25 |
| architecture/API-ROUTES.md | API route map — every endpoint with method, auth, description. Chat route pipeline detail. SSE event format. Cron consolidation (12→8). Rate limiting. Error handling patterns | 2026-03-25 |
| architecture/AI-PIPELINE.md | AI pipeline — full implementation detail for Router → Context Assembly → Prompt Build → LLM Stream → Tool Loop → Post-Response. Code examples for each stage. Memory retrieval (hybrid RRF). Tool registry. Model configs. Limits. Observability | 2026-03-25 |
| architecture/SYSTEM-PROMPT.md | System prompt architecture — dynamic assembly from modular sections, cached prefix + dynamic suffix, specialist section templates with {{placeholders}}, data block formatters, placeholder validation, token budget management | 2026-03-25 |
| architecture/BACKGROUND-JOBS.md | Background jobs & cron — DB-queue dispatcher, heavy/lightweight dispatch, job executors, cron route implementations (email scan, briefing, overnight), preemption logic, job cleanup | 2026-03-25 |
| architecture/REALTIME-NOTIFICATIONS.md | Real-time & notifications — Expo push (iOS), Web Push, 3-min batch window, Supabase Realtime channels (messages, experts, health), deep linking, breakthrough rule checking | 2026-03-25 |
| architecture/SHARED-TYPES.md | Shared types & interface contracts — all TypeScript types for chat, router, specialists, experts, memory, jobs, tools, notifications, activity log. Import from @crosby/shared | 2026-03-25 |
| architecture/BUILD-PLAN.md | Build plan — 11 phases (0-10), dependency graph, parallel agent strategy per phase, verification criteria. Foundation → Chat → Router/Tools → Integrations → Memory → Experts → Proactive → Docs → Dashboard → Settings → Polish | 2026-03-25 |
| architecture/STYLE-GUIDE-PLAN.md | Style guide plan — 7 design philosophies, 5-phase process, research tracker, tool usage plan, design system deliverables checklist, CLAUDE.md integration plan | 2026-03-25 |
| architecture/DESIGN-DIRECTION.md | Design direction synthesis — aesthetic identity, color/type/layout/motion/component direction, 48 design signals from 13 inspiration screenshots + 9 research reports, open questions for Phase 2 | 2026-03-25 |
| architecture/STYLE-GUIDE-v2.md | Production style guide — locked build reference. Colors (CSS custom properties + Tailwind), typography (4 registers, fluid scale), spacing (4px grid), borders/radius (per-element), components (exact class patterns), motion (CSS + spring values), icons, accessibility, never-do list | 2026-03-25 |
| research/conversation-ui-ux-persistent-memory-2026.md | Research report: UI/UX patterns for persistent-memory AI relationships — Pi, Replika, Nomi, Claude, ChatGPT analysis; continuous conversation design (history navigation, virtual rendering, chapter anchors); chat-beyond-bubbles patterns; mobile-first input models; proactive ambient UI (morning brief pattern); memory browser trade-offs; dark-theme visual design direction; 8 actionable takeaways for Crosby v2 | 2026-03-23 |
| research/dark-ui-design-systems-2026.md | Perplexity report: premium dark UI analysis (Linear, Vercel, Raycast, Arc, Warp, Notion, Obsidian, Things 3) — color temperature, surface elevation, accent restraint, text hierarchy, translucency | 2026-03-25 |
| research/confident-minimalism-design-language-2026.md | Perplexity report: intersection of brutalist confidence + premium refinement — typography, surface treatment, color restraint, spacing philosophy, 8pt grid | 2026-03-25 |
| research/animation-microinteraction-professional-apps-2026.md | Perplexity report: animation in Linear, Vercel, Raycast, Arc, Things 3, Stripe, Apple — spring physics, duration tiers, entrance/exit patterns, specific CSS/spring values | 2026-03-25 |
| research/animation-dark-mode-productivity-tools-2026.md | Perplexity report: motion patterns in dark-mode productivity/AI tools — duration scale, easing functions, purposeful vs delight motion, per-app analysis | 2026-03-25 |
| research/typography-ai-chat-interfaces-2026.md | Perplexity report: typography in ChatGPT, Claude, Perplexity, Cursor, Copilot — font choices, streaming rendering, markdown fidelity, code blocks, tool result visualization | 2026-03-25 |
| research/variable-fonts-production-apps-2026.md | Perplexity report: variable fonts in Linear, Vercel, GitHub, Google — dark mode weight compensation, GRAD axis, characterful font recommendations | 2026-03-25 |
| research/fluid-typography-spacing-nextjs-tailwind-2026.md | Perplexity report: clamp() math, fluid type scales, Tailwind integration, container queries, practical code patterns | 2026-03-25 |
| research/dark-mode-surface-layering-2026.md | Perplexity report: surface elevation without borders — luminance stacking, opacity-based borders, shadow calibration for dark mode | 2026-03-25 |
| research/ai-design-tooling-mcps-2026.md | Perplexity report: MCP servers for design (Playwright, shadcn/ui, UX, frontend-review, AINative Design System), accessibility CLIs, font tools | 2026-03-25 |
| research/claude-code-build-guide-perplexity.md | Perplexity deep research: Claude Code best practices for large monorepo builds — agent orchestration, context management, CLAUDE.md architecture, RN guardrails, quality gates. Includes our corrections (subagent context, AO assessment) | 2026-03-25 |
| research/subagent-context-research.md | Research: how Claude Code subagents inherit context — fresh window, no conversation history, CLAUDE.md/memory/MCP auto-loaded, known bugs | 2026-03-25 |
| research/agent-orchestrator-research.md | Research: @composio/ao — v0.2.0, worktree-per-agent, 5.4K stars, stability concerns, comparison with built-in subagents and Agent Teams | 2026-03-25 |
| architecture/PRE-BUILD-CHECKLIST.md | Pre-build checklist — every install, auth, config, and decision needed before launch. MCP audit results, missing tools, decision points | 2026-03-25 |
| architecture/AGENT-STRATEGY.md | Agent strategy — how to use subagents, Agent Teams, and AO across 10 phases. Rules for delegation, drift prevention, context budgets | 2026-03-25 |
| architecture/SLASH-COMMANDS-DRAFT.md | Slash command drafts for v2 build — /catchup, /log-phase, /verify, /delegate, /status | 2026-03-25 |
| architecture/BUILD-STATE-TEMPLATE.md | Template for .claude/build-state.md — phase tracking, locked decisions, learnings, interface contracts, active worktrees | 2026-03-25 |
| architecture/AGENT-DEFINITIONS.md | 6 custom agent definitions — web-builder, mobile-builder, api-builder, reviewer, integration-tester, researcher. Full frontmatter + system prompts ready for .claude/agents/ | 2026-03-25 |
| architecture/TOKEN-BUDGET-ANALYSIS.md | Worst-case token math for system prompt + context assembly. Typical ~30K, worst case ~56K, leaves ~94K+ for response. Budget is safe. | 2026-03-25 |
| architecture/ROUTER-EVAL-PLAN.md | Router test suite — 100+ test cases across 13 specialist domains, multi-intent, edge cases, Expert-dependent cases. Scoring targets: 90%+ accuracy, <200ms p50 latency | 2026-03-25 |
| architecture/PROCEDURAL-MEMORIES.md | Procedural memory trigger format + matching algorithm. Natural language triggers, two-stage matching (embedding pre-filter + LLM injection), confidence scoring, extraction pipeline | 2026-03-25 |
| architecture/CONTRADICTION-DETECTION.md | Memory contradiction detection algorithm. Candidate ID (entity + embedding + topic), LLM check (Gemini Flash Lite), supersession rules, inline + weekly cron detection | 2026-03-25 |
| architecture/CONSTITUTION.md | Crosby's behavioral principles & guardrails — privacy, action boundaries, harmful requests, accuracy/uncertainty, multi-person awareness. Every principle must be enforced in code. | 2026-03-25 |
| review-findings.md | Pre-build review findings — Round 1 (5 blockers, all fixed) + Round 2 (2 blockers, 6 warnings). Status tracker for plan checker results. | 2026-03-25 |

*(Claude updates this table as files are added or changed)*

---

## Current Status

**Phase: Docs Locked — Pre-Build Infra Remaining**

Product discovery complete (25 feature specs). Architecture locked (20 docs). Design system locked. Build plan locked (11 phases + post-v2.0 list). Agent strategy locked (6 custom agents). Constitution written. Soul doc finalized. System prompt rewritten. Two rounds of plan-checker review passed — all blockers fixed.

**Remaining before Phase 0:**
- Pre-build checklist infra items (Turborepo, new Supabase project, new Vercel project, MCP auth, env vars)
- See `architecture/PRE-BUILD-CHECKLIST.md` for the full list
