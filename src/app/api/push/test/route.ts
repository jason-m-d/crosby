import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/push'

export async function GET() {
  // Get the first user with a push subscription
  const { data: sub } = await supabaseAdmin
    .from('push_subscriptions')
    .select('user_id')
    .limit(1)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 })
  }

  await sendPushNotification(
    sub.user_id,
    'J.DRG Test',
    'Push notifications are working!',
    '/dashboard'
  )

  return NextResponse.json({ ok: true, sent_to: sub.user_id })
}
