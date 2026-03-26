# Build State Template

This is the template for `.claude/build-state.md` in the v2 monorepo. This file is the single source of truth for build progress. Updated at every phase boundary and before every `/clear`.

---

```markdown
# Crosby v2 Build State

Last updated: YYYY-MM-DD HH:MM
Last updated by: [main session / subagent name]

## Current Phase
Phase X: [Name] — [status: not started / in progress / completed]
Current task: [exact next thing to do]

## Phase Progress

### Phase 1: Foundation
- [ ] Monorepo scaffolding (pnpm workspaces, turbo.json)
- [ ] Root tsconfig.base.json + per-app tsconfigs
- [ ] packages/shared — types, constants, utilities
- [ ] packages/api-client — typed HTTP client
- [ ] packages/supabase — client, migrations, type generation
- [ ] apps/web — Next.js 15 scaffold + Tailwind v4
- [ ] apps/mobile — Expo bare + Nativewind v4 + Metro config
- [ ] Quality gate: pnpm typecheck && pnpm build passes

### Phase 2: Chat Core
- [ ] Chat API route (apps/web/api/chat)
- [ ] Web chat UI
- [ ] Mobile chat UI
- [ ] Streaming support
- [ ] Message persistence (Supabase)
- [ ] Quality gate passes

### Phase 3: Router + Specialists
- [ ] AI router (Gemini Flash Lite classification)
- [ ] Specialist registry
- [ ] Tool executor registry
- [ ] request_additional_context tool
- [ ] Fallback to regex classification
- [ ] Quality gate passes

### Phase 4: Integrations
- [ ] Gmail silo
- [ ] Calendar silo
- [ ] iMessage silo
- [ ] Sales/contacts silo
- [ ] Tasks silo
- [ ] Quality gate passes

### Phase 5: Memory System
- [ ] Memory extraction pipeline
- [ ] Embedding + vector storage
- [ ] RAG retrieval
- [ ] Memory UI (web + mobile)
- [ ] Quality gate passes

### Phase 6: Expert System
- [ ] Expert data model
- [ ] Expert CRUD
- [ ] Expert context loading
- [ ] Expert drift detection
- [ ] Quality gate passes

### Phase 7: Proactive Messaging
- [ ] Background job queue
- [ ] Cron job framework
- [ ] Morning briefing
- [ ] Session greeting
- [ ] Nudge system
- [ ] Quality gate passes

### Phase 8: Documents + Artifacts
- [ ] Document upload pipeline
- [ ] PDF text extraction + OCR fallback
- [ ] Chunking + embedding
- [ ] Artifact rendering
- [ ] Quality gate passes

### Phase 9: Dashboard
- [ ] Dashboard framework
- [ ] Widget: today's schedule
- [ ] Widget: email summary
- [ ] Widget: tasks
- [ ] Widget: sales pipeline
- [ ] Overnight builder
- [ ] Quality gate passes

### Phase 10: Settings + QA
- [ ] Settings page (web)
- [ ] Settings page (mobile)
- [ ] Auth flow
- [ ] End-to-end QA sweep
- [ ] Final quality gate passes
- [ ] Deploy

## Locked Decisions
<!-- Architectural decisions that are final and cannot be changed by subagents -->

| Decision | Choice | Date | Rationale |
|----------|--------|------|-----------|
| | | | |

## Open Decisions
<!-- Decisions that need to be made before proceeding -->

| Question | Options | Blocking Phase |
|----------|---------|----------------|
| | | |

## Learnings / Traps to Avoid
<!-- Things that went wrong, surprising behavior, wrong approaches -->

-

## Interface Contracts
<!-- Quick reference for the most important shared interfaces -->
<!-- Full types live in packages/shared/types/ -->

See: packages/shared/types/api.ts
See: packages/shared/types/database.ts
See: packages/shared/types/ai.ts

## Active Worktrees
<!-- Track which worktrees exist and what they're for -->

| Worktree | Branch | Agent/Purpose | Status |
|----------|--------|---------------|--------|
| | | | |
```
