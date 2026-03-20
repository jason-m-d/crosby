---
name: openrouter-expert
description: "OpenRouter expert for the Crosby project. Use this skill whenever working with AI API calls, debugging model responses, adding new AI features, troubleshooting API errors (429s, 404s, timeouts, JSON parse failures), changing models, optimizing costs or latency, or evaluating Crosby's AI pipeline. Trigger on phrases like 'openrouter', 'model error', 'API error', 'wrong model', 'slow response', 'add a new AI call', 'change the model', 'fallback not working', 'JSON parse error', 'response healing', 'provider routing', 'cost optimization', 'latency optimization', or any issue involving Crosby's AI calls through OpenRouter. Also trigger when the crosby-eval skill identifies an OpenRouter-related issue."
---

# OpenRouter Expert - Crosby Project

You are an expert in OpenRouter's API and how Crosby uses it. This skill covers two things: (1) how OpenRouter works, and (2) how Crosby specifically integrates with it. Use this knowledge to debug issues, add new AI calls correctly, optimize costs/latency, and support the crosby-eval skill when API-level issues surface.

## How Crosby Uses OpenRouter

All AI calls in Crosby go through OpenRouter (`ANTHROPIC_BASE_URL`). No direct provider calls.

### The Dual-Client Pattern

Crosby uses TWO SDK clients to talk to OpenRouter, and understanding why is critical:

**Anthropic SDK client** (for Claude models in the main chat stream):
```typescript
// src/app/api/chat/route.ts
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL })
```

**OpenAI SDK client** (for non-Anthropic models in background jobs):
```typescript
// src/lib/openrouter.ts
export const openrouterClient = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})
```

**Why two clients?** The Anthropic SDK sends an `anthropic-version` header on every request. When this header hits OpenRouter, it forces ALL requests to route to Anthropic providers - even if the model ID is `google/gemini-3.1-flash-lite-preview`. This causes 404 errors for non-Anthropic models. The OpenAI SDK doesn't send that header, so OpenRouter routes freely to the correct provider.

**Rule:** Use the Anthropic client ONLY for Claude models. Use the OpenAI client (`openrouterClient`) for Google, Perplexity, or any non-Anthropic model.

**Exception:** The web search call (`src/lib/chat/web-search.ts`) uses the Anthropic client for `perplexity/sonar-pro-search` and it works because Perplexity handles that header gracefully. But this is fragile - if issues arise, switch it to the OpenAI client.

### Model Assignments

| Use Case | Model | Client | Sort | Fallback |
|----------|-------|--------|------|----------|
| Main chat stream | `anthropic/claude-sonnet-4.6:exacto` | Anthropic SDK | `latency` | `google/gemini-3.1-pro-preview` |
| AI router | `google/gemini-3.1-flash-lite-preview` | OpenAI SDK | `price` | `google/gemini-3-flash-preview` |
| Background jobs (memory, sessions, notepad, training) | `google/gemini-3.1-flash-lite-preview` | OpenAI SDK | `price` | `google/gemini-3-flash-preview` |
| Web search | `perplexity/sonar-pro-search` | Anthropic SDK | `price` | none |
| PDF OCR fallback | `google/gemini-2.0-flash-001` | Anthropic SDK | n/a | none |

### How Fallbacks Are Passed

Crosby passes fallback models via `extra_body` (Anthropic client) or spread directly (OpenAI client). Never use the `X-OR-Models` header - it was undocumented and removed.

**Anthropic SDK pattern (main chat):**
```typescript
response = anthropic.messages.stream({
  model: selectedModel,
  max_tokens: 4096,
  system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
  messages: currentMessages,
  tools: activeTools,
  ...({ extra_body: {
    models: ['anthropic/claude-sonnet-4.6:exacto', 'google/gemini-3.1-pro-preview'],
    provider: { sort: 'latency' }
  }} as any),
})
```

**OpenAI SDK pattern (background jobs):**
```typescript
const response = await openrouterClient.chat.completions.create({
  model: 'google/gemini-3.1-flash-lite-preview',
  max_tokens: 400,
  messages: [...],
  ...({
    models: ['google/gemini-3.1-flash-lite-preview', 'google/gemini-3-flash-preview'],
    provider: { sort: 'price' },
    plugins: [{ id: 'response-healing' }],
    response_format: { type: 'json_schema', json_schema: { name: 'response', strict: true, schema } },
  } as any),
})
```

### Structured JSON Output Pattern

All background jobs that expect JSON use this combo:
1. `response_format: { type: 'json_schema', json_schema: { name: 'response', strict: true, schema: {...} } }`
2. `plugins: [{ id: 'response-healing' }]`
3. A `parseJSON()` fallback that strips markdown fences and extracts JSON objects

The `response-healing` plugin validates and repairs malformed JSON from models. It only works on non-streaming requests. The `strict: true` flag enforces exact schema compliance. Every property must include `additionalProperties: false`.

### Prompt Caching

The main chat stream uses Anthropic's prompt caching:
```typescript
system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
```

This caches the 10-20KB system prompt across requests, reducing token costs. The `ephemeral` type gives a 5-minute TTL. Anthropic requires a minimum of 1024-4096 tokens (varies by model) for caching to kick in. Cache reads cost less than full input pricing, but cache writes cost 1.25x.

For repeated background jobs processing the same system prompt, also wrap the system message in `cache_control`.

---

## OpenRouter API Reference

### Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

### Authentication
- `Authorization: Bearer <OPENROUTER_API_KEY>`
- Optional: `HTTP-Referer` (app attribution), `X-OpenRouter-Title` (app name)

### Core Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Model ID with provider prefix (e.g., `anthropic/claude-sonnet-4.6`) |
| `messages` | array | Message objects with `role` and `content` |
| `max_tokens` | int | Max completion tokens [1, context_length) |
| `temperature` | float | Sampling temperature [0, 2] |
| `top_p` | float | Nucleus sampling (0, 1] |
| `stream` | bool | Enable SSE streaming |
| `tools` | array | Function definitions for tool calling |
| `tool_choice` | string/object | `auto`, `none`, or specific function |
| `stop` | string/array | Stop sequences |
| `response_format` | object | `json_object` or `json_schema` for structured output |
| `seed` | int | Deterministic sampling seed |

### OpenRouter-Specific Parameters

These go in `extra_body` (Anthropic SDK) or directly in the request (OpenAI SDK):

| Parameter | Type | Description |
|-----------|------|-------------|
| `models` | string[] | Fallback model array in priority order |
| `provider` | object | Provider routing preferences (see below) |
| `plugins` | array | Enable plugins: `response-healing`, `context-compression` |
| `route` | string | Set to `'fallback'` for model fallback mode |

### Provider Object

Controls how OpenRouter picks which provider serves the request:

```typescript
provider: {
  sort: 'price' | 'latency' | 'throughput',  // Primary sort metric
  order: ['anthropic', 'google'],              // Try providers in this order
  allow_fallbacks: true,                        // Allow backup providers (default: true)
  require_parameters: false,                    // Only use providers supporting all params
  data_collection: 'allow' | 'deny',           // Control data logging
  only: ['anthropic'],                          // Whitelist providers
  ignore: ['openai'],                           // Blacklist providers
  quantizations: ['fp16', 'bf16'],              // Filter by model precision
  max_price: { prompt: 1, completion: 2 },      // USD per million tokens cap
  preferred_min_throughput: { p90: 50 },         // Min tokens/sec
  preferred_max_latency: { p90: 2 },             // Max seconds
}
```

**Sort behavior:** Setting `sort` disables load balancing. Without it, OpenRouter uses cost-optimized load balancing (inverse-square price weighting with outage avoidance).

### Model Variants (Suffixes)

| Suffix | Effect |
|--------|--------|
| `:exacto` | Quality-first provider routing for tool calling (Crosby uses this) |
| `:floor` | Price-first provider routing |
| `:nitro` | Throughput-first routing |
| `:free` | Free-tier model version |
| `:extended` | Extended context window |
| `:thinking` | Extended reasoning/thinking mode |
| `:online` | Real-time web search integration |

**`:exacto` details:** Reorders providers based on tool-calling success rate, throughput, and benchmark data. This is why Crosby's main chat uses `anthropic/claude-sonnet-4.6:exacto` - it prioritizes providers that handle tool calls reliably.

**Auto Exacto:** Runs automatically on ALL tool-calling requests with no configuration. It reorders providers using real-time throughput, tool-calling success rate, and benchmark data. To opt out, set `provider.sort` to `price` or use the `:floor` suffix.

### Fallback Behavior

The `models` array triggers fallback when the primary model hits:
- Context length errors
- Content moderation blocks
- Rate limits (429)
- Provider downtime

The system tries models in array order. Billing uses the model that actually served the response (check the `model` field in the response).

### Response Format

```typescript
{
  id: string,
  choices: [{
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error',
    native_finish_reason: string,  // Raw provider value
    message: { role: string, content: string, tool_calls?: [...] }
  }],
  model: string,  // Which model ACTUALLY served this (may differ from request if fallback triggered)
  usage: {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number,
    prompt_tokens_details: { cached_tokens: number, cache_write_tokens?: number },
    completion_tokens_details: { reasoning_tokens?: number },
    cost?: number
  }
}
```

### Generation Stats

`GET /api/v1/generation?id=$GENERATION_ID` - Returns detailed stats for a specific generation including exact token counts, cost, and which provider served it.

---

## Plugins

### Response Healing
- Validates and repairs malformed JSON from models
- Enable: `plugins: [{ id: 'response-healing' }]`
- Only works on non-streaming requests
- Use with `response_format: { type: 'json_schema', ... }` for best results

### Context Compression
- Truncates messages from the middle of the prompt when context exceeds model limits
- Enable: `plugins: [{ id: 'context-compression' }]`
- Auto-enabled for models with 8k or less context
- Keeps half from start, half from end (middle-out truncation)

### Web Search
- Models with `:online` suffix get real-time search
- Or use the `web_search` plugin directly

---

## Debugging OpenRouter Issues

### Common Error Patterns

**404 "Model not found"**
- Most likely cause: `anthropic-version` header forcing all requests to Anthropic providers
- Fix: Use the OpenAI SDK client (`openrouterClient`) for non-Anthropic models
- Check: Is a Google/Perplexity model being called through the Anthropic client?

**429 Rate Limit**
- OpenRouter may be rate-limiting, or the upstream provider is
- Check: Account balance (low balance triggers extra DB checks that slow things down)
- Fix: Add fallback models, check if auto-topup is enabled, maintain $10-20+ balance

**JSON Parse Errors in Background Jobs**
- Model returned malformed JSON despite `response_format`
- Check: Is `response-healing` plugin enabled?
- Check: Is the schema valid? Every object needs `additionalProperties: false` with `strict: true`
- Check: Is there a `parseJSON()` fallback catching markdown fences?

**Slow Responses / Timeouts**
- Router has a 3-second timeout before falling back to regex classifier
- Main chat has a 30-second abort timeout
- Check: Is `provider.sort` set? Without it, load balancing might hit a slow provider
- Check: Account balance (single-digit balance causes slower verification)
- Check: Edge cache may be cold in new regions (first 1-2 minutes slower)
- Fix: Ensure provider sort is set, maintain balance, consider `preferred_max_latency`

**Wrong Model Serving Response**
- The `model` field in the response shows which model actually served it
- If a fallback triggered, `model` will differ from what you requested
- This can happen silently - always log the response `model` for debugging

**Streaming Errors**
- Tool calls stream incrementally via delta objects
- `finish_reason: "tool_calls"` means you need to execute tools
- If stream cuts off, check abort controller timeout

**Router Fallback to Regex**
- Check server logs for "Router timed out" or "Router failed"
- The router uses `Promise.race` with a 3-second timeout
- Frequent fallbacks = router model or prompt needs tuning, or OpenRouter latency is high

### Diagnostic Queries

**Check what model actually served a response:**
Look at the `model` field in the API response, or query OpenRouter's generation stats:
```
GET https://openrouter.ai/api/v1/generation?id=$GENERATION_ID
```

**Check model availability:**
```
GET https://openrouter.ai/api/v1/models
```
Filter by supported features: `?supported_parameters=tools`

**Check if prompt caching is working:**
Look at `usage.prompt_tokens_details.cached_tokens` in responses. If it's 0, caching isn't hitting.

### Key Files for Debugging

| Issue | Check These Files |
|-------|-------------------|
| Main chat API errors | `src/app/api/chat/route.ts` (lines ~275-290 for stream init) |
| Router errors / timeouts | `src/lib/router.ts` (Promise.race with 3s timeout) |
| Background job failures | `src/lib/session-extraction.ts`, `src/lib/chat/memory-extraction.ts` |
| Web search errors | `src/lib/chat/web-search.ts` |
| Client config | `src/lib/openrouter.ts` (OpenAI client), env vars for Anthropic client |
| Model selection | `src/app/api/chat/route.ts` line ~48 (default model) |

---

## Adding New AI Calls to Crosby

Follow this checklist every time:

1. **Route through OpenRouter.** Never call a provider directly.

2. **Pick the right client:**
   - Claude model? Use Anthropic SDK client
   - Google/Perplexity/other? Use `openrouterClient` from `src/lib/openrouter.ts`

3. **Pick the right model:**
   - Complex agentic/research tasks: `anthropic/claude-sonnet-4.6:exacto` with `provider: { sort: 'latency' }`
   - Background jobs/crons: `google/gemini-3.1-flash-lite-preview` with `provider: { sort: 'price' }`
   - Web search: `perplexity/sonar-pro-search` with `provider: { sort: 'price' }`

4. **Always set fallbacks:**
   ```typescript
   models: ['primary-model', 'fallback-model']
   ```
   For background jobs: fallback to `google/gemini-3-flash-preview`

5. **Always set provider sort:**
   - `price` for background jobs (cost matters, speed doesn't)
   - `latency` for user-facing responses (speed matters)

6. **For JSON output, use all three layers:**
   - `response_format` with `json_schema` and `strict: true`
   - `response-healing` plugin
   - `parseJSON()` fallback for markdown fence stripping
   - Every object in the schema needs `additionalProperties: false`

7. **For repeated system prompts:**
   - Wrap in `cache_control: { type: 'ephemeral' }` to save tokens

8. **Pass fallbacks correctly:**
   - Anthropic SDK: `extra_body: { models: [...], provider: {...} }`
   - OpenAI SDK: spread directly into the create() call

9. **Type escape hatch:** Both clients need `as any` casts for OpenRouter-specific params since the SDKs don't type them.

---

## Prompt Caching Deep Dive

### How It Works on OpenRouter

OpenRouter implements "provider sticky routing" - it routes subsequent requests to the same provider endpoint that served the initial cached request, maximizing cache hit rates.

### Provider-Specific Behavior

**Anthropic Claude:**
- Supports explicit `cache_control` breakpoints (max 4)
- `ephemeral` type = 5-minute TTL, cache writes cost 1.25x, reads cost less
- Minimum 1024-4096 tokens depending on model
- Crosby uses this on the main chat system prompt

**Google Gemini:**
- Implicit caching on Gemini 2.5+ models (no setup needed)
- Also supports explicit `cache_control` breakpoints (no limit, uses last one)
- Minimum ~4096 tokens

**OpenAI:**
- Fully automatic, no configuration needed
- 1024-token minimum
- Cache reads cost 0.25x-0.50x input pricing

**DeepSeek, Groq:**
- Automated caching, no setup needed

### Verifying Cache Hits

Check `prompt_tokens_details` in the response:
- `cached_tokens` > 0 = cache hit
- `cache_write_tokens` > 0 = new cache entry written

---

## Reasoning Tokens

For models that support thinking/reasoning (Claude, Gemini 3, o-series):

```typescript
reasoning: {
  effort: 'high',      // xhigh, high, medium, low, minimal, none
  max_tokens: 4096,    // Exact budget (Anthropic, Gemini, Qwen)
  exclude: false,      // Hide reasoning from response
  enabled: true        // Enable at medium effort
}
```

**Anthropic Claude:** `max_tokens` range 1024-128000. Overall `max_tokens` must exceed reasoning budget to leave room for the actual response.

**Google Gemini 3:** Maps effort to internal `thinkingLevel`. Google determines actual token consumption internally.

### Preserving Reasoning Across Turns

For multi-turn tool-use workflows, pass reasoning back via `message.reasoning` (plaintext) or `message.reasoning_details` (structured array) to maintain context.

---

## Cost Optimization Tips

1. **Background jobs are the biggest lever.** They run constantly (email scan, memory extraction, session summarization). Using `google/gemini-3.1-flash-lite-preview` with `sort: 'price'` keeps these cheap.

2. **Prompt caching on the main chat saves 50%+.** The system prompt is 10-20KB. With `cache_control: { type: 'ephemeral' }`, repeat messages within 5 minutes reuse the cached prompt.

3. **Don't over-sort.** Setting `sort: 'latency'` disables load balancing, which means you lose the cost optimization from price-weighted distribution. Only use `sort: 'latency'` for user-facing responses where speed matters.

4. **Monitor with generation stats.** Hit `GET /api/v1/generation?id=$ID` to see exact costs per call. Look at `usage.cost` and `prompt_tokens_details.cached_tokens`.

5. **Maintain account balance above $10-20.** Low balances trigger extra verification checks on every request, adding latency.

---

## Integration with crosby-eval

When the crosby-eval skill identifies issues, here's how to diagnose OpenRouter-specific problems:

### Eval Category: API/Model Issues

If eval finds these symptoms, read this skill and apply the relevant debugging section:

- **Wrong model in response** - Check `model` field, fallback may have triggered
- **Slow response times** - Check provider sort, account balance, whether Auto Exacto is interfering
- **JSON parse failures in background jobs** - Check response-healing plugin, schema validity
- **Router falling back to regex frequently** - Check router model latency, OpenRouter status
- **Tool calls failing or incomplete** - Check if `:exacto` variant is being used, verify tool schema
- **Missing prompt cache hits** - Check `cached_tokens` in usage, verify TTL, check minimum token threshold

### Adding an Eval Dimension

When evaluating Crosby responses, add this check to the routing/tool evaluation:

1. Was the right client used? (Anthropic vs OpenAI SDK)
2. Did fallback trigger? (response `model` != request `model`)
3. Was prompt caching effective? (check `cached_tokens`)
4. Were provider preferences set correctly for this use case?
5. For background jobs: was response-healing enabled?

These checks go in the "Routing & Specialist Activation" dimension of the eval framework.

---

## Reference Files

For deeper technical details, read these as needed:

- **`references/api-deep-dive.md`** - Comprehensive reference for streaming (SSE format, delta objects, mid-stream errors, cancellation), embeddings endpoint (Crosby's RAG setup), rate limits and credits (how low balance causes latency), full parameter reference (every sampling/output/tool param with types and ranges), error codes (HTTP status codes, retry strategies), and zero completion insurance. Read this when debugging specific API issues or when you need the exact parameter name/type/range.
