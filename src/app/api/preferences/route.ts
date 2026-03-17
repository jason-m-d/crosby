import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('ui_preferences')
    .select('*')
    .order('key')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Convert to key-value map for easy consumption
  const preferences: Record<string, string> = {}
  for (const pref of data || []) {
    preferences[pref.key] = pref.value
  }

  return NextResponse.json(preferences)
}
