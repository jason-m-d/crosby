# OpenRouter API Deep Dive

Read this file when you need detailed reference on streaming, embeddings, rate limits, parameters, or error handling beyond what's in the main SKILL.md.

## Table of Contents
1. Streaming
2. Embeddings
3. Rate Limits & Credits
4. Full Parameter Reference
5. Error Codes & Handling
6. Zero Completion Insurance

---

## 1. Streaming

### How SSE Streaming Works

Set `stream: true` in the request. Responses arrive as SSE-formatted lines: `data: ` followed by JSON. Terminal event: `data: [DONE]`.

### Delta Object Structure

Each chunk contains:
- `id`: Completion identifier
- `object`: `"chat.completion.chunk"`
- `created`: Unix timestamp
- `model`: Model identifier
- `choices[0].delta.content`: The text fragment (may be null)
- `choices[0].finish_reason`: Null until stream ends

### Usage in Final Chunk

The last chunk before `[DONE]` includes a `usage` object with `prompt_tokens`, `completion_tokens`, `total_tokens`. This is the ONLY place usage data appears in streaming responses.

### Keep-Alive Comments

OpenRouter sends `": OPENROUTER PROCESSING"` comments to prevent connection timeouts. Per SSE spec, these are safely ignored. Recommended SSE clients (eventsource-parser, OpenAI SDK, Vercel AI SDK) handle these automatically.

### Streaming Tool Calls

Tool calls stream incrementally via delta objects. When `finish_reason: "tool_calls"`, the full tool call is assembled from accumulated deltas. Execute the tool, append results, and continue the loop.

### Mid-Stream Errors

If an error occurs after tokens have already been sent, HTTP status remains 200. The error appears as an SSE event:
```
data: {"error":{"code":"...", "message":"..."}, "choices":[...]}
```
Check for `'error' in chunk` during iteration. `finish_reason: "error"` signals stream termination.

### Stream Cancellation

Use `AbortController` with `signal` parameter. Provider support varies:
- Supports cancellation: OpenAI, Anthropic, Fireworks, ~20 others
- Does NOT support cancellation (billing continues): AWS Bedrock, Groq, Google
- Crosby uses a 30-second abort timeout on the main chat stream

---

## 2. Embeddings

### Endpoint
`POST https://openrouter.ai/api/v1/embeddings`

### Request Parameters
- `model` (required): e.g., `openai/text-embedding-3-small`
- `input` (required): String, array of strings, or multimodal content objects
- `encoding_format` (optional): Output format (e.g., `"float"`)
- `provider` (optional): Provider selection preferences

### Crosby's Embedding Setup
Crosby uses `openai/text-embedding-3-small` via OpenRouter for RAG embeddings (see `src/lib/embeddings.ts`). Chunks are embedded after document upload and stored for vector search.

### Input Formats

**Single text:** `"input": "text here"`

**Batch:** `"input": ["text1", "text2", "text3"]`

**Multimodal (image):**
```json
"input": [{"content": [{"type": "image_url", "image_url": {"url": "https://..."}}]}]
```

### Response Format
```json
{
  "data": [
    {"embedding": [0.123, -0.456, ...], "index": 0}
  ]
}
```

### Best Practices
- Cache embeddings for repeated inputs (Crosby stores them in Supabase)
- Batch multiple texts in single requests when possible
- Chunk long documents at meaningful boundaries
- Use cosine similarity for comparisons (not Euclidean distance)
- No streaming support for embeddings
- Deterministic - identical inputs always produce identical embeddings

### List Available Embedding Models
`GET https://openrouter.ai/api/v1/embeddings/models`

Or browse: `https://openrouter.ai/models?fmt=cards&output_modalities=embeddings`

---

## 3. Rate Limits & Credits

### Check Current Limits
`GET https://openrouter.ai/api/v1/key` with Bearer token

Returns:
- `limit`: Credit limit for the key (null if unlimited)
- `limit_remaining`: Remaining credits (null if unlimited)
- `limit_reset`: Reset type (null if never resets)
- Usage tracking: all-time, daily, weekly, monthly credit consumption
- `is_free_tier`: Whether account has made prior purchases

### Rate Limit Behavior

**Free model variants** (`:free` suffix):
- Per-minute request limits apply
- Daily limits vary by purchase history
- Creating additional accounts/keys doesn't bypass limits - capacity is global

**DDoS Protection:** Cloudflare blocks dramatically excessive usage

**Negative Balance:** HTTP 402 errors for ALL requests (including free models) until credits are replenished

### Impact on Latency

When account balance is low (single-digit dollars) or API key approaches spending limit, OpenRouter performs extra database verification on every request. This adds noticeable latency. Keep balance above $10-20 and enable auto-topup.

---

## 4. Full Parameter Reference

### Sampling Parameters

| Parameter | Type | Range | Default | Notes |
|-----------|------|-------|---------|-------|
| `temperature` | float | 0-2 | 1.0 | Lower = more deterministic |
| `top_p` | float | 0-1 | 1.0 | Nucleus sampling |
| `top_k` | int | 0+ | 0 (disabled) | Not available for OpenAI models |
| `top_a` | float | 0-1 | 0 | Minimum probability threshold relative to top token |
| `min_p` | float | 0-1 | 0 | Absolute minimum probability threshold |
| `frequency_penalty` | float | -2 to 2 | 0 | Scales with occurrence count |
| `presence_penalty` | float | -2 to 2 | 0 | Flat penalty for used tokens |
| `repetition_penalty` | float | 0-2 | 1.0 | Reduces input token repetition |
| `max_tokens` | int | 1+ | varies | Max = context_length - prompt_length |
| `seed` | int | any | none | For reproducible results (not all models) |
| `stop` | string/array | - | none | Stop sequences |

### Output Control

| Parameter | Type | Description |
|-----------|------|-------------|
| `response_format` | object | `{ type: 'json_object' }` or `{ type: 'json_schema', json_schema: {...} }` |
| `structured_outputs` | bool | Enable structured JSON schema outputs |
| `logprobs` | bool | Return log probabilities |
| `top_logprobs` | int (0-20) | N most likely tokens with probabilities |
| `logit_bias` | object | Map token IDs to bias values (-100 to 100) |

### Tool Calling

| Parameter | Type | Description |
|-----------|------|-------------|
| `tools` | array | Function definitions (OpenAI format) |
| `tool_choice` | string/object | `'none'`, `'auto'`, `'required'`, or specific function |
| `parallel_tool_calls` | bool | Simultaneous vs sequential (default: true) |

### Verbosity (New)

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `verbosity` | enum | low, medium, high, max | Controls response detail level. Maps to Anthropic's output_config.effort. `max` limited to Claude 4.6 Opus+ |

### Provider-Specific Parameters

OpenRouter passes through provider-specific params directly. Examples:
- Mistral: `safe_prompt`
- Hyperbolic: `raw_mode`

Always check provider docs for supported params.

---

## 5. Error Codes & Handling

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 400 | Bad Request | Invalid params, malformed schema, missing required fields |
| 401 | Unauthorized | Invalid/missing API key |
| 402 | Payment Required | Insufficient credits, negative balance |
| 404 | Not Found | Model doesn't exist, or `anthropic-version` header forcing wrong provider |
| 429 | Rate Limited | Too many requests, or upstream provider rate limit |
| 502 | Bad Gateway | Provider returned invalid response |
| 503 | Service Unavailable | Provider is down |
| 529 | Provider Overloaded | Upstream provider overwhelmed (enable fallbacks) |

### Error Response Format
```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded",
    "metadata": { ... }
  }
}
```

### Streaming Error Format
When error occurs mid-stream (after tokens sent), HTTP remains 200:
```
data: {"error":{"code":"...", "message":"..."}}
```

### Retry Strategy

- 429: Back off exponentially. Check if it's OpenRouter-level or provider-level. Adding fallback models helps.
- 502/503/529: Automatic if `allow_fallbacks: true` (default). Otherwise retry with backoff.
- 404: Don't retry - fix the model ID or client (likely the `anthropic-version` header bug).
- 402: Don't retry - add credits.

---

## 6. Zero Completion Insurance

Automatic protection against charges when responses fail:

**Triggers when:**
1. Response has zero completion tokens AND blank/null finish reason
2. Response has an error finish reason

**What happens:** No credits deducted, even if OpenRouter was charged by the provider for prompt processing. OpenRouter absorbs the cost.

**No configuration needed** - automatic for all accounts.

Appears on activity pages showing zero credits deducted.
