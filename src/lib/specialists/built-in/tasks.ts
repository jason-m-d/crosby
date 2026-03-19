import type { SpecialistDefinition } from '../types'

export const tasksSpecialist: SpecialistDefinition = {
  id: 'tasks',
  name: 'Tasks',
  description: 'Handles action items and delegation',
  tools: ['manage_action_items'],
  dataNeeded: ['action_items'],
  triggerRules: {
    always_on: true,
  },
  source: 'built_in',
  systemPromptSection: `{{action_items_section}}`,
}
