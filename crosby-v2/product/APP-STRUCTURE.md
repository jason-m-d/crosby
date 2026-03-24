# App Structure — Product Discovery Notes

*Last updated: 2026-03-23*

---

## Default Navigation (3 pages)

1. **Chat** — default view, home base, the main timeline
2. **Documents** — file browser, uploaded docs, OCR'd PDFs
3. **Settings** — notifications, briefing config, training preferences, integrations

That's it. Nothing else by default.

---

## What Lives Inside Crosby (Not in Nav)

These features exist and are fully functional, but have no dedicated page in the default UI. They're managed entirely through conversation and inline chat cards:

- Tasks / Action Items
- Contacts
- Commitments
- Watches / Monitors
- Decisions
- Experts (accessible through chat, may eventually get a nav entry)
- Notepad (internal to Crosby)

The simplicity is intentional. Crosby is not a task manager with AI bolted on. It's an AI that manages tasks. The nav reflects the core value prop — you talk to it, it handles the rest.

---

## The "Crosby Edits Its Own UI" Concept

Users can ask Crosby to add pages or views to their nav. Example: "add a tasks page" → Crosby generates and adds a Tasks page to the user's navigation.

This is the extensibility/silo system applied to the UI layer. Not in scope for initial v2, but a key part of the long-term product direction. Crosby's default simplicity sets this up — the three default pages feel intentional, not incomplete.

**Implications for architecture:**
- Nav structure should be data-driven, not hardcoded
- Pages should be composable — Crosby needs to be able to generate and register new page types
- Each user can have a different nav based on what they've asked for

---

## Experts and the Nav

Experts are currently chat-native (summoned by mention, or accessed via click from within chat). Whether Experts eventually get their own nav entry is an open question — but the default should be no dedicated nav entry. The chat is the access point.

---

## Documents Page (Resolved)

- **Flat list with search** — no folders, no hierarchy. You search for what you need.
- **All uploads appear here** regardless of where they were uploaded:
  - Uploaded directly on the Documents page
  - Attached via the chat paperclip
  - Uploaded into an Expert/project
- Files are **tagged by source** (Expert name, chat upload, direct upload) so you can see where they came from
- Crosby surfaces relevant documents automatically via RAG in the main chat — this works for Expert-specific documents too, even when that Expert isn't actively summoned. If a document is relevant to the query, it gets pulled in.

**Ripple effects:**
- The tagging system means the data model needs an `origin` or `source` field on documents (Expert ID, "chat", "direct")
- RAG needs to work across all documents regardless of Expert association — no scoping by default
- If Experts can be deleted, what happens to their documents? Probably: documents persist, lose the Expert tag

---

## Open Questions

- [ ] Where does the Experts list live if not in the nav? Inside the chat sidebar? A sheet/modal triggered from the chat?
- [ ] Does Settings have sub-sections? What are they?
- [ ] On mobile — same three-tab structure, or different?
- [ ] When an Expert is deleted, do its documents persist on the Documents page (untagged)?
