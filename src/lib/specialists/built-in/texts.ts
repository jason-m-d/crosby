import type { SpecialistDefinition } from '../types'

export const textsSpecialist: SpecialistDefinition = {
  id: 'texts',
  name: 'Texts',
  description: 'Handles iMessage search and contacts',
  tools: ['search_texts', 'manage_text_contacts', 'manage_group_whitelist'],
  dataNeeded: ['texts'],
  triggerRules: {
    trigger_tools: ['search_texts', 'manage_text_contacts', 'manage_group_whitelist'],
    trigger_data: ['texts'],
  },
  source: 'built_in',
  systemPromptSection: `{{recent_texts_section}}`,
}
