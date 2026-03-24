# Training & Learning — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

Training & Learning is how Crosby gets smarter over time. It's the input pipeline — how Crosby observes, captures, and stores behavioral signals that change how it acts. The longer you use Crosby, the better it understands what matters, what doesn't, and how you work.

This is not a feature the user interacts with directly. It's the system behind the scenes that makes every other feature feel more personalized over time. The user experiences it as: "Crosby stopped doing that annoying thing" and "Crosby somehow knew I'd want that."

---

## Input Signals

Crosby learns from everything. No signal is off limits.

### Engagement signals
- **Taps / clicks** — What the user interacts with on briefing cards, nudges, dashboard widgets
- **Dismissals** — What the user swipes away, ignores, or explicitly dismisses
- **Dwell time** — How long the user looks at a card or section before moving on
- **Ignores** — Things surfaced that the user never interacts with at all

### Content signals
- **Edits to drafts** — When Crosby drafts an email and the user changes the tone, subject line, or content before sending. The delta between what Crosby wrote and what the user sent is a strong signal.
- **Edits to artifacts** — Same pattern. If the user rewrites a section of an artifact, Crosby learns how they'd prefer it written.
- **Tone of voice** — How the user communicates in chat. Casual? Direct? Terse? Crosby mirrors and adapts.
- **Tone corrections** — When the user explicitly says "make it more formal" or "that's too stiff" — direct training on voice.

### Behavioral signals
- **Task follow-through** — Does the user complete tasks Crosby creates, or delete them? High delete rate on a category = stop capturing that type.
- **Repeated questions** — If the user asks the same thing multiple times, the answer wasn't retained, wasn't good enough, or should be surfaced proactively next time.
- **Corrections** — "No, not that one" / "I meant the other store" — direct error signal.
- **Time-of-day patterns** — When does the user engage? What do they look at first? When do they stop responding?

### Meta signals
- **Feature usage** — Which tools does the user invoke? Which does the user never use?
- **Dashboard interaction** — Which widgets get looked at daily? Which get ignored after the first week?
- **Quiz responses** — Direct explicit training (see below).

---

## How Learning Is Stored

What Crosby learns becomes **procedural memory** — the behavioral pattern type from the memory spec. Procedural memories have trigger-based lookup: when a relevant situation arises, the learned behavior activates.

Examples of procedural memories created from learning:

| Signal | Procedural memory created |
|---|---|
| User always edits email subject lines to be shorter | "When drafting emails, use short direct subject lines (5-8 words)" |
| User dismisses operations items in briefings 90% of the time | "De-prioritize operations metrics in briefings unless explicitly asked" |
| User edits artifact tone from formal to conversational | "When writing artifacts, default to conversational tone" |
| User completes sales-related tasks but deletes admin tasks | "Capture sales-related action items proactively. Be conservative with admin task creation." |
| User corrects Crosby's vendor disambiguation 3 times | "When user says 'the vendor', they mean [current active vendor in context], not [other vendor]" |

### Confidence model

Each learned behavior has a confidence level based on signal strength and consistency:

- **Low confidence** — One or two signals in the same direction. Crosby adjusts slightly but doesn't commit.
- **Medium confidence** — Consistent pattern across 5+ instances. Crosby changes behavior but doesn't announce it.
- **High confidence** — Strong, consistent pattern over weeks. Crosby acts on it automatically.

Low-confidence learnings are candidates for quiz session questions — areas where Crosby has a hunch but isn't sure enough to act on.

---

## Explicit Training: Quiz Sessions

Crosby proactively offers teaching sessions — short, structured Q&A to resolve areas of uncertainty.

### How it works

1. **Trigger:** Crosby has accumulated enough low-confidence learnings or unresolved ambiguities to justify asking.
2. **Cadence:** Roughly once a week, but only when Crosby actually has questions. If it's confident about everything, no quiz happens.
3. **Surfacing:** A card appears in the chat timeline: "I have a few questions to help me learn — want to do a quick teaching session?" User can tap to start or defer.
4. **Format:** Structured question cards — option chips, not open-ended text. Fast to answer. Example: "When you get emails from vendors, do you want me to: [Flag all of them] [Only flag urgent ones] [Stop flagging them]"
5. **Length:** 3-8 questions max per session. Short enough to not feel like a chore.

### Deferral behavior

- If the user defers, Crosby tries again later — spaces out further with repeated deferrals but doesn't stop on its own.
- The user can explicitly tell Crosby to stop offering quiz sessions. Crosby respects this permanently (until the user re-enables it).
- Deferred questions don't expire — they stay in the queue until asked or until Crosby resolves the uncertainty through observation.

### What gets asked

Questions come from areas of genuine uncertainty:

- Inconsistent behavior ("sometimes you dismiss these, sometimes you engage — which do you prefer?")
- New feature areas Crosby hasn't learned about yet
- Ambiguities that observation alone can't resolve ("do you want me to draft replies to these automatically or just flag them?")
- Situations where the stakes of guessing wrong are high

---

## How Learning Manifests

Learning changes Crosby's behavior across every feature. The changes are **quiet by default, announced for significant changes.**

### Quiet changes (no announcement)
- Briefing content shifts — de-prioritizing categories, reordering sections
- Nudge threshold adjustments — less aggressive on things the user doesn't engage with
- Draft tone calibration — gradually matching the user's voice
- Task capture sensitivity — stopping task creation for categories that get deleted
- Email flagging adjustments — narrowing or widening what gets surfaced

### Announced changes (Crosby mentions it)
- Stopping an entire category of nudges
- Restructuring the briefing format
- Changing a default behavior the user might notice and wonder about
- Adding a new proactive behavior that wasn't there before

The threshold: **would the user notice and wonder what happened?** If yes, announce it.

---

## Visibility: Settings Panel

In Settings, alongside the memory browser, there's a dedicated **"What Crosby has learned"** section.

### What it shows
- A readable list of Crosby's learned behavioral rules, grouped by category (email, briefings, tasks, tone, etc.)
- Each entry shows: the learned behavior, confidence level, and roughly when/how it was learned
- Plain language, not internal system details — "You prefer short email subject lines" not "procedural_memory_id_47: email.subject.length < 8"

### User actions
- **Read only.** The user can browse and understand what Crosby has learned.
- **To change something:** Tell Crosby in chat. "Actually, I want you to flag all vendor emails again." Crosby updates the procedural memory.
- **To delete something:** Tell Crosby in chat. "Forget that you learned that." Crosby removes the entry.

This keeps the settings page simple and the chat as the primary interaction point for everything.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Procedural memory | Training & Learning is the **input pipeline** for procedural memory. Observations become procedural memory entries. |
| Briefings & nudges | Learning adjusts what gets included, how items are prioritized, and how aggressively nudges fire. |
| Email management | Learning calibrates flagging thresholds, draft tone, and which emails get surfaced. |
| Tasks | Learning adjusts task capture sensitivity — which casual mentions become tasks and which don't. |
| Dashboard & overnight builder | Learning feeds the builder — patterns Crosby notices can trigger widget creation or workflow automation. (Covered in separate spec.) |
| Structured questions | Quiz sessions use structured question cards (option chips, multi-select). Same card system used elsewhere in chat. |
| App manual | The manual should document that Crosby learns over time and how the user can review/correct what it's learned. |

---

## Ripple Effects

- **Settings page** — Needs a "What Crosby has learned" section alongside memory browser. Read-only, grouped by category.
- **Chat timeline** — Quiz session invitation card (new content type). Quiz question cards use the structured question card pattern.
- **Procedural memory** — Needs confidence levels and source tracking (observed vs. explicitly taught).
- **Briefings spec** — Should reference that briefing content adapts based on learning.
- **Nudges spec** — Should reference that nudge thresholds adapt based on learning.
- **Structured questions spec** — Quiz sessions are a primary use case for structured question cards.

---

## Open Questions

- [ ] Should there be a "reset" option? Like "forget everything you've learned and start fresh" — nuclear option for if learning goes sideways?
- [ ] How does learning interact with Experts? If the user has different preferences in different Expert contexts (formal tone for legal, casual for restaurant ops), does Crosby learn per-Expert?
- [ ] Should Crosby ever proactively say "I've noticed X pattern — is that intentional?" outside of quiz sessions? Or only during quizzes?
- [ ] What's the minimum observation period before Crosby starts acting on learning? Day one shouldn't have strong behavioral changes based on a single interaction.
