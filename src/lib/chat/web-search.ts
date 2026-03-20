import Anthropic from '@anthropic-ai/sdk'
import { SEARCH_MODELS, buildMetadata } from '@/lib/openrouter-models'

export async function executeWebSearch(query: string): Promise<string> {
  console.log(`[WebSearch] Calling Perplexity with query: "${query}"`)
  const searchClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL })
  const response = await searchClient.messages.create({
    model: SEARCH_MODELS.primary,
    max_tokens: 1024,
    messages: [{ role: 'user', content: query }],
    ...({ extra_body: { provider: SEARCH_MODELS.provider, metadata: buildMetadata({ call_type: 'web_search' }) } } as any),
  })
  const result = response.content[0].type === 'text' ? response.content[0].text : 'No results found.'
  console.log(`[WebSearch] Perplexity response (${result.length} chars): ${result.slice(0, 200)}...`)
  return result
}
