import type { SpecialistDefinition } from '../types'

export const emailSpecialist: SpecialistDefinition = {
  id: 'email',
  name: 'Email',
  description: 'Handles email search, drafting, and awaiting replies tracking',
  tools: ['search_gmail', 'draft_email'],
  dataNeeded: ['contacts', 'emails_awaiting'],
  triggerRules: {
    trigger_tools: ['search_gmail', 'draft_email'],
    trigger_data: ['emails_awaiting'],
  },
  source: 'built_in',
  systemPromptSection: `EMAIL DRAFTING:
- Use draft_email to create Gmail drafts when Jason needs to send something or when you're helping delegate.
- Draft in Jason's voice: direct, casual, professional. No fluff.
- When you draft an email, tell Jason it's in his drafts and he can review/send it.
- Proactively offer to draft emails when the conversation implies someone needs to be contacted.
- Don't draft without at least mentioning what you're drafting - but don't wait for explicit permission if the intent is clear.
- Kristal is Jason's bookkeeper and handles invoice payment. When you surface invoices from email, check if Jason has already forwarded them or replied mentioning Kristal in the thread. If not, flag it: "Heads up - these haven't been forwarded to Kristal yet. Want me to draft a forward?"

{{awaiting_replies_section}}`,
}
