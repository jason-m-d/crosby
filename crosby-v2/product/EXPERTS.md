# Experts — Product Discovery Notes

*Part of the product discovery phase. To be formalized into a spec later.*
*Last updated: 2026-03-23*

---

## What an Expert Is

An Expert is a named, persistent context workspace around a topic or project. The closest analogy is GPT Projects — but integrated into a single continuous conversation rather than being a separate chat product.

Experts are **not** a separate app mode. They're a feature of Crosby that lives alongside the main conversation.

---

## The Two Access Modes

### 1. Direct (focused)
- Click into the Expert from the Experts list/page
- Dedicated conversation thread inside the Expert
- All Expert context is active

### 2. Ambient (summoned into main chat)
- User mentions the Expert in the main conversation: "let's work on our marketing"
- Crosby pulls the Expert's context into the main chat automatically
- No need to navigate anywhere — the main chat is always home base
- Weeks can pass, user can discuss other things, then summon the Expert back

Both modes should feel identical from a capability standpoint.

---

## Context Loading Model (Resolved)

When an Expert is active (either mode), Crosby loads context in a hierarchy:

### Tier 1 — Always in context (small, high-signal)
- Expert's **core instructions** — behavioral rules, formatting preferences, domain-specific directives (e.g., "always analyze houses in this order: school district → lot size → price per sqft")
- Expert **summary** — 2-4 sentences describing the project, current state, key parameters (e.g., "House Hunter: evaluating properties in San Gabriel Valley, budget $1.2M, priorities are school district and lot size")

### Tier 2 — Retrieved on demand (RAG)
- Uploaded files and documents
- Past Expert conversation history
- Retrieved against the current query, not dumped wholesale

### Importance Scoring
- A background cron job runs periodically to assign importance scores to Expert content
- High-importance facts get promoted to Tier 1 (always loaded)
- Low-importance content stays in Tier 2 (RAG only)
- This is the mechanism that keeps Tier 1 small and signal-dense over time

### Behavior Change
- Expert instructions that change *how Crosby behaves* are the most important (tier 1 always)
- Trivial instructions ("be friendly") are low priority — the Expert's domain instructions matter more
- When a House Hunter Expert is active, Crosby should automatically apply the property analysis format, reference the budget/criteria, and prioritize relevant context — without the user having to re-explain

---

## Expert Lifecycle

### Creation
- **Automatic**: Crosby detects a coherent topic cluster forming over multiple conversations and proactively suggests creating an Expert ("I notice we've been talking about marketing your restaurants a lot — want me to create a Marketing Expert to keep all of this organized?")
- **On demand**: User asks Crosby to create one ("create a project for the Upland property deal")
- **Manual**: User creates one from the UI directly

### Management
- Crosby can create, edit, and delete Experts — both automatically and when asked
- User can also manage them manually from the UI
- No fixed limit on number of Experts per user

### Typical Scale
- Varies widely by user — could be 3 or could be 50
- UI needs to handle both ends gracefully (not assume a small fixed list)

---

## Experts vs. Contacts

| | Experts | Contacts |
|---|---|---|
| What it is | A workspace / project context | A person Crosby knows about |
| Created by | User or Crosby | Crosby (auto) or user |
| Has conversation history | Yes | No (but Crosby's memory includes interaction history with that person) |
| Changes Crosby's behavior | Yes | Informs responses, doesn't change behavior |
| UI surface | Experts page / list | Contacts list (address book) |
| Analogy | GPT Projects | Address book entry |

---

## Open Questions

- [ ] What does the Expert picker/list UI look like? Card grid? Sidebar list?
- [ ] When Crosby auto-creates an Expert, does it ask for confirmation first or just do it?
- [ ] Can an Expert have sub-topics / nested structure, or is it flat?
- [ ] Does the Expert's dedicated thread share Crosby's full memory, or is it scoped?
- [ ] How does the user know which Expert (if any) is currently active in the main chat? Is there a visual indicator?
- [ ] Can multiple Experts be active simultaneously in the main chat? (e.g., "let's work on marketing for the Upland property" — both Marketing Expert and Upland Property Expert)
