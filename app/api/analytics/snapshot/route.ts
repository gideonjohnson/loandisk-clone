import { NextResponse } from 'next/server'
import { captureSnapshot } from '@/lib/analytics/portfolioSnapshotService'

/**
 * POST /api/analytics/snapshot
 * Capture portfolio snapshot — called by monthly cron job
 */
export async function POST(request: Request) {
  // Verify cron API key for automated calls
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_API_KEY && apiKey !== process.env.CRON_API_KEY) {
    // Also allow authenticated users
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const snapshot = await captureSnapshot()
    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    console.error('Snapshot capture error:', error)
    return NextResponse.json(
      { error: 'Failed to capture snapshot' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Allow cron service to trigger via GET as well (Vercel crons use GET)
  try {
    const snapshot = await captureSnapshot()
    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    console.error('Snapshot capture error:', error)
    return NextResponse.json(
      { error: 'Failed to capture snapshot' },
      { status: 500 }
    )
  }
}
