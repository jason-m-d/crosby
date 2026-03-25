# Data Deletion & Privacy Model

## Core Principle
Crosby holds personal data across many systems. Deletion must be thorough but not paranoid — when you delete something, it actually goes away, and cascading effects are predictable.

## Deletion by Entity Type

### Memories
- Immediate deletion from Settings → Memory & Learning
- If memory was part of a supersession chain (newer replaced older), deleting the newer one does NOT resurface the old one. The chain loses a node; old stays superseded.
- Procedural memories (learned behaviors): deletion removes the behavior from the system prompt context. The model literally stops seeing it. Effectively a full reset — Crosby would have to re-learn from scratch. This is prompt removal, not a "confidence score" abstraction.

### Notepad Entries
- Immediate deletion. No cascade — notepad entries don't feed other systems.
- Expired notes (past Crosby-set expiry) are auto-deleted by a background cron, not just hidden.

### Contacts
- Promoted contact deleted → contact record deleted, entity resolution mappings cleared.
- Memories tagged with that contact retain the tag text (so "Roger prefers email" doesn't become orphaned gibberish) but the link to a contact record is severed. Memories themselves are NOT deleted — they're the user's memories, not the contact's.
- Shadow records: users can't see or delete these directly. Cleaned up by a staleness cron (no interaction in 6+ months → purged).

### Experts
- Expert record deleted, context associations cleared.
- Memories tagged with that Expert retain the tag as plain text. The model naturally infers the Expert no longer exists from the orphaned tag — no special logic needed.
- Notepad entries tagged with that Expert lose the active link but retain tag text.
- Artifacts tied to that Expert remain on the Documents page (Artifacts tab), just untagged.
- Dashboard widgets tied to that Expert get soft-deleted into the holding bay.

### Artifacts
- Soft-deleted into 1-month holding bay (consistent with dashboard widget behavior).
- After 1 month → hard deleted. RAG embeddings purged.
- One-line tombstone retained indefinitely ("sales proposal for Acme, created March 2026") so Crosby can say "you had one but deleted it" rather than gaslighting.

### Documents
- Document file deleted from storage, RAG embeddings purged immediately.
- Same one-line tombstone as artifacts.

### Conversation Messages
- Individual messages: NOT deletable. The timeline is a continuous record. Crosby's memory and context depend on conversation history — selective message deletion creates integrity problems.
- Sessions: also not individually deletable.
- If the user wants Crosby to "forget" something, they delete the memory extracted from it, not the message itself.

### Email Data
- Email lives in its own data layer (not memory). Disconnect Gmail → email data purged (messages, scan results, metadata).
- All-or-nothing. No selective email deletion within Crosby.
- Memories that were sourced from email scans are RETAINED — they live in the memory system, not the email data layer. They're the user's memories, not email data.

### Calendar Data
- Same pattern as email. Disconnect Google Calendar → all calendar data purged.

## Account Deletion
- Full nuke. Everything: messages, memories, contacts, notepad, artifacts, documents, email data, calendar data, Experts, dashboard, settings, background job history, learned behaviors.
- Account suspended immediately upon request.
- Hard-deleted after 24-hour grace period (allows "I didn't mean to").
- Confirmation: "This deletes everything permanently. Type BYE BYE CROSBY to confirm."
- After deletion: Crosby retains nothing. No anonymized data, no analytics retention.

## Retention Policies
- Superseded memories: Kept indefinitely (historical record). Only deleted if user explicitly deletes them.
- Expired notepad entries: Auto-purged by cron after expiry. No retention.
- Soft-deleted artifacts/widgets: 1 month in holding bay, then hard-deleted. One-line tombstone kept indefinitely.
- Background job logs: Purged after 90 days. No user-facing visibility into old job logs.
- Shadow contacts: Purged after 6 months of no interaction.

## Not Building for v2
- **Data export:** Not at launch. Could add later.
- **Granular message deletion:** Intentionally excluded due to integrity risks.
- **Anonymization:** No analytics pipeline, nothing to anonymize.

## Design Decisions & Rationale
- Messages not deletable → delete the memory instead. This preserves timeline integrity while giving users control over what Crosby "knows."
- Connection disconnect = full data purge. Clean mental model — disconnect means the data is gone.
- Tombstones for artifacts/documents → prevents gaslighting ("I have no record of that"). Crosby should acknowledge things existed.
- Email/calendar memories survive disconnect → memories are the user's knowledge, not the integration's data.
- "BYE BYE CROSBY" confirmation → personality-appropriate alternative to generic DELETE confirmation.
