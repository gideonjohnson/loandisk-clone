import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getLoginHistory } from '@/lib/security/loginHistoryService'

/**
 * GET /api/security/login-history
 * Returns login history for the current authenticated user
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '20', 10)

      const history = await getLoginHistory(session.user.id!, limit)

      return NextResponse.json({
        history,
        total: history.length,
      })
    } catch (error) {
      console.error('Get login history error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch login history',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)
