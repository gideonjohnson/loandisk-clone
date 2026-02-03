import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { generateWarnings } from '@/lib/analytics/earlyWarningService'

export const GET = createAuthHandler(
  async () => {
    try {
      const warnings = await generateWarnings()
      return NextResponse.json(warnings)
    } catch (error) {
      console.error('Early warnings error:', error)
      return NextResponse.json({ error: 'Failed to generate warnings' }, { status: 500 })
    }
  },
  [Permission.ANALYTICS_VIEW]
)
