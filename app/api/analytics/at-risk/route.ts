import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { getAtRiskLoans } from '@/lib/analytics/loanRiskService'

export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const threshold = parseInt(searchParams.get('threshold') || '50', 10)

      const loans = await getAtRiskLoans(threshold)
      return NextResponse.json(loans)
    } catch (error) {
      console.error('At-risk loans error:', error)
      return NextResponse.json({ error: 'Failed to fetch at-risk loans' }, { status: 500 })
    }
  },
  [Permission.ANALYTICS_PREDICTIVE]
)
