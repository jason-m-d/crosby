# Shared Types & Interface Contracts — Architecture Spec

*Last updated: 2026-03-25*

---

## Overview

All TypeScript types shared between apps and packages live in `packages/shared/src/types/`. These are the interface contracts that ensure the web app, mobile app, API routes, and background jobs all agree on data shapes. Generated database types come from Supabase; hand-written types cover everything else.

---

## Database Types (Generated)

Generated via `supabase gen types typescript` from the live schema. These are the source of truth for all database row shapes.

```bash
# Generate types
pnpm --filter supabase gen:types

# Output: packages/supabase/src/types/database.ts
```

Usage:
```typescript
import { Database } from '@crosby/supabase'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
type MessageUpdate = Database['public']['Tables']['messages']['Update']
```

---

## Chat Types

```typescript
// packages/shared/src/types/chat.ts

/** Content block format (matches Anthropic API) */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

/** Message as sent to/from the API */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: ContentBlock[]
  messageType: 'chat' | 'briefing' | 'nudge' | 'heads_up' | 'greeting' | 'system' | 'research_complete' | 'overnight_build'
  expertIds: string[]
  specialistIds: string[]
  metadata: ChatMessageMetadata
  createdAt: string
}

export interface ChatMessageMetadata {
  cardTracks?: CardTrack[]
  toolCalls?: string[]         // Tool names called in this message
  citations?: Citation[]
}

/** Interactive card embedded in the timeline */
export interface CardTrack {
  cardType: 'email_draft' | 'calendar_event' | 'task' | 'contact' | 'structured_question'
  data: Record<string, unknown>
}

export interface Citation {
  source: string
  title: string
  url?: string
}

/** SSE events streamed from /api/chat */
export type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id: string; content: string }
  | { type: 'card_track'; cardType: string; data: Record<string, unknown> }
  | { type: 'artifact_open'; artifactId: string }
  | { type: 'expert_drift'; expertId: string; confidence: number }
  | { type: 'error'; message: string }
  | { type: 'done' }

/** Request body for POST /api/chat */
export interface ChatRequest {
  message: string
  expertId?: string            // Explicit Expert activation
  attachmentIds?: string[]     // Pre-uploaded document IDs
}
```

---

## Router Types

```typescript
// packages/shared/src/types/router.ts

export interface RouterInput {
  message: string
  recentMessages: {
    role: 'user' | 'assistant'
    content: string
  }[]
  experts: RouterExpert[]
  specialists: RouterSpecialist[]
}

export interface RouterExpert {
  id: string
  name: string
  description: string
  isActive: boolean
  ambientConfidence: number
}

export interface RouterSpecialist {
  id: string
  name: string
  description: string
  triggerRules: SpecialistTriggerRules
}

export interface RouterResult {
  intent: string
  specialists: { id: string; confidence: number }[]
  experts: { id: string; confidence: number }[]
  dataNeeded: string[]
  toolsNeeded: string[]
  ragQuery: string | null
  complexity: 'simple' | 'moderate' | 'complex'
}
```

---

## Specialist Types

```typescript
// packages/shared/src/types/specialist.ts

export interface SpecialistDefinition {
  id: string
  name: string
  description: string
  tools: string[]                    // Tool names this specialist owns
  dataNeeded: string[]               // Data blocks required when active
  triggerRules: SpecialistTriggerRules
  systemPromptSection: string        // Template with {{placeholders}}
  source: 'built_in' | 'user_created'
}

export interface SpecialistTriggerRules {
  triggerTools?: string[]            // Activate if router requests these tools
  triggerData?: string[]             // Activate if router requests these data blocks
  alwaysOn?: boolean                 // Core specialist
}
```

---

## Expert Types

```typescript
// packages/shared/src/types/expert.ts

export interface Expert {
  id: string
  userId: string
  name: string
  description: string | null
  instructions: string | null
  color: string | null
  icon: string | null
  isActive: boolean
  ambientConfidence: number
  pinnedDocumentIds: string[]
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}

export type ExpertActivationMode = 'direct' | 'ambient' | 'inactive'

export interface ExpertDriftState {
  expertId: string
  confidence: number
  mode: ExpertActivationMode
  tierLoaded: 'none' | 'partial' | 'full'
}
```

---

## Memory Types

```typescript
// packages/shared/src/types/memory.ts

export interface SemanticMemory {
  id: string
  content: string
  importance: number
  confidence: number
  entityTags: string[]
  supersededAt: string | null
  supersededBy: string | null
  createdAt: string
  lastAccessedAt: string | null
  accessCount: number
}

export interface EpisodicMemory {
  id: string
  title: string
  narrative: string
  keywords: string[]
  entityTags: string[]
  importance: number
  timeStart: string | null
  timeEnd: string | null
  sessionId: string | null
  createdAt: string
}

export interface ProceduralMemory {
  id: string
  name: string
  triggerPattern: string
  actionDescription: string
  exampleInvocations: string[]
  confidence: number
  category: string | null
  lastTriggeredAt: string | null
  triggerCount: number
}

/** Memory extraction result from the background model */
export interface MemoryExtractionResult {
  semantic: {
    content: string
    importance: number
    entityTags: string[]
  }[]
  episodic: {
    title: string
    narrative: string
    keywords: string[]
    entityTags: string[]
    importance: number
  }[]
}
```

---

## Background Job Types

```typescript
// packages/shared/src/types/background-job.ts

export type JobType =
  | 'deep_research'
  | 'overnight_build'
  | 'expert_research'
  | 'document_embedding'
  | 'email_backfill'
  | 'memory_extraction'
  | 'context_summary_refresh'
  | 'message_embedding'
  | 'flush_push_batch'

export type JobStatus = 'queued' | 'running' | 'paused' | 'success' | 'failed' | 'cancelled'
export type JobCategory = 'heavy' | 'lightweight'
export type JobPriority = 1 | 2 | 3  // 1=user, 2=user-adjacent, 3=system

export interface BackgroundJob {
  id: string
  userId: string
  jobType: JobType
  status: JobStatus
  category: JobCategory
  priority: JobPriority
  triggerSource: string | null
  prompt: string | null
  result: string | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
  timeoutAt: string | null
  createdAt: string
}
```

---

## Tool Types

```typescript
// packages/shared/src/types/tools.ts

export interface ToolDefinition {
  name: string
  schema: ToolSchema         // Anthropic-compatible tool schema
  specialist: string          // Which specialist owns this tool
}

export interface ToolSchema {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolResult {
  content: string              // Text result injected into conversation
  isError?: boolean
  cardTrack?: CardTrack       // Optional interactive card
  artifactOpen?: string       // Optional artifact ID to open in sidebar
}

export interface ToolContext {
  userId: string
  sessionId: string
  expertIds: string[]
}

export type ToolExecutor = (
  input: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>
```

---

## Notification Types

```typescript
// packages/shared/src/types/notifications.ts

export interface PushContent {
  type: 'briefing' | 'nudge' | 'heads_up' | 'greeting' | 'research_complete' | 'overnight_build'
  title: string
  body: string
  priority: 'high' | 'normal'
}

export type DeliveryTier = 'immediate' | 'batched' | 'held'

export interface ProactiveOutboxEntry {
  id: string
  userId: string
  messageType: 'briefing' | 'nudge' | 'heads_up' | 'greeting'
  decision: 'sent' | 'skipped' | 'absorbed' | 'held'
  contentPreview: string | null
  relatedTopics: string[]
  reason: string | null
  messageId: string | null
  createdAt: string
}
```

---

## Activity Log Types

```typescript
// packages/shared/src/types/activity-log.ts

export type ActivityLogType =
  | 'cron'
  | 'background_job'
  | 'router_decision'
  | 'error'
  | 'proactive_decision'
  | 'integration_health'

export interface ActivityLogEntry {
  id: string
  userId: string
  logType: ActivityLogType
  status: string | null
  summary: string | null
  data: Record<string, unknown>
  durationMs: number | null
  createdAt: string
}
```

---

## Task Types

```typescript
// packages/shared/src/types/task.ts

export interface Task {
  id: string
  userId: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'completed' | 'dismissed' | 'delegated'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  isCommitment: boolean
  dueDate: string | null
  completedAt: string | null
  dismissedAt: string | null
  dismissalReason: string | null
  nudgeCount: number
  lastNudgedAt: string | null
  escalationLevel: number
  entityTags: string[]
  expertId: string | null
  sourceMessageId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  isCommitment?: boolean
  dueDate?: string
  expertId?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'completed' | 'dismissed' | 'delegated'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string | null
  dismissalReason?: string
}
```

---

## Document Types

```typescript
// packages/shared/src/types/document.ts

export interface Document {
  id: string
  userId: string
  title: string
  fileUrl: string | null
  fileType: string | null
  fileSize: number | null
  source: 'upload' | 'chat_attachment' | 'artifact' | 'deep_research'
  isPinned: boolean
  expertId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  chunkIndex: number
  similarity?: number
}

export interface DocumentSearchRequest {
  query: string
  expertId?: string
  limit?: number
}

export interface DocumentSearchResponse {
  chunks: (DocumentChunk & { documentTitle: string })[]
}
```

---

## Contact Types

```typescript
// packages/shared/src/types/contact.ts

export interface Contact {
  id: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  organization: string | null
  relationshipType: string | null
  isPromoted: boolean
  promotedAt: string | null
  roleAliases: string[]
  interactionCount: number
  lastInteractionAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ContactChannel {
  id: string
  contactId: string
  channelType: 'email' | 'phone' | 'alias' | 'google_contact_id'
  value: string
  isPrimary: boolean
  source: string | null
  firstSeenAt: string
}

export interface CreateContactRequest {
  name: string
  email?: string
  phone?: string
  organization?: string
  relationshipType?: string
  roleAliases?: string[]
}

export interface UpdateContactRequest {
  name?: string
  email?: string
  phone?: string
  organization?: string
  relationshipType?: string
  roleAliases?: string[]
}
```

---

## Artifact Types

```typescript
// packages/shared/src/types/artifact.ts

export interface Artifact {
  id: string
  userId: string
  title: string
  content: string
  artifactType: 'plan' | 'spec' | 'checklist' | 'report' | 'freeform'
  version: number
  expertId: string | null
  importance: number
  isPinned: boolean
  deletedAt: string | null
  specSummary: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ArtifactVersion {
  id: string
  artifactId: string
  version: number
  content: string
  changeSummary: string | null
  changedBy: 'user' | 'assistant'
  createdAt: string
}

export interface UpdateArtifactRequest {
  title?: string
  content?: string
  isPinned?: boolean
}
```

---

## Notepad Types

```typescript
// packages/shared/src/types/notepad.ts

export interface NotepadEntry {
  id: string
  userId: string
  content: string
  expertId: string | null
  isPinned: boolean
  expiresAt: string | null
  sourceMessageId: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateNotepadRequest {
  content?: string
  isPinned?: boolean
}
```

---

## Watch Types

```typescript
// packages/shared/src/types/watch.ts

export interface Watch {
  id: string
  userId: string
  description: string
  watchType: 'watch' | 'monitor'
  status: 'active' | 'resolved' | 'stale' | 'dismissed'
  condition: string | null
  resolutionSummary: string | null
  resolvedAt: string | null
  staleAt: string | null
  contactId: string | null
  expertId: string | null
  entityTags: string[]
  sourceMessageId: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateWatchRequest {
  status?: 'resolved' | 'dismissed'
  resolutionSummary?: string
}
```

---

## Settings Types

```typescript
// packages/shared/src/types/settings.ts

export interface UserSettings {
  id: string
  displayName: string | null
  timezone: string
  language: string
  tonePreference: 'casual' | 'professional' | 'balanced'
  responseLength: 'concise' | 'standard' | 'detailed'
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  briefingCadence: 'morning' | 'morning_afternoon' | 'morning_afternoon_evening'
  overnightBuilderEnabled: boolean
  quizSessionsEnabled: boolean
  overnightResearchEnabled: boolean
  notificationPreferences: NotificationPreferences
}

export interface NotificationPreferences {
  briefings: { push: boolean; inApp: boolean }
  nudges: { push: boolean; inApp: boolean }
  headsUps: { push: boolean; inApp: boolean }
  watchAlerts: { push: boolean; inApp: boolean }
  researchComplete: { push: boolean; inApp: boolean }
}

export interface UpdateSettingsRequest {
  displayName?: string
  timezone?: string
  tonePreference?: 'casual' | 'professional' | 'balanced'
  responseLength?: 'concise' | 'standard' | 'detailed'
  quietHoursEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  briefingCadence?: 'morning' | 'morning_afternoon' | 'morning_afternoon_evening'
  overnightBuilderEnabled?: boolean
  quizSessionsEnabled?: boolean
  overnightResearchEnabled?: boolean
  notificationPreferences?: Partial<NotificationPreferences>
}
```

---

## Push & Webhook Types

```typescript
// packages/shared/src/types/push.ts

export interface PushSubscription {
  id: string
  userId: string
  platform: 'ios' | 'web'
  token: string
  deviceName: string | null
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export interface RegisterPushRequest {
  platform: 'ios' | 'web'
  token: string
  deviceName?: string
}

export interface GmailWebhookPayload {
  emailAddress: string
  historyId: string
}
```

---

## Auth Types

```typescript
// packages/shared/src/types/auth.ts

export interface GoogleAuthRequest {
  scopes?: string[]
}

export interface GoogleAuthResponse {
  authUrl: string
}

export interface AuthCallbackResult {
  userId: string
  isNewUser: boolean
}
```

---

## Dashboard Types

```typescript
// packages/shared/src/types/dashboard.ts

export interface DashboardWidget {
  id: string
  userId: string
  title: string
  widgetType: 'chart' | 'table' | 'count' | 'list' | 'status' | 'timeline'
  dataSource: string
  config: Record<string, unknown>
  position: number
  expertId: string | null
  refreshIntervalSeconds: number
  lastRefreshedAt: string | null
  status: 'proposed' | 'approved' | 'active' | 'rejected'
  isVisible: boolean
  createdBy: 'system' | 'user' | 'overnight_builder'
  createdAt: string
  updatedAt: string
}

export interface CreateWidgetRequest {
  title: string
  widgetType: 'chart' | 'table' | 'count' | 'list' | 'status' | 'timeline'
  dataSource: string
  config?: Record<string, unknown>
  expertId?: string
}

export interface UpdateWidgetRequest {
  title?: string
  config?: Record<string, unknown>
  position?: number
  isVisible?: boolean
  status?: 'approved' | 'rejected'
}
```

---

## Integration Health Types

```typescript
// packages/shared/src/types/integration-health.ts

export type IntegrationName = 'gmail' | 'google_calendar' | 'imessage' | 'openrouter' | 'supabase' | 'perplexity' | 'cohere'
export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'disconnected'

export interface IntegrationHealth {
  id: string
  userId: string
  integration: IntegrationName
  status: IntegrationStatus
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastError: string | null
  consecutiveFailures: number
}
```

---

## Training Signal Types

```typescript
// packages/shared/src/types/training-signal.ts

export type SignalType =
  | 'draft_edit' | 'artifact_edit' | 'tone_correction' | 'task_dismissed'
  | 'card_dismissed' | 'card_engaged' | 'repeated_question' | 'explicit_correction'
  | 'feature_usage' | 'widget_ignored' | 'quiz_response'

export interface TrainingSignal {
  id: string
  userId: string
  signalType: SignalType
  signalData: Record<string, unknown>
  category: string | null
  strength: number
  processedAt: string | null
  proceduralMemoryId: string | null
  sourceMessageId: string | null
  createdAt: string
}
```

---

## Onboarding Types

```typescript
// packages/shared/src/types/onboarding.ts

export interface OnboardingProgress {
  id: string
  userId: string
  emailConnected: boolean
  calendarConnected: boolean
  profileDepth: number
  featureDiscovery: number
  firstBriefingReceived: boolean
  returnSessions: number
  completenessScore: number
  completedAt: string | null
}
```

---

## API Response Types

```typescript
// packages/shared/src/types/api.ts

/** Standard API error response */
export interface ApiError {
  error: string
}

/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** Standard list response (non-paginated) */
export interface ListResponse<T> {
  data: T[]
}
```

---

## Constants

```typescript
// packages/shared/src/constants/index.ts

export { CHAT_MODEL, CHAT_FALLBACK_MODELS, ROUTER_MODEL, BACKGROUND_MODEL, EMBEDDING_MODEL } from './models'
export {
  MAX_TOOL_CALLS, STREAM_TIMEOUT_MS, ROUTER_TIMEOUT,
  MAX_CONCURRENT_HEAVY_JOBS, HEAVY_JOB_TIMEOUT_MS, LIGHTWEIGHT_JOB_TIMEOUT_MS,
  SUMMARY_MAX_TOKENS, SUMMARY_REFRESH_TOKEN_THRESHOLD,
  DEFAULT_RECENT_MESSAGES, MIN_RECENT_MESSAGES,
  MEMORY_RETRIEVAL_CANDIDATES, MEMORY_EXTRACTION_DEBOUNCE_MS,
} from './limits'
```

---

## Type Export Pattern

All types are re-exported from the package index:

```typescript
// packages/shared/src/index.ts

export * from './types/chat'
export * from './types/router'
export * from './types/specialist'
export * from './types/expert'
export * from './types/memory'
export * from './types/background-job'
export * from './types/tools'
export * from './types/notifications'
export * from './types/activity-log'
export * from './types/api'
export * from './types/task'
export * from './types/document'
export * from './types/contact'
export * from './types/artifact'
export * from './types/notepad'
export * from './types/watch'
export * from './types/settings'
export * from './types/push'
export * from './types/auth'
export * from './types/dashboard'
export * from './types/integration-health'
export * from './types/training-signal'
export * from './types/onboarding'
export * from './constants'
```

Usage in any app or package:

```typescript
import { ChatMessage, RouterResult, Expert, ToolExecutor } from '@crosby/shared'
```
