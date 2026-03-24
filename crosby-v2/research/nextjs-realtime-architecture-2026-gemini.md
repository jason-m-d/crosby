> **Original Prompt:** "You are helping me plan the architecture for Crosby v2. This is an AI personal assistant built on Next.js (App Router) + TypeScript + Supabase, with Claude as the LLM routed through OpenRouter. It uses a single long-running conversation (not multiple separate conversations). I need production-focused research on the following 4 domains of real-time AI chat architecture in 2026: (1) Streaming architecture — SSE vs. WebSockets for AI chat, Vercel AI SDK vs. rolling your own with the Anthropic SDK, rendering tool calls mid-stream; (2) Real-time and proactive behavior — how proactive AI assistants work in 2026, real-time infrastructure options, background processes injecting into active conversations; (3) App architecture patterns — Next.js codebase structure for AI apps, long conversation management, client-side state management; (4) Vercel vs. alternatives for AI-heavy Next.js — function timeouts, Fluid Compute, handling long-running tool chains."

---

# Architectural Evolution of Agentic Personal Assistants: Engineering Best Practices for High-Stakes Multi-Domain Environments in 2026

The transition from stateless chatbots to persistent, agentic personal assistants represents the most significant shift in the artificial intelligence landscape between 2024 and 2026. Assistants such as Crosby, which integrate deeply with email, calendar, and document retrieval, require a fundamental departure from the fragile "intent classifier" architectures of the previous era. The 2026 production standard for high-performance assistants like Crosby is defined by the **Vercel AI SDK** for streaming, **Supabase Realtime** for proactive synchronization, and **Durable Execution** patterns for long-running tool chains.

---

## 1. Streaming Architecture: Vercel AI SDK vs. Direct Integration

In 2026, the **Vercel AI SDK (v4/v5)** has become the industry-standard toolkit for building AI-powered React applications, largely displacing "roll-your-own" direct SDK implementations for production use. While direct use of the Anthropic SDK is viable for simple scripts, it introduces significant technical debt in a complex Next.js App Router environment.

### SDK Comparison: Why Abstraction Wins

| Feature | Vercel AI SDK (ai package) | Direct Anthropic SDK |
| :---- | :---- | :---- |
| **Stream Management** | Native ReadableStream handling with automatic chunked response reconstruction. | Manual parsing of Server-Sent Events (SSE) or newline-delimited JSON. |
| **Tool Execution** | **Multi-Step Tools**: streamText automatically handles the full cycle of model tool request → execution → model response. | Manual "inner loops" to catch tool calls, execute them, and send results back to the LLM. |
| **UI Synchronization** | useChat hook manages loading, error, and completion states across React re-renders without waterfalls. | Manual state management (e.g., useState, useEffect) to track message history and partial results. |
| **Generative UI** | Integrated support for **React Server Components** via streamUI to stream interactive widgets directly. | Requires manual coordination of client/server components for interactive tool results. |

### Handling Mid-Stream Tool Calls

The state-of-the-art pattern for Crosby's multi-step tools is **Automatic Function Execution with Intent & Progress**. When a model triggers a tool (e.g., "searching Gmail"), the SDK streams an "intent" to the client immediately. The UI renders a **Skeleton Loader** or **Typing Indicator** specific to that tool to maintain engagement during the 2–8 second execution window, nearly eliminating user abandonment. Once the tool completes, the results are injected into the context, and the text stream resumes seamlessly.

---

## 2. Real-Time and Proactive Behavior with Supabase

For a long-running assistant like Crosby, real-time updates are critical for "Agent-to-User" proactive interactions and multi-device continuity (e.g., seeing a task update on web that was triggered by a background process).

### The Live Database Pattern

Production apps in 2026 avoid SSE polling in favor of **Supabase Realtime (Channels)**.

* **Background Injection:** When a cron job or webhook (e.g., a new high-priority email arriving) triggers a proactive message, the background worker inserts a row into the messages table.
* **Real-Time Broadcast:** The Next.js frontend, subscribed to the messages channel with **Row Level Security (RLS)**, receives a `POSTGRES_CHANGES` event and updates the chat UI instantly without a page refresh.
* **Proactive Nudges:** These signals are delivered via in-app notifications with "smart management," allowing them to expire automatically if the user doesn't interact within a threshold.

---

## 3. App Architecture & Long-Running Conversations

Crosby's "single long-running conversation" model necessitates a sophisticated approach to state and memory to avoid the performance degradation seen in simple chat apps.

### State Management: Zustand vs. Jotai

In 2026, developers use a hybrid approach to client-side state:

* **Zustand (Centralized):** Used for app-wide global state like **Authentication**, **Theme**, and **Integration Status**. Its store-based model is more traceable for larger teams.
* **Jotai (Atomic):** Preferred for the **Chat Interface** itself. Since chat involves high-frequency micro-updates (streaming tokens), Jotai's independent "atoms" ensure that only the specific message component being updated re-renders, resulting in sub-millisecond state reads.

### Message Scaling Strategies

For conversations with thousands of messages, production apps implement a **Three-Layer Memory Architecture**:[^1]

1. **Summarization:** Older turns are summarized into a "compact memory" layer by a fast model like Gemini Flash, which is then injected into the system prompt to preserve long-term context without bloating the token budget.
2. **Observation Masking:** Hiding older, less relevant bits of information (placeholder strategy) has been found to be more cost-efficient and sometimes more reliable than pure summarization for SE/agentic tasks.
3. **Virtualization:** The frontend uses **Windowing/Virtualization** to only render the 10-20 messages currently in the viewport, maintaining 60fps scrolling even as the history grows.

---

## 4. Infrastructure Strategy: Handling the Serverless Ceiling

A major hurdle for Vercel-hosted AI apps is the **Execution Timeout Limit**.

* **Hobby Plan:** Strictly capped at 10 seconds.
* **Pro Plan:** Default is 15 seconds, configurable up to a maximum of **300 seconds (5 minutes)** for Serverless Functions.

### The "Durable Execution" Solution

For Crosby's deep research agents or multi-step reasoning loops that may exceed 2–5 minutes, developers in 2026 utilize **Inngest** or **Temporal**.

* **Function Splitting:** Inngest allows you to define workflows as "steps." If a 120-second tool chain fails or hits a timeout, Inngest's durable execution engine ensures that only the failed step is retried, while successful ones are never repeated.
* **Async Workers:** For heavy processing (scraping hundreds of pages), the standard move is to hand off the task from the Next.js API route to an async background worker (e.g., a Kubernetes Job or a persistent server on Fly.io/Railway) to prevent 504 Gateway Timeouts entirely.

---

## Conclusion: The 2026 Reference Stack for Crosby

The optimal architecture for Crosby in 2026 combines the developer velocity of the **Vercel AI SDK** with the persistence of **Supabase** and the resilience of **Durable Execution**. By centralizing tool logic in the Next.js backend (serving as the orchestrator) and utilizing a live database for real-time synchronization, Crosby can evolve from a reactive chatbot into a truly autonomous digital teammate.

Key decisions:
- **Streaming:** Vercel AI SDK's `streamText` + `useChat` — the abstraction is worth it
- **Real-time:** Supabase Realtime's `postgres_changes` — leverages existing infrastructure with zero additional services
- **State:** Zustand for global app state; Jotai atoms for high-frequency chat updates
- **Long-running work:** Inngest durable functions, never inline in webhook handlers
- **Deployment:** Vercel Pro with `maxDuration: 300` for the chat route; Railway for any persistent background workers

#### Works cited

1. Context Engineering Guide: RAG, Memory Systems & Dynamic... - meta-intelligence.tech
2. From Prompting and Context Engineering to Memory Architecture - Alok Mishra
