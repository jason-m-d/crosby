import { NextResponse } from 'next/server'
import { getTrainingStats } from '@/lib/training'

export async function GET() {
  try {
    const stats = await getTrainingStats()
    return NextResponse.json(stats)
  } catch (e: any) {
    console.error('Training stats error:', e)
    return NextResponse.json({ error: e.message || 'Failed to get stats' }, { status: 500 })
  }
}
