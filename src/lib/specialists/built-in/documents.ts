import type { SpecialistDefinition } from '../types'

export const documentsSpecialist: SpecialistDefinition = {
  id: 'documents',
  name: 'Documents',
  description: 'Handles artifacts, projects, project context, and RAG retrieval',
  tools: ['manage_artifact', 'open_artifact', 'manage_project', 'manage_project_context', 'manage_bookmarks'],
  dataNeeded: ['projects', 'artifacts', 'documents_rag', 'context_chunks'],
  triggerRules: {
    trigger_tools: ['manage_artifact', 'manage_project', 'manage_project_context', 'manage_bookmarks'],
    trigger_data: ['documents_rag', 'context_chunks', 'projects', 'artifacts'],
  },
  source: 'built_in',
  systemPromptSection: `{{projects_section}}

{{project_system_prompt_section}}

{{relevant_projects_hint}}

{{artifacts_section}}

{{document_context_section}}`,
}
