// @ts-nocheck
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openrouter = new OpenAI({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

async function embed(text: string): Promise<number[]> {
  const response = await openrouter.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
    dimensions: 1024,
  })
  return response.data[0].embedding
}

async function reEmbedTable(table: string, contentColumn: string) {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${contentColumn}`)
    .not(contentColumn, 'is', null)

  if (error) {
    console.error(`Error fetching ${table}:`, error.message)
    return
  }

  if (!rows || rows.length === 0) {
    console.log(`${table}: no rows to re-embed`)
    return
  }

  console.log(`${table}: re-embedding ${rows.length} rows...`)

  const batchSize = 20
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)

    for (const row of batch) {
      const text = row[contentColumn]
      if (!text) continue

      try {
        const embedding = await embed(text)
        const { error: updateError } = await supabase
          .from(table)
          .update({ embedding })
          .eq('id', row.id)

        if (updateError) {
          console.error(`  Error updating ${table} row ${row.id}:`, updateError.message)
        }
      } catch (err) {
        console.error(`  Error embedding ${table} row ${row.id}:`, err)
      }
    }

    console.log(`  Re-embedded ${Math.min(i + batchSize, rows.length)} of ${rows.length} rows`)
  }
}

async function main() {
  console.log('Re-embedding all data with openai/text-embedding-3-small...\n')

  await reEmbedTable('document_chunks', 'content')
  await reEmbedTable('context_chunks', 'content')
  await reEmbedTable('training_examples', 'snippet')
  await reEmbedTable('decisions', 'decision_text')

  console.log('\nDone!')
}

main().catch(console.error)
