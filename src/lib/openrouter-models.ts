/**
 * Centralized OpenRouter model configuration.
 * All AI call sites should import from here instead of hardcoding model strings.
 */

export const CHAT_MODELS = {
  primary: 'anthropic/claude-sonnet-4.6:exacto',
  fallbacks: ['google/gemini-3.1-pro-preview'],
  provider: { sort: 'latency' as const },
}

export const BACKGROUND_LITE_MODELS = {
  primary: 'google/gemini-3.1-flash-lite-preview',
  fallbacks: ['google/gemini-3-flash-preview'],
  provider: { sort: 'price' as const },
}

export const SEARCH_MODELS = {
  primary: 'perplexity/sonar-pro-search',
  provider: { sort: 'price' as const },
}

export const EMBEDDINGS_MODEL = 'openai/text-embedding-3-small'

/**
 * Metadata broadcast to Langfuse via OpenRouter.
 * Pass in extra_body alongside model/provider config.
 */
export type CallType =
  | 'main_chat'
  | 'router'
  | 'session_greeting'
  | 'background_job'
  | 'watch_check'
  | 'memory_extraction'
  | 'session_extraction'
  | 'cron_email_scan'
  | 'cron_text_scan'
  | 'cron_morning_briefing'
  | 'cron_nudge'
  | 'cron_overnight_build'
  | 'cron_summarize'
  | 'training_extract'
  | 'prefetch'
  | 'web_search'

export interface CallMetadata {
  call_type: CallType
  user_id?: string
  session_id?: string
  conversation_id?: string
}

export function buildMetadata(meta: CallMetadata): CallMetadata {
  return meta
}
