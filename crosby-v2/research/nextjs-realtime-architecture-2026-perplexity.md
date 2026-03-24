> **Original Prompt:** "You are helping me plan the architecture for Crosby v2. This is an AI personal assistant built on Next.js (App Router) + TypeScript + Supabase, with Claude as the LLM routed through OpenRouter. It uses a single long-running conversation (not multiple separate conversations). I need production-focused research on the following 4 domains of real-time AI chat architecture in 2026: (1) Streaming architecture — SSE vs. WebSockets for AI chat, Vercel AI SDK vs. rolling your own with the Anthropic SDK, rendering tool calls mid-stream; (2) Real-time and proactive behavior — how proactive AI assistants work in 2026, real-time infrastructure options, background processes injecting into active conversations; (3) App architecture patterns — Next.js codebase structure for AI apps, long conversation management, client-side state management; (4) Vercel vs. alternatives for AI-heavy Next.js — function timeouts, Fluid Compute, handling long-running tool chains."

---

# Real-Time AI Chat App Architecture in Next.js (2026)

*Production patterns for streaming AI responses, real-time updates, background processes, and deployment — specifically for a Next.js App Router + Supabase stack with a single long-running conversation.*

***

## Executive Summary

The stack has converged significantly in 2026. For a Claude-powered personal assistant like Crosby built on Next.js + Supabase, the production-standard answers are: **Vercel AI SDK 6 with `streamText` + `maxSteps`** for streaming, **Supabase Realtime** for in-app real-time delivery, **Inngest** for background jobs and proactive messages, and **Zustand** for client state. Vercel remains the best deployment platform for Next.js AI apps, but its Fluid Compute model (announced early 2025) has materially changed the economics of long-running AI functions. The biggest unsolved pattern in 2026 is elegantly combining all three layers — streaming inference, real-time updates, and background events — into a single coherent frontend state machine.[^1]

***

## 1. Streaming Architecture

### The Right Protocol: SSE via Vercel AI SDK

In 2026, the streaming protocol debate is largely settled: **Server-Sent Events (SSE) via the Vercel AI SDK** is the dominant production pattern for AI chat in Next.js. WebSockets are bidirectional and add complexity; for the primary LLM inference stream (server → client), SSE is simpler, more cacheable, and works natively with Next.js App Router's `ReadableStream` and `Response` primitives. The Vercel AI SDK abstracts all stream-parsing, React state management, and re-render optimization behind the `useChat` hook.[^2][^3]

What the AI SDK eliminates from your codebase:[^4]
- Managing `ReadableStream` from the API
- Parsing SSE or newline-delimited JSON
- Updating React state without re-render waterfalls
- Handling abort signals for cancellation
- Managing loading, error, and completion states
- Synchronizing client and server state

The correct setup for a Claude-powered route in 2026:

```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    messages,
    tools: { /* semantically retrieved tools */ },
    maxSteps: 10,
    onFinish: async ({ usage, toolCalls }) => {
      // Persist to Supabase, log to observability
    },
  });
  return result.toDataStreamResponse();
}
```

### Vercel AI SDK vs. Rolling Your Own with the Anthropic SDK

Both approaches are viable. The tradeoffs in 2026:

| Dimension | Vercel AI SDK | Direct Anthropic SDK |
|---|---|---|
| Boilerplate reduction | ~60% less client-side code[^5] | Full manual implementation |
| Provider switching | One-line change[^2] | Rewrite stream parsing |
| Multi-step tool loops | Built-in `maxSteps` | Manual recursion required |
| Streaming runtime | Edge runtime only[^5] | Node.js + Edge |
| Tool call capture | Requires workaround[^6] | Full control |
| Custom stream events | Limited | Unlimited |
| React hooks | `useChat`, `useObject`, etc. | None |

The key limitation of the AI SDK: capturing tool calls and tool results while streaming is non-trivial — accessing `stream.toolCalls` consumes the stream, creating a conflict if you need to both stream to the client and log tool details. The workaround is using `onStepFinish` and `onFinish` callbacks rather than reading from the stream directly.[^6]

**Recommendation for Crosby:** Use the Vercel AI SDK for the primary streaming chat layer. Use the Anthropic SDK directly (or LiteLLM) for background/non-streaming operations (batch processing, scheduled analysis, tool pre-fetching).

### Rendering Tool Calls Mid-Stream

The Vercel AI SDK's data stream protocol delivers different message "parts" — text deltas, tool call starts, tool input deltas, tool results, and tool call completions — all through the same stream. The `useChat` hook assembles these into a `messages` array where each message can have multiple parts.[^7]

The production pattern for rendering interleaved tool calls:

```tsx
{message.parts?.map((part, i) => {
  if (part.type === 'text') return <Markdown key={i}>{part.text}</Markdown>;
  if (part.type === 'tool-invocation') {
    if (part.state === 'call') return <ToolCallIndicator key={i} tool={part.toolInvocation.toolName} />;
    if (part.state === 'result') return <ToolResult key={i} result={part.toolInvocation.result} />;
  }
})}
```

For Crosby's assistant, tool call results should be rendered as collapsible "evidence cards" below the assistant's text — showing which tool ran, what it returned, and collapsing to save space. This is the pattern used in production by Linear AI and Perplexity.[^4]

### Optimistic UI During Streaming

The AI SDK handles the baseline optimistic UI automatically — the user message appears immediately before the server confirms receipt. For tool calls specifically, show progress indicators while tools execute:

- **Typing indicator**: AI SDK exposes `isLoading` — show an animated indicator while the first token arrives
- **Tool execution indicator**: When `part.state === 'call'` and no result yet, render a lightweight spinner with the tool name ("Searching your email...", "Checking your calendar...")
- **Partial tool results**: Don't stream partial JSON tool results to the UI — wait for the complete tool result and render it atomically. Tool results are small enough that the latency gain from partial rendering is negligible while the flicker cost is real

***

## 2. Real-Time and Proactive Behavior

### How Proactive AI Assistants Work in 2026

Proactive behavior (AI-initiated messages) is the defining product frontier in 2026. Production apps use a three-tier delivery strategy:[^8][^9]

1. **In-app real-time**: If the user has the app open, inject the proactive message directly into the conversation via WebSocket/Supabase Realtime — the most seamless experience
2. **Push notification**: If the app is backgrounded or closed, deliver via web push API (requires service worker registration)
3. **Email digest**: For lower-urgency proactive content (daily briefings, weekly summaries), batch into email delivery via Resend/Postmark

For Crosby specifically: a morning briefing (calendar + email summary + priority tasks) is an obvious proactive workflow. The pattern is: Inngest scheduled function fires at 7am → runs LLM synthesis → inserts `proactive_message` row in Supabase → Supabase Realtime broadcasts to active client, or sends push notification if client is offline.

### Real-Time Infrastructure: Supabase Realtime vs. Alternatives

Given you're already on Supabase, **Supabase Realtime is the right answer** for Crosby's real-time layer — eliminating a separate service dependency. Its capabilities are well-matched to an AI assistant use case:

| Feature | Supabase Realtime | Pusher | Ably |
|---|---|---|---|
| Protocol | WebSockets | WebSockets + XHR fallback | WebSockets |
| Postgres change listening | Native | No | No |
| Presence | Yes | Yes | Yes |
| Typing indicators | Yes (Broadcast) | Yes (Channels) | Yes |
| Push notifications | External only | Yes (Beams) | iOS/Android |
| Uptime SLA | 99.0%[^10] | 99.95%[^10] | Higher |
| Latency | Unlisted | 90–200ms[^10] | 6.5ms[^11] |
| Max concurrent clients | 10,000[^10] | Unlisted | Higher |
| Bundled cost | Included in Supabase | Separate billing | Separate billing |

The argument for keeping Supabase Realtime: it piggybacks on your existing Postgres database, so any background process that inserts a row automatically triggers a Realtime event — no separate message broker required. Ably's 6.5ms API latency is overkill for a personal assistant. For push notifications (offline delivery), integrate a dedicated service like Novu, Knock, or OneSignal as a thin layer on top.[^11][^12]

### Background Processes Injecting into Active Conversations

The architectural pattern for background processes (cron jobs, webhooks) injecting messages into a live conversation:

```
Background Process (Inngest/Cron)
         ↓
   INSERT message row into Supabase
   with { role: 'assistant', source: 'background', ... }
         ↓
   Supabase Realtime fires postgres_changes event
         ↓
   Client's Realtime subscription receives event
         ↓
   Append to local message state
```

This works because Supabase Realtime's `postgres_changes` listener on your `messages` table fires on any INSERT, regardless of whether it originated from the user's session or a background process. The client needs to distinguish background-injected messages from streaming messages and render them appropriately (no streaming animation, mark source).[^12][^13]

The webhook handler pattern for incoming events (new email, calendar event, etc.):

```typescript
// app/api/webhooks/email/route.ts
export async function POST(req: Request) {
  const payload = await req.json();
  // Enqueue Inngest event — do not process inline
  await inngest.send({ name: 'email/new', data: payload });
  return new Response('ok', { status: 200 });
}
```

Always return immediately from webhook handlers and enqueue to Inngest — never do LLM inference inside a webhook handler, which could exceed Vercel's 60s limit and lose the webhook.[^14]

***

## 3. App Architecture Patterns

### Next.js Codebase Structure for AI Apps (2026)

The 2026 production standard for AI Next.js apps introduces an `agents/` top-level directory alongside the conventional structure:[^15]

```
/app
  /api
    /chat/route.ts          ← Streaming LLM route (edge runtime)
    /ai/route.ts            ← Non-streaming AI operations
    /webhooks/...           ← Inbound webhooks → Inngest
    /inngest/route.ts       ← Inngest serve handler
  /(dashboard)/             ← Authenticated app layout
    page.tsx                ← Dashboard
    /chat/page.tsx          ← Main conversation
/agents
  /prompts
    base.ts                 ← Crosby system prompt
  /tools
    index.ts                ← Tool registry + semantic retrieval
    email.ts, calendar.ts, tasks.ts, crm.ts ...
  /workflows
    morning-brief.ts        ← Inngest proactive workflow
    email-summary.ts
/components
  /ui                       ← Primitive components
  /features
    /chat                   ← Message list, input, tool cards
    /dashboard              ← Sales tiles, calendar widget, etc.
/stores
  chatStore.ts              ← Zustand chat state
  uiStore.ts                ← UI transient state
/lib
  /db                       ← Supabase client + queries
  /ai                       ← LLM client setup, model registry
```

Route organization principle: **one `route.ts` per concern, not per operation**. The `/api/chat` route handles all conversational AI inference. Background trigger endpoints live in `/api/inngest` and `/api/webhooks`. Avoid splitting AI operations across many tiny API routes — it fragments your error handling and makes streaming harder to reason about.[^15]

### Long Conversation Management: Pagination + Virtualization

For Crosby's single long-running conversation that may accumulate thousands of messages, two layers are required:

**Database layer: cursor-based pagination**
Load the most recent 50–100 messages on session start. When the user scrolls to the top, fetch the next page using cursor pagination (not offset-based — offsets are O(n) on large tables). Keep the active conversation to ~200 messages in memory at any time.

**Rendering layer: TanStack Virtual**
For the message list, **TanStack Virtual** (`@tanstack/react-virtual`) is the production standard for virtualized chat lists in 2026. It only renders messages currently in the viewport, handling thousands of messages with no performance degradation. The critical implementation for a chat (reversed list, auto-scroll to bottom):[^16]

```tsx
const rowVirtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 88,           // Estimated message height
  measureElement: (el) => el.getBoundingClientRect().height, // Dynamic measure
});
```

**Virtuoso's MessageList** component (`react-virtuoso`) is an alternative specifically designed for AI/chat conversations, with built-in scroll-to-bottom and prepend-without-jump behavior. It's higher-level than TanStack Virtual and worth evaluating for Crosby's use case.[^17]

**Message summarization**: When the database table exceeds ~5,000 messages, implement session-window summarization: store a `summary` alongside the conversation, compress older turns into it, and load only the summary + last N turns into the model context.

### Client-Side State Management

**Zustand** is the right choice for Crosby's conversation and UI state in 2026. The consensus from production teams:[^18][^19]

- **Zustand**: Centralized store, excellent TypeScript support, non-React access (useful for calling state from Inngest event handlers or socket callbacks), 2.8kB bundle. Recommended for 90% of SaaS apps[^19]
- **Jotai**: Atomic model with minimal re-renders, best for highly interactive UIs (Figma-style) with many granular state slices. More fragmented and harder to trace state flow[^20]
- **React Context + useReducer**: Only for simple cases with low update frequency — causes full subtree re-renders on any state change, unacceptable for a streaming chat

For Crosby, a pragmatic store split:

```typescript
// stores/chatStore.ts — Zustand
interface ChatStore {
  messages: Message[];
  isStreaming: boolean;
  activeToolCalls: ToolCall[];
  appendMessage: (msg: Message) => void;
  updateLastMessage: (delta: string) => void;
  setStreaming: (v: boolean) => void;
}

// stores/uiStore.ts — Zustand
interface UIStore {
  sidebarOpen: boolean;
  activeView: 'chat' | 'dashboard' | 'settings';
}
```

The AI SDK's `useChat` hook manages its own internal state for the streaming session. Zustand complements it by holding persisted conversation history and cross-component UI state. Avoid putting the entire `messages` array in Zustand if you're using `useChat` — the SDK maintains the authoritative streaming state; sync to Zustand/Supabase on `onFinish`.

### Vercel Deployment Patterns

**Function timeouts** are the most common Crosby-relevant deployment concern. Vercel's limits in 2026:

| Plan | Max Duration | Notes |
|---|---|---|
| Hobby | 60s | Edge Functions (streaming starts immediately) |
| Pro | 300s | Serverless; 900s on Enterprise[^21] |
| Fluid Compute | Effectively unlimited for I/O-bound | See below |

**Vercel Fluid Compute** (announced March 2025, GA mid-2025) is the key architectural change for AI apps. Unlike traditional serverless (one request = one VM), Fluid allows a single worker to handle multiple concurrent requests. For AI streaming workloads — which are almost entirely I/O-bound (waiting for Claude to generate tokens) — Fluid can reduce compute costs by up to 85–95% and dramatically reduces cold starts through resource reuse.[^22][^23][^1]

For Crosby's long-running tool chains (30–120 seconds): **opt into Fluid Compute** for the streaming route + use `maxDuration: 300` on Pro plan. Streaming responses start returning tokens immediately, so the Vercel timeout clock is less punishing than for non-streaming operations — the function stays alive because it's actively writing to the stream.[^24][^21]

**Cron job limitations on Vercel**: Vercel Cron is limited to 1-minute execution windows with a 1-per-second minimum trigger frequency. For anything more complex than a simple database query, **do not use Vercel Cron directly for AI workflows** — use Vercel Cron to trigger an Inngest event, then let Inngest orchestrate the actual multi-step AI work.[^25][^14]

***

## 4. Vercel vs. Alternatives for AI-Heavy Next.js

### The Current Reality

**Vercel remains the best platform for AI Next.js apps in 2026** when your primary concern is frontend excellence — preview deployments, zero-config Next.js, edge distribution, and the AI SDK integration.[^26][^21][^27]

The case against Vercel is specifically about **long-running non-streaming operations** and cost at scale:

```
Vercel Pro cost (serverless execution): ~$0.40/GB-hour
Railway (persistent service): Flat monthly + minimal usage
```

A growing pattern in 2026 — **hybrid deployment**:[^27][^28]

```
Vercel:  Next.js frontend + AI streaming routes (edge)
Railway: Background workers, long-running AI pipelines,
         any task that doesn't need to be a serverless function
```

### Platform Comparison for AI Apps

| Platform | Best For | Timeout | Cold Starts | Cost at Scale |
|---|---|---|---|---|
| **Vercel** | Next.js frontend + streaming AI | 300s Pro, 900s Enterprise[^21] | ~400–800ms (AI SDK)[^21] | Adds up on compute-heavy |
| **Railway** | Backend AI services, long pipelines | Unlimited[^21] | None (persistent)[^21] | Predictable |
| **Fly.io** | Multi-region, low-latency backends | Unlimited | Low (persistent) | Good for global scale |
| **Coolify/self-hosted** | Full control, data sovereignty | Unlimited | Depends | Infrastructure overhead |

For Crosby as a personal assistant (single user), Vercel Pro is entirely sufficient. The hybrid Vercel + Railway pattern becomes relevant when you have compute-intensive background AI workflows that run continuously.[^28]

### Solving Long-Running AI Operations (30–120s Tool Chains)

**Option A: Inngest Durable Functions (recommended)**
Inngest breaks long operations into steps, each running as a separate Vercel function invocation. The orchestration state lives in Inngest's infrastructure, not in Vercel's function timeout:

```typescript
// inngest/workflows/morning-brief.ts
export const morningBrief = inngest.createFunction(
  { id: 'morning-brief' },
  { cron: '0 7 * * *' },  // 7am daily
  async ({ step, publish }) => {
    const emails = await step.run('fetch-emails', () => fetchRecentEmails());
    const calendar = await step.run('fetch-calendar', () => fetchTodayCalendar());
    const tasks = await step.run('fetch-tasks', () => fetchPriorityTasks());
    const brief = await step.run('synthesize', () =>
      synthesizeWithClaude({ emails, calendar, tasks })
    );
    await step.run('inject-message', () =>
      supabase.from('messages').insert({ role: 'assistant', content: brief, source: 'morning_brief' })
    );
  }
);
```

Each `step.run` is independently retriable and runs within Vercel's timeout window.[^30][^29]

**Option B: Upstash QStash + Workflow**
For teams at scale with concurrency requirements, QStash is simpler than Inngest (just HTTP POST) and avoids concurrency limits. Best for high-volume, simpler workflows.[^31]

**Option C: Vercel Fluid + Streaming Response**
For the primary LLM inference path (even 2–3 minute tool chains), streaming buys you significant slack — Vercel doesn't timeout a streaming response the same way it timeouts a hanging non-streaming function, because the connection stays alive while tokens flow.[^24]

### Background Job Tool Comparison

| Tool | Model | Free Tier | Best For |
|---|---|---|---|
| **Inngest** | Event-driven step functions | 50K runs/mo[^32] | Multi-step AI workflows, retries, observability |
| **Trigger.dev** | Job-based, TypeScript-native | Limited | Long-running jobs, clean DX[^33] |
| **QStash (Upstash)** | HTTP message delivery | 500 msgs/day[^32] | Simple async delivery, high scale |
| **Vercel Cron** | Time-based triggers | Included | Trigger Inngest events only |

For Crosby: **Inngest** is the clear fit. Its Realtime feature publishes progress events to subscribed clients while the job runs — meaning background AI workflows can stream progress into Crosby's UI in real-time.[^29]

***

## Putting It All Together: Crosby's Real-Time Architecture

The three layers — streaming inference, background processes, and real-time updates — integrate like this:

```
User message
    ↓
Vercel AI SDK streamText (edge runtime)
    ↓ (streaming SSE via useChat)
Frontend renders text + tool call cards progressively
    ↓ (onFinish)
Save completed message to Supabase
    ↑
Supabase Realtime (postgres_changes)
    ↑
Background processes (Inngest functions):
  - Morning brief (cron)
  - Email webhook handler
  - Calendar change watcher
  - Proactive nudges
```

The frontend subscribes to both channels simultaneously:
1. The Vercel AI SDK `useChat` hook — handles the active streaming session
2. A Supabase Realtime subscription on the `messages` table — receives background-injected messages

When a background message arrives via Realtime while no stream is active, append it to Zustand's message store and render it as a non-streaming assistant message. When a stream is active, queue the Realtime message and inject it after the stream completes to avoid race conditions.

---

## References

1. [Vercel Fluid: Revolutionizing Serverless with a New Compute Model](https://ssojet.com/blog/news-2025-03-vercel-fluid)
2. [Real-time AI in Next.js: How to stream responses with the Vercel AI SDK](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)
3. [Express.js vs Next.js for AI Applications in 2026 - Groovy Web](https://www.groovyweb.co/blog/expressjs-vs-nextjs-ai-apps-2026)
4. [Vercel AI SDK Complete Guide: Building Production-Ready AI Chat Apps](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6)
5. [OpenAI SDK vs Vercel AI SDK: Which Should You Choose in 2026](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison)
6. [Capturing tool calls and results while streaming with the Vercel AI SDK](https://community.vercel.com/t/capturing-tool-calls-and-results-while-streaming-with-the-vercel-ai-sdk/32475)
7. [Tool Calling - AI SDK Core](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
8. [Proactive AI in 2026: Moving Beyond the Prompt - AlphaSense](https://www.alpha-sense.com/resources/research-articles/proactive-ai/)
9. [30 AI & GenAI Predictions for 2026 That Will Transform Work and Life](https://www.linkedin.com/pulse/ai-gen-2026-predictions-year-ahead-david-cronshaw-gl1ic)
10. [Pusher vs Supabase Realtime](https://ably.com/compare/pusher-vs-supabase)
11. [Ably vs Supabase Realtime](https://ably.com/compare/ably-vs-supabase)
12. [How to Implement Supabase Realtime in Your App - Chat2DB](https://chat2db.ai/resources/blog/implement-supabase-realtime)
13. [Getting Started with Realtime | Supabase Docs](https://supabase.com/docs/guides/realtime/getting_started)
14. [How to solve Next.js timeouts - Inngest Blog](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)
15. [Next.js Project Structure: Full-Stack Folder Guide (App Router)](https://www.groovyweb.co/blog/nextjs-project-structure-full-stack)
16. [How to speed up long lists with TanStack Virtual - LogRocket Blog](https://blog.logrocket.com/speed-up-long-lists-tanstack-virtual/)
17. [Virtuoso Message List](https://virtuoso.dev/message-list/)
18. [Zustand vs Jotai: Choosing the Right State Manager for Your React App](https://blog.openreplay.com/zustand-jotai-react-state-manager/)
19. [React State Management in 2025: Zustand vs. Redux vs. Jotai](https://meerako.com/blogs/react-state-management-zustand-vs-redux-vs-context-2025)
20. [Jotai vs Zustand: Which React State Library is Better?](https://www.zignuts.com/blog/jotai-vs-zustand-react-state-guide)
21. [Vercel vs Railway vs Render: Deploying AI Applications in 2026](https://getathenic.com/blog/vercel-vs-railway-vs-render-ai-deployment)
22. [Vercel Fluid: a New Compute Model and an Alternative to Serverless?](https://www.infoq.com/news/2025/03/vercel-fluid/)
23. [Vercel 2026: Architecting the Future of the AI Cloud - YouTube](https://www.youtube.com/watch?v=hETZ9o2Loc8)
24. [Anthropic vs Vercel (2026): Claude AI + Deployment Stack](https://www.buildmvpfast.com/compare/anthropic-vs-vercel)
25. [Get Rid of Function Timeouts and Reduce Vercel Costs | Upstash Blog](https://upstash.com/blog/vercel-cost-workflow)
26. [Fly.io vs Railway 2026: Which Developer Platform Should You Deploy On?](https://thesoftwarescout.com/fly-io-vs-railway-2026-which-developer-platform-should-you-deploy-on/)
27. [Vercel vs Railway: Best Deployment Platform for SaaS (2026)](https://designrevision.com/blog/vercel-vs-railway)
28. [Vercel vs Railway for hosting a Next.js AI chat app? : r/nextjs - Reddit](https://www.reddit.com/r/nextjs/comments/1r4qmpw/vercel_vs_railway_for_hosting_a_nextjs_ai_chat_app/)
29. [How to add background jobs with real-time updates to a Next.js app](https://www.inngest.com/blog/background-jobs-realtime-nextjs)
30. [Next.js Background Jobs: Inngest vs Trigger.dev vs Vercel Cron](https://www.hashbuilds.com/articles/next-js-background-jobs-inngest-vs-trigger-dev-vs-vercel-cron)
31. [Why We Chose QStash and Upstash Workflow at Scale](https://upstash.com/blog/qstash-workflow-at-scale)
32. [Best Trigger.dev Alternatives (2026): Open-Source](https://www.buildmvpfast.com/alternatives/trigger-dev)
33. [Inngest vs Trigger.dev (2026) Which One Actually Wins? - YouTube](https://www.youtube.com/watch?v=85l4BsRUxoY)
