import { NextRequest, NextResponse } from 'next/server'
import { storeTrainingExample, getTrainingStats } from '@/lib/training'

export async function POST(req: NextRequest) {
  try {
    const { snippet, is_action_item, label_source, source_type, metadata, action_item_id } = await req.json()

    if (!snippet || typeof is_action_item !== 'boolean' || !label_source) {
      return NextResponse.json({ error: 'Missing required fields: snippet, is_action_item, label_source' }, { status: 400 })
    }

    const result = await storeTrainingExample(
      snippet,
      is_action_item,
      label_source,
      source_type,
      metadata,
      action_item_id
    )

    const stats = await getTrainingStats()

    return NextResponse.json({ id: result.id, total_examples: stats.total_examples })
  } catch (e: any) {
    console.error('Training label error:', e)
    return NextResponse.json({ error: e.message || 'Failed to store training example' }, { status: 500 })
  }
}
