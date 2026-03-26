# AI Pipeline — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

The AI pipeline is the sequence of operations that turns a user message into a Crosby response. It's the core of the product. Every message flows through: **Router → Context Assembly → System Prompt Build → LLM Stream → Tool Execution → Post-Response Processing.**

This spec covers each stage in implementation detail.

---

## Pipeline Stages

```
User message
  │
  ▼
┌─────────────────┐
│  1. ROUTER       │  Fast, cheap LLM (Gemini Flash Lite)
│  classifies      │  → intent, specialists, experts, data needs, tools
│  intent          │  Timeout: 3s → fallback to regex
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. CONTEXT      │  Parallel data loading based on router output
│  ASSEMBLY        │  → memories, emails, calendar, docs, Expert context
│                  │  → rolling summary, recent messages, RAG results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. PROMPT       │  Dynamic assembly from specialist sections
│  BUILD           │  → base prompt + active sections + data blocks
│                  │  → deduplicated tool array
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. LLM STREAM   │  Main chat model (configurable)
│  + TOOL LOOP     │  → streaming SSE to client
│                  │  → server-side tool execution
│                  │  → max 8 tool calls, 30s timeout
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. POST-        │  Fire-and-forget (not in response path)
│  RESPONSE        │  → store message, extract memories
│                  │  → embed message, update Expert confidence
└─────────────────┘
```

---

## Stage 1: Router

### Input

```typescript
interface RouterInput {
  message: string                    // The user's message
  recentMessages: {                  // Last 3 messages for context
    role: 'user' | 'assistant'
    content: string                  // Text-only summary of content blocks
  }[]
  experts: {                         // All user Experts
    id: string
    name: string
    description: string
    isActive: boolean
    ambientConfidence: number
  }[]
  specialists: {                     // All registered specialists
    id: string
    name: string
    description: string
    triggerRules: SpecialistTriggerRules
  }[]
}
```

### Output

```typescript
interface RouterResult {
  intent: string                     // Primary intent classification
  specialists: {                     // Specialists to activate
    id: string
    confidence: number               // 0.0-1.0
  }[]
  experts: {                         // Experts detected as relevant
    id: string
    confidence: number               // 0.0-1.0
  }[]
  dataNeeded: string[]               // Data blocks to load
  toolsNeeded: string[]              // Specific tools to include
  ragQuery: string | null            // Rewritten query for RAG search
  complexity: 'simple' | 'moderate' | 'complex'  // Drives retrieval depth
}
```

### Implementation

```typescript
// src/lib/ai/router.ts

import { ROUTER_MODEL, ROUTER_FALLBACK, ROUTER_TIMEOUT } from '@crosby/shared/constants'

export async function classifyMessage(input: RouterInput): Promise<RouterResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ROUTER_TIMEOUT)

  try {
    const response = await openrouter.chat.completions.create({
      model: ROUTER_MODEL,
      messages: [
        { role: 'system', content: buildRouterPrompt(input) },
        { role: 'user', content: input.message }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'router_result',
          strict: true,
          schema: ROUTER_RESULT_SCHEMA
        }
      },
      extra_body: {
        models: [ROUTER_MODEL, ROUTER_FALLBACK],
        provider: { sort: 'price' },
        plugins: [{ id: 'response-healing' }]
      }
    }, { signal: controller.signal })

    clearTimeout(timeout)
    return parseRouterResult(response)
  } catch (error) {
    clearTimeout(timeout)
    // Fallback to regex classifier
    return regexClassify(input.message)
  }
}
```

### Router Prompt Structure

```typescript
function buildRouterPrompt(input: RouterInput): string {
  return `You are a message router for a personal AI assistant.

AVAILABLE SPECIALISTS:
${input.specialists.map(s => `- ${s.id}: ${s.description}`).join('\n')}

USER'S EXPERTS:
${input.experts.map(e => `- ${e.name} (${e.description}) [currently: ${e.isActive ? 'active' : `ambient ${e.ambientConfidence}`}]`).join('\n')}

RECENT CONTEXT:
${input.recentMessages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}

Classify the user's message. Determine:
1. Which specialists are needed (with confidence 0.0-1.0)
2. Which Experts are relevant (with confidence 0.0-1.0)
3. What data needs to be loaded
4. What tools should be available
5. A keyword-rich RAG query if document/memory search would help
6. Complexity level (simple/moderate/complex)

${ROUTER_FEW_SHOT_EXAMPLES}`
}
```

### Regex Fallback

The regex classifier from v1, adapted for v2's specialist/Expert names. Returns a `RouterResult` with hardcoded confidence scores (0.8 for matches, 0.0 for non-matches).

```typescript
// src/lib/ai/router-fallback.ts

const PATTERNS: Record<string, RegExp[]> = {
  email: [/email/i, /inbox/i, /gmail/i, /reply/i, /draft/i, /send.*(to|email)/i],
  calendar: [/calendar/i, /schedule/i, /meeting/i, /event/i, /free.*time/i, /availability/i],
  tasks: [/task/i, /todo/i, /action.item/i, /remind/i, /deadline/i, /commitment/i],
  documents: [/document/i, /upload/i, /file/i, /pdf/i, /attachment/i],
  // ... more patterns
}

export function regexClassify(message: string): RouterResult {
  const specialists = Object.entries(PATTERNS)
    .filter(([_, patterns]) => patterns.some(p => p.test(message)))
    .map(([id]) => ({ id, confidence: 0.8 }))

  if (specialists.length === 0) {
    specialists.push({ id: 'core', confidence: 1.0 })
  }

  return {
    intent: specialists[0]?.id || 'general_chat',
    specialists,
    experts: [],
    dataNeeded: deriveDataNeeds(specialists),
    toolsNeeded: deriveToolNeeds(specialists),
    ragQuery: null,
    complexity: 'simple'
  }
}
```

---

## Stage 2: Context Assembly

### Data Block Loading

Context is loaded in parallel based on the router's `dataNeeded` array. Each data block is a self-contained fetch that returns formatted text for the system prompt.

```typescript
// src/lib/chat/context-loader.ts

interface LoadContextOptions {
  userId: string
  routerResult: RouterResult
  activeExperts: Expert[]
  recentMessageCount: number      // ~20 default
}

interface LoadedContext {
  recentMessages: Message[]
  contextSummary: string | null
  memories: {
    semantic: SemanticMemory[]
    episodic: EpisodicMemory[]
    procedural: ProceduralMemory[]
  }
  dataBlocks: Map<string, string>   // blockName → formatted text
  expertContext: Map<string, string> // expertId → Tier 1 content
  ragResults: string | null
}

export async function loadContext(options: LoadContextOptions): Promise<LoadedContext> {
  const { userId, routerResult, activeExperts } = options

  // Always-on loads (parallel)
  const alwaysOn = Promise.all([
    loadRecentMessages(userId, options.recentMessageCount),
    loadContextSummary(userId),
    loadProceduralMemories(userId, routerResult),
    loadCriticalTasks(userId),
    loadActiveWatches(userId),
  ])

  // Router-driven loads (parallel)
  // Confidence-based loading: specialists with confidence < 0.5 only get tool
  // definitions loaded (no data blocks). 0.5-0.8 get lightweight data (counts,
  // summaries). 0.8+ get full data blocks. This keeps context lean when the
  // router is uncertain.
  const routerDriven = Promise.all(
    routerResult.dataNeeded
      .filter(block => {
        const specialist = routerResult.specialists.find(s => s.id === blockToSpecialist(block))
        return !specialist || specialist.confidence >= 0.5  // Skip data for low-confidence specialists
      })
      .map(block => {
        const specialist = routerResult.specialists.find(s => s.id === blockToSpecialist(block))
        const lightweight = specialist && specialist.confidence < 0.8
        return loadDataBlock(userId, block, routerResult, { lightweight })
      })
  )

  // Memory retrieval (parallel with above)
  const memories = loadMemories(userId, routerResult)

  // Expert context (parallel with above)
  const expertContext = Promise.all(
    activeExperts.map(expert => loadExpertTierOne(userId, expert, routerResult))
  )

  // RAG retrieval (parallel with above)
  const rag = routerResult.ragQuery
    ? retrieveRAG(userId, routerResult.ragQuery)
    : Promise.resolve(null)

  // Wait for all parallel fetches
  const [
    [recentMessages, contextSummary, procedural, criticalTasks, watches],
    dataBlockResults,
    memoryResults,
    expertResults,
    ragResults
  ] = await Promise.all([alwaysOn, routerDriven, memories, expertContext, rag])

  return {
    recentMessages,
    contextSummary,
    memories: {
      semantic: memoryResults.semantic,
      episodic: memoryResults.episodic,
      procedural,
    },
    dataBlocks: new Map([
      ['critical_tasks', formatTasks(criticalTasks)],
      ['watches', formatWatches(watches)],
      ...dataBlockResults,
    ]),
    expertContext: new Map(expertResults),
    ragResults,
  }
}
```

### Memory Retrieval (Hybrid)

```typescript
// src/lib/chat/memory/retrieval.ts

export async function loadMemories(userId: string, routerResult: RouterResult) {
  // Skip memory retrieval for simple queries that don't need it
  if (routerResult.complexity === 'simple' && !routerResult.dataNeeded.includes('memories')) {
    return { semantic: [], episodic: [] }
  }

  // Three parallel signals
  const queryEmbedding = await generateEmbedding(routerResult.ragQuery || routerResult.intent)

  const [vectorResults, entityResults, recentResults] = await Promise.all([
    // 1. Vector similarity
    adminClient.rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_count: 15,
      filter_user_id: userId,
    }),
    // 2. Entity matching (if entities mentioned)
    searchByEntityTags(userId, extractEntities(routerResult)),
    // 3. Recent + important
    getRecentImportantMemories(userId, 10),
  ])

  // Reciprocal Rank Fusion
  const fused = reciprocalRankFusion([
    vectorResults.data || [],
    entityResults,
    recentResults,
  ])

  // LLM recall gating (fast pass to filter noise)
  const gated = await recallGating(fused.slice(0, 15), routerResult)

  return {
    semantic: gated.filter(m => m.type === 'semantic'),
    episodic: gated.filter(m => m.type === 'episodic'),
  }
}

function reciprocalRankFusion(rankings: any[][], k = 60): any[] {
  const scores = new Map<string, number>()

  for (const ranking of rankings) {
    ranking.forEach((item, rank) => {
      const current = scores.get(item.id) || 0
      scores.set(item.id, current + 1 / (k + rank + 1))
    })
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => rankings.flat().find(item => item.id === id))
    .filter(Boolean)
}
```

### Expert Tier 1 Loading

```typescript
// src/lib/experts/context-loading.ts

export async function loadExpertTierOne(
  userId: string,
  expert: Expert,
  routerResult: RouterResult
): Promise<[string, string]> {  // [expertId, formattedContext]

  const confidence = routerResult.experts.find(e => e.id === expert.id)?.confidence
    ?? expert.ambientConfidence

  // Below threshold — no context loading
  if (confidence < 0.2) return [expert.id, '']

  // Low confidence — description only
  if (confidence < 0.5) {
    return [expert.id, formatExpertDescription(expert)]
  }

  // Medium confidence — description + top pinned doc
  if (confidence < 0.8) {
    const topDoc = await getTopPinnedDocument(expert.id)
    return [expert.id, formatExpertPartial(expert, topDoc)]
  }

  // High confidence — full Tier 1
  const [pinnedDocs, topArtifacts, recentResearch] = await Promise.all([
    getPinnedDocuments(expert.id),
    getTopArtifacts(expert.id, 3),
    getRecentResearch(expert.id, 2),
  ])

  const content = formatExpertFull(expert, pinnedDocs, topArtifacts, recentResearch)

  // Enforce token budget (~15% of available context)
  const truncated = truncateToTokenBudget(content, EXPERT_TIER1_TOKEN_BUDGET)

  return [expert.id, truncated]
}
```

---

## Stage 3: System Prompt Build

### Prompt Structure

The system prompt is assembled dynamically per request. Each section is included only if its specialist is active.

```
┌─────────────────────────────────────────────┐
│ CACHED PREFIX (stable across messages)       │
│                                              │
│  ① Base prompt (identity, voice, rules)      │
│  ② Context retrieval routing rules           │
│  ③ Active Expert instructions                │
│  ④ Procedural memory triggers                │
│                                              │
├─────────────────────────────────────────────┤
│ DYNAMIC SUFFIX (changes per message)         │
│                                              │
│  ⑤ Rolling context summary                   │
│  ⑥ Active specialist sections (with data)    │
│  ⑦ Memory retrieval results                  │
│  ⑧ RAG results                               │
│  ⑨ Expert Tier 1 content                     │
│                                              │
└─────────────────────────────────────────────┘
```

**Why this split:** The cached prefix is stable across messages (same Expert, same procedural rules). OpenRouter's prompt caching (`cache_control: ephemeral`) caches it. The dynamic suffix changes per message. This minimizes redundant token processing.

### Implementation

```typescript
// src/lib/ai/prompt/builder.ts

export function buildSystemPrompt(
  context: LoadedContext,
  activeSpecialists: SpecialistDefinition[],
  activeExperts: Expert[],
): { content: string; cacheBreakpoint: number } {

  // === CACHED PREFIX ===
  const prefix = [
    BASE_SYSTEM_PROMPT,                          // Identity, voice, rules
    CONTEXT_RETRIEVAL_RULES,                     // Which layer answers which question
    ...activeExperts.map(e => formatExpertInstructions(e)),
    ...context.memories.procedural.map(p => formatProceduralTrigger(p)),
  ].join('\n\n')

  // === DYNAMIC SUFFIX ===
  const suffix = [
    // Rolling context summary
    context.contextSummary
      ? `<context_summary>\n${context.contextSummary}\n</context_summary>`
      : null,

    // Active specialist sections with data populated
    ...activeSpecialists.map(specialist =>
      populateSpecialistSection(specialist, context.dataBlocks)
    ),

    // Retrieved memories
    context.memories.semantic.length > 0
      ? `<memories>\n${context.memories.semantic.map(m => `- ${m.content}`).join('\n')}\n</memories>`
      : null,

    context.memories.episodic.length > 0
      ? `<episodes>\n${context.memories.episodic.map(e => `- ${e.title}: ${e.narrative}`).join('\n')}\n</episodes>`
      : null,

    // RAG results
    context.ragResults
      ? `<documents>\n${context.ragResults}\n</documents>`
      : null,

    // Expert Tier 1 content
    ...Array.from(context.expertContext.entries())
      .filter(([_, content]) => content.length > 0)
      .map(([expertId, content]) =>
        `<expert_context name="${expertId}">\n${content}\n</expert_context>`
      ),
  ].filter(Boolean).join('\n\n')

  return {
    content: `${prefix}\n\n${suffix}`,
    cacheBreakpoint: prefix.length,  // Everything before this is cacheable
  }
}
```

### Specialist Section Population

Each specialist has a prompt template with `{{placeholder}}` tokens that get replaced with loaded data:

```typescript
// src/lib/ai/prompt/sections/email.ts

export const EMAIL_SECTION = `
## Email Context

{{emails_awaiting}}

You can search emails with search_gmail, draft emails with draft_email, and send emails with send_email.
When drafting emails, match Crosby's voice - direct, concise, no corporate speak.
Always confirm before sending.
`

function populateSpecialistSection(
  specialist: SpecialistDefinition,
  dataBlocks: Map<string, string>
): string {
  let section = specialist.systemPromptSection

  // Replace all {{placeholder}} tokens with loaded data
  for (const [blockName, content] of dataBlocks) {
    section = section.replace(`{{${blockName}}}`, content || '(none)')
  }

  // Remove any unreplaced placeholders
  section = section.replace(/\{\{[^}]+\}\}/g, '(not loaded)')

  return section
}
```

---

## Stage 4: LLM Stream + Tool Loop

### Streaming Implementation

```typescript
// src/lib/ai/stream.ts

export async function streamChat(
  systemPrompt: { content: string; cacheBreakpoint: number },
  messages: Message[],
  tools: ToolDefinition[],
  onEvent: (event: SSEEvent) => void,
): Promise<{ assistantMessage: ContentBlock[]; toolCalls: ToolCall[] }> {

  const allContent: ContentBlock[] = []
  const allToolCalls: ToolCall[] = []
  let toolCallCount = 0
  const startTime = Date.now()

  // Build conversation history for the API
  let conversationMessages = formatMessagesForAPI(messages)

  while (true) {
    // Safety limits
    if (toolCallCount >= MAX_TOOL_CALLS) break
    if (Date.now() - startTime > STREAM_TIMEOUT_MS) break

    const stream = await openrouter.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        // Cached prefix: identity, Expert instructions, procedural triggers (stable across messages)
        {
          role: 'system',
          content: systemPrompt.content.slice(0, systemPrompt.cacheBreakpoint),
          cache_control: { type: 'ephemeral' },
        },
        // Dynamic suffix: summary, specialist data, memories, RAG results (changes per message)
        {
          role: 'system',
          content: systemPrompt.content.slice(systemPrompt.cacheBreakpoint),
        },
        ...conversationMessages,
      ],
      tools: tools.map(t => t.schema),
      stream: true,
      extra_body: {
        models: CHAT_FALLBACK_MODELS,
        provider: { sort: 'latency' },
      },
    })

    let currentToolUse: Partial<ToolCall> | null = null
    let hasToolCalls = false

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      // Text content
      if (delta?.content) {
        onEvent({ type: 'text_delta', content: delta.content })
        // Accumulate for storage
      }

      // Tool call start
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            currentToolUse = {
              id: tc.id,
              name: tc.function.name,
              input: '',
            }
            onEvent({ type: 'tool_use', id: tc.id!, name: tc.function.name, input: {} })
            hasToolCalls = true
          }
          if (tc.function?.arguments && currentToolUse) {
            currentToolUse.input += tc.function.arguments
          }
        }
      }
    }

    // If no tool calls, we're done
    if (!hasToolCalls) break

    // Execute tool calls
    if (currentToolUse?.name && currentToolUse?.input) {
      toolCallCount++
      const parsedInput = JSON.parse(currentToolUse.input as string)
      const result = await executeToolCall(currentToolUse.name, parsedInput)

      onEvent({ type: 'tool_result', id: currentToolUse.id!, content: result.content })
      allToolCalls.push({ ...currentToolUse, result } as ToolCall)

      // Emit any card tracks or artifacts from tool execution
      if (result.cardTrack) onEvent({ type: 'card_track', ...result.cardTrack })
      if (result.artifactOpen) onEvent({ type: 'artifact_open', artifact_id: result.artifactOpen })

      // Add tool call + result to conversation for next iteration
      conversationMessages.push(
        { role: 'assistant', content: null, tool_calls: [formatToolCall(currentToolUse)] },
        { role: 'tool', tool_call_id: currentToolUse.id, content: result.content }
      )
    }
  }

  onEvent({ type: 'done' })
  return { assistantMessage: allContent, toolCalls: allToolCalls }
}
```

### Tool Execution Registry

```typescript
// src/lib/chat/tools/registry.ts

type ToolExecutor = (input: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>

const registry = new Map<string, ToolExecutor>()

// Register all tools at startup
export function registerTools() {
  // Email
  registry.set('search_gmail', executeSearchGmail)
  registry.set('draft_email', executeDraftEmail)
  registry.set('send_email', executeSendEmail)

  // Calendar
  registry.set('get_calendar_events', executeGetCalendarEvents)
  registry.set('create_event', executeCreateEvent)
  registry.set('find_availability', executeFindAvailability)

  // Tasks
  registry.set('manage_tasks', executeManageTasks)

  // Documents
  registry.set('search_documents', executeSearchDocuments)

  // Contacts
  registry.set('query_contacts', executeQueryContacts)

  // Artifacts
  registry.set('manage_artifact', executeManageArtifact)

  // Notepad
  registry.set('manage_notepad', executeManageNotepad)

  // Watches
  registry.set('manage_watches', executeManageWatches)

  // Web search
  registry.set('web_search', executeWebSearch)
  registry.set('deep_research', executeDeepResearch)

  // System
  registry.set('request_additional_context', executeRequestAdditionalContext)
  registry.set('query_activity_log', executeQueryActivityLog)
  registry.set('search_conversation_history', executeSearchConversationHistory)
  registry.set('ask_structured_question', executeAskStructuredQuestion)
  registry.set('spawn_background_job', executeSpawnBackgroundJob)
}

export async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  context?: ToolContext
): Promise<ToolResult> {
  const executor = registry.get(name)
  if (!executor) {
    return { content: `Unknown tool: ${name}`, isError: true }
  }
  try {
    return await executor(input, context!)
  } catch (error) {
    return { content: `Tool error: ${error.message}`, isError: true }
  }
}
```

---

## Stage 5: Post-Response Processing

All post-response work is fire-and-forget — it runs after the SSE stream closes. None of it blocks the response.

```typescript
// src/lib/chat/post-response.ts

export async function processPostResponse(options: {
  userId: string
  userMessage: Message
  assistantMessage: ContentBlock[]
  toolCalls: ToolCall[]
  routerResult: RouterResult
  sessionId: string
}) {
  const { userId, userMessage, assistantMessage, toolCalls, routerResult, sessionId } = options

  // All fire-and-forget — don't await these as a group
  void Promise.allSettled([
    // Store assistant message
    storeAssistantMessage(userId, assistantMessage, {
      sessionId,
      expertIds: routerResult.experts.map(e => e.id),
      specialistIds: routerResult.specialists.map(s => s.id),
      metadata: { toolCalls: toolCalls.map(tc => tc.name) },
    }),

    // Memory extraction (debounced — skip if last extraction was < 5s ago)
    debouncedMemoryExtraction(userId, userMessage, assistantMessage),

    // Embed user message (queue for next embed cron, or do inline if fast)
    queueMessageEmbedding(userId, userMessage.id),

    // Update Expert ambient confidence
    updateExpertConfidence(userId, routerResult.experts),

    // Update session message count
    incrementSessionMessageCount(sessionId),

    // Log router decision to activity log
    logRouterDecision(userId, routerResult),

    // Log tool calls to activity log
    ...toolCalls.map(tc => logToolCall(userId, tc)),

    // Check if context summary needs refresh
    checkSummaryRefresh(userId),
  ])
}
```

### Memory Extraction

```typescript
// src/lib/chat/memory/extraction.ts

export async function extractMemories(
  userId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  const response = await openrouter.chat.completions.create({
    model: BACKGROUND_MODEL,
    messages: [
      {
        role: 'system',
        content: MEMORY_EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: `User said: "${userMessage}"\n\nAssistant responded: "${assistantResponse}"\n\nExtract any memories worth keeping.`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'extracted_memories',
        strict: true,
        schema: MEMORY_EXTRACTION_SCHEMA,
      }
    },
    extra_body: {
      models: [BACKGROUND_MODEL, BACKGROUND_FALLBACK],
      provider: { sort: 'price' },
      plugins: [{ id: 'response-healing' }],
    }
  })

  const extracted = parseMemoryExtractionResult(response)

  for (const memory of extracted.semantic) {
    const embedding = await generateEmbedding(memory.content)
    await adminClient.from('semantic_memories').insert({
      user_id: userId,
      content: memory.content,
      importance: memory.importance,
      entity_tags: memory.entityTags,
      embedding,
    })
  }

  for (const episode of extracted.episodic) {
    const embedding = await generateEmbedding(episode.narrative)
    await adminClient.from('episodic_memories').insert({
      user_id: userId,
      title: episode.title,
      narrative: episode.narrative,
      keywords: episode.keywords,
      entity_tags: episode.entityTags,
      importance: episode.importance,
      embedding,
    })
  }
}
```

---

## Model Configuration

```typescript
// packages/shared/src/constants/models.ts

// Main chat model (env-configurable for easy swaps without deploys)
export const CHAT_MODEL = process.env.CHAT_MODEL || 'anthropic/claude-sonnet-4.6:exacto'
export const CHAT_FALLBACK_MODELS = [
  'anthropic/claude-sonnet-4.6:exacto',
  'google/gemini-3.1-pro-preview'
]
export const CHAT_PROVIDER_SORT = 'latency'

// Router model
export const ROUTER_MODEL = process.env.ROUTER_MODEL || 'google/gemini-3.1-flash-lite-preview'
export const ROUTER_FALLBACK = 'google/gemini-3-flash-preview'
export const ROUTER_TIMEOUT = 3000 // ms

// Background jobs (memory extraction, briefings, etc.)
export const BACKGROUND_MODEL = process.env.BACKGROUND_MODEL || 'google/gemini-3.1-flash-lite-preview'
export const BACKGROUND_FALLBACK = 'google/gemini-3-flash-preview'

// Web search
export const WEB_SEARCH_MODEL = process.env.WEB_SEARCH_MODEL || 'perplexity/sonar-pro-search'

// Embeddings
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536
```

---

## Limits & Budgets

```typescript
// packages/shared/src/constants/limits.ts

// Stream limits
export const MAX_TOOL_CALLS = 8              // Per response
export const STREAM_TIMEOUT_MS = 30_000      // 30 seconds

// Router
export const ROUTER_TIMEOUT = 3_000          // 3 seconds

// Context budgets (percentages of total available context)
export const BUDGET_SYSTEM_PROMPT = 0.05     // 5%
export const BUDGET_CONTEXT_SUMMARY = 0.02   // 2%
export const BUDGET_MEMORIES = 0.02          // 2%
export const BUDGET_RECENT_MESSAGES = 0.15   // 5-15% (flexible)
export const BUDGET_EXPERT_TIER1 = 0.15      // 10-15% (flexible)
// Remaining: on-demand retrieval, tool results

// Expert Tier 1 absolute budget
export const EXPERT_TIER1_TOKEN_BUDGET = 4000  // ~15% of available context at 200K model

// Summary
export const SUMMARY_MAX_TOKENS = 2000
export const SUMMARY_REFRESH_TOKEN_THRESHOLD = 80_000
export const SUMMARY_REFRESH_TIME_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours

// Recent messages
export const DEFAULT_RECENT_MESSAGES = 20
export const MIN_RECENT_MESSAGES = 10        // Never go below this

// Background jobs
export const MAX_CONCURRENT_HEAVY_JOBS = 3
export const HEAVY_JOB_TIMEOUT_MS = 5 * 60 * 1000   // 5 minutes
export const LIGHTWEIGHT_JOB_TIMEOUT_MS = 30_000      // 30 seconds

// Memory
export const MEMORY_EXTRACTION_DEBOUNCE_MS = 5_000    // 5 seconds
export const MEMORY_RETRIEVAL_CANDIDATES = 15
export const CONTRADICTION_SCAN_BATCH_SIZE = 50
```

---

## Error Recovery

| Failure | Recovery |
|---|---|
| Router timeout | Regex fallback. Continue. Log to activity_log. |
| Router malformed response | Regex fallback. Continue. Log error. |
| Context loading partial failure | Continue with what loaded. Missing blocks show as "(not loaded)" in prompt. |
| Memory retrieval failure | Continue without memories. Response may miss context but won't break. |
| LLM stream failure | Retry once with simplified context (last 5 messages, no RAG). If retry fails → error message (NOT saved to DB). |
| Tool execution failure | Return error text as tool_result. Model sees the error and adapts. |
| Memory extraction failure | Silent. No impact on user. Will try again on next message. |
| Embedding failure | Queue for next embed cron run. |

---

## Observability (Langfuse)

Every chat request creates a Langfuse trace with spans:

```
trace: "chat_request"
  ├── span: "router" (model, latency, result)
  ├── span: "context_loading" (blocks loaded, latency)
  ├── span: "prompt_build" (token count, sections included)
  ├── span: "llm_stream" (model, tokens in/out, latency, tool calls)
  │   ├── span: "tool_call_1" (name, latency, result)
  │   ├── span: "tool_call_2" (name, latency, result)
  │   └── ...
  └── span: "post_response" (memory extraction, embedding)
```

This enables:
- Latency debugging (which stage is slow?)
- Cost tracking (tokens per request, per model)
- Quality evaluation (what did the router classify? what memories were retrieved?)
- Error tracing (which stage failed?)
