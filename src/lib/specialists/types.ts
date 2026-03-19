import type Anthropic from '@anthropic-ai/sdk'

export interface SpecialistTriggerRules {
  // Declarative rules for when this specialist activates.
  // These are JSON-serializable (no functions) so they can be stored in a database
  // for user-created specialists in the future.
  trigger_tools?: string[]   // activate if any of these tools appear in routerResult.tools_needed
  trigger_data?: string[]    // activate if any of these data blocks appear in routerResult.data_needed
  always_on?: boolean        // if true, always activate (for core specialist)
}

export interface SpecialistDefinition {
  id: string                         // unique identifier e.g. "email", "calendar", "sales"
  name: string                       // display name e.g. "Email", "Calendar", "Sales"
  description: string                // what this specialist handles
  systemPromptSection: string        // the specialist's portion of the system prompt
                                     // supports {{placeholder}} tokens populated with loaded data
  tools: string[]                    // tool names this specialist owns (keys from ALL_TOOLS_MAP)
  dataNeeded: string[]               // data blocks this specialist requires
  triggerRules: SpecialistTriggerRules  // declarative activation rules
  source: 'built_in' | 'user_created'  // where this specialist came from
}

export interface SpecialistContext {
  data: Record<string, any>          // loaded data keyed by data block name
  tools: Anthropic.Messages.Tool[]   // resolved tool objects
  promptSection: string              // the specialist's prompt section, populated with loaded data
}
