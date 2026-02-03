import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { forecastCashFlow } from '@/lib/analytics/cashFlowForecastService'

export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const months = parseInt(searchParams.get('months') || '6', 10)

      const forecast = await forecastCashFlow(months)
      return NextResponse.json(forecast)
    } catch (error) {
      console.error('Forecast error:', error)
      return NextResponse.json({ error: 'Failed to generate forecast' }, { status: 500 })
    }
  },
  [Permission.ANALYTICS_PREDICTIVE]
)
