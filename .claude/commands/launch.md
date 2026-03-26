# Crosby v2 — Build Launch

You are the lead engineer. You run the Crosby v2 build — start to finish, autonomously.

You have an office:

- **web-builder** — frontend. Next.js pages, components, layouts. DOM and Tailwind only.
- **mobile-builder** — mobile. React Native + Expo screens. RN primitives only.
- **api-builder** — backend. API routes, server logic, AI pipeline, tool executors.
- **reviewer** — senior staff. Reviews diffs before merge. Read-only, Opus.
- **integration-tester** — QA. Runs quality gates. Read-only.
- **researcher** — analyst. Fast codebase search, doc lookups. Haiku.

Phase 0 you handle solo — the foundation is too critical to delegate. After that, you delegate to your team, review their output, merge it, and move to the next phase. You don't stop between phases. You don't ask for permission. You keep building until it's done or you hit something that genuinely can't proceed without Jason's input.

Jason already made every product decision. The specs are complete. The architecture is locked. The design system is finalized. Your job is execution.

---

## Step 1 — Where Are We?

1. Does `~/Development/crosby-v2/turbo.json` exist?
2. Does `~/Development/crosby-v2/.claude/build-state.md` exist?

| turbo.json | build-state.md | Situation | Action |
|------------|---------------|-----------|--------|
| No | No | First launch. | Go to **Step 2** |
| Yes | No | Phase 0 started, never checkpointed. | Read `git log` in `~/Development/crosby-v2/`, assess, resume Phase 0. |
| Yes | Yes | Build in progress. | Read build-state.md, resume from where it says. |

---

## Step 2 — Pre-Build Gate (First Launch Only)

**Do NOT write any code until this gate clears.** Run through every item below. Check what you can check automatically. For everything you can't verify, compile it into ONE message to Jason and wait for his response.

### Auto-Check (verify silently):
- [ ] OpenRouter API key exists in environment (`$OPENROUTER_API_KEY`)
- [ ] Supabase MCP server is responding (try a simple query)
- [ ] Langfuse MCP server is responding (try a simple query)
- [ ] EAS CLI installed (`eas --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Turborepo installed (`turbo --version`)

### Need From Jason (ask all at once):
- [ ] v2 Supabase project URL (`SUPABASE_URL`)
- [ ] v2 Supabase anon key (`SUPABASE_ANON_KEY`)
- [ ] v2 Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Google OAuth client ID (`GOOGLE_CLIENT_ID`) — may be same as v1
- [ ] Google OAuth client secret (`GOOGLE_CLIENT_SECRET`) — may be same as v1
- [ ] Confirmation that OpenRouter has credit balance for the build

GitHub repo is already set: `https://github.com/jason-m-d/crosbyv2.git`
Vercel project is deferred — not needed until deployment.

### How to ask:
Present Jason with a single, clear checklist of what you need. For each item, explain what it is in one sentence. If some auto-checks failed, include those too ("I also need X installed — should I install it or will you?").

### Gate rule:
Once Jason provides the credentials and confirms the checklist, proceed to Step 3 and don't stop again. If Jason provides partial info ("I'll get the Supabase keys later, start without them"), proceed with what you have and document what's missing in build-state.md — but flag that database-dependent work will be blocked until the keys arrive.

---

## Step 3 — Bootstrap + Phase 0

```bash
mkdir -p ~/Development/crosby-v2 && cd ~/Development/crosby-v2 && git init && git remote add origin https://github.com/jason-m-d/crosbyv2.git
```

Read these docs before starting:
- `crosby-v2/architecture/MONOREPO-STRUCTURE.md`
- `crosby-v2/architecture/DATABASE-SCHEMA.md`
- `crosby-v2/architecture/SHARED-TYPES.md`
- `crosby-v2/architecture/AUTH-SESSION.md`
- `crosby-v2/architecture/STYLE-GUIDE-v2.md`
- `crosby-v2/architecture/AGENT-DEFINITIONS.md`
- `crosby-v2/architecture/SLASH-COMMANDS-DRAFT.md`
- `crosby-v2/architecture/BUILD-STATE-TEMPLATE.md`

Build in order:

1. Monorepo scaffolding (pnpm-workspace.yaml, turbo.json, package.json, tsconfig.base.json)
2. packages/shared — types, constants, utils from SHARED-TYPES.md
3. packages/supabase — client, admin client, migrations
4. packages/api-client — typed HTTP client skeleton
5. Database migrations — ALL SQL from DATABASE-SCHEMA.md via Supabase MCP
6. Generate Supabase types
7. apps/web — Next.js 15, Tailwind v4, shadcn/ui, design system from STYLE-GUIDE-v2.md
8. apps/mobile — Expo bare workflow, React Navigation, Nativewind
9. Auth flow — Supabase Auth, Google OAuth, middleware
10. App shell — layout, navigation, auth-gated routes
11. vercel.json — cron definitions from MONOREPO-STRUCTURE.md
12. .env.local + .env.example

### Build Infrastructure (Also Phase 0)

**`.claude/build-state.md`** — from BUILD-STATE-TEMPLATE.md

**`.claude/agents/`** — all 6 agents from AGENT-DEFINITIONS.md

**`.claude/commands/`** — from SLASH-COMMANDS-DRAFT.md: catchup.md, log-phase.md, verify.md, delegate.md, status.md

**`CLAUDE.md`** — monorepo structure, dev commands, import rules, AI routing, design system ref, never-do list

**Per-package CLAUDE.md** — apps/web (DOM-only), apps/mobile (RN-only), packages/shared (isomorphic)

### Verify Phase 0
```bash
pnpm turbo build && pnpm turbo typecheck
```
Pass → update build-state → commit → proceed to Phase 1.

---

## Planning Docs

All specs live in the original repo: `crosby-v2/`

**Read before each phase. Don't work from memory.**

### Architecture
| Doc | What | Phase |
|-----|------|-------|
| `crosby-v2/architecture/BUILD-PLAN.md` | Tasks, deps, parallel strategy, verification | Every |
| `crosby-v2/architecture/MONOREPO-STRUCTURE.md` | Folders, packages, routes, crons, env vars | 0 |
| `crosby-v2/architecture/DATABASE-SCHEMA.md` | Tables, columns, indexes, RLS, RPCs | 0 |
| `crosby-v2/architecture/SHARED-TYPES.md` | All TypeScript interfaces | 0 |
| `crosby-v2/architecture/AUTH-SESSION.md` | Auth, OAuth, sessions, middleware | 0 |
| `crosby-v2/architecture/API-ROUTES.md` | Every endpoint | 1-2 |
| `crosby-v2/architecture/AI-PIPELINE.md` | Router → Context → Prompt → Stream → Tools | 2 |
| `crosby-v2/architecture/SYSTEM-PROMPT.md` | Prompt assembly, specialist sections | 2 |
| `crosby-v2/architecture/BACKGROUND-JOBS.md` | Job queue, dispatcher, crons | 6-8 |
| `crosby-v2/architecture/REALTIME-NOTIFICATIONS.md` | Push, Realtime, batching, deep linking | 6 |
| `crosby-v2/architecture/AGENT-STRATEGY.md` | Agent usage per phase, context mgmt | Every |
| `crosby-v2/architecture/STYLE-GUIDE-v2.md` | Colors, type, spacing, motion, components | UI |
| `crosby-v2/architecture/DESIGN-DIRECTION.md` | Design philosophy | Design Qs |
| `crosby-v2/architecture/ROUTER-EVAL-PLAN.md` | 100+ router test cases | 2 |
| `crosby-v2/architecture/PROCEDURAL-MEMORIES.md` | Trigger format, matching | 4 |
| `crosby-v2/architecture/CONTRADICTION-DETECTION.md` | Memory contradiction detection | 4 |
| `crosby-v2/architecture/CONSTITUTION.md` | Privacy, action boundaries | 2, 9 |
| `crosby-v2/architecture/TOKEN-BUDGET-ANALYSIS.md` | Prompt token math | 2 |

### Product Specs
| Doc | Feature | Phase |
|-----|---------|-------|
| `crosby-v2/product/CHAT-TIMELINE.md` | Chat model, content types | 1 |
| `crosby-v2/product/INLINE-CARDS.md` | Card categories, layout | 2 |
| `crosby-v2/product/ROUTER.md` | Router, confidence, fallback | 2 |
| `crosby-v2/product/EXPERT-CONTEXT-LOADING.md` | Expert context, budgets | 5 |
| `crosby-v2/product/EMAIL-MANAGEMENT.md` | Email scanning, drafting | 3 |
| `crosby-v2/product/CALENDAR-INTEGRATION.md` | Calendar, confirmation cards | 3 |
| `crosby-v2/product/TEXT-SMS.md` | iMessage, degradation | 3 |
| `crosby-v2/product/PERSISTENT-MEMORY.md` | Memory model, retrieval | 4 |
| `crosby-v2/product/CONVERSATION-CONTINUITY.md` | Context layers, summary | 4 |
| `crosby-v2/product/CONTACTS-ENTITY-RESOLUTION.md` | Contacts, resolution | 3, 9 |
| `crosby-v2/product/WATCHES-MONITORS.md` | Watches, staleness | 2 |
| `crosby-v2/product/BRIEFINGS-NUDGES.md` | Briefings, nudges | 6 |
| `crosby-v2/product/PROACTIVE-MESSAGES.md` | Message taxonomy | 6 |
| `crosby-v2/product/NOTIFICATIONS.md` | Delivery tiers, quiet hours | 6 |
| `crosby-v2/product/DASHBOARD-OVERNIGHT-BUILDER.md` | Widgets, overnight builder | 8 |
| `crosby-v2/product/BACKGROUND-JOBS.md` | Concurrency, queue | 8 |
| `crosby-v2/product/WEB-SEARCH-DEEP-RESEARCH.md` | Perplexity, research | 2, 8 |
| `crosby-v2/product/STRUCTURED-QUESTIONS.md` | Cards, chips | 2 |
| `crosby-v2/product/ARTIFACTS.md` | Sidebar, editing | 7 |
| `crosby-v2/product/NOTEPAD.md` | Working memory, sidebar | 2, 9 |
| `crosby-v2/product/MOBILE-EXPERIENCE.md` | RN, push, deep linking | 0, 6 |
| `crosby-v2/product/ONBOARDING.md` | Progressive reveal | 9 |
| `crosby-v2/product/SETTINGS.md` | 5 tab groups | 9 |
| `crosby-v2/product/SILOS.md` | Core silos only | 2 |
| `crosby-v2/product/ERROR-HANDLING-GRACEFUL-DEGRADATION.md` | Health, banners | 9 |
| `crosby-v2/product/ACTIVITY-LOG.md` | Diagnostics log | 9 |
| `crosby-v2/product/AUTH-ACCOUNT.md` | Auth, OAuth, scopes | 0 |
| `crosby-v2/product/APP-MANUAL.md` | RAG feature docs | 10 |
| `crosby-v2/SOUL-v2.md` | Voice, personality, prompts | 2 |

### Post-v2.0 — Don't Build
- Training & Learning pipeline (schema only in Phase 0)
- Silo marketplace + custom silo builder
- Trust escalation, contact full/private mode
- iMessage macOS helper app
- Data export, granular message deletion, anonymization

---

## Phase Execution (Phase 1+)

For every phase after Phase 0, loop through this and move directly to the next:

### 1. Read
BUILD-PLAN.md for this phase + every relevant spec from the tables above.

### 2. Plan + Execute
Parallel tasks → spawn builder agents with `isolation: "worktree"`. Sequential → handle yourself or delegate serially.

### 3. Review + Merge
Review every diff. Use reviewer for complex work. Merge one at a time. Typecheck after each.

### 4. Verify
```bash
pnpm turbo build && pnpm turbo typecheck && pnpm turbo lint
```
Plus phase-specific checks. Fix failures before proceeding.

### 5. Checkpoint + Continue
Update build-state.md → commit → `/clear` if above 60% → start next phase.

---

## Delegation Rules

Every agent prompt MUST include:
1. Exact file paths to create/modify
2. TypeScript signatures (pasted, not referenced)
3. Never-touch list
4. Product requirements (paste key sections)
5. Design system sections (for UI agents)
6. Quality gate: `pnpm --filter <package> typecheck`
7. Commit instruction

Rules:
- Two agents never edit the same file
- packages/shared is READ-ONLY during agent work
- Merge sequentially, typecheck after each
- Never let agents merge their own work

---

## Context Management

**60% rule:** Update build-state → `/clear` → `/catchup`

**Phase boundaries:** Clear after each phase.

**Survives /clear:** build-state.md, git, CLAUDE.md, agents, commands, memory.

**Lost:** File contents, reasoning, tool results. `/catchup` rebuilds.

---

## Locked Decisions

- New repo at `~/Development/crosby-v2/`
- pnpm + Turborepo
- All AI through OpenRouter
- Supabase for DB, auth, storage
- React Native + Expo bare workflow
- Mobile calls web API, never Supabase directly
- Built-in worktree isolation (AO authorized if 5+ parallel needed)
- Phase 0 is solo
- Design system locked in STYLE-GUIDE-v2.md
- Post-v2.0 items — don't build

---

## When Things Go Wrong

**Stuck (3+ failures):** Re-plan. Try a different approach. Only ask Jason if you've genuinely exhausted options.

**Bad agent output:** Don't merge. Log in build-state. Re-delegate or do it yourself.

**Quality gates failing:** Stop. Run reviewer. Fix root cause.

**Spec conflict:** Check `crosby-v2/product/GAPS-AND-CONTRADICTIONS.md`. If unaddressed and blocking, ask Jason. If you can make a reasonable call, make it and log it.

**Need a dependency:** Install it.

---

## Go

Execute Step 1. Start building. Don't stop until it's done.
