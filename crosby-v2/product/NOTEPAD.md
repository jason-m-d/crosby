# Notepad — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

The notepad is Crosby's visible working memory. It's scratch space for temporary context that needs to survive beyond the current context window but isn't permanent enough for memory. The user can see it, but Crosby is the primary writer.

This is the implementation of the "working memory" type from the memory model. The four-type memory system becomes: semantic, episodic, and procedural (persistent memory) + working (notepad). Clean separation — permanent stuff goes in memory, temporary stuff goes in the notepad.

---

## Core Model

- **Crosby-owned, user-visible.** Crosby creates most entries as part of its working process. The user can see everything by opening the sidebar.
- **Ephemeral by design.** Every entry has an expiry set by Crosby based on what it thinks the relevance window is. Entries expire silently unless pinned.
- **Expert-tagged.** When Crosby creates a note while an Expert is active, the entry is tagged with that Expert. When the user opens the notepad with an Expert active, related notes surface at the top, with the rest below.
- **Not a staging area for memory.** Notepad and memory are separate destinations. Crosby classifies at the moment of capture and puts information in the right place. No promotion workflow, no expiry review cycle.

---

## What Goes Where

Classification happens at capture time based on the nature of the information, not the verb the user uses.

| Information type | Destination | Examples |
|---|---|---|
| Durable facts, preferences, relationship context | Persistent memory | "Mike prefers email over phone", "Jason's lawyer is Sarah Chen" |
| Working context, intermediate task state, temporary holds | Notepad | "Holding three vendor bids for comparison", "Need to check back on lease terms after Sarah responds" |
| Active reminders, things that need follow-up | Task system | "Ask Sarah about the lease terms", "Follow up on the bid by Friday" |

**User language mapping:**
- "Remember this" / "don't forget" → persistent memory
- "Take note" / "jot this down" / "hold onto this" → notepad
- Ambiguous → Crosby classifies based on content. Durable facts default to memory (safer — losing a permanent fact is worse than cluttering memory).

---

## Note Structure

Each notepad entry has:

| Field | Description |
|---|---|
| Content | The note itself — plain text, can be multi-line |
| Created date | When the entry was created |
| Source | `crosby` (created during working process) or `user-requested` (user explicitly asked Crosby to note something) |
| Expert tag | Which Expert was active when created, if any. `null` for general context |
| Expiry | Set by Crosby per entry based on estimated relevance window. No fixed default — Crosby decides |
| Pinned | Boolean. Pinned notes never expire. User or Crosby can pin |

---

## Expiry

- **Crosby sets expiry per note.** A note about intermediate math in a calculation might expire at session end. A note about vendor bids for an active deal might get 14 days. Crosby judges based on context.
- **Pinned notes never expire.** User can pin from the sidebar. User can also tell Crosby to pin a note ("keep that note").
- **Expired notes disappear silently.** No notification, no review prompt. The point is that temporary things go away on their own.
- **If the user wants something permanent, it should be memory, not a pinned note.** Pinning is for extending the life of something that's still temporary but needed longer than Crosby estimated. If a note is pinned indefinitely, it's probably a sign it should have been memory — but Crosby doesn't nag about this.

---

## UI

### Sidebar

The notepad lives in the right sidebar as a tab alongside Artifacts and Contacts.

- **Sidebar trigger:** Small icon in the top right corner of the screen. Always visible, minimal, not distracting.
- **Tab memory:** The sidebar remembers which tab the user was last on and opens to that tab.
- **Notepad tab contents:** A list of notes, each showing content (possibly truncated), created date, source indicator, and Expert tag if applicable. Pinned notes marked visually.
- **Expert filtering:** When an Expert is active, notes tagged with that Expert surface at the top of the list. Remaining notes show below, not hidden.
- **User actions in sidebar:** Read, edit, delete, pin/unpin any note.

### Chat Timeline

- **"Noted" indicator:** When Crosby creates a notepad entry mid-conversation, a subtle inline indicator appears in the timeline (similar to a system message, not a full card). Just enough to signal "I wrote something down" without interrupting flow.
- **No card for notepad entries.** Notes are background activity, not conversation content. The indicator is a breadcrumb, not a message.

### User interaction via chat

The user can manage notes through conversation:
- "Take note of this" → Crosby creates an entry
- "What's on your notepad?" → Crosby summarizes current entries
- "Delete that note" / "drop that" → Crosby removes the entry
- "Pin that note" / "keep that one" → Crosby pins it
- "Actually remember that permanently" → Crosby moves it to persistent memory and removes the notepad entry

---

## What Crosby Uses It For

Examples of what Crosby writes to the notepad during its working process:

- **Multi-step tasks:** "Holding three vendor quotes: A ($12k), B ($15k), C ($11k) — waiting for Jason to decide"
- **Active research:** "Comparing lease terms across two properties — need the updated square footage from the landlord"
- **Cross-message context:** "Jason mentioned he wants to revisit the staffing plan after the Q2 numbers come in"
- **Intermediate state:** "Pulled 47 emails matching the search — narrowing down to the 6 with attachments"
- **Expert working context:** "For the restaurant deal: Jason wants to see the buildout timeline before signing. Sarah is drafting the rider."

These are things Crosby needs to track but that don't belong in permanent memory — they're situational and time-bound.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Persistent memory | Separate destination. Memory = permanent facts/preferences/patterns. Notepad = temporary working context. No promotion workflow between them. |
| Context window | The notepad survives beyond the context window. Things in the context window are ephemeral to the current request; notepad entries persist across sessions until expiry. |
| Tasks | Tasks are actionable items with follow-up. Notepad entries are context, not actions. "Compare the three bids" is a task. "The three bids are $12k, $15k, $11k" is a notepad entry. |
| Experts | Notes are tagged with the active Expert at creation time. Expert-specific notes surface first when that Expert is active. Notes are never siloed — all notes are visible regardless of Expert context. |
| Artifacts | Artifacts are Crosby-created documents (reports, plans, etc.) displayed in the sidebar. Notes are short working entries. If something grows complex enough to need structure, it becomes an artifact, not a long note. |

---

## Ripple Effects

- **Chat timeline** — New content type: "noted" indicator (subtle inline system message when Crosby creates a notepad entry)
- **Sidebar** — Becomes a three-tab panel: Artifacts, Contacts, Notepad. Needs a persistent trigger button (top right icon). Tab state persists.
- **Memory spec** — Working memory type is now explicitly "the notepad." Remove or redirect any references to working memory as a separate storage mechanism.
- **Expert spec** — Experts gain notepad integration: notes tagged with Expert context, surface first when Expert is active.
- **Tools** — Crosby needs notepad tools: `create_note`, `list_notes`, `update_note`, `delete_note`, `pin_note`. These are internal tools, not user-facing.

---

## Open Questions

- [ ] Should Crosby's "noted" indicator in the timeline be tappable to open the sidebar to that note?
- [ ] Is there a maximum number of active (non-expired) notes before Crosby should consolidate or warn?
- [ ] When an Expert is archived, do its tagged notes expire immediately or keep their original expiry?
- [ ] Should the notepad be included in the app manual RAG so Crosby can explain what the notepad is when asked?
