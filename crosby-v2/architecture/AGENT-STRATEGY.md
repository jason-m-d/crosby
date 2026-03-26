# Agent Strategy for v2 Build

How we'll use Claude Code's agent capabilities across the 10-phase build.

## The Three Agent Primitives Available

### 1. Subagents (Built-in Agent Tool)
- Spawned from the main Claude Code session
- Start with **fresh context** — no conversation history from parent
- Inherit CLAUDE.md, memory files, MCP servers, permissions automatically
- Parent must include everything else in the prompt string
- Can run with `isolation: "worktree"` for git-isolated work
- **Stable, production-ready**

**Best for:** Independent implementation tasks within a phase, research/exploration, parallel file creation where outputs don't depend on each other.

### 2. Agent Teams (Experimental)
- Multiple full Claude Code sessions with shared task list
- Teammates can message each other directly (peer-to-peer)
- Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`
- Costs significantly more tokens (each teammate = full session)
- **Experimental — not recommended for the build**

**Best for:** Tasks where agents genuinely need to negotiate with each other in real-time. We probably don't need this.

### 3. Agent Orchestrator (@composio/ao)
- External tool, each agent gets own git worktree + branch + PR
- Web dashboard for monitoring
- Agents can't communicate during work — conflicts surface at merge time
- Requires tmux
- **v0.2.0, actively developed but still rough**

**Best for:** Post-foundation parallelization where each chunk is a clean PR. Individual page UIs, individual silo implementations, individual API route groups.

## Recommended Strategy Per Phase

**NOTE:** Phase numbering matches BUILD-PLAN.md (Phases 0-10).

### Phase 0: Foundation (SERIAL — lead only)
**Agents used:** Lead session only. Researcher for doc lookups.

This phase defines the contracts everything else depends on:
- Monorepo scaffolding (pnpm workspaces, turbo.json, tsconfigs)
- Shared type definitions (API contracts, DB types, AI types)
- Supabase schema + migrations
- App shells for both web and mobile
- Auth flow
- Metro config, Nativewind config

**Why serial:** Every subsequent phase imports from these packages. Getting this wrong cascades everywhere. Not worth the risk of parallel drift.

**`/clear` after this phase.** Foundation generates a lot of context.

### Phase 1: Chat Core (3 PARALLEL AGENTS)
**Agents used:** api-builder, web-builder, mobile-builder (parallel). Reviewer after.

- **api-builder:** Chat API route, streaming, OpenRouter client, message storage, session management
- **web-builder:** Chat page UI, message list, input, streaming display
- **mobile-builder:** Chat screen UI, same features, native components

**Coordination:** api-builder starts first (needs 1-2 hours head start for route types). Then web-builder and mobile-builder work in parallel consuming those types. All three share types from packages/shared.

**`/clear` after this phase.**

### Phase 2: Router + Specialists + Tools (MOSTLY SERIAL with parallel bursts)
**Agents used:** Lead for router/wiring. api-builder for tool executors (parallel burst). web-builder for card rendering.

The router, specialist registry, and prompt builder are tightly coupled — lead builds these serially. But tool executors are independent and can be parallelized:

- **Lead:** Router → specialist resolver → context loader → prompt builder → wiring
- **Parallel burst (api-builder instances):** Tool executors (tasks, contacts, artifacts, web search, system tools) — each is an independent file
- **web-builder:** Card track rendering (independent UI work)

**`/clear` after this phase.** Router is complex and fills context fast.

### Phase 3: Integrations (HIGHLY PARALLEL — enable Agent Teams here)
**Agents used:** 3-4 api-builder instances with worktree isolation. Reviewer after each.

This is where parallelism pays off most. Each integration is self-contained:
- **api-builder (Gmail):** OAuth client, tool executors, email scan cron
- **api-builder (Calendar):** OAuth client, tool executors, calendar sync cron
- **api-builder (iMessage):** Helper app interface, tool executors
- **api-builder (health tracking):** Integration health model

Each agent gets the locked specialist interface from Phase 2 and a "never-touch" list. This is where Agent Orchestrator could help if we want 4+ parallel agents.

**`/clear` after this phase.**

### Phase 4: Memory System (SERIAL with one parallel burst)
**Agents used:** Lead for pipeline. api-builder for independent retrieval implementations.

- **Lead (serial):** Embedding pipeline → memory extraction → wiring into context loader
- **Parallel burst:** Semantic retrieval, episodic retrieval, procedural triggers (independent implementations behind a shared interface)

### Phase 5: Expert System (LIMITED PARALLEL)
**Agents used:** api-builder for backend, web-builder + mobile-builder for UI (parallel).

- **api-builder:** Expert CRUD, activation, context loading, drift detection, overnight research
- **web-builder:** Expert sidebar UI, Expert Drift color tinting
- **mobile-builder:** Expert list/management screen

Backend must establish the data model before UI agents start.

### Phase 6: Proactive Messaging + Notifications (SERIAL + mobile parallel)
**Agents used:** Lead/api-builder for cron logic. mobile-builder for push notifications.

- **api-builder:** Briefing generation, nudge logic, outbox, batch window, crons
- **mobile-builder:** Push notification handling, deep linking (parallel with api-builder)
- **web-builder:** Web Push implementation (parallel)

### Phase 7: Document Pipeline + RAG (LIMITED PARALLEL)
**Agents used:** api-builder + web-builder + mobile-builder in parallel.

- **api-builder:** Upload route, PDF extraction, chunking, embedding, search
- **web-builder:** Documents page UI, artifact sidebar
- **mobile-builder:** Documents screen, artifact display

### Phase 8: Dashboard + Background Jobs (HIGHLY PARALLEL for widgets)
**Agents used:** api-builder for job system, then web-builder + mobile-builder for widgets.

- **api-builder:** Job dispatcher, queue helpers, deep research executor, crons
- **web-builder:** Dashboard canvas, individual widgets (parallel burst — one per widget)
- **mobile-builder:** Dashboard screen, widget rendering

### Phase 9: Settings + Activity Log + Remaining UI (HIGHLY PARALLEL)
**Agents used:** web-builder + mobile-builder in parallel. api-builder for activity log route.

- **web-builder:** Settings page (all tabs), contacts side panel, notepad tab, onboarding, error banners
- **mobile-builder:** Settings screen, contacts screen, onboarding flow
- **api-builder:** Activity log API route

All three can work in parallel — they're touching different files.

### Phase 10: Polish + QA + Mobile Parity (SERIAL)
**Agents used:** Reviewer for audit. Integration-tester for gates. Lead for fixes.

- **Reviewer:** Full codebase review — platform correctness, consistency, security
- **Integration-tester:** All quality gates, accessibility audit
- **Lead:** Fix issues, performance optimization, app manual seeding

**Mobile parity note:** Because mobile-builder works alongside web-builder in every phase (not deferred to Phase 10), mobile parity should be mostly done by now. Phase 10 catches gaps, not builds from scratch.

## Rules for All Agents

### Every subagent prompt MUST include:
1. The exact file paths it should create/modify
2. The interface contracts it must conform to (paste the TypeScript signatures)
3. A "never-touch" list of files/packages it must not modify
4. Quality gate: "Run `pnpm --filter <package> typecheck` before declaring done"
5. Commit instruction: "Commit your work with a descriptive message when the typecheck passes"

### The Lead (Main Session) Must:
1. Never implement — only plan, delegate, review, and merge
2. Update `.claude/build-state.md` at every phase boundary
3. Run full `pnpm typecheck && pnpm lint && pnpm build` between phases
4. Review diffs from every subagent before merging
5. Resolve merge conflicts — never let agents merge their own work
6. `/clear` and `/catchup` at 60% context or at phase boundaries

### Preventing Agent Drift:
1. Lock shared types in `packages/shared` BEFORE parallelizing
2. Use "never-touch" lists (negative scope > positive scope)
3. Interface contracts are source of truth — agents can't deviate
4. One agent owns one worktree — no shared file access during work
5. Merge sequentially, resolve conflicts, typecheck after each merge

## Context Management Rules

### The 60% Rule
Monitor context usage with `/context`. When it hits ~60%:
1. Ask Claude to update `.claude/build-state.md` with current state
2. Run `/clear` for full 200K window
3. Run `/catchup` to rebuild context from git diff + build state

### Phase Boundary Clears
Run `/clear` at every phase boundary regardless of context usage. Each phase is a natural checkpoint. The `/log-phase` command handles the handoff:
1. Run quality gates
2. Update build-state.md
3. Commit
4. Report context usage
5. Recommend clear if above 50%

### One Task Per Conversation
For subagent work, each agent gets one focused task. Don't chain multiple unrelated tasks in a single agent invocation — spawn a new one. Keeps context lean and output focused.

### What Gets Cleared vs. Persisted
**Persisted** (survives /clear):
- `.claude/build-state.md` — phase progress, decisions, learnings
- Git commits — the actual code
- CLAUDE.md files — project rules
- Memory files — cross-session knowledge
- Custom agent definitions

**Lost on /clear** (must be rebuilt):
- Which files were read and their contents
- In-conversation reasoning and decisions not written to build-state
- Tool results from this session

The `/catchup` command reconstructs what matters from git diff + build-state.

## Context Budget Per Phase

Rough estimates (need to validate):
- Fresh session: ~180K usable tokens (200K - 20K system overhead)
- CLAUDE.md + memory files: ~10-15K tokens
- Each file read: ~1-5K tokens
- Each subagent spawn: reduces parent context by prompt size

**Budget rule:** If a phase requires reading more than ~30 files and making changes across them, split it into sub-phases with `/clear` between them.

## Decision: Agent Orchestrator vs. Built-in Worktrees

**For the initial build, use built-in worktree isolation (`isolation: "worktree"` on Agent tool).**

Reasons:
- Zero additional dependencies
- Stable (not v0.2.0)
- No tmux requirement
- Same isolation benefit (separate worktree per agent)
- Less overhead to manage

**Agent Orchestrator is authorized** — the lead can install and use it if a phase would genuinely benefit from 5+ parallel agents. No need to ask first.

## Decision: Agent Teams

**Phase 1-2:** Regular subagents. The lead relays information between agents manually. Low risk, proven pattern.

**Phase 3 onward:** Enable Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). By Phase 3, the foundation and chat core are stable, and agents working on router, specialists, and integrations would benefit from direct peer communication — especially api-builder telling web-builder and mobile-builder when routes are ready, without the lead as a relay bottleneck.

This is a setting change, not a structural change — the same 6 custom agents work with both approaches.

## Custom Agents (6 Total)

Full definitions in `AGENT-DEFINITIONS.md`. Summary:

| Agent | Model | Tools | Isolation | Purpose |
|-------|-------|-------|-----------|---------|
| web-builder | Sonnet | Full | worktree | All Next.js web app code |
| mobile-builder | Sonnet | Full | worktree | All React Native/Expo code |
| api-builder | Sonnet | Full | worktree | API routes, server logic, AI pipeline |
| reviewer | Opus | Read-only | none | Reviews all agent output before merge |
| integration-tester | Sonnet | Read + Bash | none | Runs quality gates |
| researcher | Haiku | Read + Web | none | Fast codebase search, doc lookup |
