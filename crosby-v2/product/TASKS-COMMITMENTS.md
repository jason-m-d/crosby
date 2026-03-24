# Tasks & Commitments — Product Discovery Notes

*Last updated: 2026-03-23*

---

## The Model

Tasks and commitments are the **same underlying system** with a behavioral distinction. A commitment is a task that Crosby takes more seriously.

| | Task | Commitment |
|---|---|---|
| What it is | Something that needs doing | Something the user promised (to someone or themselves) |
| Created from | Casual mentions, email extraction, explicit asks | "I'll do X by Friday", "I told Sarah I'd send it", promises in conversation |
| Deadline | Optional | Usually has one (or implied urgency) |
| Nudge behavior | Standard escalation | Faster escalation, higher priority in briefings |
| Nudge tone | Organizational ("this is on your list") | Accountability ("you said you'd do this") |
| Can sit idle | Yes, for a while | No — Crosby escalates sooner |

### Implementation
- Same data model — a task with a `type` or `commitment` flag
- The flag changes how the nudge system treats it: escalation speed, briefing priority, language
- Commitments surface higher in briefings and nudges than regular tasks

---

## Task Creation

Tasks are created from multiple sources:
- **Conversation**: User mentions something casually ("I need to call the accountant") → Crosby auto-creates
- **Email**: Email scanner extracts action items → auto-creates with `source: email`
- **Calendar**: Post-meeting action items
- **Explicit**: User says "add a task" or "remind me to..."
- **Expert context**: Work within an Expert generates tasks tied to that Expert

### Commitment Detection
Crosby distinguishes commitments from regular tasks by detecting:
- Promises to others ("I'll send Sarah the proposal")
- Self-imposed deadlines ("I need to do this by Friday")
- Accountability language ("I committed to", "I promised", "I said I would")

---

## Expiration

- Tasks can sit indefinitely but get nudged with escalation over time
- Commitments **never silently expire** — Crosby flags before dropping
- Expiration prompt: "You said you'd send the proposal to Sarah 3 weeks ago. Still on your plate, or should I let it go?"
- User response feeds the learning system — if they drop it, Crosby learns the pattern

---

## Decisions

Decisions are a separate concept from tasks/commitments. A decision is a strategic or tactical choice that Crosby records to prevent drift and maintain consistency.

### Capture
- Crosby **quietly logs decisions** from conversation without asking for confirmation
- Exception: if Crosby is very unconfident about whether something was a decision, it confirms
- Examples: "Let's go with vendor A", "We're not doing B2B", "Use Supabase for the database"

### Surfacing
Decisions surface in three ways:
1. **Drift detection**: Crosby notices the user heading in a direction that contradicts a past decision → "You decided X in January — is that still the plan, or are we changing direction?"
2. **On request**: User asks "What have we decided about X?" → Crosby retrieves relevant decisions
3. **Pattern recognition**: A similar situation arises → "Last time this came up, we went with X — want to do the same?"

### Storage
- Decisions are stored with: the decision itself, context/rationale (what was discussed), date, and optionally the alternatives that were considered
- No weight/category system for now — all decisions are treated equally

---

## Ripple Effects

- **Proactive messages**: Commitments get priority treatment in nudges and briefings. The nudge system needs to check the task type to determine escalation speed and language.
- **Email scanning**: Email is a major source of both tasks and commitments. The scanner needs to distinguish "action item in email" from "promise made in email" — the latter is a commitment.
- **Experts**: Tasks and commitments can be tied to Experts. An Expert's task list is part of its context.
- **Contacts**: Commitments often involve another person. The commitment should link to a Contact when applicable ("I told Sarah" → links to Sarah's contact record). This enriches the Contact's relationship profile.
- **Memory/decisions**: Decisions feed into Crosby's long-term memory. They're a special type of memory — not preferences or facts, but choices with rationale. The memory system needs to index decisions separately so they're retrievable for drift detection.
- **Watches**: "I'll send it by Friday" could auto-create a self-watch — Crosby watches for whether the user actually does it.
- **Learning**: How the user handles expired commitments (drops vs. reschedules vs. completes late) teaches Crosby about the user's accountability patterns.

---

## Open Questions

- [ ] Is there a UI to see all tasks/commitments, or is it purely surfaced through chat/nudges/briefings? (Chat-native per APP-STRUCTURE.md, but could be a user-requested page via "edit own UI")
- [ ] Can the user convert between task and commitment? ("Actually this is a commitment, not just a task")
- [ ] Do tasks/commitments have priority levels beyond the task/commitment distinction?
- [ ] How does Crosby handle task completion — does the user say "done" in chat, check it off in a card, or does Crosby detect completion from context?
- [ ] Decision retrieval — is there a dedicated "decisions log" view, or purely conversational?
