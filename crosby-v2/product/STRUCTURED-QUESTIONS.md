# Structured Questions & Quick Confirms — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

A behavioral shift: Crosby is free to ask clarifying questions before acting, and the UI makes answering them frictionless. Instead of guessing and getting it wrong, Crosby pauses, presents options, and gets it right.

This is inspired by the principle that AI is built to be helpful and often skips clarification to avoid seeming slow — but asking the right question produces a better result than guessing. Structured questions make that pause feel fast, not annoying.

---

## Two Interaction Levels

### 1. Clarifying Questions (Timeline Card)

For disambiguation, multi-step clarification, and any question where context matters.

- **Format:** A card appears in the chat timeline with Crosby's question, suggested answer chips, and a "something else" option.
- **Chips:** Variable number — as many as the situation calls for. Could be 2 for a simple "which store?" or 5 for "which of these priorities?" Crosby picks the right count.
- **"Something else" option:** Always present. Opens a text input so the user can type a freeform answer if none of the suggestions fit.
- **Resolution:** When the user taps a chip or types an answer, the card resolves into a regular message in the timeline formatted as "Q: [question] A: [answer]". No leftover interactive UI in the history.
- **Chaining:** Crosby can ask follow-up questions based on answers — multiple clarifying cards in sequence before taking action. Each resolves into its own Q&A message.

### 2. Simple Confirmations (Input Area Chips)

For quick yes/no, approve/cancel, and lightweight choices.

- **Format:** Option chips appear above the input area — right where the user is already looking. No card in the timeline.
- **Use cases:** "Send this email?" → [Send] [Cancel]. "Create this event?" → [Create] [Edit first]. Simple binary or ternary choices.
- **Lightweight:** Doesn't clutter the timeline. The user taps and moves on.
- **Resolution:** The selected action is taken. The confirmation and result appear as regular messages in the timeline.

### When to use which

| Situation | Pattern |
|---|---|
| Disambiguation ("which store?", "which project?") | Timeline card with chips |
| Multi-step clarification (chained questions) | Timeline cards |
| Quiz session questions | Timeline cards |
| Simple yes/no before an action | Input area chips |
| Approve/cancel/edit choices | Input area chips |
| Dashboard widget approval | Timeline card (more context needed) |

---

## When Crosby Asks

### Confidence-based

Crosby decides whether to ask or act based on confidence:

- **High confidence** — Just do it. No clarification needed.
- **Medium confidence** — Ask, with the most likely answer as the first chip. Makes it one-tap for the common case.
- **Low confidence** — Ask. Don't guess.

The exact thresholds are tuned through prompt engineering and learned per-user through the Training & Learning system.

### Learned behavior

- If the user consistently tells Crosby to ask clarifying questions, Crosby learns to ask more often over time.
- If the user consistently picks the first option without hesitation, Crosby learns it can act on high-confidence guesses.
- If the user frequently picks "something else," Crosby learns its suggestions aren't matching well and adjusts.
- This is stored as procedural memory: "This user prefers to be asked before acting" or "This user wants Crosby to just do it."

### Always-ask categories

Some actions should always confirm regardless of confidence (via prompt engineering, not hardcoded):

- Sending emails
- Creating/modifying calendar events
- Deleting things
- Any action that affects external systems

These use the simple confirmation pattern (input area chips), not the full clarifying question card.

---

## Card Design Principles

- **Speed over completeness.** The options should be answerable in one tap. If the user has to read a paragraph before choosing, the card is too complex.
- **Suggest, don't interrogate.** The chips are Crosby's best guesses, not a quiz. The user should feel like Crosby is being thoughtful, not slow.
- **Graceful fallback.** If the user ignores the card and just types their answer in the regular input, Crosby accepts that too. The card is a convenience, not a gate.
- **No dead ends.** "Something else" is always available. The user is never forced into options that don't fit.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Training & Learning | Quiz sessions use clarifying question cards as their primary interaction pattern. Learning calibrates how often Crosby asks. |
| Email management | Email send confirmations use input area chips. Draft review might use timeline cards for more complex choices. |
| Calendar integration | Event creation confirmations use input area chips. |
| Dashboard & overnight builder | Widget approval uses timeline cards (needs context: preview, explanation, modify/keep/remove options). |
| Watches | Watch resolution actions could use input area chips for quick responses. |
| Chat timeline | Clarifying question cards are a timeline content type. They resolve into Q&A messages. |
| App manual | Manual should document that Crosby asks clarifying questions and how to interact with the chips. |

---

## Ripple Effects

- **Chat timeline** — New content type: clarifying question card (chips + "something else"). Resolves into formatted Q&A message.
- **Input area** — New UI element: confirmation chips above the text input. Ephemeral — disappear after selection or if the user starts typing.
- **Prompt engineering** — Crosby's system prompt needs clear guidance on when to ask vs. act, with the confidence framework.
- **Training & Learning** — New signal: how often the user picks suggestions vs. types "something else." Feeds back into clarification frequency and suggestion quality.
- **All action-taking features** — Email, calendar, tasks, watches, dashboard — all gain a confirmation pattern (either card or input chips depending on complexity).

---

## Open Questions

- [ ] Should the "something else" text input appear inline in the card, or does tapping "something else" focus the main chat input?
- [ ] Can the user tap a chip and also add a comment? Like select "Store 2067" but add "and also check 2068" — or is that a separate message?
- [ ] Should clarifying question cards have a timeout? If the user doesn't answer for hours, does Crosby follow up or just wait?
- [ ] For chained questions, should Crosby show a progress indicator ("question 2 of 4") or just ask them one at a time naturally?
