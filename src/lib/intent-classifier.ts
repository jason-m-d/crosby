/**
 * Intent classifier for selective context injection.
 *
 * Classifies the user message into a set of "domains" that determine which
 * data blocks and tool schemas are injected into the system prompt.
 */

export const ALWAYS_ON_DOMAINS = ['base', 'actionItems', 'artifacts', 'projects', 'watches', 'training'] as const

/**
 * Classify the user message into a set of active domains.
 *
 * @param message - The raw user message text
 * @param recentDomains - context_domains from the previous assistant message (for follow-up inheritance)
 */
export function classifyIntent(message: string, recentDomains?: string[] | null): Set<string> {
  const result = new Set<string>(ALWAYS_ON_DOMAINS)
  const lower = message.toLowerCase().trim()
  const words = lower.split(/\s+/)

  // Greeting short-circuit: if message matches greeting patterns OR is ≤3 words with no domain keywords
  const greetingPattern = /^(hey|hi|hello|good morning|good afternoon|good evening|what'?s up|whats up|sup|yo)\b/i
  if (greetingPattern.test(lower)) {
    return result
  }

  // Track whether any conditional domains were added
  const beforeSize = result.size

  // Email
  if (/email|draft|send|forward|reply|inbox|gmail|kristal|invoice/.test(lower)) {
    result.add('email')
  }

  // Calendar — "call" only counts if another calendar word is also present
  const calendarKeywords = /calendar|meeting|schedule|free|busy/.test(lower)
  const callWithContext = /\bcall\b/.test(lower) && calendarKeywords
  if (calendarKeywords || callWithContext) {
    result.add('calendar')
  }

  // People / contacts
  if (/contacts|who is|phone|email address|reach out/.test(lower)) {
    result.add('people')
  }

  // Notes
  if (/notepad|\bnote\b|remind me|jot|write down/.test(lower)) {
    result.add('notes')
  }

  // Texts (NOT bare "message" — require text/sms/imessage)
  if (/\btext\b|sms|imessage/.test(lower)) {
    result.add('texts')
  }

  // Watches (in addition to always-on, these trigger domain for data)
  if (/watching|monitor|keep an eye/.test(lower)) {
    result.add('watches')
  }

  // Dashboard
  if (/dashboard|\bcard\b|\bpin\b/.test(lower)) {
    result.add('dashboard')
  }

  // Alerts / notification rules
  if (/notification|\brule\b|notify me when/.test(lower)) {
    result.add('alerts')
  }

  // UI preferences
  if (/sidebar|theme|preferences/.test(lower)) {
    result.add('prefs')
  }

  // Sales
  if (/sales|revenue|\bstore\b|how did|performance|wingstop|pickle|forecast|budget/.test(lower)) {
    result.add('sales')
  }

  // Training
  if (/training|teach|\blearn\b|feedback|example/.test(lower)) {
    result.add('training')
  }

  // Bookmarks
  if (/bookmark|save link/.test(lower)) {
    result.add('bookmarks')
  }

  // Follow-up inheritance: if message ≤5 words AND no new conditional domains were added AND recentDomains is non-empty
  if (words.length <= 5 && result.size === beforeSize && recentDomains && recentDomains.length > 0) {
    for (const d of recentDomains) {
      result.add(d)
    }
  }

  return result
}

/**
 * Return the tool names that should be active for the given domain set.
 */
export function getToolsForDomains(domains: Set<string>): string[] {
  // Always-on tools
  const tools: string[] = [
    'manage_action_items',
    'manage_artifact',
    'manage_project',
    'manage_project_context',
    'manage_notepad',
    'search_web',
    'spawn_background_job',
    'ask_structured_question',
    'quick_confirm',
    'manage_training',
    'create_watch',
    'list_watches',
    'cancel_watch',
    'manage_contacts',
  ]

  if (domains.has('email')) {
    tools.push('search_gmail', 'draft_email')
  }

  if (domains.has('calendar')) {
    tools.push('check_calendar', 'find_availability', 'create_calendar_event')
  }

  if (domains.has('dashboard')) {
    tools.push('manage_dashboard')
  }

  if (domains.has('alerts')) {
    tools.push('manage_notification_rules')
  }

  if (domains.has('prefs')) {
    tools.push('manage_preferences')
  }

  if (domains.has('sales')) {
    tools.push('query_sales')
  }

  if (domains.has('texts')) {
    tools.push('search_texts', 'manage_text_contacts', 'manage_group_whitelist')
  }

  if (domains.has('bookmarks')) {
    tools.push('manage_bookmarks')
  }

  return tools
}
