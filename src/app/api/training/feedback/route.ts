import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { storeTrainingExample } from '@/lib/training'

export async function POST(req: NextRequest) {
  try {
    const { action_item_id, is_correct } = await req.json()

    if (!action_item_id || typeof is_correct !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields: action_item_id, is_correct' }, { status: 400 })
    }

    // Look up the action item's source snippet
    const { data: item } = await supabaseAdmin
      .from('action_items')
      .select('source_snippet, source, title')
      .eq('id', action_item_id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    const snippet = item.source_snippet || item.title

    await storeTrainingExample(
      snippet,
      is_correct, // if user says "yes this is correct" then it IS an action item
      'feedback',
      (item.source as 'email' | 'chat') || undefined,
      undefined,
      action_item_id
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Training feedback error:', e)
    return NextResponse.json({ error: e.message || 'Failed to store feedback' }, { status: 500 })
  }
}
