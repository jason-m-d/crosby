> **Original Prompt:** "You are helping me plan the architecture for Crosby v2. This is an AI personal assistant built on Next.js (App Router) + TypeScript + Supabase, with Claude as the LLM routed through OpenRouter. The product vision is to evolve Crosby into a platform where capabilities ('silos') are composable modules that users can eventually create and connect themselves. I need production-focused research on the following 4 domains of extensible AI assistant architecture in 2026: (1) Plugin/extension architecture for AI assistants — how production systems in 2026 structure extensibility, MCP vs. other protocols, what to put in core vs. plugins; (2) Declarative tool and integration definition — JSON/YAML-based tool registration, capability manifests, tool permission scoping; (3) Agentic integration building — how production systems handle 'connect my Shopify' type flows in 2026, OAuth-as-a-service platforms (Nango, Composio, Merge), webhook ingestion architecture; (4) Multi-tenant considerations — user data isolation, per-user token storage, decisions to make now even when single-user."

---

# Extensible AI Assistant Architecture: Plugin/Silo Systems in 2026

## Executive Summary

The architectural question you're asking — how to rebuild a hardcoded personal AI assistant into a system of composable, user-extensible "silos" — is now a well-trodden production problem. The ecosystem has converged on a clear set of patterns: **MCP as the de facto tool integration protocol**, **manifest-based capability registration** for silo discovery, **OAuth-as-a-service platforms** (Nango, Composio, Merge) for the credential plumbing, and **PostgreSQL RLS** as the pragmatic starting point for multi-tenant isolation. The following covers each of your four question areas with what's actually shipping in 2026.

---

## 1. Plugin/Extension Architecture for AI Assistants

### MCP Is the Standard — With Caveats

Since Anthropic introduced the Model Context Protocol in November 2024, MCP has become the de facto integration layer for agentic AI. It is natively supported by Anthropic, OpenAI, Google, and Microsoft, and deployed across millions of daily active developer tool users as of early 2026. Adoption velocity is exceptional: the SDK crossed 8 million weekly downloads, and the question has shifted from "will MCP win?" to "how quickly can enterprises build on top of it?"[^1][^2]

The protocol's core concept is clean: MCP provides a standardized way for AI agents to retrieve data and interact with tools, decoupling business logic from specific models. Think of it as the USB-C connector for agentic AI — any compliant tool speaks the same language regardless of which LLM is on the other end. MCP primitives are **Resources** (contextual data), **Prompts** (injectable instructions), and **Tools** (executable functions).[^3][^4][^5]

There is one significant competing protocol: Google's **Agent2Agent (A2A)**, which focuses on agent-to-agent communication rather than tool integration, and is positioned as complementary to MCP rather than competing. In practice, production systems in 2026 use MCP for tool integration and either custom scaffolding or early A2A concepts for multi-agent handoffs — the latter is not yet standardized.[^2]

**What shipped vs. what's still coming (2026 roadmap state):**

| Feature | Status |
|---|---|
| Remote MCP over HTTP/SSE | ✅ Shipped (early 2025) |
| TypeScript + Python SDKs stable | ✅ Shipped |
| Java + Go SDKs | ✅ Now available |
| OAuth 2.1 partial support | ✅ Partially shipped |
| MCP Registry (centralized discovery) | 🔄 In progress — API layer for 3rd-party marketplaces |
| Full SSO integration | 🔄 Still in progress |
| Multi-agent orchestration primitives | 🔄 In spec, not yet standardized |
| Fine-grained authorization | 📋 On roadmap |
| Streaming / multimodal (audio, video) | 🔄 Rolling out |

### How the Major Platforms Handle Extensibility

The extensibility models converge around **manifest-based plugin declarations** wired to MCP or REST runtimes:

- **Microsoft 365 Copilot** uses a Plugin Manifest JSON schema (v2.4 as of March 2026) where each plugin declares its runtime type (`RemoteMCPServer`, `OpenApi`, or `LocalPlugin`), authentication method, and tool capabilities. Tools can be statically defined inline or dynamically discovered via MCP's `tools/list` method at load time. Auth types are `None`, `OAuthPluginVault`, or `ApiKeyPluginVault` — credentials are stored in a vault, not in the manifest itself.[^7][^8]

- **VS Code's agent mode** distinguishes between Language Model Tools (deep VS Code API access), MCP Tools (cross-environment, no VS Code APIs), and Chat Participants (custom interaction flows). The guidance is: use MCP tools when the integration needs to run outside the editor or be reused across environments.[^9]

- **OpenClaw** (an open-source AI assistant runtime) implements a **capability registration** model: core defines capability contracts (`registerProvider`, `registerChannel`, `registerSpeechProvider`), and plugins register implementations against those contracts. Core can reject duplicate ownership at startup; plugin shapes are classified as plain-capability, hybrid-capability, hook-only, or non-capability. This is a clean pattern for your silo system.[^10]

### Silo Capability Registration: What to Include

A production silo manifest registers four things:

1. **Tools** — function definitions with `name`, `description`, and `inputSchema` (JSON Schema). The LLM uses these for tool selection.[^8]
2. **Prompt context** — injectable system prompt fragments (e.g., "You have access to the user's Shopify store. Current date: …").[^3]
3. **Data connections** — sync jobs that populate RAG context (e.g., pull email threads into a vector store every 15 minutes).[^11]
4. **Auth config** — which OAuth provider, required scopes, vault reference IDs.[^7][^8]

### The Core vs. Plugin Boundary

This is the most important architectural decision and the one most teams get wrong by building too much into core. The boundary in production 2026 systems follows this pattern:

**Core platform owns:**
- Session and conversation management
- LLM routing and context window management
- Auth vault (credential storage and rotation)
- Plugin registry and capability resolution
- UX shell (the chat interface, notifications)
- Security enforcement (scope validation, tenant isolation)
- Observability and tracing

**Silo/plugin owns:**
- Tool definitions (what this integration can do)
- Domain-specific prompt context injection
- Data sync logic (what to pull and when)
- Webhook handlers (inbound events from the third-party service)
- OAuth flow configuration for its specific provider

The practical heuristic: anything that would break every other silo if it changed lives in core. Anything that is specific to a single integration lives in the silo. Email parsing logic is a silo concern. The vault that stores the Gmail OAuth token is a core concern.

---

## 2. Declarative Tool and Integration Definition

### JSON/YAML vs. Code: Both Have a Place

The spectrum in 2026 runs from fully declarative to fully programmatic, and the right position depends on who creates the integration:

- **Fully declarative (JSON/YAML):** Best for standard API integrations with CRUD-style operations. Microsoft's declarative agent framework lets you define agents entirely in YAML — no code — loaded via `AgentFactory.CreateFromYaml`. n8n's declarative node style defines properties, I/O, and operations in JSON. This is accessible enough for non-developers with a builder UI layered on top.[^12][^13]
- **Programmatic (TypeScript/Python):** Required for complex logic — custom transformations, conditional branching, stateful sync jobs. Nango's code-first model has developers write TypeScript sync functions that run on Nango's runtime, which then get versioned in git and deployed like normal code.[^14][^11]
- **LLM-generated (emerging):** Nango ships an AI Integration Builder that uses Claude, Gemini, or Codex to generate integration tool definitions from natural language descriptions. A developer says "I need a tool that fetches Shopify orders modified in the last 24 hours" and the LLM produces the JSON schema and sync function. This is the closest production example to "connect my Shopify" as an agentic primitive in 2026.[^11]

### Tool Permission Scoping

A silo should operate with least-privilege access enforced at multiple layers:

1. **OAuth scope declaration** — the silo manifest declares exactly which OAuth scopes it requires (e.g., `gmail.readonly` not `gmail.full`). The auth platform (Nango/Composio/core vault) enforces that the issued token has only those scopes.[^15]
2. **Tool-level scope attestation** — Microsoft's manifest schema has a `security_info` object per function that declares risk level and whether it can interact with other plugins. Functions without this property are blocked from cross-plugin actions.[^7]
3. **Namespace isolation** — when multiple silos are loaded, the MCP roadmap includes namespace isolation to control which tools are visible to which agents. In production today, this is enforced at the application layer by the plugin registry, not yet at the protocol level.[^2]
4. **Silo data boundary** — a silo should only have access to the data connections it registered. The core platform enforces this by scoping tool calls to the integration's credential context, never exposing another silo's tokens.

### Handling Tool Conflicts

When two silos register overlapping capabilities (e.g., both Calendar and Tasks silos can "create a reminder"), production systems use these resolution strategies:

- **Explicit ownership** — plugin registries like OpenClaw reject duplicate provider IDs at startup with actionable diagnostics. Force each silo to declare a unique namespace prefix (e.g., `calendar.create_event` vs `tasks.create_reminder`).[^10]
- **Intent-based routing** — the LLM's tool selection handles most conflicts naturally when descriptions are sufficiently differentiated. Research shows tool description quality is critical: 97.1% of analyzed MCP tool descriptions have at least one "smell" and 56% fail to state their purpose clearly. Write descriptions that name the specific system, not generic verbs.[^16]
- **Priority declaration** — silos can declare priority in their manifest for conflicting intents. Core resolves ties using the highest-priority registered handler.

---

## 3. Agentic Integration Building

### The State of "Connect My Shopify" as an Agentic Primitive

Full end-to-end agentic integration building — where a user says "connect my Shopify" and the AI orchestrates the OAuth flow, defines the tools, and schedules the sync — is partially real in 2026. Here's the breakdown:

- **OAuth flow orchestration:** Platforms like Composio and Nango handle the OAuth dance automatically once you've pre-registered a provider. Composio manages the full auth lifecycle — OAuth flows, token refresh, credential storage — for 500+ APIs without the app ever touching raw credentials. Nango provides a drop-in white-label Connect UI with per-user token isolation and automatic refresh. The user clicks "Connect Shopify," authenticates via Shopify's OAuth, and the platform stores the resulting tokens scoped to that user's identity.[^17][^18]
- **Tool definition generation:** Nango's AI Integration Builder (using Claude/Gemini/Codex) generates tool definitions and sync functions from natural language. You get most of the way to "AI sets up the integration" with this — but a developer still reviews and deploys the generated function. Fully unsupervised tool generation that runs in production is not yet the norm in 2026.[^11]
- **Sync job creation:** Once credentials exist, platforms like Nango auto-schedule the polling/sync job based on your sync configuration. This part is largely automated.[^14]

The gap in 2026 is the schema-mapping and tool-definition generation step. The OAuth plumbing is solved. The "create a Stripe dashboard" prompt generating a correct tool definition and deploying it autonomously — that requires human review before production deployment.

### OAuth-as-a-Service: Platform Comparison

For a consumer AI assistant that connects to many third-party APIs, the options in 2026 are:

| Platform | Architecture | Best For | Pricing Entry |
|---|---|---|---|
| **Nango** | Code-first, open-source, TypeScript sync functions | Full control, self-hostable, multi-tenant AI products | ~$50/mo |
| **Composio** | Managed, agent-native, 500+ APIs | Agents across many tools with minimal custom glue | Usage-based |
| **Merge** | Unified API (HRIS/CRM/ATS etc.), normalized schemas | Governance-first, compliance-heavy environments | Per-connection |
| **Paragon** | Embedded iPaaS + workflow builder, 130+ connectors | Complex multi-step workflows | Enterprise |
| **Arcade** | MCP-native runtime, lightweight | Chatbot-style agents that only need real-time actions | Early-stage |

For your use case — a consumer AI assistant with restaurant/business integrations (Toast POS, Stripe, Shopify) — **Nango** is the strongest fit: open-source, multi-tenant native, and explicitly designed to reuse integration logic as MCP tools. Composio is a close second if you want fully managed auth without code-first overhead.

### Webhook Ingestion for a Plugin System

The production architecture for inbound webhook handling in a plugin system is a **generic ingestion layer** that fans out to silo-specific consumers:[^21]

1. **Ingestion endpoint** — a single public URL (e.g., `/webhooks/{silo_id}`) accepts all inbound webhooks from third parties. This layer does signature verification, payload validation, and TLS termination only — no business logic.[^22]
2. **Queue** — verified payloads go into a message queue (SQS, Redis Streams, or a managed service). This decouples ingestion from processing, preventing slow consumers from blocking new events.[^22]
3. **Router** — a router reads from the queue and dispatches to the correct silo handler based on `silo_id` and event type. Hookdeck's fan-out pattern (multiple consumers sharing one source URL) is the cleanest managed option.[^23]
4. **Silo consumer** — the silo's own handler processes the event. It only ever sees events routed to it, enforcing the data boundary.

**Managed options in 2026:**
- **Hookdeck** — purpose-built inbound webhook proxy with filtering, retries, rate limiting, and fan-out routing. Best for teams that don't want to build webhook infrastructure.[^23]
- **Svix** — per-tenant webhook management with an embeddable self-serve portal for customers. Better suited when you're sending webhooks to users, not just receiving.[^23]

For your architecture: use Hookdeck for inbound webhooks from Stripe, Shopify, Toast etc. Route to silo handlers by matching the source name to the registered silo. The queue provides durability so a failed silo handler can be retried without losing the event.

---

## 4. Multi-Tenant Considerations

### Decisions to Make Now (Even When Single-User)

The most expensive multi-tenancy migrations happen when teams add `tenant_id` as an afterthought. The following decisions cost nothing to make now and prevent a painful rewrite later:

- **Add `user_id` (future `tenant_id`) to every table from day one.** Even in a single-user product, design every query to filter by user identity. When you add a second user, the query stays the same — you just start passing a different value.
- **Design services to be stateless.** Stateless services scale horizontally without re-architecture. Avoid in-memory user state; push it to the database with a user key.[^24]
- **Build the auth vault from the start.** Token storage that's secure enough for one user is secure enough for a thousand. Getting encryption right retroactively is harder than OAuth plumbing retroactively.
- **Use environment-scoped secrets from day one.** Doppler or similar tools prevent secrets sprawl and make the per-environment isolation required in multi-tenant systems easier to enforce.[^25]

### User Data Isolation: RLS vs. Schema-Per-Tenant vs. Database-Per-Tenant

The three strategies differ in isolation strength, operational cost, and migration difficulty:

| Strategy | Isolation Level | Operational Cost | Best For |
|---|---|---|---|
| **Shared DB + RLS** | Logical (DB enforced) | Low | Most consumer AI apps, early-stage SaaS |
| **Schema-per-tenant** | Logical + structural | Medium | B2B SaaS with different data models per customer tier |
| **Database-per-tenant** | Physical | High | Regulated industries, enterprise contracts requiring data residency |

**For your use case, start with PostgreSQL RLS.** AWS and Azure both have mature RLS implementations that push tenant filtering into the database engine — if application code forgets a `WHERE user_id = $1` clause, the database enforces it anyway. The setup:

```sql
-- Every table gets tenant_id / user_id
ALTER TABLE silo_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON silo_data
  USING (user_id::TEXT = current_setting('app.current_user'));
```

Set `app.current_user` at the start of every database session from your application middleware. RLS treats it as an automatic WHERE clause on every query. This is defense in depth — application-level filtering + database-level enforcement.[^28]

Migrate to schema-per-tenant only when you need different data models per customer tier (e.g., enterprise customers with custom fields) or when compliance requires structural isolation. At that point, the migration path is well-understood: add a schema router function, move tables, update connection strings per tenant context.[^27]

### Per-User OAuth Tokens and API Keys

OAuth tokens in a multi-tenant AI system are long-lived delegated credentials used by background workers — treat them as infrastructure secrets, not session data.[^29]

**Minimum production token storage schema:**

```
tokens:
  id (UUID PK)
  user_id (FK → users)
  silo_id (FK → silos)
  provider (e.g., "google", "shopify")
  access_token (encrypted, AES-GCM)
  refresh_token (encrypted, AES-GCM)
  expires_at (timestamp)
  scopes (array)
  status (active / expired / revoked)
  created_at, updated_at
```

Key principles from production systems:[^29]

- **Envelope encryption at rest** — encrypt tokens with a per-user key, and encrypt that key with a master key (HSM-backed). If one user's data is compromised, others are protected.
- **Never log tokens** — not in application logs, not in error reports, not in analytics pipelines.
- **Proactive refresh** — refresh tokens before they expire (typically at 80% of token lifetime), not reactively on 401 errors. Reactive refresh causes race conditions in concurrent background agents.
- **Bind token lookups to user context** — every token query must filter by `user_id`. Never fetch tokens in a loop without a user scope; this is how cross-tenant leaks happen at scale.
- **Separate service-level and user-delegated tokens** — your app's API key for a service and a user's OAuth token for that same service should live in different table rows with explicit type fields.

**For managed OAuth lifecycle**, consider **Nango** (handles storage, refresh, and isolation natively with multi-tenant support) or **Scalekit** (purpose-built OAuth lifecycle management for AI SaaS). For secrets management — your own API keys for LLM providers, database credentials, etc. — **Doppler** is the pragmatic choice for early-stage: fast setup, CI integration, and environment isolation without the operational overhead of HashiCorp Vault.

---

## Recommended Architecture for Your Silo System

Pulling everything together into a concrete architecture decision map:

### Core Platform Layer
- **Session + routing**: stateless Next.js or similar; all state in DB keyed by `user_id`
- **Plugin registry**: a `silos` table with manifest JSON (tools, auth config, prompt context fragments, sync config), loaded at session start
- **Auth vault**: Nango or Scalekit for third-party OAuth; Doppler for your own service credentials
- **LLM routing**: pass the active silos' tool manifests as MCP tool definitions; let the model select
- **Webhook router**: Hookdeck as inbound proxy, route by `silo_id`, queue-backed for durability

### Silo Manifest Schema (suggested)
```json
{
  "id": "shopify",
  "name": "Shopify Store",
  "version": "1.0.0",
  "auth": {
    "type": "oauth2",
    "provider": "shopify",
    "scopes": ["read_orders", "read_inventory"]
  },
  "tools": [
    {
      "name": "shopify.get_recent_orders",
      "description": "Fetches orders from the user's Shopify store modified in the last N hours. Use this when the user asks about store orders, sales, or recent purchases.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "hours": { "type": "number", "description": "Hours to look back" }
        },
        "required": ["hours"]
      }
    }
  ],
  "prompt_context": "The user has a Shopify store connected. You can access order history, inventory, and product data.",
  "sync": {
    "frequency": "15m",
    "entities": ["orders", "inventory"]
  },
  "webhooks": [
    { "event": "orders/create", "handler": "onNewOrder" }
  ]
}
```

### Data Isolation
- **Start with PostgreSQL RLS** on all silo data tables, scoped to `user_id`
- Every background job and tool execution sets `app.current_user` at the DB connection level
- Token table uses envelope encryption; per-user keys stored in your secrets manager

### Multi-Tenant Migration Path
- Single user today: shared DB + RLS, `user_id` on all tables, stateless services
- 10–1,000 users: same schema, RLS scales well, add connection pooling (PgBouncer/Supabase)
- Enterprise tier / regulated customers: promote to schema-per-tenant for those accounts, keep shared schema for standard tier
- Data residency requirements: database-per-region with tenant-routing at the application gateway layer

---

## Security Considerations

MCP's rapid adoption has outpaced security tooling. Key risks to design around now:

- **Tool poisoning**: ~5.5% of open-source MCP servers exhibit tool poisoning behaviors; validate any community-built silo manifest before loading. For user-created silos, run tool descriptions through a sanitization layer before passing to the LLM.[^1]
- **Description-code inconsistency**: 13% of real-world MCP servers have substantial mismatches between tool descriptions and actual behavior. Your plugin registry should include a contract test that calls each tool with known inputs and validates outputs.[^30]
- **Over-permissioned tools**: Gartner predicts inadequate identity controls will contribute to 25% of AI security breaches by 2028. Enforce least-privilege scopes at the OAuth authorization step — users should explicitly consent to each scope a silo requests.[^31]
- **Prompt injection via silo context**: malicious webhook payloads can carry prompt injection instructions. Sanitize all webhook data before injecting it into the LLM context window.[^32]
- **Token logging**: the most common production failure mode — a single `console.log(token)` or unredacted error sent to Sentry exposes delegated credentials for every affected user.[^29]
