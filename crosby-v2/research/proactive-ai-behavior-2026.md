# Proactive AI Assistant Behavior — When to Act, When to Wait, and How Not to Be Annoying (2026)

*Research report compiled for Crosby v2 planning. March 2026.*

---

## 1. The Proactive Decision Layer — How Production Systems Decide When to Reach Out

The central design challenge of any proactive AI system is the **interruption calculus**: weighing the value of surfacing something now against the cost of disrupting the user's current focus. In 2026, this is still one of the hardest unsolved problems in AI assistant UX.

### The Four-Gate Decision Model

Research and production systems have converged on a layered decision process. A well-designed proactive agent checks all four gates before firing:

1. **Relevance filter** — Is this directly relevant to the user's current or upcoming context? Generic information doesn't pass.
2. **Importance threshold** — Is it urgent or valuable enough to warrant an interruption? This filters routine observations from genuinely actionable insights.
3. **User state analysis** — Is the user in a state where interruption is acceptable right now? (Time of day, inferred activity, quiet hours.)
4. **Confidence score** — How certain is the agent that its prediction is correct and its suggestion will actually help?

Only when all four pass their thresholds should the system act. The practical maxim: **an agent should reach out less often than it could**. When it does reach out, users should pay attention because they've learned its judgment is sound. ([Alpha Sense: Proactive AI in 2026](https://www.alpha-sense.com/resources/research-articles/proactive-ai/), [Lyzr: Proactive AI Agents](https://www.lyzr.ai/glossaries/proactive-ai-agents/))

### What Production AI Assistants Have Shipped

**ChatGPT Pulse** (launched September 25, 2025) is OpenAI's production answer to this problem. Rather than pushing individual notifications throughout the day, Pulse delivers a single daily briefing synthesized overnight from memory, chat history, feedback, and opt-in connectors (calendar, email). Key design choices: asynchronous computation, finite cards (not an endless feed), morning timing, and a careful safety-review layer to avoid harmful content. Currently limited preview for Pro users on iOS/Android. ([Skywork: ChatGPT Evolution 2025](https://skywork.ai/blog/chatgpt-evolution-2025-ultimate-guide-pulse-proactive-updates/), [AI Insider: ChatGPT New Features 2026](https://aiinsider.in/ai-learning/chatgpt-new-features-2025-2026/))

**Google Gemini Personal Intelligence** (rolled out 2025) connects Gmail, Photos, YouTube, and Search to allow Gemini to reason across a user's data and surface proactive insights. Critically, app connection is off by default — users opt in per-app. Google trained guardrails to avoid proactive assumptions about sensitive data (health, finances). The explicit framing is "personal, proactive, and powerful." ([Google Blog: Gemini Personal Intelligence](https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence/), [9to5Google: Gemini proactive](https://9to5google.com/2025/05/01/gemini-personal-proactive-powerful-assistant/))

**Meta Project Luna** is building an AI morning briefing for Facebook that analyzes a user's feed and external sources to deliver a single daily digest. Same pattern: batch into one daily push, not continuous pinging.

The convergence is striking: **every major platform has landed on the morning briefing / daily digest as the primary proactive delivery mechanism**, not real-time push notifications.

---

## 2. Interruption Models and User Tolerance

### The Notification Fatigue Problem Is Real and Severe

Knowledge workers already face 121 daily emails and interruptions every 2-3 minutes; 68% report productivity damage from notification fatigue. Adding an AI assistant that makes this worse will get turned off immediately.

The CHI 2025 research paper "Need Help? Designing Proactive AI Assistants for Programming" tested several proactive assistant designs and found a sharp tradeoff:
- Proactive assistants increased task completion by **12-18%** when suggestions were well-timed
- But increasing suggestion frequency **cut user preference by half** even when productivity improved
- Participants with persistent proactive suggestions called the assistant "distracting" and "annoying"
- The finding: users often preferred the non-proactive assistant just because it didn't interrupt their flow

([ACM CHI 2025: Need Help?](https://dl.acm.org/doi/10.1145/3706598.3714002), [ACM CHI 2025: Assistance or Disruption?](https://dl.acm.org/doi/10.1145/3706598.3713357))

### Patterns That Work

**Batching.** Accumulate observations and deliver them together rather than interrupting for each item. The morning briefing pattern is the extreme form of this. AI notification management systems now offer intelligent digests that group related low-urgency items. ([SentiSight: AI Notification Management 2026](https://www.sentisight.ai/ai-manages-digital-notification-chaos/))

**Timing-based delivery.** Deliver non-urgent insights at natural transition points (morning, pre-meeting, end of day) rather than the moment the system detects them. The async sleep-time compute model (see section 5) is built on this idea.

**Quiet hours.** Hard blocks where non-urgent messages are held. This should be absolute, not just a preference — the research is clear that violating quiet hours is a trust-breaking event.

**User-controlled thresholds.** Let the user dial how much proactivity they want. Some users want more nudges; others want almost none. The system should adapt to revealed preferences over time — if users consistently dismiss a category of message, stop sending it.

**The "earned trust" model.** If the system has a track record of high-quality, well-timed nudges, users become more receptive. If it fires spuriously, they tune everything out. This means it's better to miss occasionally than to false-positive. Precision over recall for proactive messages.

---

## 3. The Trigger Taxonomy — What Events Should Prompt Proactive Behavior

Based on production systems and research, proactive triggers fall into four tiers by urgency and actionability:

### Tier 1 — Interrupt Now (true urgency, time-sensitive action required)
- Calendar conflict detected that requires resolution before a meeting
- Incoming message from a known high-priority contact that requires a time-sensitive response
- A commitment the user made that is about to expire with no action taken
- A meeting starting in N minutes with no prep (agenda, attendee context) loaded

### Tier 2 — Surface at Next Natural Moment (important but not urgent)
- High-priority email that deserves attention today but can wait until the morning briefing
- A follow-up that was promised and not sent (detected via CRM or email history)
- An open task with an approaching deadline
- A pattern detected over multiple messages (e.g., three unanswered emails from the same person)

### Tier 3 — Include in Daily Digest (useful context, not time-sensitive)
- Upcoming meetings in the next 24-48 hours with relevant context to review
- Recent activity on a watched project or contact
- A document or email that might be relevant to tomorrow's meeting
- Patterns noticed across the week (e.g., spending above normal, schedule gap opening up)

### Tier 4 — Log but Don't Proactively Surface (too low signal-to-noise)
- Routine emails already triaged
- Non-urgent calendar items far in the future
- Low-confidence pattern detections
- Items the user has dismissed before

The "ProPerSim" research (arXiv September 2025, updated February 2026) found that a personalized assistant starts with a 2.2/4.0 average performance score on proactive suggestions and improves to 3.3/4.0 through feedback loops over time — underscoring that tier classification needs to be adaptive and learned, not just rule-based. ([arXiv: ProPerSim](https://arxiv.org/abs/2509.21730))

Production systems like n8n workflows for personal assistants now analyze email metadata + semantic content to classify urgency (High/Medium/Low) and cross-reference calendar data to generate prioritized briefings. The multi-signal approach (not just keyword matching) is essential for accurate triage.

---

## 4. Proactive Message Quality — Trusted Advisor vs. Annoying Bot

### What Makes a Proactive Message Feel Like Good Advice

Research on human executive assistants provides the clearest template here. The best executive assistants:
- Anticipate needs without being asked, but **do not surface every observation** — only the ones that require the executive's attention
- Present information concisely with a clear "so what" — not just data, but interpretation and recommended next action
- Choose the right moment — not mid-meeting, not at an interruption cost that exceeds the value
- Earn the right to interrupt by having a track record of good judgment
- Know when to buffer (e.g., prepare answers in advance for questions the executive might ask) vs. when to proactively escalate

([RepStack: Proactive EA Skills](https://repstack.co/stay-ahead-with-proactive-executive-assistant-skills/), [Base HQ: Staying Proactive EA Part 1](https://basehq.com/resources/the-proactivity-series-part-1/))

### The Four Elements of a High-Quality Proactive Message

**1. Specificity.** Vague messages ("You have some emails to review") erode trust. Specific messages ("Sarah from Acme has followed up twice on the contract — last message 3 days ago, no response") are actionable.

**2. Interpretive value.** Don't just report facts. Add the "so what": "This looks like it needs a response today before it becomes a problem."

**3. Brevity.** The message should fit on a single screen without scrolling. If the full context is needed, it should be one tap away. CHI research confirms that suggestions feel best when they provide "clear answers while giving specific examples" in a scannable format.

**4. Explicit reasoning.** Users trust proactive messages more when the system explains why it surfaced this. "I'm flagging this because you mentioned the Acme deal is your top priority this week" is better than an unexplained alert. Transparency in reasoning is a trust-builder. ([Alpha Sense](https://www.alpha-sense.com/resources/research-articles/proactive-ai/))

### Tone

Pi/Inflection's personality research is instructive: the best AI assistant tone is "kind and supportive," "curious and inquisitive," but explicitly avoids being "combative," "robotic and repetitive," or "evasive." For a proactive message, this translates to: warm but direct, never alarmist, never preachy, never repetitive about the same thing twice without new information.

The goal is to sound like a smart colleague who spotted something you should know about — not a bot that detected an event condition.

---

## 5. Technical Architecture for Proactive Behavior

### The Letta Sleep-Time Compute Model

The most sophisticated architectural approach in 2026 is **sleep-time compute**, introduced in production by Letta. The core idea: AI agents should not just think reactively when prompted, but process and synthesize information during "sleep time" — the periods between user interactions.

Concretely, a sleep-time agent runs in the background alongside the primary conversational agent. It:
- Shares memory with the primary agent
- Asynchronously processes new data (emails, calendar changes, conversation history)
- Rewrites the primary agent's memory state with synthesized insights
- Does not interrupt the primary agent mid-conversation

This means when the user next opens the app, the agent already has a refined, up-to-date understanding — not just raw data — and can surface proactive insights that were computed while idle. The sleep-time agent can use a larger, slower model (like a full Gemini Pro) while the conversational agent uses a fast model. ([Letta: Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute), [Letta Docs: Sleep-time agents](https://docs.letta.com/guides/agents/architectures/sleeptime), [Fast Company](https://www.fastcompany.com/91368307/why-sleep-time-compute-is-the-next-big-leap-in-ai))

### Event-Driven vs. Polling vs. Scheduled Scans

Production proactive systems use a hybrid:
- **Event-driven** for Tier 1 triggers: Gmail Pub/Sub pushes email arrivals, calendar webhooks fire on new/changed events. These feed into a real-time queue that evaluates whether an immediate alert is warranted.
- **Scheduled scans** for Tier 2/3 synthesis: A nightly or hourly job processes the event queue, groups related items, applies the "should I send this?" LLM judge, and prepares the digest.
- **On-demand prefetch** for session context: When the user opens the app, a prefetch call synthesizes recent activity into the session greeting and loads relevant context.

### The "Should I Send This?" Decision

In 2025-2026 production systems, this decision is made by an **LLM judge call** — a cheap, fast model (e.g., Gemini Flash Lite) given:
- The candidate message
- User's recent history of accepted/dismissed messages
- Current time and user's schedule
- A rubric for what "worthy of interruption" means

The model outputs a score and brief reasoning. Items above the threshold get sent; below it get batched or discarded.

The "Proactive Agent" paper (arXiv 2410.12361) proposes training a **reward model** on human annotations of accepted vs. rejected proactive suggestions, then using it as an automatic evaluator. In production this is usually approximated with a prompted LLM judge rather than a fine-tuned model.

### Avoiding Duplicate and Contradictory Messages

The key mechanisms:

**Message state tracking.** Every proactive message is logged with a unique ID, the trigger that caused it, and its delivery status. Before firing, the system checks: has this trigger already produced a message in the last N hours? Has the user already taken action on the underlying item?

**Idempotency keys.** Each trigger event gets a key derived from the source entity (e.g., `email:{message_id}:follow_up_alert`). If the key is already in the sent table, the message is suppressed.

**Cooldown windows.** Per-topic cooldowns prevent hammering the user about the same thing. A calendar conflict might have a 24-hour cooldown once flagged; a weekly spending summary has a 7-day cooldown.

**Supersession.** When new information makes a previous proactive message stale or wrong, the system should send an update rather than letting the old message stand. This is the hardest case and most systems handle it by expiring old messages after a time window.

---

## Key Takeaways for Crosby v2

**1. Adopt the morning briefing as the primary delivery mechanism.** Every major AI platform (ChatGPT Pulse, Gemini, Meta Luna) has converged on a single daily digest rather than real-time push. This is the right default for Crosby. Real-time interruptions should be reserved for Tier 1 only (genuine urgency, time-sensitive action required within hours).

**2. Build a four-gate interruption model before building any proactive features.** Relevance → Importance → User state → Confidence. All four must pass. The cost of a false positive (user dismisses or disables proactive messages) is higher than the cost of a miss. Precision over recall.

**3. Implement sleep-time compute from the start.** Background jobs should not just scan and alert — they should synthesize. A sleep-time process that rewrites a "today's state" memory block nightly gives the morning greeting real substance and avoids recounting raw data. Use a larger model for sleep-time synthesis; use a fast model for live conversation.

**4. Use a four-tier trigger taxonomy with different delivery paths per tier.** Tier 1 = interrupt immediately (very rare). Tier 2 = surface in next session greeting. Tier 3 = include in morning briefing. Tier 4 = log only. Each tier should have explicit criteria and user-adjustable thresholds.

**5. Every proactive message needs an explicit "why."** Users trust and engage with messages that explain the reasoning. "I'm surfacing this because X" beats an unexplained alert. Transparency is a trust-builder that compounds over time.

**6. Build message deduplication and cooldown windows as infrastructure, not an afterthought.** Every proactive message should have an idempotency key derived from the source entity. Before sending, check: already sent about this? User already took action? Cooldown window active? Without this, users will get spammed during periods of high activity.

**7. Learn from dismissals.** Track which categories of proactive messages get dismissed vs. acted on. Over time, suppress categories with low engagement rates. The ProPerSim research shows personalized proactivity starts at 2.2/4.0 and improves to 3.3/4.0 with feedback — the adaptation loop is essential.

**8. Default to less, not more.** The CHI research finding is unambiguous: increasing proactive frequency cuts user preference even when it improves task completion. The first version of Crosby's proactive layer should err toward conservative. Users who want more can increase the frequency; users who feel spammed will turn it off entirely.

---

## Sources

- [Alpha Sense: Proactive AI in 2026: Moving Beyond the Prompt](https://www.alpha-sense.com/resources/research-articles/proactive-ai/)
- [ACM CHI 2025: Need Help? Designing Proactive AI Assistants for Programming](https://dl.acm.org/doi/10.1145/3706598.3714002)
- [ACM CHI 2025: Assistance or Disruption? Trade-offs of Proactive AI Programming Support](https://dl.acm.org/doi/10.1145/3706598.3713357)
- [Skywork: ChatGPT Evolution 2025 — Pulse & Proactive Updates](https://skywork.ai/blog/chatgpt-evolution-2025-ultimate-guide-pulse-proactive-updates/)
- [Skywork: ChatGPT Pulse 2025 — Proactive AI & Intelligent Assistants](https://skywork.ai/blog/chatgpt-pulse-2025-proactive-ai-intelligent-assistants/)
- [Google Blog: Personal Intelligence — Connecting Gemini to Google Apps](https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence/)
- [9to5Google: Google wants Gemini to be personal, proactive, and powerful](https://9to5google.com/2025/05/01/gemini-personal-proactive-powerful-assistant/)
- [Letta: Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute)
- [Letta Docs: Sleep-time Agents](https://docs.letta.com/guides/agents/architectures/sleeptime)
- [Fast Company: Why sleep-time compute is the next big leap in AI](https://www.fastcompany.com/91368307/why-sleep-time-compute-is-the-next-big-leap-in-ai)
- [arXiv 2410.12361: Proactive Agent — Shifting LLM Agents from Reactive to Active Assistance](https://arxiv.org/abs/2410.12361)
- [arXiv 2509.21730: ProPerSim — Developing Proactive and Personalized AI Assistants](https://arxiv.org/abs/2509.21730)
- [SentiSight: AI Notification Management 2026](https://www.sentisight.ai/ai-manages-digital-notification-chaos/)
- [RepStack: Stay Ahead with Proactive Executive Assistant Skills](https://repstack.co/stay-ahead-with-proactive-executive-assistant-skills/)
- [Base HQ: Staying Proactive as an Executive Assistant Part 1](https://basehq.com/resources/the-proactivity-series-part-1/)
- [Lyzr: Proactive AI Agents](https://www.lyzr.ai/glossaries/proactive-ai-agents/)
- [Business Standard: Year Ender 2025 — AI Assistants Rise from Reactive to Proactive](https://www.business-standard.com/technology/tech-news/year-ender-2025-ai-assistants-rise-alexa-siri-google-assistant-chatgpt-meta-gemini-125122200324_1.html)
- [Autonomous.ai: What Is Proactive AI? How Agents Act Without Prompts](https://www.autonomous.ai/ourblog/proactive-ai)
- [Saner.AI: Proactive AI Assistant — Best 3 on the Market](https://www.saner.ai/blogs/best-proactive-ai-assistants)
