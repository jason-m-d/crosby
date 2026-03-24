# Self-Aware App Manual — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

Crosby has a comprehensive internal manual embedded in its own RAG system. It's the source of truth for everything Crosby knows about itself — every feature, every tool, every background process, every limitation, and how everything connects.

When the user asks "can you do X?", "how does Y work?", or "what should I use for this?", Crosby searches its own manual the same way it searches uploaded documents. It's genuinely self-aware about its own capabilities — not guessing, not hallucinating features that don't exist, not missing features that do.

---

## Why It Matters

Without the manual, Crosby has two failure modes:

1. **Claims it can do something it can't.** User asks, Crosby guesses yes, user tries, it fails. Trust broken.
2. **Doesn't know it can do something it can.** User asks, Crosby says no or gives a vague answer, user never discovers the feature. Value lost.

The manual eliminates both. Crosby can confidently answer any question about itself because it has authoritative documentation to reference.

---

## What It Covers

The manual is exhaustive. It covers:

### Features & capabilities
- What every feature does, in detail
- How to use each feature (what to say, what to tap, what to expect)
- What each feature *cannot* do — explicit limitations

### Feature interactions
- How features connect to each other ("if you set up a watch, it connects to email scanning and will notify you when the reply arrives")
- Cross-feature workflows ("when you upload a document to an Expert, it gets chunked and embedded so Crosby can reference it in that Expert's context")
- Which features feed into which ("Training & Learning observes your briefing interactions and adjusts what gets included over time")

### Recommendations
- When to use which feature ("for quick temporary notes, use the notepad. For permanent facts, tell me to remember it")
- Best practices ("Experts work best when you give them specific instructions rather than broad topics")
- Common patterns ("most users set up a morning briefing first, then add watches as things come up")

### Tools & background processes
- Every tool Crosby has access to and what it does
- Every background job/cron and what it monitors
- How the overnight builder works and what it can create

### Architecture (user-facing)
- How the dashboard works, what widgets can show
- How the sidebar works (artifacts, contacts, notepad)
- How the chat timeline works (message types, cards, structured questions)
- How notifications work and how to configure them

### Limitations
- What Crosby explicitly cannot do
- What requires external setup (OAuth connections, API keys)
- Rate limits or constraints the user should know about
- Features that are planned but not yet built

---

## How It's Stored

### One document per feature area

The manual is split into separate documents by feature area — not one giant doc. Each document covers one feature comprehensively.

**Why:** Smaller, focused chunks produce more precise RAG retrieval. When the user asks "how do watches work?", Crosby pulls the watches manual entry, not a random chunk from a monolithic doc that happened to mention watches.

### RAG embedding

Each manual document is chunked and embedded the same way uploaded documents are. Crosby searches its own manual using the same RAG pipeline it uses for user documents.

Manual documents are tagged with a `source: app_manual` or equivalent marker so they can be distinguished from user-uploaded content in search results.

---

## How It Stays Current

### Automatic updates

The manual is a living document that updates automatically when features change. No developer maintenance required.

**How it works:**
- When a new feature ships or an existing feature changes, the manual entry for that feature is regenerated automatically.
- The regeneration process reads the current state of the feature (code, configuration, tools, routes) and produces an updated manual entry.
- The updated entry is re-embedded for RAG.

**The goal:** Zero drift between what the app does and what Crosby thinks the app does. At any point in time, the manual accurately reflects the current state of the product.

### Implementation approaches (to be decided during build)

Several approaches could work:
- **Build-time generation:** Manual entries regenerated as part of the build/deploy pipeline. Every deploy produces a fresh manual.
- **Feature-flag-aware:** Manual entries know about feature flags and only document features that are currently active.
- **Code-derived:** Manual generation reads tool definitions, route handlers, and cron configs to produce accurate documentation automatically.

The exact mechanism is an implementation detail. The requirement is: manual stays current without manual effort.

---

## How It's Used

### Separation of concerns

| Layer | What it tells Crosby |
|---|---|
| System prompt | How to behave — personality, tone, rules, interaction patterns |
| App manual (RAG) | What it is and what it can do — features, capabilities, limitations, recommendations |

The system prompt doesn't list features or explain how they work. It tells Crosby to search the manual when asked about itself. The manual is the single source of truth for capability questions.

### Retrieval

- When the user asks about Crosby's capabilities, Crosby searches the manual via RAG.
- The system prompt instructs Crosby to always search the manual for self-referential questions rather than answering from general knowledge.
- Results are used to construct a confident, accurate answer.

### Confidence

Because the manual is authoritative:
- Crosby can say "yes, I can do that — here's how" with confidence.
- Crosby can say "no, I can't do that" with confidence, rather than hedging.
- Crosby can recommend the right feature for a need because it understands how all features are designed to work.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| RAG pipeline | Manual uses the same chunking and embedding pipeline as user documents. Tagged with source marker. |
| Documents | Manual entries are distinct from user-uploaded documents. They don't appear in the Documents page — they're internal to Crosby. |
| System prompt | Prompt tells Crosby to search the manual for capability questions. Prompt handles behavior; manual handles knowledge. |
| Training & Learning | The "What Crosby has learned" section in settings is separate from the manual. The manual is about features; learning is about user preferences. |
| Onboarding | During onboarding, the manual enables Crosby to explain what it can do and guide the user through setup. |
| Structured questions | When Crosby recommends a feature, it can use structured question cards to help the user choose. |

---

## Ripple Effects

- **Build/deploy pipeline** — Needs a manual regeneration step. Every deploy should produce an up-to-date manual.
- **RAG pipeline** — Manual documents need a source tag to distinguish from user content.
- **System prompt** — Needs instruction to search manual for self-referential questions.
- **Feature development** — When building any new feature, the manual generation needs to pick it up automatically. This influences how features are structured (e.g., tool definitions should be self-describing).

---

## Open Questions

- [ ] Should the user be able to see the manual? Like a "help" section that surfaces manual content in a browsable format? Or is it purely behind-the-scenes RAG?
- [ ] Should the manual include information about the user's specific setup? E.g., "you have 3 Experts configured" or "your email is connected via Gmail." Or should it only cover generic feature documentation?
- [ ] How does the manual handle features that work differently based on configuration? E.g., if the user has disabled nudges, does the manual say "nudges are disabled" or "nudges can be configured in settings"?
