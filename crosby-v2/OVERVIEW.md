# Crosby v2 — Vision & Core Principles

**Last updated: 2026-03-23**

---

## Why Rebuild?

v1 works and is genuinely useful, but the architecture has accumulated structural debt. The specialist/silo system was bolted on incrementally — the core chat was built first, and capabilities were layered on top. That order creates friction: the LLM foundation wasn't designed with modular capabilities in mind from the start.

v2 starts with the right foundation. More research, a complete plan, before writing a line of code.

---

## Core Shift in Thinking

**v1 mindset:** Chat is the core. Specialists/silos are extensions layered on top.

**v2 mindset:** Capabilities (what used to be called specialists/silos) ARE the core. The chat is the interface to them — not the other way around.

This is a subtle but important inversion. In v2, the foundational LLM layer is designed around the idea that it will always be operating within a set of active capability modules. The chat interface sits on top of that, not underneath.

---

## What Crosby Is

A personal AI executive assistant. One continuous conversation. Knows everything you've told it, everything in your connected accounts, and everything in your uploaded documents. Does work for you in the background without being asked.

---

## What We've Figured Out

All major questions have been answered across three completed phases:

- **Product discovery** — 23 feature areas fully specced with detailed PRDs, edge cases, and ripple effects
- **Architecture** — monorepo structure, database schema, auth, API routes, AI pipeline, system prompt, background jobs, realtime/notifications, shared types, build plan — all documented
- **Design system** — visual identity locked via interactive design lab. Typography (Fraunces + Plus Jakarta Sans + JetBrains Mono), colors (warm sepia + amber), spacing, motion, borders, radius, component stack (shadcn/ui + AI Elements + Motion + Tailwind CSS Motion) — all decided

**Status: Ready for build.**

---

## Key Principles (Draft)

1. **Plan first, code second.** Every major system gets designed on paper before implementation.
2. **Capabilities are first-class.** The architecture centers on capability modules, not on chat.
3. **Reliability over features.** If routing and tool use aren't rock solid, nothing else matters.
4. **Design for the product direction.** User-created silos are the future — the architecture should make that natural, not a retrofit.
5. **Don't rebuild what works.** RAG, memory extraction, the basic chat loop — these work. Rebuild the structure, not everything.
6. **Accessible by default.** WCAG 2.1 AA compliance. All interactive elements keyboard-navigable, proper ARIA labels, screen reader support, sufficient color contrast. Not a separate effort — baked into implementation standards from day one.

### Scope Decisions
- **Single-user only for v2.** Multi-user (household, team) is a future consideration.
- **English-only for v2.** Internationalization deferred.
- **No billing system at launch.** Monetization strategy TBD — v2 launches invite-only or free initially.
