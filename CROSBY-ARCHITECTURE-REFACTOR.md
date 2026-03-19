# Crosby Architecture Refactor - Claude Code Prompts

This document contains sequential prompts to give Claude Code for refactoring Crosby's chat system. Execute them in order - each phase builds on the previous one. Each prompt is designed to be copy/pasted directly into Claude Code.

**Important**: Before starting each phase, make sure the previous phase is working and tested. Don't rush through these.

---

## Phase 0: Stability Guards (Do This First)

This phase adds safety nets to the existing system. No architecture changes - just making what exists more resilient. This fixes the timeouts, repeated responses, and crashes you're experiencing NOW.

### Prompt 0

```
I need you to add stability guards to the chat system. No architecture changes - just safety nets. Read src/app/api/chat/route.ts and make these specific changes:

1. ADD A TIMEOUT TO THE MAIN LLM CALL
The tool execution while loop (the `while (continueLoop)` block that calls `anthropic.messages.stream()`) has no timeout. If OpenRouter hangs, the request hangs forever. Wrap each iteration of the loop with an AbortController timeout of 30 seconds. If it times out, break the loop and send a graceful error to the frontend: "I got cut off - let me try that again with a simpler approach."

2. CAP TOOL CALLS PER MESSAGE
Inside the while (continueLoop) loop, add a counter. If the model makes more than 8 tool calls in a single message, break the loop and append a message to the model saying "You've used 8 tools on this message. Wrap up your response with what you have." This prevents runaway tool chains.

3. ADD RETRY ON STREAM FAILURE
The current `response.on('error')` handler just rethrows, which kills the request. Instead: catch the error, log it, and retry ONCE with a simplified context (drop document chunks and reduce history to last 5 messages). If the retry also fails, send a clean error to the frontend.

4. FIX THE HISTORY DEDUPLICATION
The current history loading trims messages to fit a 40K character budget. But if the stream errors mid-response and a partial assistant message gets saved, the next request sees a malformed history. After loading history from the DB, add a check: if the last message is role "assistant" and is shorter than 20 characters, drop it - it's likely a partial/failed response.

5. ADD HARD CAP ON DOCUMENT CONTEXT
In the buildSystemPrompt call, the documentContext string can be huge if RAG returns long chunks. Before passing documentContext to buildSystemPrompt, truncate it to 4000 characters max. Add a comment explaining why.

6. DEBOUNCE MEMORY EXTRACTION
The extractMemories() call at the end of the POST handler fires on every message with no debounce. If two messages arrive in rapid succession, both extractions run in parallel and can create duplicate memories. Add a simple guard: before running extractMemories, check if there's a memory with created_at within the last 5 seconds. If so, skip this extraction.

Don't change any other behavior. Test by sending a few messages to make sure streaming still works.
```

---

## Phase 1: The AI Router (Replaces Regex Classifier)

This is the biggest single improvement. Replace the dumb keyword regex in `src/lib/intent-classifier.ts` with a fast AI call that actually understands what the user needs.

### Prompt 1A - Build the Router

```
I'm replacing the regex-based intent classifier with an AI-powered router. This is the most important change in the refactor - it determines what data loads and what tools are available for every message.

CURRENT STATE:
- src/lib/intent-classifier.ts has classifyIntent() which uses regex to detect domains like "email", "calendar", "sales", etc.
- It returns a Set<string> of domain names
- getToolsForDomains() maps domains to tool names
- The chat route in src/app/api/chat/route.ts calls classifyIntent() then uses domains to gate which DB queries run and which tools are active

NEW DESIGN:
Create a new file src/lib/router.ts that exports an async function routeMessage(). It should:

1. Take the user's message + last 3 messages as context (array of {role, content} objects)
2. Call Gemini Flash Lite via the openrouterClient (from src/lib/openrouter.ts) with a structured JSON schema response
3. Return a RouterResult object with these fields:

```typescript
interface RouterResult {
  intent: string              // 1-sentence description of what the user wants
  data_needed: string[]       // which data blocks to load. Valid values: "action_items", "projects", "artifacts", "memories", "documents_rag", "context_chunks", "contacts", "notes", "calendar", "emails_awaiting", "watches", "dashboard_cards", "notification_rules", "ui_preferences", "training", "decisions", "texts", "sales"
  tools_needed: string[]      // actual tool names from ALL_TOOLS_MAP keys
  rag_query: string | null    // rewritten search query optimized for vector search, or null if no RAG needed
  complexity: "low" | "medium" | "high"  // how complex the response needs to be
  relevant_projects: string[] // project names or IDs that this message likely relates to (empty array if none). Used to scope RAG retrieval and to prompt context-saving behavior.
}
```

4. The router prompt should be concise but smart. Here's the system prompt to use:

"You are a message router for an AI executive assistant app called Crosby. Your job is to analyze the user's message and determine exactly what data and tools are needed to respond. Be precise - only request what's actually needed. A greeting needs nothing. A question about email needs email tools and awaiting_replies data. A question about store performance needs sales data and the query_sales tool. When multiple topics are mentioned, include data/tools for all of them. The rag_query should be a rewritten version of the user's message optimized for semantic search against the user's documents and project context - make it keyword-rich and specific. Set it to null for greetings, simple questions, or messages that clearly don't need document retrieval. For relevant_projects: identify which projects this message likely relates to based on topic, keywords, or explicit mentions. The active projects will be provided to you. This is critical for two things: (1) scoping RAG retrieval to the right project's documents, and (2) triggering the assistant to ask about saving conversation context to that project."

   Additionally, the routeMessage function should accept an optional `activeProjects` parameter - an array of { id, name, description } objects loaded once at app init or cached. Pass these into the router's user message so the AI knows what projects exist and can match against them. Example: if the user says "update on the marketing plan" and there's a project called "Local Store Marketing", the router should return relevant_projects: ["Local Store Marketing"].

5. Use model "openai/gpt-5.4-nano" with fallback "openai/gpt-4.1-nano", provider sort "price". These nano models are specifically designed for classification, data extraction, and sub-agent routing - exactly what the router does. They're faster and cheaper than Gemini Flash Lite for this use case.
6. Use response_format with json_schema (strict: true) and the response-healing plugin in extra_body (this is the pattern used in other background jobs - see src/app/api/cron/email-scan/route.ts for reference)
7. Add a 3-second timeout on the router call. If it times out, fall back to the old classifyIntent() function so the chat still works.
8. Add console.log timing: log how long the router call takes in ms.

Also keep the old classifyIntent() and getToolsForDomains() functions - don't delete them. They're the fallback.

Important details about the openrouterClient pattern - look at how background jobs in the codebase call it. The openrouterClient is an OpenAI SDK instance, so calls look like:
openrouterClient.chat.completions.create({
  model: "google/gemini-3.1-flash-lite-preview",
  messages: [...],
  response_format: { type: "json_schema", json_schema: { name: "router_result", strict: true, schema: {...} } },
  ...extra_body stuff
})

NOT like the Anthropic SDK calls used in the main chat.
```

### Prompt 1B - Wire the Router into the Chat Route

```
Now wire the new router into the chat API route. Read src/app/api/chat/route.ts and src/lib/router.ts.

CHANGES TO MAKE IN route.ts:

1. Import routeMessage from src/lib/router.ts

2. Replace the classifyIntent() call with routeMessage(). The current code does something like:
   const domains = classifyIntent(message, recentDomains)
   const activeToolNames = getToolsForDomains(domains)

   Change it to:
   const routerResult = await routeMessage(message, recentMessages)  // recentMessages = last 3 from history

   Then derive the domains and tool names from routerResult:
   - data_needed maps to which DB queries run in the Promise.all block
   - tools_needed maps to which tools from ALL_TOOLS_MAP are included

3. CHANGE THE PROMISE.ALL BLOCK to be conditional based on routerResult.data_needed:
   Currently all 18+ queries fire every time. Change each one to only run if the corresponding data block is in routerResult.data_needed. For example:
   - "action_items" in data_needed -> run the action_items query, otherwise resolve to { data: [] }
   - "documents_rag" in data_needed -> run retrieveRelevantChunks(), otherwise resolve to []
   - "calendar" in data_needed -> run the calendar query, otherwise resolve to { data: [] }
   - etc.

   Use routerResult.rag_query instead of the raw user message for RAG retrieval when it's not null. This is important - the router rewrites the query to be better for semantic search.

   PROJECT CONTEXT SCOPING: If routerResult.relevant_projects is non-empty, use it to scope RAG retrieval. The current code already supports project-scoped retrieval (retrieveRelevantChunks takes a projectId parameter, and retrieveRelevantContextChunks does too). Look up the project IDs from the project names the router returned, then pass those IDs to the RAG functions. If multiple projects are relevant, run separate RAG queries for each and merge results. Also: when building the system prompt, include a hint like "This message likely relates to the [Project Name] project. If the conversation produces useful context, offer to save it to that project." This preserves the current behavior where Crosby proactively suggests adding context to projects.

4. BUILD TOOLS DYNAMICALLY from routerResult.tools_needed:
   Instead of:
   const activeTools = activeToolNames.map(name => ALL_TOOLS_MAP[name]).filter(Boolean)

   Do:
   const activeTools = routerResult.tools_needed.map(name => ALL_TOOLS_MAP[name]).filter(Boolean)

5. KEEP THE FALLBACK: If routeMessage throws or times out (it has internal timeout handling that falls back to classifyIntent), the old path still works. But also add a try/catch around the routeMessage call just in case, falling back to the old classifyIntent + getToolsForDomains pattern.

6. SAVE ROUTER RESULT in the assistant message metadata. When saving the assistant message to the DB, include the routerResult in a new column or in the existing context_domains field. This lets us debug what the router decided. For now, just save routerResult.data_needed as the context_domains array (it replaces the old domain names).

7. ADD A REQUEST_ADDITIONAL_CONTEXT TOOL:
   Add a new lightweight tool called "request_additional_context" that the model can call if it realizes mid-response that it needs data the router didn't load. The tool takes a parameter "data_blocks" (array of strings from the valid data_needed values). When called, it runs the corresponding DB queries and injects the results into the conversation. This is the self-correction mechanism for when the router gets it wrong.

   Tool definition:
   {
     name: "request_additional_context",
     description: "Request additional data that wasn't loaded initially. Use this if you realize you need information (like calendar events, email data, sales figures, etc.) that isn't in your current context. Specify which data blocks you need.",
     input_schema: {
       type: "object",
       properties: {
         data_blocks: {
           type: "array",
           items: { type: "string", enum: ["action_items", "projects", "artifacts", "memories", "documents_rag", "context_chunks", "contacts", "notes", "calendar", "emails_awaiting", "watches", "dashboard_cards", "notification_rules", "ui_preferences", "training", "decisions", "texts", "sales"] },
           description: "Which data blocks to load"
         },
         reason: { type: "string", description: "Why you need this data (for logging)" }
       },
       required: ["data_blocks"]
     }
   }

   This tool should ALWAYS be in the active tools list regardless of what the router says.

Test by sending various messages:
- "hey" (should load almost nothing)
- "how did 895 do last week" (should load sales)
- "did roger email me back" (should load email + contacts + awaiting_replies)
- "what's on my calendar today and are there any overdue action items" (should load calendar + action_items)
```

---

## Phase 2: Typing Prediction + Specialist Chips UI

This is the UX innovation - Crosby starts preparing while you're still typing, and shows you what it's thinking.

### Prompt 2A - Prefetch API Endpoint

```
I need a new lightweight API endpoint that the frontend can call while the user is typing to get an early classification of their intent. This powers two things: (1) prefetching data before they hit send, and (2) showing "specialist chips" in the UI.

Create src/app/api/chat/prefetch/route.ts:

1. It accepts POST with { partial_message: string, recent_messages: {role: string, content: string}[] }

2. It calls routeMessage() from src/lib/router.ts with the partial message. For prefetch calls specifically, use "openai/gpt-4.1-nano" (cheaper than the main router's gpt-5.4-nano) since prefetch results are speculative and may be discarded if the user keeps typing. Pass an optional `model` parameter to routeMessage() to support this.

3. It returns JSON with:
   {
     specialists: string[]     // human-readable specialist names to show as chips
     data_needed: string[]     // the raw data blocks (for cache key matching on submit)
     tools_needed: string[]    // the raw tool names
     rag_query: string | null
     cache_key: string         // hash of data_needed + tools_needed, for comparing against the real request
   }

4. The "specialists" field maps data_needed/tools_needed to human-readable chip labels. Create a mapping:
   - If tools include search_gmail or draft_email -> "Email"
   - If tools include check_calendar, find_availability, or create_calendar_event -> "Calendar"
   - If tools include query_sales -> "Sales"
   - If tools include manage_action_items -> "Tasks"
   - If tools include search_texts -> "Texts"
   - If tools include search_web -> "Web Search"
   - If tools include manage_artifact -> "Documents"
   - If tools include manage_contacts -> "Contacts"
   - If tools include manage_notepad -> "Notes"
   - If tools include manage_dashboard -> "Dashboard"
   - If data_needed includes "memories" or "documents_rag" or "context_chunks" -> "Memory" (only if no more specific specialist matched)

   If the router returns very little (greeting-level), return specialists: [] (no chips)

5. This endpoint should be FAST. Add a hard 2-second timeout on the entire handler. If it times out, return { specialists: [], data_needed: [], tools_needed: [], rag_query: null, cache_key: "" }

6. Also add SERVER-SIDE CACHING of prefetch results. Use a simple in-memory Map<string, { result: PrefetchResult, timestamp: number }>. Cache key is the partial_message. TTL of 10 seconds. When the real chat POST comes in, it can check this cache to skip the router call if the message matches.

7. In the main chat route (src/app/api/chat/route.ts), add logic at the top of the POST handler: before calling routeMessage(), check the prefetch cache. If there's a cache hit where the partial_message is a prefix of the actual message AND the cache is < 10 seconds old, use the cached router result instead of making a new router call. This means the router already ran while the user was typing - zero added latency on send.

8. ADD INLINE AUTOCOMPLETE SUGGESTIONS to the prefetch response. The prefetch should also return contextual completions for the partial message. Add a new field to the response:

   autocomplete: { text: string, source: string }[] // up to 3 suggestions

   How it works: after the router classifies the partial message, run a fast context lookup based on what the router detected. Examples:
   - If the message mentions a store number (326, 895, etc.), look up the GM/staff associated with that store from contacts
   - If the message contains "message" or "email" or "reach out" or "contact" or "tell", suggest relevant contact names from the contacts table
   - If the message mentions a project name or keyword, suggest the full project name
   - If the message starts with a pattern like "how did" or "sales at", suggest store names/numbers
   - If the message mentions a person's first name, suggest their full name + role from contacts

   The autocomplete should feel like Gmail Smart Compose - it predicts what you're about to type next based on context.

   To keep this fast, preload a lightweight context bundle on app init (or cache it server-side with a 5-min TTL):
   - All contacts (name, role, email, associated stores)
   - All project names
   - Store number-to-name mapping
   - Recent action item titles (last 10)

   The autocomplete lookup should be pure string matching against this cached context - no AI call needed for this part. The AI router already ran, so we know the domain. The autocomplete just needs to find the most likely completion from known entities.

   Return the suggestions sorted by relevance (exact prefix match first, then fuzzy).

   IMPORTANT: The autocomplete text should be the CONTINUATION of what the user typed, not the full replacement. If they typed "Labor at 326 is high. We should message" and the suggestion is "Mayra (GM, Coleman)", the autocomplete.text should be "Mayra (GM, Coleman)" - the part that comes AFTER the cursor.
```

### Prompt 2B - Frontend Chips UI + Inline Autocomplete

```
I need to update the chat input component to show specialist chips and call the prefetch endpoint while the user types.

Read src/components/chat-input.tsx. This is a forwardRef component called ChatInput with a textarea, file upload, and model picker.

CHANGES:

1. ADD PREFETCH STATE AND DEBOUNCED CALL:
   - Add state: const [specialists, setSpecialists] = useState<string[]>([])
   - Add state: const [prefetchLoading, setPrefetchLoading] = useState(false)
   - Add a ref for the debounce timer: const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null)

   In the handleInput callback, after updating the input state, add:
   - Clear the existing prefetch timer
   - If the input is longer than 3 characters, set a new timer for 500ms
   - When the timer fires, call /api/chat/prefetch with the current input text
   - On response, setSpecialists(result.specialists)
   - On error or empty input, setSpecialists([])

   When the user clears the input or sends a message, clear specialists.

2. RENDER SPECIALIST CHIPS above the input field:
   When specialists.length > 0, render a row of small chips between the file attachments area and the textarea. Each chip should:
   - Be a small pill/tag shape
   - Show an icon + label (use lucide-react icons: Mail for Email, Calendar for Calendar, TrendingUp for Sales, CheckSquare for Tasks, MessageSquare for Texts, Globe for Web Search, FileText for Documents, Users for Contacts, StickyNote for Notes, LayoutDashboard for Dashboard, Brain for Memory)
   - Have a subtle entrance animation (fade in + slight slide up, ~150ms)
   - Have a dismissable X button that removes that specialist from the list
   - Use muted/subtle styling that matches the existing input aesthetic - not flashy. Think small, light, almost like tags.

   Import the icons at the top. Map specialist names to icon components.

3. CHIP TRANSITION BEHAVIOR:
   - When the user changes their message and new specialists come back from the prefetch, animate OUT the old chips and animate IN the new ones
   - If the same specialist exists in both old and new sets, don't re-animate it (keep it stable)
   - Use CSS transitions, not a heavy animation library

4. PASS PREFETCH DATA TO PARENT ON SUBMIT:
   The onSubmit prop currently takes (message: string, model: string). Change it to also accept an optional prefetch cache key: onSubmit(message, model, prefetchCacheKey?). This way the parent can pass it to the chat API so it knows to check the prefetch cache.

   Update the ChatInputProps interface and the handleSubmit function accordingly. The parent component that uses ChatInput will need to be updated too - find where onSubmit is called and add the third parameter.

5. STYLING: The chips container should be:
   - flex flex-wrap gap-1.5 px-3.5 py-2
   - Only visible when specialists.length > 0
   - Placed right above the textarea row, below any file attachments

   Each chip:
   - flex items-center gap-1 px-2 py-0.5
   - text-[0.7rem] text-muted-foreground
   - bg-muted/30 border border-border/50
   - rounded-full
   - transition-all duration-150 ease-out
   - The X button: ml-0.5, opacity-0 group-hover:opacity-100 transition
   - Add "group" class to the chip container for the hover effect

6. ADD INLINE AUTOCOMPLETE (Ghost Text):
   The prefetch response now includes an `autocomplete` array. Show the top suggestion as ghost text inline in the textarea, after the user's cursor position.

   Implementation:
   - Add state: const [autocompleteSuggestion, setAutocompleteSuggestion] = useState<string | null>(null)
   - When the prefetch response comes back with autocomplete suggestions, set the first one as the active suggestion
   - Render the ghost text using an overlay technique: position a transparent div exactly over the textarea with the same font/size/padding. The div contains the user's actual text (invisible) followed by the suggestion text in a muted gray color (text-muted-foreground/30). This keeps the ghost text perfectly aligned with where the cursor is.
   - ACCEPT BEHAVIOR: When the user presses Tab or the right arrow key (and cursor is at end of input), accept the suggestion - append the autocomplete text to the input and clear the suggestion.
   - DISMISS BEHAVIOR: When the user types any character, clear the current suggestion (the next prefetch will generate a new one if applicable). When the user presses Escape, clear the suggestion.
   - IGNORE when: cursor is not at the end of the input, or the textarea is empty, or the suggestion doesn't make sense as a continuation of what's typed.
   - The ghost text should only appear after the prefetch returns - never show stale suggestions from a previous prefetch.

   Key styling details for the overlay:
   - Same font-family, font-size (0.875rem), line-height (relaxed), and padding as the textarea
   - pointer-events-none so clicks pass through to the textarea
   - Use white-space: pre-wrap to match textarea wrapping behavior
   - The ghost portion should be a span with opacity ~0.3 and the same text color as the placeholder

   Also: when the user accepts an autocomplete suggestion (Tab/right arrow), this is a strong signal about their intent. Send a lightweight event back to the prefetch endpoint or update the specialist chips accordingly. For example, if they accepted "Mayra (GM, Coleman)" after typing about store 326, the Email/Contacts specialists should light up if they haven't already.

Keep the rest of the component exactly as-is. Don't change the model picker, file upload, or textarea behavior.
```

---

## Phase 3: Route Decomposition (Breaking Up the Monolith)

The 3,465-line route.ts needs to be broken into modules. This doesn't change behavior - it just makes the code maintainable and sets up for the specialist architecture.

### Prompt 3

```
The chat route at src/app/api/chat/route.ts is 3,465 lines. I need you to break it into logical modules without changing any behavior. This is a pure refactor - everything should work exactly the same after.

TARGET STRUCTURE:

src/lib/chat/
  tools/
    definitions.ts      - All 27 tool schema objects (ACTION_ITEM_TOOL, ARTIFACT_TOOL, etc.) and ALL_TOOLS_MAP
    registry.ts          - Tool executor registry: a Map<string, ExecutorFunction> where each tool name maps to its executor. Export registerToolExecutor(name, fn) and executeToolByName(name, input, context). This replaces the giant if/else chain in the current tool dispatch. IMPORTANT: this registry pattern is groundwork for future user-created specialists that can register custom tool executors at runtime.
    executors.ts         - All tool execution functions (executeArtifactTool, executeSearchTexts, etc.). Each function gets registered in the registry via registerToolExecutor() at module load time.
    status-labels.ts     - The toolStatusLabels mapping
  streaming.ts           - The streaming/SSE helpers (encoder, event formatting)
  context-loader.ts      - The Promise.all data loading block, parameterized by RouterResult.data_needed
  history.ts             - History loading, deduplication, trimming
  memory-extraction.ts   - The extractMemories function and related helpers
  session.ts             - getOrCreateSession and session management logic
  web-search.ts          - executeWebSearch function

After the refactor, src/app/api/chat/route.ts should be ~200-300 lines max. It becomes a thin orchestrator:
1. Parse request
2. Get/create session
3. Load history
4. Call router
5. Load context (via context-loader)
6. Build system prompt
7. Stream response with tool loop
8. Post-response processing

Each module should export clean functions with explicit parameters - no reliance on closure variables from route.ts. Every function should take what it needs as arguments.

RULES:
- Don't change any logic or behavior
- Don't rename any database columns or table names
- Don't change the API contract (request/response format)
- Keep all the console.log statements for debugging
- Make sure TypeScript types are correct - import what's needed
- Test by sending messages after the refactor to confirm everything still works

Start by reading the entire route.ts file, mapping out what goes where, then do the extraction module by module.
```

---

## Phase 4: Specialist System (The Product Architecture)

This is where the silo/specialist concept gets built. Each specialist is a self-contained module with its own mini-prompt, tools, and data access.

### Prompt 4A - Specialist Framework

```
I'm building a "specialist" system for Crosby. A specialist is a self-contained module that handles a specific domain (email, calendar, sales, etc.). The router dispatches to specialists instead of loading everything into one giant prompt.

Create the specialist framework:

1. Create src/lib/specialists/types.ts:

```typescript
export interface SpecialistTriggerRules {
  // Declarative rules for when this specialist activates.
  // These are JSON-serializable (no functions) so they can be stored in a database
  // for user-created specialists in the future.
  trigger_tools?: string[]      // activate if any of these tools appear in routerResult.tools_needed
  trigger_data?: string[]       // activate if any of these data blocks appear in routerResult.data_needed
  always_on?: boolean           // if true, always activate (for core specialist)
}

export interface SpecialistDefinition {
  id: string                    // unique identifier e.g. "email", "calendar", "sales"
  name: string                  // display name e.g. "Email", "Calendar", "Sales"
  description: string           // what this specialist handles
  systemPromptSection: string   // the specialist's portion of the system prompt (can contain {{placeholder}} tokens that get populated with loaded data)
  tools: string[]               // tool names this specialist owns (keys from ALL_TOOLS_MAP)
  dataNeeded: string[]          // data blocks this specialist requires
  triggerRules: SpecialistTriggerRules  // declarative activation rules (replaces canHandle function)
  source: 'built_in' | 'user_created'  // where this specialist came from
}

export interface SpecialistContext {
  data: Record<string, any>     // loaded data keyed by data block name
  tools: Tool[]                 // resolved tool objects
  promptSection: string         // the specialist's prompt section, populated with loaded data
}
```

IMPORTANT DESIGN DECISION: Notice that triggerRules is a plain data object, not a function. This is intentional groundwork. Built-in specialists define their trigger rules in code files. But eventually, user-created specialists will have their trigger rules stored as JSON in a database `specialists` table. The resolveSpecialists function should evaluate trigger rules generically - it should not care whether the specialist came from a code file or a DB row.

Similarly, systemPromptSection should support template tokens like {{contacts_list}} or {{calendar_events}} that get populated at runtime with loaded data. Built-in specialists can hardcode their prompt sections, but user-created specialists will need this templating to inject dynamic data they don't know at creation time.
```

2. Create src/lib/specialists/registry.ts:
   - Export a Map<string, SpecialistDefinition> called specialistRegistry
   - Export registerSpecialist(def: SpecialistDefinition) and getSpecialist(id: string)
   - Export resolveSpecialists(routerResult: RouterResult): SpecialistDefinition[] - evaluates each specialist's triggerRules against the router result and returns matches. The evaluation logic:
     * If triggerRules.always_on is true, include it
     * If any item in triggerRules.trigger_tools appears in routerResult.tools_needed, include it
     * If any item in triggerRules.trigger_data appears in routerResult.data_needed, include it
   - Export async loadUserSpecialists(): Promise<SpecialistDefinition[]> - FOR NOW this just returns an empty array with a TODO comment. In the future, this will query a `specialists` table in Supabase and return user-created specialist definitions. The function signature exists now so the registry already supports the pattern of merging built-in + user-created specialists at startup.
   - On module init, register all built-in specialists from the built-in/ folder. Then call loadUserSpecialists() and register those too (once the DB table exists).

3. Create built-in specialist definitions - one file per specialist in src/lib/specialists/built-in/:

   a. email.ts - Handles email search, drafting, awaiting replies
      - tools: ["search_gmail", "draft_email"]
      - dataNeeded: ["contacts", "emails_awaiting"]
      - systemPromptSection: Extract the EMAIL DRAFTING section and Awaiting Replies section from src/lib/system-prompt.ts
      - triggerRules: { trigger_tools: ["search_gmail", "draft_email"], trigger_data: ["emails_awaiting"] }
      - source: "built_in"

   b. calendar.ts - Handles schedule, availability, event creation
      - tools: ["check_calendar", "find_availability", "create_calendar_event"]
      - dataNeeded: ["calendar", "contacts"]
      - systemPromptSection: Extract the calendar section from system-prompt.ts
      - triggerRules: { trigger_tools: ["check_calendar", "find_availability", "create_calendar_event"], trigger_data: ["calendar"] }
      - source: "built_in"

   c. sales.ts - Handles store performance, revenue, forecasts
      - tools: ["query_sales"]
      - dataNeeded: ["sales"]
      - systemPromptSection: Extract SALES DATA section
      - triggerRules: { trigger_tools: ["query_sales"], trigger_data: ["sales"] }
      - source: "built_in"

   d. tasks.ts - Handles action items, delegation
      - tools: ["manage_action_items"]
      - dataNeeded: ["action_items"]
      - systemPromptSection: Extract the Active Action Items section with all the delegation rules
      - triggerRules: { always_on: true }
      - source: "built_in"

   e. documents.ts - Handles artifacts, projects, project context, RAG
      - tools: ["manage_artifact", "manage_project", "manage_project_context", "manage_bookmarks"]
      - dataNeeded: ["projects", "artifacts", "documents_rag", "context_chunks"]
      - systemPromptSection: Extract project rules and artifact rules sections from system-prompt.ts. This includes the RULES for managing project context (proactive context saving, multi-project routing, listing/cleanup) and the RULES for managing projects (create/update/archive).
      - triggerRules: { trigger_tools: ["manage_artifact", "manage_project", "manage_project_context", "manage_bookmarks"], trigger_data: ["documents_rag", "context_chunks", "projects", "artifacts"] }
      - source: "built_in"

      PROJECT CONTEXT FLOW - this is critical to get right:
      The current system has a two-way flow between the main chat and projects:
      (1) Projects feed INTO the chat: project-specific system prompts, pinned documents, and project context entries get injected into the system prompt when relevant.
      (2) The chat feeds INTO projects: when the conversation covers something relevant to a project, Crosby offers to save it via manage_project_context.

      In the specialist architecture, this flow must be preserved:
      - The router's relevant_projects field tells the documents specialist which projects are active for this message
      - loadSpecialistData for the documents specialist should: load the project list (always), load project-specific system prompts for relevant_projects, scope RAG retrieval to relevant_projects, and load pinned documents for relevant_projects
      - The documents specialist's prompt section should include a dynamic hint when relevant_projects is non-empty: "This conversation may be relevant to [Project Name]. If useful context emerges, offer to save it."
      - The manage_project_context tool handler already exists - it doesn't need to change. The specialist just needs to make sure the tool is available and the prompt encourages its use.

      Also: the current system passes a project_id in the request body when the user is viewing a specific project in the UI. This should still work - if project_id is in the request, it overrides the router's relevant_projects for RAG scoping. The router's detection is for when the user is in the main chat and mentions a project implicitly.

   f. texts.ts - Handles iMessage search and contacts
      - tools: ["search_texts", "manage_text_contacts", "manage_group_whitelist"]
      - dataNeeded: ["texts"]
      - systemPromptSection: Extract the texts section
      - triggerRules: { trigger_tools: ["search_texts", "manage_text_contacts", "manage_group_whitelist"], trigger_data: ["texts"] }
      - source: "built_in"

   g. core.ts - The "always on" specialist. Handles web search, background jobs, structured questions, watches, contacts, notepad, training, notifications, dashboard, preferences
      - tools: ["search_web", "spawn_background_job", "ask_structured_question", "quick_confirm", "manage_training", "create_watch", "list_watches", "cancel_watch", "manage_contacts", "manage_notepad", "manage_dashboard", "manage_notification_rules", "manage_preferences", "request_additional_context"]
      - dataNeeded: ["memories", "notes", "contacts", "watches", "decisions"]
      - systemPromptSection: The base prompt + training rules + structured question rules + web search rules + watch rules
      - triggerRules: { always_on: true }
      - source: "built_in"

4. Create src/lib/specialists/prompt-builder.ts:
   - Export buildSpecialistPrompt(activeSpecialists: SpecialistDefinition[], loadedData: Record<string, any>, baseContext: { previousSessionSummary?, currentTime: string, relevantProjects?: string[], projectSystemPrompt?: string }): string
   - This replaces the monolithic buildSystemPrompt. It assembles the prompt from:
     a. BASE_SYSTEM_PROMPT (identity, store list, always present)
     b. Current date/time
     c. Previous session summary (if any)
     d. Project system prompt (if viewing a specific project or if relevant_projects detected)
     e. A "relevant projects" hint if the router detected project relevance: "This conversation may relate to: [Project Names]. Consider saving useful context to those projects."
     f. Each active specialist's promptSection, populated with its loaded data
   - The result should be SMALLER than the current system prompt because only active specialists contribute their sections

5. Update src/lib/chat/context-loader.ts to work with specialists:
   - Instead of loading all data then passing to buildSystemPrompt, load only the data blocks that active specialists need
   - Export loadSpecialistData(specialists: SpecialistDefinition[], message: string, ragQuery?: string): Promise<Record<string, any>>

Don't wire this into the chat route yet - that's the next prompt. Just build the framework, the built-in specialists, and the prompt builder. Make sure it all type-checks.
```

### Prompt 4B - Wire Specialists into Chat Route

```
Now wire the specialist system into the chat route. Read the current src/app/api/chat/route.ts (which should be the slim ~300 line orchestrator from Phase 3) and the specialist framework from Phase 4A.

CHANGES:

1. After calling routeMessage(), call resolveSpecialists(routerResult) to get the active specialist list.

2. Replace the context loading with loadSpecialistData(activeSpecialists, message, routerResult.rag_query)

3. Replace buildSystemPrompt() with buildSpecialistPrompt(activeSpecialists, loadedData, baseContext)

4. Build the active tools list from the union of all active specialists' tools:
   const activeToolNames = [...new Set(activeSpecialists.flatMap(s => s.tools))]
   const activeTools = activeToolNames.map(name => ALL_TOOLS_MAP[name]).filter(Boolean)

5. The request_additional_context tool handler needs to be updated: when called, it should:
   a. Look at the requested data_blocks
   b. Find which specialists own that data
   c. Load the data via loadSpecialistData for just those specialists
   d. Rebuild the relevant prompt sections and inject them as a tool result

6. Log which specialists activated for each message:
   console.log('[Chat] active specialists:', activeSpecialists.map(s => s.id).join(', '))

7. Save the active specialist IDs in the message metadata (context_domains field):
   context_domains: activeSpecialists.map(s => s.id)

IMPORTANT: The core specialist should ALWAYS be in the active list. Even for a greeting, core provides the base identity and always-on tools.

Test thoroughly:
- "hey" -> only core specialist, minimal prompt
- "check my email" -> core + email specialists
- "how did 895 do and what's on my calendar" -> core + sales + calendar
- "did roger email me back about the labor thing" -> core + email (router should detect email intent even without the word "email")
- Send a follow-up like "what about 326" after a sales question -> router should pick up context from recent messages
```

---

## Phase 5: Verify and Tune

### Prompt 5

```
I need you to do a thorough QA pass on the refactored chat system. Run through these test scenarios and fix anything that breaks:

1. GREETING TEST: Send "hey what's up" - should respond fast with minimal context loading. Check the server logs to confirm few/no DB queries fired.

2. SINGLE DOMAIN TEST: Send "how did store 895 do yesterday" - should only load sales data and have query_sales tool available. Verify in logs that email/calendar/text queries did NOT fire.

3. MULTI-DOMAIN TEST: Send "check my email and tell me what's on my calendar today" - should load both email and calendar data, have tools for both.

4. FOLLOW-UP TEST: After the sales question, send "what about 326" - the router should understand from context this is also about sales.

5. AMBIGUOUS TEST: Send "can you check if roger got back to me about the labor issue" - the router should detect this needs email even though "email" isn't mentioned.

6. SELF-CORRECTION TEST: Send a message that the router misclassifies (hard to predict, but try something edge-case-y). Verify the model can call request_additional_context to get what it needs.

7. PREFETCH TEST: Open the browser dev tools network tab. Start typing slowly in the chat input. Verify that /api/chat/prefetch calls fire after 500ms of no typing. Verify specialist chips appear above the input.

8. CHIPS ACCURACY TEST: Type "email" and verify the Email chip appears. Delete it and type "calendar" - verify Email chip disappears and Calendar chip appears.

9. TIMEOUT TEST: Temporarily add a 5-second delay to the routeMessage function. Verify the fallback to classifyIntent works and the chat still responds (just without the router optimization).

10. PROMPT SIZE TEST: After each test, log the character count of the system prompt that was sent. Compare to what the old system would have sent. The new system should be consistently smaller.

For each test, report: what happened, what the router decided (from logs), which specialists activated, and whether the response was correct. Fix any issues you find.

11. AUTOCOMPLETE TEST: Type "Labor at 326 is high. We should message " slowly. After "message ", an inline ghost text suggestion should appear suggesting a contact name associated with store 326 (e.g. the GM). Press Tab - the suggestion should be accepted and appended to the input. Verify the specialist chips update if needed.

12. AUTOCOMPLETE DISMISS TEST: Type something that triggers a suggestion, then keep typing a different word. The ghost text should disappear immediately when you type a character that doesn't match the suggestion.

13. PROJECT CONTEXT TEST: If you have an active project (e.g. "Local Store Marketing"), send a message like "I just talked to the marketing rep about the new promo strategy for Q2." Check:
    - The router should identify relevant_projects: ["Local Store Marketing"]
    - RAG should be scoped to that project's documents
    - Crosby should offer to save the context to that project
    - The project system prompt (if one exists) should be injected

14. MULTI-PROJECT TEST: Send a message that spans two projects: "The marketing materials for the new menu need to go through the ops team for pricing approval." If you have both a Marketing and an Operations project, the router should detect both and Crosby should offer to save context to each.

15. PROJECT OVERRIDE TEST: Navigate to a specific project view in the UI (so project_id is in the request). Send a message that could relate to a different project. Verify that project_id from the UI takes priority for RAG scoping, but the router's relevant_projects hint is still shown for cross-project awareness.

Also: check the specialist chip animations in the UI. They should fade in smoothly, not pop. If the animation feels janky, adjust the CSS transition timing.
```

---

## Notes for Jason

**What order to do this in:**
- Phase 0 first, always. This fixes your current stability issues regardless of anything else.
- Phase 1A and 1B are the biggest bang for the buck. The AI router alone will dramatically improve response quality.
- Phase 2 (typing prediction + chips) can be done in parallel with Phase 3 by a different Claude Code session if you want to move fast.
- Phase 3 (route decomposition) is a pure refactor that makes Phase 4 possible.
- Phase 4 is the full specialist architecture.
- Phase 5 is QA.

**What to watch for:**
- The router call adds ~200-400ms latency. But the reduced prompt size should make the main LLM call faster, so net response time should be about the same or better.
- Gemini Flash Lite is very cheap for the router call (~fractions of a cent). But monitor the cost if you're sending lots of prefetch requests while typing.
- The specialist system makes it much easier to add new capabilities later. Want a new "inventory" specialist? Create one file, register it, done.

**What this sets up for the future:**
- User-created specialists (the "vibe code your own automation" product vision)
- Specialist-to-specialist communication (email specialist passes results to calendar specialist)
- Per-specialist analytics (which specialists are used most, which fail most)
- The consumer app architecture where each user has their own specialist configurations

---

## Future: Self-Creating Specialists (Not Built Now, But Groundwork Is Laid)

The architecture above intentionally lays groundwork for Crosby to create its own specialists through conversation. Here's the progression:

**Level 1 (what we're building):** Built-in specialists with fixed tools. Router dispatches to them. Everything is in code.

**Level 2 (next major feature):** User-configurable specialists stored in the database. Same built-in tools, but the user describes what they want through chat, and Crosby generates a specialist config. Example: "Hey Crosby, create a specialist that checks my email every morning for health department messages and creates action items from them." Crosby would generate a DB row with: tools = ["search_gmail", "manage_action_items"], trigger = cron schedule, prompt = "Search for emails from health department domains, extract any required actions or deadlines."

The groundwork already in place for Level 2:
- SpecialistDefinition uses declarative triggerRules (JSON-serializable, not functions)
- The registry has loadUserSpecialists() stub ready to query a DB table
- systemPromptSection supports template tokens for dynamic data injection
- Tool executors are in a registry (Map) that can be extended at runtime

The DB schema when Level 2 gets built:
```sql
create table specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  system_prompt_section text not null,
  tools text[] not null,          -- tool names from the registry
  data_needed text[] not null,    -- data block names
  trigger_rules jsonb not null,   -- { trigger_tools?, trigger_data?, always_on?, cron_schedule? }
  source text default 'user_created',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table specialist_executions (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid references specialists(id),
  trigger_type text,              -- 'router', 'cron', 'manual'
  input jsonb,
  output jsonb,
  tokens_used integer,
  latency_ms integer,
  created_at timestamptz default now()
);
```

**Level 3 (the big vision):** Specialists that can create new data pipelines. "Hey Crosby, I want to pull sales data from Toast POS instead of parsing emails. Here's the API docs." Crosby would need to: generate API integration code, create new DB tables, register new tool executors, and wire it all into a specialist. This is essentially Crosby writing its own backend - a much bigger lift that requires sandboxed code execution and careful security guardrails. Not something to build now, but the tool executor registry and specialist DB schema are designed to support it eventually.

**The key insight:** The hard-coded sales email extraction you have today would eventually become a "Sales Email Parser" specialist stored in the DB. And when you want to switch to Toast POS, you'd tell Crosby to create a "Toast POS Sales" specialist that replaces it. The specialist system makes these swappable instead of requiring code changes.
