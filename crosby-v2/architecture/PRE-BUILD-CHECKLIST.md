# Pre-Build Checklist

Items are split into two categories: **hard blockers** that must be done before Phase 0 can start, and **Phase 0 tasks** that are part of the build itself. Don't confuse the two — the hard blockers are infra/tooling setup, the Phase 0 tasks are build work.

---

## Hard Blockers (Must Complete Before Phase 0)

These are infrastructure prerequisites. Phase 0 tasks assume they exist.

### Tool Installation

- [x] **Turborepo** — installed globally
- [x] **tmux** — installed via Homebrew (3.6a)
- [x] **Motion Dev MCP** — Installed. Requires Claude Code restart to pick up.
- [ ] **Agent Orchestrator** — `npm install -g @composio/ao` (optional — only if we decide to use it for Phase 2+ parallelization)

### MCP Server Authentication

- [ ] **Supabase MCP** — re-authenticate (currently showing "Needs authentication")
- [ ] **Google Calendar MCP** — authenticate (needed for calendar integration in Phase 3)
- ~~Notion MCP~~ — NOT needed for Crosby. Ignore the built-in claude.ai listing.

### MCP Server Cleanup

- [x] **MCP config clean** — `.mcp.json` only has langfuse, supabase, shadcn. No duplicate Vercel, no stitch. Already resolved.
- [ ] **Verify Langfuse MCP** keys are still valid (keys are in .mcp.json plaintext — test with a query)

### Environment Setup

- [ ] **Create new Supabase project** for v2 (clean slate, no v1 data)
- [ ] **Create new Vercel project** for v2 (v1 stays deployed)
- [ ] Copy env vars from v1 Vercel to v2 (OpenRouter key, Google OAuth, etc.)
- [ ] Verify OpenRouter API key is active and has budget
- [ ] Verify EAS CLI is installed and authenticated for mobile builds

---

## Phase 0 Tasks (Part of the Build — Not Pre-Reqs)

These are created as part of Phase 0 execution. They're listed here for completeness but are tracked in BUILD-PLAN.md.

### Configuration Files (Created During Phase 0)

- [ ] Root CLAUDE.md for v2 monorepo
- [ ] apps/web/CLAUDE.md — Next.js 15 rules, DOM-only, anti-RN guardrails
- [ ] apps/mobile/CLAUDE.md — RN/Expo rules, anti-DOM guardrails, Nativewind constraints
- [ ] packages/shared/CLAUDE.md — isomorphic-only constraints
- [ ] packages/api-client/CLAUDE.md — typed HTTP client patterns
- [ ] packages/supabase/CLAUDE.md — migration rules, RLS patterns
- [ ] .claude/commands/catchup.md — context rebuild after `/clear`
- [ ] .claude/commands/log-phase.md — checkpoint phase completion
- [ ] .claude/commands/verify.md — run all quality gates
- [ ] .claude/build-state.md — phase tracking template

### Shared Contracts (Created During Phase 0, Tasks 0.2-0.5)

- [ ] packages/shared/types/api.ts — all API route type signatures
- [ ] packages/shared/types/database.ts — Supabase table types (generated after migrations)
- [ ] packages/shared/types/ai.ts — specialist, router, tool type definitions
- [ ] tsconfig.base.json — root config (strict, paths, NO moduleResolution)
- [ ] apps/web/tsconfig.json — extends base, moduleResolution: bundler
- [ ] apps/mobile/tsconfig.json — extends base, moduleResolution: node
- [ ] turbo.json — pipeline with ^build dependencies
- [ ] apps/mobile/metro.config.js — pnpm symlink support, singleton pinning, Nativewind

---

## Decision Points (All Resolved)

- [x] Same Supabase project as v1 or new one? **New project. Clean slate. No data migration. v1 stays running.**
- [x] Same Vercel project or new one? **New project. v1 stays deployed until v2 is ready.**
- [x] Agent Orchestrator vs. built-in worktree isolation? **Start with built-in worktrees. AO authorized if lead decides it's needed.**
- [x] Do we need Notion MCP? **No**
- [x] Agent Teams? **Enable Phase 3+ via setting change**
- [x] Which phases can genuinely parallelize? **Documented in AGENT-STRATEGY.md. Phases 3/4/7 can partially overlap. Phases 6/7/8/9 can run in parallel once deps met.**
