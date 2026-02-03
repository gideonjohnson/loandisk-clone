import { NextResponse } from 'next/server'
import { scoreAllActiveLoans } from '@/lib/analytics/loanRiskService'

/**
 * POST/GET /api/analytics/risk-scoring
 * Batch score all active loans — called by daily cron job
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
  if (process.env.CRON_API_KEY && apiKey !== process.env.CRON_API_KEY) {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await scoreAllActiveLoans()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Risk scoring error:', error)
    return NextResponse.json({ error: 'Failed to score loans' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await scoreAllActiveLoans()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Risk scoring error:', error)
    return NextResponse.json({ error: 'Failed to score loans' }, { status: 500 })
  }
}
