import type { SpecialistDefinition } from '../types'

export const calendarSpecialist: SpecialistDefinition = {
  id: 'calendar',
  name: 'Calendar',
  description: 'Handles schedule, availability, and event creation',
  tools: ['check_calendar', 'find_availability', 'create_calendar_event'],
  dataNeeded: ['calendar', 'contacts'],
  triggerRules: {
    trigger_tools: ['check_calendar', 'find_availability', 'create_calendar_event'],
    trigger_data: ['calendar'],
  },
  source: 'built_in',
  systemPromptSection: `{{calendar_section}}`,
}
