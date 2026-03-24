# Web Search & Deep Research — Product Discovery Notes

*Last updated: 2026-03-24*

---

## What It Is

One search system, two depths. Crosby doesn't have built-in web search — all web searches go through Perplexity. Sonnet is the brain (reasoning, conversation, tool orchestration). Perplexity is the eyes on the internet.

- **Web search:** Quick factual lookups. Inline in conversation. Automatic — Crosby decides when it needs current information and calls the tool.
- **Deep research:** Multi-source synthesis. Runs in the background as a job. User-initiated — the user asks for it, or Crosby suggests it.

---

## Why One Provider

- Sonnet's built-in web search is inconsistent — sometimes searches when it shouldn't, misses when it should, results less reliable than a purpose-built search engine.
- One search provider = one system to tune, debug, and trust.
- Perplexity is fast enough for simple queries that there's no penalty routing everything through it.
- Eliminates the "which search system do I use" decision point that causes reliability issues.

---

## Web Search (Quick)

### How it works
- Sonnet never has web search enabled. When it needs current information, it calls a `web_search` tool.
- The tool hits **Perplexity Sonar** (or equivalent fast endpoint) and returns results inline.
- Crosby answers the user's question using the search results — the raw Perplexity response is not shown directly.

### When it triggers
- Weather, sports scores, store hours, stock prices, recent news
- "What time does X close?"
- "Who won the game last night?"
- "What's the current price of X?"
- Any question where the answer requires information more recent than Crosby's training data

### Tool description (for prompt engineering)
"Use for questions that need current or real-time information. Quick factual lookups — weather, scores, hours, prices, recent news, simple factual questions. Returns results inline."

---

## Deep Research (Background)

### How it works
- User asks for research, a deep dive, comparison, or analysis.
- Crosby calls a `deep_research` tool that kicks off a **background job**.
- The job hits Perplexity's deeper research offering, which handles the multi-search, multi-source synthesis.
- Depth and duration are determined by Perplexity — Crosby doesn't control how many searches or how long it takes.
- The output is a structured report stored as an **artifact**.

### When it triggers
- User explicitly asks: "research this", "dig into this", "I need a deep dive on X", "compare these options"
- Crosby can suggest it: "I can give you a quick answer, but this might benefit from a deeper dive — want me to run it in the background?"
- The tool is user-initiated, not automatic. Crosby never silently decides to spend minutes researching.

### Tool description (for prompt engineering)
"Use when the user explicitly asks for research, a deep dive, comparison, analysis, or anything requiring multiple sources synthesized into a report. Always runs in the background. Tell the user you're on it."

---

## Deep Research Delivery

### When research starts
- Crosby responds inline saying it's on it.
- The inline message has a **visual indicator** (glow, pulse, or animation) showing the job is active.
- User continues chatting normally — the research runs in the background.

### When research completes

Three scenarios based on user state:

| User state | Delivery |
|---|---|
| Actively chatting with Crosby | Crosby weaves it in as an aside: "By the way, that research on POS systems is done — check it out in the sidebar." |
| App is open but not chatting | Crosby sends a message in the timeline and opens the sidebar with the report. |
| App is closed | Push notification. Report waiting in the sidebar when they open the app. |

### Report format
- Stored as an **artifact** in the sidebar.
- Structured report — sections, sources, key findings.
- Crosby can present a summary in the timeline with a "full report in the sidebar" pointer.

### Progress checks
- If the user asks "how's that research going?" — Crosby gives a status update if the system supports it, otherwise "still working on it."
- Not a priority to build detailed progress tracking — simple status is fine for v2.

---

## Follow-Up Questions

- If Crosby just completed the research and it's still in the context window, it can answer follow-up questions directly.
- If the artifact is open in the sidebar, it's pulled into Crosby's context — the user can chat about what they see.
- If the report has fallen out of context, Crosby can pull the artifact back in to answer questions.
- **RAG treatment:** Deep research reports that Crosby deems the user cares about get tagged as `deep_research` artifacts and embedded for RAG retrieval. If the user asks "remember that research I did on POS systems?" months later, Crosby can find it.

---

## Relationship to Other Systems

| System | Relationship |
|---|---|
| Artifacts | Deep research reports are stored as artifacts. They live in the sidebar, are two-way viewable, and get RAG treatment when deemed important. |
| Background jobs | Deep research runs as a background job. Same infrastructure as overnight builds and other async work. |
| Notifications | Research completion triggers push notifications if the app is closed. |
| Sidebar | Reports open in the sidebar. Sidebar content is pulled into Crosby's context for follow-up conversation. |
| Router / tool selection | Prompt engineering drives the choice between `web_search` and `deep_research`. Clear tool descriptions, no overlap. |
| Briefings | If a deep research report completed overnight, it can be included in the morning briefing. |
| App manual | Manual should document both search capabilities and how to ask for deep research. |

---

## Ripple Effects

- **Tools:** Two new tools — `web_search` (Perplexity Sonar, inline) and `deep_research` (Perplexity deep, background job).
- **Artifacts spec:** New artifact type: `deep_research` report. Gets RAG embedding when deemed important.
- **Chat timeline:** New visual treatment: active research indicator (glowing/pulsing inline message).
- **Background jobs:** Deep research as a job type with completion notification logic.
- **Sidebar:** Research reports auto-open in sidebar on completion (when user is in-app but not chatting).

---

## Open Questions

- [ ] Which Perplexity product/endpoint for deep research? Sonar Pro? Their deep research API? Needs evaluation for quality vs. cost vs. speed.
- [ ] Should Crosby cite sources in its quick web search answers? Perplexity returns citations — do we surface them inline?
- [ ] Can the user set a "depth preference" for research? Like "always go deep when I ask about competitors" — or is that over-engineering?
- [ ] Should deep research reports be shareable? Export to PDF, send via email, share with a collaborator's Crosby instance?
- [ ] Rate limiting — if the user kicks off 5 deep research jobs at once, is that fine or should there be a queue/limit?
