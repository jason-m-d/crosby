import { openrouterClient } from './openrouter'

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openrouterClient.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
    dimensions: 1024,
  })
  if (!response.data?.[0]?.embedding) {
    console.error('Embedding failed:', JSON.stringify(response).slice(0, 200))
    throw new Error('Embedding generation failed')
  }
  return response.data[0].embedding
}

export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const response = await openrouterClient.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
    dimensions: 1024,
  })
  if (!response.data?.[0]?.embedding) {
    console.warn('[embeddings] Query embedding failed')
    throw new Error('Query embedding generation failed')
  }
  return response.data[0].embedding
}
