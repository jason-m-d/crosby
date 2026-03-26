# Onboarding / Cold Start — Product Discovery Notes

*Last updated: 2026-03-25*

---

## What It Is

Onboarding is three things in sequence: a threshold, a greeting, and a conversation.

1. **Auth** — account creation (Google OAuth preferred, email/password fallback)
2. **Optional OAuth offer** — "Connect Google to get the full experience" with a skip option
3. **The amber screen** — a full-bleed amber screen with a single button. A moment of intent before the experience begins.
4. **Crosby streams** — the amber dissolves, the chat UI appears (chat only — no nav, no sidebar, no dashboard), and Crosby starts talking immediately.
5. **Progressive reveal** — the rest of the UI appears piece by piece as it becomes relevant.

There is no wizard. No forms. No multi-step setup. The user clicks one button and is in the product.

---

## The Amber Screen

After auth (and the optional OAuth offer), the user lands on a full-screen amber fill. No chrome, no logo, no nav — just the accent color filling the viewport and a single button.

### Design
- **Background:** Full viewport, amber accent color (`hsl(38, 90%, 55%)`)
- **Button:** Centered, minimal. Copy: "Enter" (or similar — short, intentional, not cute)
- **Nothing else.** No tagline, no loading indicator, no explanation.

### Purpose
The amber screen is a threshold. It separates the mundane (creating an account) from the experience (meeting Crosby). It's a breath before the personality arrives. The user makes one intentional choice — "I'm ready" — and then Crosby takes over.

### Transition
When the user taps the button:
1. The amber fades out (smooth, ~400ms, not instantaneous)
2. The chat UI fades in underneath — just the message area and input. No other chrome.
3. Crosby's first message begins streaming immediately. By the time the amber is fully gone, text is already appearing.

The transition should feel like a curtain rising, not a page loading.

---

## The Pre-Auth OAuth Offer

Between account creation and the amber screen, Crosby offers Google OAuth:

- **"Connect your Google account to get the full experience"** with two options: [Connect Google] and [Skip for now]
- If they connect: Crosby gets Gmail + Calendar access immediately. By the time they hit the amber screen, a background job is already scanning their last week of email.
- If they skip: That's fine. The bottom sheet OAuth flow (already specced) is always available later, triggered conversationally or from Settings > Connections.

### Progressive scopes
Per AUTH-ACCOUNT.md: read-only scopes at sign-up. Write permissions (send email, create events) requested when first needed during natural use.

---

## Crosby's First Message

The first message streams as soon as the amber screen fades. It should feel like Crosby was waiting for them.

### Tone
- Confident, not welcoming. No "Welcome!" No exclamation marks. No "I'm so excited to help you!"
- Smart, slightly dry humor. The voice references from SOUL-v2.md apply from word one.
- Prove competence immediately. This isn't a tour — it's Crosby demonstrating that it's worth the user's time.

### Two paths

**Connected path (user connected Google before amber screen):**

Crosby already has data. The background email scan started during the OAuth step. By the time the user hits the amber screen and it fades, Crosby has enough to say something real.

The first message references actual things from the user's life — meetings, emails, people, patterns. Not a summary of everything, but a few sharp observations that prove Crosby already understands context. It also casually drops that experts exist — not as a feature announcement, but woven in with humor as part of showing what it can do.

Example tone (not literal copy):
> "Hey [name]. I've been looking through your email — you've got a lease negotiation going with someone named Sarah, Roger's been pinging you about staffing at 2067, and there's a vendor quote that expires Thursday. I have thoughts on all of it. And if any of this gets complicated enough, we can spin up a dedicated expert for it — like a little department that actually does its job. But first — anything on fire today?"

This is the "holy shit" moment. Crosby is already working. The expert mention plants a seed without asking the user to do anything.

If the email scan hasn't finished by the time the amber fades, Crosby leads with personality and the expert mention, then follows up moments later when the data lands: "Still digging through your email — give me a sec." This feels natural, not broken.

**Skipped path (user skipped OAuth):**

Crosby has the user's name (from auth) and nothing else. The greeting should still be confident and have personality — not apologetic about the lack of data. Still mentions experts casually.

Example tone (not literal copy):
> "Hey [name]. I know your name and not much else right now — that's fine. Ask me anything, or tell me what you're working on and I'll start pulling my weight. I can track tasks, do research, manage your email and calendar once you connect them, even build out dedicated experts for whatever you're juggling. Fair warning though — I get a lot more useful with data. No pressure, but the offer stands."

No groveling. No "please connect your accounts so I can help you!" The skipped path still feels like meeting a capable person, not a blank setup screen.

### Relationship to living greeting

The first onboarding message IS the first living greeting (per PERSISTENT-MEMORY.md). It follows the same pattern: it's a message that represents Crosby's current understanding of the user's state. After onboarding completes, future session-opens use the normal living greeting system — but the onboarding message is the seed that starts the pattern.

---

## Progressive UI Reveal

When the amber screen fades, only the chat appears. No sidebar, no nav, no dashboard. The first experience is purely conversational.

### Why
- Focus. The user should be paying attention to what Crosby is saying, not exploring a UI.
- The UI is meaningless without data. An empty sidebar, empty dashboard, and empty nav just look broken.
- It makes the product feel like it grows around the user rather than being an empty shell they have to fill.

### How the chrome appears

The reveal is triggered by relevance, not time:

| Trigger | What appears |
|---|---|
| User connects Google (via bottom sheet OAuth) | Sidebar becomes available (email/calendar data populating) |
| Crosby uses a tool (checks email, reads calendar) | That silo's icon appears in the nav |
| Crosby mentions the dashboard or overnight builder | Dashboard area becomes available |
| Crosby creates a notepad entry | Notepad tab appears in sidebar |
| Crosby creates or suggests an Expert | Experts section appears in nav |
| User asks about settings or preferences | Settings becomes accessible in nav |

### Transition quality
Each reveal uses the motion system — elements slide or fade in, not pop. This should feel designed, not buggy. If a sidebar slides in mid-conversation, it should look like Crosby just opened it, not like the layout broke.

### The ceiling
After any of these conditions, the full UI reveals:
- Onboarding completeness score reaches threshold (see below)
- User has had 3+ sessions
- User explicitly navigates to something (they're exploring — give them everything)

Once the ceiling is hit, `has_completed_onboarding` flips on the user profile. From then on, the full UI renders on every load. The progressive reveal is a one-time first-experience thing, never a permanent state.

### Return visits during onboarding
If the user leaves and comes back before onboarding completes:
- If they've seen enough chrome to have context, show what they've already seen (sidebar if connected, nav items already revealed). Don't re-hide things.
- The living greeting handles the re-engagement — no need for a separate "welcome back" onboarding flow.

---

## The Conversational Onboard

After the first message, onboarding becomes a conversation. Crosby asks questions naturally, not as a questionnaire. The flow adapts based on what the user gives it.

### Core questions (woven into conversation, not listed)

- **About the user:** "What do you do? Work, personal, or both?"
- **What they need help with:** "What's the biggest thing that falls through the cracks for you?"
- **Work context:** If work-related — "Tell me about your business" / "What does your typical day look like?"
- **Email (if not connected):** Crosby will mention email naturally when it's relevant — not as a setup step, but because it would genuinely help in context. One mention, no nagging.
- **Calendar (if not connected):** Same approach — mention it when it's contextually useful.

### OAuth flow (bottom sheet)

When the user agrees to connect an account mid-conversation:
1. A chip appears in the chat: [Connect Gmail] or [Connect Google Calendar]
2. Tapping opens a bottom sheet browser — Google's auth page loads inside the sheet
3. User signs in and approves
4. Sheet closes, Crosby immediately acknowledges and starts working with the data

The flow never leaves the chat. It feels like Crosby opened a window, handled it, and came back.

---

## The "Wow" Moment

If the user connected Google during the pre-amber OAuth step, the wow moment IS the first message — Crosby already knows things about them.

If the user connects later (via bottom sheet during conversation):
1. Crosby scans the last week of email in the background
2. Returns with a short, sharp summary designed to impress
3. Then asks follow-up questions about what it found ("Is the lease thing still active?" / "Who's Roger — is he your ops manager?")

This is where the user goes from "interesting" to "holy shit, it gets me."

### What if the email is boring?
If the user's email is empty or uninteresting, Crosby doesn't fake it. It acknowledges what it found (or didn't find) honestly and pivots to what it can do: "Your inbox is pretty quiet — either you're on top of things or you're good at ignoring email. Either way, tell me what you're working on and I'll find other ways to be useful."

---

## Onboarding Completeness Score

Tracked internally. Invisible to the user — no progress bar, no checklist.

### Score inputs

| Factor | Weight | Description |
|---|---|---|
| Email connected | High | The single most impactful connection. Gives Crosby a week of context. |
| Calendar connected | Medium | Enables meeting prep, availability checking, scheduling. |
| Profile depth | Medium | Does Crosby know: work/personal/both, what the user does, what they need help with? |
| Feature discovery | Medium | Has the user tried core interactions — asked a question, created a task, interacted with a card? |
| First briefing received | Low | Has the user experienced a morning briefing? (Requires at least one overnight cycle.) |
| Return sessions | Low | Has the user come back at least a few times? |

### Completion

- **Can be done in a single session.** A power user who connects everything, answers questions, and tries a few features could hit completion in 20 minutes.
- **Can take a week.** A cautious user who connects email on day one, calendar on day three, and gradually explores could take several days.
- **The score measures coverage, not duration.**
- **When satisfied:** `has_completed_onboarding` flips to true. Full UI renders on next load. Crosby silently stops asking setup-oriented questions. No graduation moment — the user shouldn't notice because onboarding never felt abnormal.

---

## iOS Push Notification Permission

Push notification permission is requested during onboarding, but NOT immediately.

**When:** After Crosby has demonstrated value. Ideally after the "wow" moment (email scan summary) or after the first proactive message would be sent. The request should feel earned — Crosby has proven it has things worth notifying about.

**How:** Crosby mentions it conversationally: "I can send you a heads-up when something needs your attention — want me to turn on notifications?" Then the iOS permission dialog fires. If denied, Crosby notes it and doesn't ask again (the option exists in Settings).

---

## Skipped / Minimal Onboarding

If the user doesn't want to connect accounts or answer questions, Crosby respects that.

- **Crosby works with what it has.** Chat, memory, tasks, commitments, web search — all work without connections. The product is useful, just less proactive.
- **Context-driven suggestions, not nagging.** If the user later says "did Roger email me back?" and email isn't connected, Crosby can say "I could check that for you if you connect your email — want to set that up?"
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
| Dashboard | Hidden (part of progressive reveal). No widgets until Crosby builds the first one. |
| Experts | None exist. Crosby may suggest creating the first one based on what it learns. |
| Training & Learning | No behavioral data. Defaults to neutral. Adapts over first 2 weeks. |
| Briefings | First briefing arrives the morning after first use. Content is thin initially. |
| Watches | None. Created organically from conversation and email scanning. |
| Tasks | None. Created from conversation, email extraction, or commitment tracking. |
| Nav / Chrome | Minimal. Progressive reveal adds elements as they become relevant. |

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Auth (AUTH-ACCOUNT.md) | Auth happens before the amber screen. Google OAuth preferred path enables pre-amber data fetch. |
| Living greeting (PERSISTENT-MEMORY.md) | The onboarding first message IS the first living greeting. Same system, different content. |
| Email management | Email is the recommended first connection. The "wow" moment depends on email scan. |
| Calendar | Second recommended connection. Enables meeting prep and scheduling. |
| Dashboard (DASHBOARD-OVERNIGHT-BUILDER.md) | Dashboard is hidden during progressive reveal. Appears when relevant or at onboarding completion. |
| Structured questions | Onboarding uses structured question cards for setup choices ([Connect Gmail] [Not now]). |
| App manual | Crosby references its own manual to explain features during onboarding. |
| Training & Learning | Onboarding conversation seeds the first procedural memories and preferences. |
| Memory | Onboarding conversation is the first source of semantic memory. |
| Contacts | Email scan during onboarding creates the first shadow contact records. |
| Briefings | First briefing is a milestone. Thin on day one, richer as data accumulates. |
| Notifications | Push notification permission requested during onboarding, after value is demonstrated. |
| Chat timeline (CHAT-TIMELINE.md) | The onboarding experience IS the chat timeline. No separate onboarding mode or UI. |
| Design system | Amber screen uses the accent color. Progressive reveal uses the motion system for transitions. |

---

## Ripple Effects

- **Auth infrastructure** — OAuth offer step between account creation and amber screen. Bottom sheet browser for mid-conversation OAuth.
- **Email scanning** — Needs a "first scan" mode that pulls the last week and synthesizes a summary. Must start during OAuth step (before amber screen) so data is ready by the time Crosby greets.
- **User profile schema** — `has_completed_onboarding` boolean flag. Controls progressive reveal vs full chrome rendering.
- **Layout component** — Must conditionally render chrome based on onboarding state. Chat-only mode vs full UI mode.
- **Motion system** — Progressive reveal transitions need to be designed: sidebar slide-in, nav item appearance, dashboard area expansion.
- **First scan timing** — If user connects Google pre-amber, the email scan runs in the background during the amber screen moment. Crosby needs enough data by the time it streams to reference real things. May need a brief internal delay or a "still scanning" fallback.
- **iOS push permission** — Request after demonstrating value, not immediately.
- **First briefing** — Morning briefing generation needs to handle thin data gracefully on day one.
- **Onboarding score** — Internal tracking system. Influences when the progressive reveal ceiling hits and Crosby stops asking setup questions.

---

## Open Questions

- [x] ~~Is there an account creation step before the conversation starts?~~ **Yes.** Auth → optional OAuth offer → amber screen → chat. (Resolved 2026-03-25)
- [x] ~~Should Crosby offer a quick demo/tour of the UI?~~ **No.** Progressive reveal handles this — the UI appears as it becomes relevant. No tour needed. (Resolved 2026-03-25)
- [x] ~~Should Crosby suggest an Expert during onboarding?~~ **Yes, but as a casual mention, not a setup prompt.** Crosby drops that experts exist as part of the first message — woven in with humor, not announced as a feature. Plants the seed so the user knows the concept when they need it later. No structured question, no follow-up. Just awareness. (Resolved 2026-03-25)
- [x] ~~Minimum email scan time?~~ **Don't block the greeting on the scan.** Stream the greeting immediately. If email data is ready, use it. If not, lead with personality and follow up moments later when the scan completes. ("Still digging through your email — give me a sec.") This feels more natural — like a person who started working before you sat down. (Resolved 2026-03-25)
- [x] ~~Amber screen button copy~~ **"Enter."** Simple, not trying too hard. The screen is stark and intentional — the copy should match. (Resolved 2026-03-25)
- [x] ~~Progressive reveal animation specs~~ **Design lab territory, not a product decision.** Motion system specs in DESIGN-DIRECTION.md apply. Specific reveal animations to be designed during build. (Resolved 2026-03-25)
