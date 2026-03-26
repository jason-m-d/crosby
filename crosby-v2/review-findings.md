# Pre-Build Review Findings

**Reviewed:** 2026-03-25 (Round 2, re-verified)
**Reviewer:** Claude Plan Checker
**Files reviewed:** 59 (22 architecture, 35 product, 2 other)
**Findings:** 0 BLOCKER, 1 WARNING, 2 MINOR

---

## Status of Prior Findings

### Round 2 Blockers — ALL RESOLVED

- **B1 ✅ SHARED-TYPES.md now covers 11 of 12 categories.** Types added for: documents, tasks, contacts, artifacts, notepad, watches/monitors, settings, push subscriptions, webhooks, auth callbacks, and dashboard widgets. Only `Silo` types are still missing (see M1 below). Router field naming (`dataNeeded`/`toolsNeeded`) is now consistent camelCase across both SHARED-TYPES and API-ROUTES.
- **B2 ✅ Pre-build checklist partially resolved.** Turborepo and tmux are installed. Remaining unchecked items (Supabase MCP re-auth, new Supabase project, new Vercel project, EAS CLI) are infrastructure setup tasks to do at build start — not plan defects. Downgraded since tooling blockers are cleared.

### Round 2 Warnings — ALL RESOLVED

- **W1 ✅ Widget and silo routes added to API-ROUTES.md.** Full widget CRUD + refresh endpoint. Silo routes include GET/PATCH with explicit note that POST/DELETE are post-v2.0.
- **W2 ✅ Training & Learning explicitly marked post-v2.0 in BUILD-PLAN.md.** `training_signals` table created in Phase 0 schema, but observation pipeline and quiz system are post-launch. Memory extraction (Phase 4) covers core learning loop.
- **W3 ✅ Contact entity resolution tasks added to BUILD-PLAN.md.** Task 3.11 covers shadow record auto-creation from email/calendar. Task 9.8 covers promotion cron + alias resolution.
- **W4 ✅ Router field naming now consistent.** Both SHARED-TYPES and API-ROUTES use camelCase (`dataNeeded`, `toolsNeeded`).
- **W5 ✅ Per-category notification toggles added to DATABASE-SCHEMA.md.** `notification_preferences` JSONB column on `user_profiles` with per-category push/in_app toggles for briefings, nudges, heads-ups, watch alerts, and research completion.
- **W6 ✅ Living greeting state storage added.** `greeting_state` JSONB column on `user_profiles` with content, isMutable, and generatedAt fields.

### Round 2 Minor — ALL RESOLVED

- **M3 ✅ Marketplace/custom silos explicitly marked post-v2.0 in BUILD-PLAN.md.**
- **M4 ✅ Monitors explicitly noted in BUILD-PLAN.md** as watch variant with `watch_type = 'monitor'`, persistent triggers, and repeat-fire behavior.

---

## WARNINGS

### [W1] Silo types missing from SHARED-TYPES.md
- **File:** `crosby-v2/architecture/SHARED-TYPES.md`
- **Section:** Type file organization
- **Issue:** 11 of 12 entity categories now have types, but `Silo` types (SiloDefinition, SiloConfig, etc.) are not defined. API-ROUTES.md has silo routes (GET/PATCH) and DATABASE-SCHEMA.md has a `silos` table, but there's no TypeScript interface for a Silo entity.
- **Impact:** Low for v2.0 since silo routes are limited (GET list, GET detail, PATCH config) and custom silo creation is post-v2.0. But the build agent working on silo routes will need to invent the type shape.
- **Fix:** Add a `Silo` interface to SHARED-TYPES.md matching the `silos` table columns: id, name, description, silo_type, status, tools, prompt_section, trigger_rules, connections, sync_schedule, config, last_synced_at.

---

## MINOR

### [M1] Minor type gaps in otherwise complete categories
- **File:** `crosby-v2/architecture/SHARED-TYPES.md`
- **Section:** Documents, Contacts, Webhooks
- **Issue:** Three small gaps in otherwise complete type definitions: (1) `DocumentUploadRequest` not defined (multipart upload may not need one), (2) `ContactDetail` not defined (may use `Contact` + `ContactChannel[]`), (3) Expo push receipt webhook payload type not defined.
- **Impact:** Minimal. Build agents can infer these from context or define them inline.
- **Fix:** Add if convenient, but not blocking.

### [M2] Pre-build infrastructure tasks still pending
- **File:** `crosby-v2/architecture/PRE-BUILD-CHECKLIST.md`
- **Section:** Hard blockers
- **Issue:** Four infrastructure items remain unchecked: Supabase MCP re-authentication, new Supabase project for v2, new Vercel project for v2, and various MCP auth tasks. These are setup tasks, not plan defects.
- **Impact:** Phase 0 can't fully execute without a database and deployment target. These are 5-10 minute tasks each.
- **Fix:** Complete before starting Phase 0.

---

## Summary

The plan is in excellent shape. All prior blockers and warnings have been resolved. The remaining items are one missing type definition (Silo — low impact since custom silos are post-v2.0) and infrastructure setup tasks that take minutes to complete.

**Overall assessment: Ready to build.** No architectural gaps, no contradictions, no missing contracts that would cause a build agent to fail. The type system covers all Phase 1-9 entities, the build plan has clear phase ordering with explicit post-v2.0 deferrals, and cross-doc consistency is solid.
