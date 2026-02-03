import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { getSnapshotTrends } from '@/lib/analytics/portfolioSnapshotService'

export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const months = parseInt(searchParams.get('months') || '12', 10)
      const branchId = searchParams.get('branchId') || undefined

      const trends = await getSnapshotTrends(months, branchId)
      return NextResponse.json(trends)
    } catch (error) {
      console.error('Trends error:', error)
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
    }
  },
  [Permission.ANALYTICS_VIEW]
)
