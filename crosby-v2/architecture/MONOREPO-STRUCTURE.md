# Monorepo Structure — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

Crosby v2 is a monorepo containing three apps (web, mobile, shared backend) and shared packages. The structure enables code sharing between web and mobile while keeping platform-specific code isolated.

---

## Stack

| Layer | Technology |
|---|---|
| Web app | Next.js 15 (App Router), React 19, TypeScript |
| Mobile app | React Native + Expo (bare workflow), TypeScript |
| Styling (web) | Tailwind CSS v4, shadcn/ui |
| Styling (mobile) | React Native StyleSheet + Nativewind (Tailwind for RN) |
| Database | Supabase (Postgres 16 + pgvector + Row Level Security) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (document uploads) |
| AI routing | OpenRouter (all AI calls) |
| Embedding | OpenAI text-embedding-3-small via OpenRouter |
| Reranking | Cohere rerank (or Supabase pg_bm25 if self-hosting) |
| Push notifications | Expo Push Service (APNs) |
| Web push | Web Push API + service worker |
| Hosting (web) | Vercel |
| Hosting (mobile) | Expo EAS Build + App Store |
| Background jobs | Vercel Cron → API routes → DB queue |
| Observability | Langfuse (traces, evals, cost tracking) |
| Package manager | pnpm (workspaces) |
| Monorepo tool | Turborepo |

---

## Folder Structure

```
crosby-v2/
├── apps/
│   ├── web/                          # Next.js web app
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages and API routes
│   │   │   │   ├── (auth)/           # Auth pages (login, signup, reset)
│   │   │   │   ├── (app)/            # Authenticated app pages
│   │   │   │   │   ├── chat/         # Main chat page
│   │   │   │   │   ├── documents/    # Documents page
│   │   │   │   │   ├── settings/     # Settings page (tabbed)
│   │   │   │   │   └── layout.tsx    # App shell (sidebar, nav)
│   │   │   │   ├── api/
│   │   │   │   │   ├── chat/         # Chat streaming endpoint
│   │   │   │   │   ├── cron/         # Cron job endpoints
│   │   │   │   │   ├── documents/    # Document upload/management
│   │   │   │   │   ├── auth/         # Auth callbacks
│   │   │   │   │   └── webhooks/     # External webhooks (Gmail push, etc.)
│   │   │   │   └── layout.tsx        # Root layout
│   │   │   ├── components/           # Web-specific UI components
│   │   │   │   ├── chat/             # Chat timeline, message bubbles, cards
│   │   │   │   ├── sidebar/          # Right sidebar (artifacts, contacts, notepad)
│   │   │   │   ├── dashboard/        # Dashboard widgets
│   │   │   │   ├── documents/        # Document list, upload
│   │   │   │   ├── settings/         # Settings tabs
│   │   │   │   ├── experts/          # Expert list, activation UI
│   │   │   │   └── ui/              # shadcn/ui primitives
│   │   │   ├── hooks/                # Web-specific React hooks
│   │   │   └── styles/               # Tailwind config, globals
│   │   ├── public/                   # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── vercel.json               # Cron definitions
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # React Native + Expo app
│       ├── src/
│       │   ├── screens/              # Screen components (Chat, Documents, Experts, Settings)
│       │   ├── components/           # Mobile-specific UI components
│       │   │   ├── chat/
│       │   │   ├── sidebar/
│       │   │   ├── dashboard/
│       │   │   └── common/
│       │   ├── navigation/           # React Navigation config (bottom tabs, stacks)
│       │   ├── hooks/                # Mobile-specific hooks (push, biometrics, keyboard)
│       │   └── utils/                # Mobile utilities (deep linking, storage)
│       ├── app.json                  # Expo config
│       ├── eas.json                  # EAS Build config
│       ├── tsconfig.json
│       └── package.json
│
│   # NOTE: macOS helper app (for iMessage monitoring) is deferred to post-v2.0.
│   # When built, it will live at apps/macos-helper/ with its own build/sign pipeline.
│
├── packages/
│   ├── shared/                       # Shared business logic (web + mobile)
│   │   ├── src/
│   │   │   ├── types/                # All TypeScript types/interfaces
│   │   │   │   ├── database.ts       # Database row types (generated from Supabase)
│   │   │   │   ├── chat.ts           # Chat message, tool call, streaming types
│   │   │   │   ├── router.ts         # Router input/output types
│   │   │   │   ├── specialist.ts     # Specialist definition types
│   │   │   │   ├── expert.ts         # Expert types
│   │   │   │   ├── memory.ts         # Memory types (semantic, episodic, procedural)
│   │   │   │   ├── background-job.ts # Job types
│   │   │   │   └── index.ts          # Re-export all types
│   │   │   ├── constants/            # Shared constants
│   │   │   │   ├── models.ts         # AI model IDs and configs
│   │   │   │   ├── limits.ts         # Token budgets, concurrency limits, timeouts
│   │   │   │   ├── specialists.ts    # Specialist IDs and metadata
│   │   │   │   └── index.ts
│   │   │   ├── utils/                # Pure utility functions
│   │   │   │   ├── formatting.ts     # Date, number, text formatting
│   │   │   │   ├── validation.ts     # Input validation (Zod schemas)
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api-client/                   # Typed API client (mobile uses this to call web API)
│   │   ├── src/
│   │   │   ├── client.ts             # Base HTTP client with auth
│   │   │   ├── chat.ts               # Chat API (SSE streaming)
│   │   │   ├── documents.ts          # Document API
│   │   │   ├── settings.ts           # Settings API
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── supabase/                     # Supabase client + DB utilities
│       ├── src/
│       │   ├── client.ts             # Supabase client initialization
│       │   ├── admin.ts              # Service role client (server-side only)
│       │   ├── queries/              # Typed query functions
│       │   │   ├── messages.ts
│       │   │   ├── memories.ts
│       │   │   ├── experts.ts
│       │   │   ├── contacts.ts
│       │   │   ├── documents.ts
│       │   │   └── ...
│       │   ├── migrations/           # SQL migration files
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── scripts/                          # One-off scripts (seeding, data migration)
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml               # pnpm workspace config
├── tsconfig.base.json                # Base TypeScript config
├── .env.local                        # Local env vars (not committed)
├── .env.example                      # Env var template
└── package.json                      # Root package.json
```

---

## Package Dependency Graph

```
apps/web ──────► packages/shared
    │           packages/supabase
    │
apps/mobile ──► packages/shared
    │           packages/api-client
    │
packages/api-client ──► packages/shared
packages/supabase ──► packages/shared
```

**Key rule:** `packages/shared` has ZERO platform dependencies. No React, no React Native, no Next.js. Pure TypeScript — types, constants, and utility functions only.

**The web app** imports `packages/shared` and `packages/supabase` directly. It talks to Supabase server-side via API routes.

**The mobile app** imports `packages/shared` and `packages/api-client`. It does NOT talk to Supabase directly — all data flows through the web app's API routes. This keeps the mobile app thin and the backend logic in one place.

---

## Why This Structure

### Why pnpm + Turborepo
- pnpm: fast, disk-efficient, strict dependency isolation (prevents phantom dependencies)
- Turborepo: caches builds across packages, runs tasks in parallel, understands the dependency graph

### Why the mobile app calls the web API (not Supabase directly)
- **Single source of truth for business logic.** The chat route, router, specialist system, memory extraction — all live in the web app's API routes. The mobile app is a client.
- **Security.** Supabase service role keys never ship to the mobile app. Only the web API has admin access.
- **Consistency.** Both web and mobile go through the same pipeline. No divergence in behavior.
- **Simpler mobile app.** The mobile app is UI + API calls. No business logic duplication.

### Why shared types are in a separate package
- Types are imported by every other package. Keeping them in one place prevents drift.
- Generated from Supabase schema (via `supabase gen types typescript`) so they stay in sync with the database.

---

## Build & Dev Commands

```bash
# Install all dependencies
pnpm install

# Dev — start web app
pnpm --filter web dev

# Dev — start mobile app
pnpm --filter mobile start

# Build — web app (for Vercel deploy)
pnpm --filter web build

# Build — mobile app (for EAS build)
pnpm --filter mobile build

# Type check — all packages
pnpm turbo typecheck

# Lint — all packages
pnpm turbo lint

# Generate Supabase types
pnpm --filter supabase gen:types
```

---

## API Route Organization (Web App)

All backend logic lives in the web app's API routes. The mobile app calls these via the `api-client` package.

```
src/app/api/
├── chat/
│   ├── route.ts              # Main chat streaming endpoint (POST)
│   └── prefetch/
│       └── route.ts          # Router pre-classification while typing (POST)
├── cron/
│   ├── email-scan/route.ts
│   ├── calendar-sync/route.ts
│   ├── briefing/route.ts
│   ├── nudge/route.ts
│   ├── overnight/route.ts    # Overnight builder + Expert research
│   ├── embed/route.ts        # Message + document embedding
│   ├── memory-scan/route.ts  # Weekly contradiction scan
│   └── jobs/route.ts         # Background job dispatcher (every minute)
├── documents/
│   ├── upload/route.ts
│   ├── [id]/route.ts
│   └── search/route.ts
├── experts/
│   ├── route.ts              # CRUD experts
│   └── [id]/route.ts
├── contacts/
│   └── route.ts
├── settings/
│   └── route.ts
├── auth/
│   ├── callback/route.ts     # OAuth callback
│   └── google/route.ts       # Google OAuth initiation
├── webhooks/
│   ├── gmail/route.ts        # Gmail push notifications
│   └── expo-push/route.ts    # Push notification receipts
├── activity-log/
│   └── route.ts              # Query activity log
└── health/
    └── route.ts              # Health check endpoint
```

### Cron Consolidation (vs. v1's 12 crons)

v1 had 12 separate crons. v2 consolidates to 8:

| Cron | Schedule | What it does |
|---|---|---|
| `email-scan` | Every 15 min | Scan Gmail, check watches, extract context |
| `calendar-sync` | Every 15 min | Sync Google Calendar events |
| `briefing` | 3x daily (morning/afternoon/evening) | Generate briefings |
| `nudge` | Every 2 hours | Check for stale tasks, overdue commitments |
| `overnight` | 1x nightly | Dashboard builds + Expert research |
| `embed` | Every 15 min | Embed new messages + documents |
| `memory-scan` | Weekly | Contradiction detection across new memories |
| `jobs` | Every minute | Dispatch queued background jobs |

**What changed from v1:**
- `text-scan`, `text-heartbeat-monitor`, `text-cleanup` → consolidated into `email-scan` (runs the text check alongside email)
- `session-summary`, `summarize-conversation` → replaced by rolling context summary (triggered by token threshold, not cron)
- `embed-messages` → merged with document embedding into single `embed` cron
- `run-background-jobs` → renamed to `jobs`, same behavior

---

## Server-Side Library Organization

All backend business logic lives in `apps/web/src/lib/`. This is NOT in the shared package — it's server-only code that depends on Node.js, Supabase admin client, and OpenRouter.

```
src/lib/
├── ai/
│   ├── router.ts             # Message router (Gemini Flash Lite)
│   ├── stream.ts             # Chat streaming with tool loop
│   ├── models.ts             # Model configs, fallback chains
│   └── prompt/
│       ├── builder.ts        # Dynamic system prompt assembly
│       ├── sections/         # Prompt sections per specialist
│       └── templates.ts      # Base prompt templates
├── chat/
│   ├── context-loader.ts     # Parallel data block loading
│   ├── context-summary.ts    # Rolling summary generation/refresh
│   ├── tools/
│   │   ├── registry.ts       # Tool executor registry (Map-based)
│   │   ├── definitions/      # Tool schemas (one file per domain)
│   │   │   ├── email.ts
│   │   │   ├── calendar.ts
│   │   │   ├── tasks.ts
│   │   │   ├── documents.ts
│   │   │   ├── experts.ts
│   │   │   ├── contacts.ts
│   │   │   ├── artifacts.ts
│   │   │   ├── web-search.ts
│   │   │   ├── notepad.ts
│   │   │   └── system.ts     # request_additional_context, query_activity_log
│   │   └── executors/        # Tool executor functions (one file per domain)
│   │       ├── email.ts
│   │       ├── calendar.ts
│   │       ├── tasks.ts
│   │       └── ...
│   └── memory/
│       ├── extraction.ts     # Async memory extraction pipeline
│       ├── retrieval.ts      # Hybrid retrieval (vector + entity + recency)
│       ├── procedural.ts     # Trigger-based procedural memory matching
│       └── contradiction.ts  # Contradiction detection logic
├── specialists/
│   ├── registry.ts           # Specialist registry + resolver
│   ├── definitions/          # Built-in specialist definitions
│   │   ├── core.ts
│   │   ├── email.ts
│   │   ├── calendar.ts
│   │   ├── tasks.ts
│   │   ├── documents.ts
│   │   ├── artifacts.ts
│   │   └── texts.ts
│   └── loader.ts             # Load user-created specialists from DB
├── experts/
│   ├── activation.ts         # Expert drift, ambient/active transitions
│   ├── context-loading.ts    # Tier 1/Tier 2 loading logic
│   └── research.ts           # Overnight Expert research
├── integrations/
│   ├── gmail/
│   │   ├── client.ts         # Gmail API client
│   │   ├── scan.ts           # Email scanning pipeline
│   │   └── draft.ts          # Email drafting
│   ├── google-calendar/
│   │   ├── client.ts
│   │   └── sync.ts
│   ├── imessage/
│   │   └── client.ts
│   └── health.ts             # Per-integration health tracking
├── proactive/
│   ├── briefing.ts           # Briefing generation
│   ├── nudge.ts              # Nudge generation + escalation
│   ├── greeting.ts           # Living greeting generation
│   ├── outbox.ts             # Proactive message dedup
│   └── delivery.ts           # Push notification delivery
├── rag/
│   ├── embeddings.ts         # Embedding generation (OpenAI via OpenRouter)
│   ├── chunker.ts            # Document chunking
│   ├── retrieval.ts          # Vector search + reranking
│   └── pdf.ts                # PDF text extraction + OCR fallback
├── background/
│   ├── dispatcher.ts         # Job queue dispatcher
│   ├── deep-research.ts      # Deep research job executor
│   └── overnight.ts          # Overnight builder + Expert research
├── activity-log/
│   └── logger.ts             # Structured activity logging
└── utils/
    ├── rate-limit.ts
    ├── errors.ts
    └── timing.ts
```

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (all through OpenRouter)
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cohere (reranking)
COHERE_API_KEY=

# Cron auth
CRON_SECRET=

# Push notifications
EXPO_ACCESS_TOKEN=

# Observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=

# AI Models (configurable — defaults in code)
CHAT_MODEL=
ROUTER_MODEL=
BACKGROUND_MODEL=
WEB_SEARCH_MODEL=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Vercel Configuration

The `apps/web/vercel.json` file defines cron schedules. All times are UTC.

```json
{
  "crons": [
    { "path": "/api/cron/email-scan", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/calendar-sync", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/briefing", "schedule": "0 13,20,1 * * *" },
    { "path": "/api/cron/nudge", "schedule": "0 */2 * * *" },
    { "path": "/api/cron/overnight", "schedule": "0 10 * * *" },
    { "path": "/api/cron/embed", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/memory-scan", "schedule": "0 9 * * 1" },
    { "path": "/api/cron/jobs", "schedule": "* * * * *" }
  ]
}
```

**Build Plan:** Creating `apps/web/vercel.json` with these cron definitions is a Phase 0 task — it must exist before any cron-dependent features can be deployed.

---

## Deployment

### Web (Vercel)
- Vercel detects the monorepo and builds `apps/web`
- Root directory set to `apps/web` in Vercel project settings
- Turborepo caching speeds up builds (shared packages cached)
- Cron jobs defined in `apps/web/vercel.json`

### Mobile (Expo EAS)
- EAS Build compiles the React Native app
- iOS builds submitted to App Store via EAS Submit
- Push notifications via Expo Push Service
- OTA updates via EAS Update (for JS-only changes)

### Database (Supabase)
- Migrations run via `supabase db push` or MCP tools
- Types generated via `supabase gen types typescript`
- RLS policies enforce auth at the database level

---

## Relationship to Product Specs

| Product spec | Architecture mapping |
|---|---|
| APP-STRUCTURE.md | `apps/web/src/app/(app)/` — 3 pages: chat, documents, settings |
| MOBILE-EXPERIENCE.md | `apps/mobile/` — React Native + Expo, bottom nav |
| ROUTER.md | `apps/web/src/lib/ai/router.ts` |
| EXPERT-CONTEXT-LOADING.md | `apps/web/src/lib/experts/` |
| CONVERSATION-CONTINUITY.md | `apps/web/src/lib/chat/context-summary.ts` + `memory/` |
| BACKGROUND-JOBS.md | `apps/web/src/lib/background/` + `api/cron/` |
| ACTIVITY-LOG.md | `apps/web/src/lib/activity-log/` + `api/activity-log/` |
| NOTIFICATIONS.md | `apps/web/src/lib/proactive/delivery.ts` |
| AUTH-ACCOUNT.md | Supabase Auth + `api/auth/` + `(auth)/` pages |
