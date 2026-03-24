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

## What We're Figuring Out

*(This section grows as research and decisions are made)*

- What does the right data model look like for a modular capability system?
- How should the AI pipeline be structured so routing + tool use is reliable?
- What's the right way to architect background jobs so they're not bolted on?
- How do we build for the consumer product direction (silos users create) without over-engineering v2?

---

## Key Principles (Draft)

1. **Plan first, code second.** Every major system gets designed on paper before implementation.
2. **Capabilities are first-class.** The architecture centers on capability modules, not on chat.
3. **Reliability over features.** If routing and tool use aren't rock solid, nothing else matters.
4. **Design for the product direction.** User-created silos are the future — the architecture should make that natural, not a retrofit.
5. **Don't rebuild what works.** RAG, memory extraction, the basic chat loop — these work. Rebuild the structure, not everything.
