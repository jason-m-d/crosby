# Onboarding / Cold Start — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

Onboarding is a conversation, not a wizard. The very first time a user opens Crosby, it starts talking. No forms, no multi-step setup screens, no "connect your accounts" page. The user is already using the product while setting it up.

Onboarding is invisible — there's no mode switch, no progress bar, no "getting started" checklist. It's just Crosby being Crosby, with more setup-oriented questions early on. The transition to normal behavior is seamless because the interaction pattern never changes.

---

## First Interaction

### The opening

Crosby greets the user with energy and confidence. The vibe is "let me prove to you how helpful I can be."

The greeting covers:
- What Crosby is and why it's different (brief — not a sales pitch, more like "here's what I do")
- An invitation to get started: "The more you give me, the more useful I'll be. Want to start by connecting your email?"

### Tone
- Confident but not arrogant
- Eager to prove itself
- Conversational, not robotic
- "Let me show you" energy, not "please fill out this form" energy

---

## The Conversational Onboard

Crosby asks questions conversationally, not as a questionnaire. The flow adapts based on what the user gives it.

### Core questions (woven into conversation, not listed)

- **Email:** "Want me to connect to your email? That's where I can start being most useful right away."
- **Calendar:** "How about your calendar? If I can see what's coming up, I can help you prepare."
- **About the user:** "What do you do? Are you using this for work, personal stuff, or both?"
- **What they need help with:** "What's the biggest thing that falls through the cracks for you?"
- **Work context:** If work-related — "Tell me about your business" / "What does your typical day look like?"

### OAuth flow

When the user agrees to connect an account:
1. A button/chip appears in the chat: [Connect Gmail] or [Connect Google Calendar]
2. Tapping opens a **bottom sheet browser** within the app — Google's auth page loads inside the sheet
3. User signs in and approves
4. Sheet closes, Crosby immediately acknowledges: "Got it — I'm connected to your email. Give me a minute to look around."

The flow never leaves the chat experience. It feels like Crosby opened a window, handled it, and came back.

---

## The "Wow" Moment

After email connects, Crosby scans the last week of email to gather context about the user's life. Then it comes back with a short summary designed to impress:

- "Looks like you're managing several restaurant locations, you've got a lease negotiation going with Sarah, and Roger's been emailing about a staffing issue at store 2067."
- Demonstrates that Crosby already understands context, people, and what's going on.

Then Crosby proceeds to ask questions about what it found:
- Questions about the email activity ("Is the lease thing still active?")
- Questions about the content itself ("Who's Roger — is he your ops manager?")
- Questions about what the user wants Crosby to do with it ("Want me to keep an eye on that vendor quote and remind you when it expires?")

This is where the user goes from "interesting" to "holy shit, it gets me."

---

## Onboarding Completeness Score

Onboarding is tracked internally with a completeness score. Invisible to the user — no progress bar, no checklist.

### Score inputs

| Factor | Weight | Description |
|---|---|---|
| Email connected | High | The single most impactful connection. Gives Crosby a week of context to work with. |
| Calendar connected | Medium | Enables meeting prep, availability checking, scheduling. |
| Profile depth | Medium | Does Crosby know: work/personal/both, what the user does, what they need help with? |
| Feature discovery | Medium | Has the user tried core interactions — asked a question, created a task, interacted with a card? |
| First briefing received | Low | Has the user experienced a morning briefing? (Requires at least one overnight cycle.) |
| Return sessions | Low | Has the user come back at least a few times? Indicates engagement beyond initial curiosity. |

### Completion

- **Can be done in a single session.** A power user who connects everything, answers questions, and tries a few features could hit completion in 20 minutes.
- **Can take a week.** A cautious user who connects email on day one, calendar on day three, and gradually explores could take several days.
- **The score measures coverage, not duration.** Time is a factor (return sessions) but not the primary driver.
- **When satisfied, Crosby transitions silently.** No graduation moment, no "we're all set" message. Crosby just stops asking setup-oriented questions and operates normally. The user shouldn't notice a transition because onboarding never felt abnormal to begin with.

---

## Skipped / Minimal Onboarding

If the user doesn't want to connect accounts or answer questions, Crosby respects that.

- **Crosby works with what it has.** Chat, memory, tasks, commitments, web search — all work without any connections. The product is useful, just less proactive.
- **Context-driven suggestions, not nagging.** If the user later says "did Roger email me back?" and email isn't connected, Crosby can say "I'd be able to check that for you if you connect your email — want to set that up?"
- **One ask per integration.** After Crosby suggests connecting email once in context, it doesn't ask again. The user knows the option exists.
- **No guilt trips.** Crosby never says "you'd get more out of me if..." or makes the user feel like they're underusing the product.

---

## Cold Start: Empty Systems

On day one, every system starts from zero. Here's how each handles it:

| System | Cold start behavior |
|---|---|
| Memory | Empty. Builds from conversation and email scan. First entries come from onboarding questions. |
| Contacts | Empty. Populated from email scan (shadow records) and conversation mentions. |
| Notepad | Empty. Crosby starts using it as working context accumulates. |
| Dashboard | Hidden. No widgets until Crosby builds the first one (overnight builder or user request). |
| Experts | None exist. Crosby may suggest creating the first one based on what it learns about the user's work. |
| Training & Learning | No behavioral data. Defaults to neutral — moderate clarification frequency, standard briefing format. Adapts over first 2 weeks. |
| Briefings | First briefing arrives the morning after first use. Content is thin initially — mostly calendar and email if connected. Gets richer over time. |
| Watches | None. Created organically from conversation and email scanning. |
| Tasks | None. Created from conversation, email extraction, or commitment tracking. |

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Email management | Email is the recommended first connection. The "wow" moment depends on email scan. |
| Calendar | Second recommended connection. Enables meeting prep and scheduling. |
| Structured questions | Onboarding uses structured question cards for setup choices ([Connect Gmail] [Not now]). |
| App manual | Crosby references its own manual to explain features during onboarding. "I can keep an eye on your email and flag things that need your attention" — accurate because it's from the manual. |
| Training & Learning | Onboarding questions seed the first procedural memories and preferences. |
| Memory | Onboarding conversation is the first source of semantic memory ("user runs 10 restaurant locations"). |
| Contacts | Email scan during onboarding creates the first shadow contact records. |
| Briefings | First briefing is a milestone. Thin on day one, richer as data accumulates. |
| Notifications | Push notification permission request happens during onboarding (iOS requires explicit permission). |

---

## Ripple Effects

- **Auth infrastructure** — Bottom sheet browser for OAuth flows. Needs to work on both web and React Native.
- **Email scanning** — Needs a "first scan" mode that pulls the last week and synthesizes a summary, not just incremental monitoring.
- **Onboarding score** — Internal tracking system. Influences when Crosby stops asking setup-oriented questions.
- **iOS push permission** — Need to request notification permission at the right moment during onboarding. Not immediately — after Crosby has demonstrated value.
- **First briefing** — Morning briefing generation needs to handle thin data gracefully on day one.

---

## Open Questions

- [ ] When should Crosby request iOS push notification permission? During onboarding after demonstrating value? Or wait until the first proactive message would be sent?
- [ ] Should Crosby offer a quick demo/tour of the UI (dashboard area, sidebar, bottom nav) or just let the user discover it naturally?
- [ ] For the email "wow" moment — what if the user's email is boring/empty? Does Crosby have a fallback that still impresses?
- [ ] Should Crosby suggest an Expert during onboarding based on what it learns? ("Sounds like the restaurant operations could be its own workspace — want me to set that up?")
- [ ] Is there an account creation step before the conversation starts (email/password, or social login)? Or does the app just open straight into the chat?
