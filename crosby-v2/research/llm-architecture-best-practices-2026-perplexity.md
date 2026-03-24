> **Original Prompt:** "You are helping me plan the architecture for an AI personal assistant called Crosby. It's built on Next.js (App Router) with TypeScript and uses Supabase for the database. It uses Anthropic's Claude as the LLM, routed through OpenRouter. The assistant has 15–25 tools spanning email (Gmail), calendar (Google Calendar), tasks, CRM, documents, SMS/text messages, web search, and more. It's a single long-running conversation (not multiple separate conversations). I need deep, production-focused research on the following 6 domains of LLM application architecture in 2026: (1) System prompt architecture for tool-heavy assistants, (2) Tool design and surface area, (3) Context management strategy, (4) LLM routing, providers, and infrastructure, (5) Observability and debugging, (6) Streaming and error handling."

---

# LLM Application Architecture Best Practices for Crosby (2026)

*A production-focused guide for building AI personal assistants with deep tool integrations, long-running conversations, and Claude as the primary LLM.*

***

## Executive Summary

The landscape of LLM application architecture has matured significantly in 2025–2026. The field has moved from "prompting" to **context engineering** — a broader discipline of curating what enters the model's attention budget at every inference step. For an assistant like Crosby with 15–25+ tools spanning email, calendar, tasks, CRM, and documents, the dominant failure modes are context pollution, tool overload, and zero observability into model decisions. This report covers the six architecture domains you asked about, drawing on the latest production patterns from Anthropic, LangChain, and shipping products.[^1]

**The single most important architectural insight in 2026:** The model's context window is a finite attention budget with diminishing marginal returns — not just a token limit. Every token added to context depletes the model's ability to focus on other tokens. Every architectural decision should be evaluated by whether it makes the relevant signal denser or noisier.[^1]

***

## 1. System Prompt Architecture for Tool-Heavy Assistants

### Structural Organization

Anthropic's Applied AI team recommends organizing system prompts into **distinct named sections** using XML tags (`<background_information>`, `<instructions>`) or Markdown headers (`## Tool guidance`, `## Output format`). This improves both the model's attention allocation and your own maintainability. For Crosby, a battle-tested section order is:[^1]

1. **Identity and role** — who Crosby is, the user it serves, its conversational style
2. **Capabilities overview** — brief enumeration of tool domains (email, calendar, tasks, etc.)
3. **Core behavioral instructions** — how to approach ambiguity, when to ask vs. act, tone
4. **Tool guidance** — when to use each domain's tools (high-level heuristics, not exhaustive rules)
5. **Output format** — response structure, markdown usage, response length norms
6. **Safety and boundaries** — what Crosby should refuse or escalate

The key failure modes are **over-prescription** (hardcoding brittle conditional logic) and **under-specification** (vague high-level guidance that provides no decision heuristics). The optimal "altitude" is specific enough to guide tool selection and behavior, but flexible enough to let the model reason through novel situations.[^1]

### All Tools in System Prompt vs. Self-Describing Schemas

For Crosby's 15–25 tools, the practical answer is a **hybrid**: tool selection heuristics and domain routing guidance go in the system prompt, but the actual tool instructions live primarily in the tool definitions themselves, prompt-engineered for maximum clarity. Anthropic's internal evaluations showed that small, precise refinements to tool descriptions — not system prompt overhauls — drove dramatic accuracy improvements, including Claude Sonnet 3.5 achieving state-of-the-art on SWE-bench after tool description refinements alone.[^2]

The system prompt should tell the model *when* to turn to email tools vs. calendar tools vs. CRM tools. The tool definitions tell it *how* to use them correctly. Tool descriptions should be written "as if explaining to a new hire" — making implicit context explicit: what specialized query formats are expected, how resources relate to each other, what common mistakes to avoid.[^2]

### Token Budget for System Prompts

Claude Sonnet and Opus in 2026 have 200k context windows. A practical production allocation for a personal assistant like Crosby:[^3]

| Component | Token Budget | Notes |
|---|---|---|
| System prompt (core) | 1,500–3,000 | Keep tight — repeats every call |
| Tool definitions | 2,000–5,000 | Depends on tool count and description depth |
| Conversation history | 10,000–20,000 | Windowed/compressed |
| Retrieved context (RAG) | 2,000–4,000 | Top 3–5 chunks |
| Current user message | 100–500 | The user's turn |
| Output reserve | 4,000–12,000 | Response generation space |

A rough production heuristic: **60/20/20** — 60% of usable context for conversation history (users expect continuity), 20% for knowledge and retrieved memory, 20% for system prompt and tools. The system prompt token cost is especially painful because it's paid on every single request. This is the primary reason to keep it tight.[^4]

### Instruction Hierarchy and Priority Ordering

Put **the most important, most frequently relevant instructions first**. Models attend to earlier context more reliably than later context — the "lost in the middle" phenomenon is real and consistent across all models. Safety-critical instructions (e.g., "do not send emails without confirmation") should appear near the top of the system prompt, not buried in a section after 2,000 tokens of tool guidance.[^1]

***

## 2. Tool Design and Surface Area

### Granularity: Consolidate Around Workflows, Not APIs

The correct framing is not "many small tools vs. fewer large tools" but **workflow-matching tools vs. raw API wrappers**. Anthropic explicitly recommends against tools that merely wrap existing API endpoints, because agents have different "affordances" than traditional software — the model reads tool descriptions token-by-token and has limited context to juggle intermediate results.[^2]

Concrete examples of the transformation:

| Don't build | Build instead |
|---|---|
| `list_users`, `list_events`, `create_event` | `schedule_event` (finds availability + schedules) |
| `get_customer_by_id`, `list_transactions`, `list_notes` | `get_customer_context` (compiles recent relevant info) |
| `read_logs` | `search_logs` (returns relevant lines + context) |
| `search_email`, `read_email`, `list_email` | `find_emails` + `email_action` (search + act) |

The goal is to **offload orchestration from model context into tool execution**. A single `schedule_event` call that internally checks calendar availability, finds free slots, and books — with only the final result returning to the model — is radically more efficient than three separate tool calls.[^2]

### Handling 20+ Tools: Semantic Tool Retrieval

Tool overload is a documented, quantified production problem. Research confirms that as tool counts grow, both performance degrades and context window consumption explodes. The solution that's emerged in production is **semantic tool retrieval** — rather than injecting all tool definitions into every call, maintain a vector store of tool descriptions and retrieve only the most relevant subset per request.[^5][^6]

LangGraph's **BigTool** pattern implements this directly: tool descriptions are embedded into a vector store, and a semantic search at request time surfaces only the 5–8 most relevant tools for the user's query. This has been shown to cut tool-definition tokens by approximately 85% while maintaining or improving selection accuracy.[^7][^8][^5]

Anthropic released a **Tool Search Tool** as part of Claude's Advanced Tool Use (GA February 2026) that implements this concept natively in the Claude platform. It allows the model itself to discover tools on demand rather than having them all pre-loaded, achieving ~85% reduction in token usage for tool definitions.[^8]

For Crosby's architecture, a pragmatic approach:
- **Always-on tools** (4–6): send message to user, create task, web search, note memory
- **Domain tools** (retrieved semantically): email tools, calendar tools, CRM tools, document tools
- **Namespaced consistently**: `email_search`, `email_send`, `email_read` (service_action pattern)[^2]

### Tool Error Reporting

When a tool fails, the model receives the error and must decide how to proceed — its decision quality is entirely dependent on the error message quality.[^2]

**Bad error response** (opaque): `{"error": "400 Bad Request", "code": "E_INVALID_PARAMS"}`

**Good error response** (actionable): `{"error": "Email search failed: date range exceeds 90-day limit. Try narrowing to the last 30 days.", "suggested_fix": "Reduce date_range parameter"}`[^2]

Tools should also clearly distinguish between retryable errors (rate limits, transient failures) and non-retryable errors (permission denied, invalid parameters).[^9]

### Web Search Reliability

For Crosby's web search tool, the two dominant production choices are **Exa** and **Tavily**. In independent Fortune 100 enterprise evaluations, Exa scored 81% vs. Tavily's 71% on complex multi-hop retrieval (WebWalker benchmark), with p95 latency of 1.4s vs. 4.5s. Exa's query-dependent highlights cut tokens 50–75% while improving RAG accuracy by 10%.[^10]

***

## 3. Context Management Strategy

### What to Pre-Load vs. Fetch On-Demand

Anthropic's current recommendation is a **"just-in-time" context strategy** with minimal pre-loading. Rather than stuffing email summaries, calendar summaries, and CRM data into every system prompt, agents maintain lightweight identifiers and fetch actual data via tool calls at runtime.[^1]

For Crosby specifically:
- **Pre-load at session start**: user identity + preferences, today's date/time, brief agenda summary, any pinned tasks/priorities
- **Fetch on demand**: email search/content, full calendar details, CRM records, document content, sales reports
- **Always in system prompt**: Crosby's identity, tool guidance, behavioral instructions

### Context Window Strategy for Long-Running Sessions

Three production patterns for managing unbounded conversation history:[^3]

**1. Conversation Compaction / Summarization** — When approaching context limit, summarize message history and reinitiate with the summary. Clear old tool call results aggressively — once a tool result is acted upon, the raw result adds noise without value.[^1]

**2. Sliding Window with Session Summary** — Maintain only the last N turns in active context, with an injected session summary at the start of the history block.[^3]

**3. External Memory** — For preferences, recurring patterns, and persistent user facts, use external memory storage with semantic retrieval back into context.[^4][^1]

### RAG Strategy for Multi-Domain Retrieval

In 2026, **hybrid retrieval** is the production standard — combining BM25 keyword search with dense semantic vector search, metadata filtering, and cross-encoder reranking. Hybrid with Reciprocal Rank Fusion (RRF) outperforms either method alone.[^11][^12][^13]

For Crosby's multi-domain RAG:
- **Maintain separate indices** per domain with domain-aware chunking strategies
- **Add metadata filtering** as a first-pass narrowing step before vector search (date ranges, sender, document type)
- **Cross-encoder reranking** after initial retrieval significantly improves result quality[^12]

***

## 4. LLM Routing, Providers, and Infrastructure

### OpenRouter vs. Alternatives in 2026

OpenRouter remains the most popular SaaS routing option: 400+ models, ~40ms overhead, clean unified API. However, it charges a 5–5.5% fee on top of model costs. An independent 2026 analysis flagged this as a "$60,000 routing trap" for teams that fail to plan for migration.[^15][^16][^17]

| Gateway | Model | Latency | Cost | Best For |
|---|---|---|---|---|
| OpenRouter | SaaS | ~40ms overhead | 5% fee | Prototyping, early-stage |
| LiteLLM | Self-hosted | ~3ms overhead | No token fee | Scale, control, custom routing |
| Helicone | Proxy/SaaS | Standard | Flat subscription | Observability + routing |
| TensorZero | Rust gateway | <1ms P99 | Infra cost | Low-latency, structured workflows |
| AWS Bedrock | Managed cloud | Standard | AWS pricing | Enterprise AWS environments |

**OpenRouter is defensible** as a starting point, but architecture should be built to swap providers without code changes.[^18]

### Multi-Model Routing Strategy

- **Fast/cheap model** (Claude Haiku 4.5 or Gemini Flash): Intent classification, simple task triaging, notification drafts
- **Primary capable model** (Claude Sonnet 4.5): Main conversational turns, multi-tool orchestration, email drafting
- **Heavy model** (Claude Opus 4.1): Complex reasoning tasks, long document analysis, strategic planning

### Structured Output Reliability

Anthropic launched **Structured Outputs** in public beta in November 2025 (GA on Claude Sonnet 4.5 and Opus 4.1). Constrained decoding mathematically guarantees JSON schema compliance — no more parsing gymnastics or retry logic for schema conformance.[^21][^22]

***

## 5. Observability and Debugging

### What to Log on Every LLM Call

The minimum viable observability payload per request:[^23][^24]

- **Input**: full messages array (truncated for storage), system prompt hash
- **Tool calls made**: tool name, parameters passed, timestamp
- **Tool results**: result payload (truncated), latency, success/failure
- **Output**: final response, finish reason
- **Metrics**: input tokens, output tokens, total latency, cost estimate, model used

### Best-in-Class Observability Tools (2026)

| Platform | Best For | Open Source | Key Strength |
|---|---|---|---|
| **Braintrust** | Teams shipping AI products | No | CI/CD evals, 1M free spans, exhaustive auto-metrics[^25] |
| **Langfuse** | Open-source, self-hosting | Yes (MIT) | Full trace capture, OpenTelemetry, 19k+ GitHub stars[^25] |
| **LangSmith** | LangChain/LangGraph stacks | No | Native LangChain integration, annotation queues[^26] |
| **Helicone** | Minimal-code observability | Partial | Proxy-based, URL change = instant logging[^27] |
| **Arize Phoenix** | OpenTelemetry teams | Yes | Framework-agnostic, RAG quality metrics[^27] |

**Start with Langfuse** (self-hosted, MIT license) or **Helicone** (one URL change from your OpenRouter setup). Add evaluation with **Braintrust** once you have production traffic.

### Automated Evaluation Without Manual Review

**LLM-as-judge** is the production standard for scalable evaluation in 2026. A judge model evaluates samples against custom criteria: answer relevancy, helpfulness, faithfulness, tool selection accuracy, path efficiency.[^29][^30][^28]

***

## 6. Streaming and Error Handling

### Streaming Tool-Calling Responses

For Crosby built on Next.js, **Vercel AI SDK 6** (`streamText` with `maxSteps`) is the production-standard approach. It handles the multi-step tool calling loop automatically. The `maxSteps` parameter (typically 5–10) prevents infinite loops while allowing multi-tool workflows.[^33][^19]

### Error Classification Before Retry

| Error Type | HTTP Code | Action |
|---|---|---|
| Rate limit | 429 | Exponential backoff per `Retry-After` header |
| Server error | 500, 502, 503, 504 | Exponential backoff with jitter |
| Timeout | — | Shorter timeout, max 2 retries |
| Auth error | 401, 403 | No retry — fix the request |
| Client error | 400 | No retry — log and surface to user |

The baseline retry pattern: start at 1s, cap at 60s, add random jitter, stop at 3–5 attempts.[^34]

### Partial Failure and Graceful Degradation

A five-level degradation hierarchy for Crosby:[^37][^38]

```
Level 0: Full capability (all tools available)
Level 1: Retry (same call, transient error)
Level 2: Rephrase (same intent, different parameters)
Level 3: Reroute (different tool for same task)
Level 4: Partial result (inform user of limited capability)
Level 5: Graceful failure (clear explanation of what's unavailable)
```

If the Gmail API is down, Crosby should complete the calendar/task/CRM portions of a request and explicitly note what couldn't be reached.

***

## Key Technology Decisions Summary

| Decision | Recommendation | Rationale |
|---|---|---|
| LLM primary | Claude Sonnet 4.5 | Native tool calling, Structured Outputs, best multi-tool accuracy |
| LLM routing | OpenRouter now → LiteLLM at scale | OpenRouter for DX; migrate when 5% fee hurts |
| Tool retrieval | Semantic retrieval (BigTool pattern) | 85% token reduction, handles 20+ tools cleanly |
| Streaming | Vercel AI SDK 6 `streamText` | First-class Next.js support, multi-step tool loops |
| Observability | Langfuse (self-hosted) + Helicone | Open source + minimal-code observability |
| RAG | Hybrid (BM25 + dense + reranking) | Outperforms either method alone |
| Web search | Exa | 81% vs. 71% accuracy, 3x faster, query-aware highlights |
| Structured output | Claude Structured Outputs (beta) | Schema-guaranteed JSON without retry logic |
| Error recovery | 5-level degradation + circuit breakers | Production agents fail ~50%+ without deliberate fault tolerance |
| Evaluation | LLM-as-judge + Langfuse eval | Scalable automated quality assessment without manual review |
| Tool protocol | MCP (native Claude support) | De facto standard, supported by Anthropic/OpenAI/Google/Microsoft |

---

## References

1. [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
2. [Writing effective tools for AI agents—using AI agents - Anthropic](https://www.anthropic.com/engineering/writing-tools-for-agents)
3. [Giving AI Agents Memory Without Breaking the Token Budget](https://dev.to/akshaygupta1996/context-engineering-giving-ai-agents-memory-without-breaking-the-token-budget-1ho5)
4. [Context Engineering Is What Your Agent Actually Needs | Chanl Blog](https://www.chanl.ai/blog/context-engineering-production-ai-agents)
5. [BigTool: Agents with large number of tools](https://www.youtube.com/watch?v=3ISRS2hQlfI)
6. [Too Many Tools? How LLMs Struggle at Scale](https://www.youtube.com/watch?v=ej7-n9OoGnQ)
7. [Introducing BigTool: A Solution for Efficient Tool Retrieval - LinkedIn](https://www.linkedin.com/posts/kuratd_langchain-activity-7311067293533257730-zucV)
8. [Claude's Programmatic Tool Calling is now GA — 37% fewer tokens](https://www.reddit.com/r/ClaudeAI/comments/1r7xnbf/claudes_programmatic_tool_calling_is_now_ga_37/)
9. [Tools Fail: Detecting Silent Errors in Faulty Tools](http://arxiv.org/pdf/2406.19228.pdf)
10. [Exa vs Tavily: AI Search API Comparison 2026](https://exa.ai/versus/tavily)
11. [RAG in 2025: 7 Proven Strategies](https://www.morphik.ai/blog/retrieval-augmented-generation-strategies)
12. [RAG in 2026: How Retrieval-Augmented Generation Works for Enterprise AI](https://www.techment.com/blogs/rag-models-2026-enterprise-ai/)
13. [10 RAG Projects That Actually Teach You Retrieval in 2026](https://dextralabs.com/blog/rag-projects-retrieval/)
14. [Building Conversational AI Agents with Context Windows](https://propelius.ai/blogs/building-conversational-ai-agents-context-windows/)
15. [Best LLM router for AI projects: OpenRouter vs LiteLLM](https://www.linkedin.com/pulse/which-llm-router-should-you-choose-your-next-ai-vs-dmitry-styhe)
16. [OpenRouter vs LiteLLM: The $60,000 Routing Trap](https://www.youtube.com/watch?v=XZPNjgJ4E0c)
17. [LLM Routing: OpenRouter vs LiteLLM](https://www.linkedin.com/posts/darryl-ruggles_openrouter-vs-litellm-features-pricing-activity-7388992888300412928-97k4)
18. [Top LLM Gateways 2025 - Agenta.ai](https://agenta.ai/blog/top-llm-gateways)
19. [Vercel AI SDK 6: Streaming AI Chat with Next.js](https://www.digitalapplied.com/blog/vercel-ai-sdk-6-streaming-chat-nextjs-guide)
20. [Top 5 LLM Gateways for 2026](https://www.getmaxim.ai/articles/top-5-llm-gateways-for-2026-a-comprehensive-comparison/)
21. [Anthropic boosts Claude API with Structured Outputs](https://tessl.io/blog/anthropic-brings-structured-outputs-to-claude-developer-platform-making-api-responses-more-reliable/)
22. [Claude API Structured Output: Complete Guide](https://thomas-wiegold.com/blog/claude-api-structured-output/)
23. [Observability for LLM apps: what to log](https://al-kindipublisher.com/index.php/fcsai/article/view/12101)
24. [AgentOps: Enabling Observability of LLM Agents](https://arxiv.org/pdf/2411.05285.pdf)
25. [7 best AI observability platforms for LLMs in 2025 - Braintrust](https://www.braintrust.dev/articles/best-ai-observability-platforms-2025)
26. [10 LLM Observability Tools to Evaluate & Monitor AI in 2026](https://www.confident-ai.com/knowledge-base/10-llm-observability-tools-to-evaluate-and-monitor-ai-2026)
27. [Best LLM Observability Tools in 2026 - Firecrawl](https://www.firecrawl.dev/blog/best-llm-observability-tools)
28. [LLM as a Judge - Primer and Pre-Built Evaluators - Arize AI](https://arize.com/llm-as-a-judge/)
29. [The Rise of Agent-as-a-Judge Evaluation for LLMs - arXiv](https://arxiv.org/html/2508.02994v1)
30. [LLM-as-a-Judge Simply Explained](https://www.confident-ai.com/blog/why-llm-as-a-judge-is-the-best-llm-evaluation-method)
31. [LLM-as-Judge: How to Calibrate with Human Corrections](https://www.langchain.com/articles/llm-as-a-judge)
32. [Context Engineering: Why AI Agents Need More Than Prompts](https://www.reddit.com/r/AIPractitioner/comments/1oo1cxz/context_engineering_why_ai_agents_need_more_than/)
33. [Vercel AI SDK Complete Guide](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6)
34. [AI Agent Retry Strategies: Exponential Backoff](https://getathenic.com/blog/ai-agent-retry-strategies-exponential-backoff)
35. [Graceful Degradation Patterns in AI Agent Systems](https://zylos.ai/research/2026-02-20-graceful-degradation-ai-agent-systems)
36. [Why Bad Tool Calling Makes LLMs Slow and Expensive](https://www.codeant.ai/blogs/poor-tool-calling-llm-cost-latency)
37. [Error Recovery and Graceful Degradation in AI Agents](https://notes.muthu.co/2026/02/error-recovery-and-graceful-degradation-in-ai-agents/)
38. [Graceful Degradation in AI Agent Error Handling](https://zylos.ai/research/2026-01-12-ai-agent-error-handling-recovery)
39. [Self-correction in LLM calls: a review](https://theelderscripts.com/self-correction-in-llm-calls-a-review/)
40. [Building Effective AI Agents - Anthropic](https://www.anthropic.com/research/building-effective-agents)
41. [LLM Observability Is the New Logging](https://www.reddit.com/r/LangChain/comments/1rjn3pn/llm_observability_is_the_new_logging_quick/)
42. [Error Recovery in AI Agents](https://dev.to/gantz/error-recovery-in-ai-agents-graceful-degradation-and-retry-strategies-40ca)
43. [The Future of MCP: Roadmap, Enhancements, and What's Next](https://www.getknit.dev/blog/the-future-of-mcp-roadmap-enhancements-and-whats-next)
