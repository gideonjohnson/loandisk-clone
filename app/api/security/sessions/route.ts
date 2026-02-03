import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getActiveSessions, revokeSession, revokeAllSessions } from '@/lib/security/sessionService'

/**
 * GET /api/security/sessions
 * Returns all active sessions for the current authenticated user
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const sessions = await getActiveSessions(session.user.id!)

      return NextResponse.json({
        sessions,
        total: sessions.length,
      })
    } catch (error) {
      console.error('Get sessions error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch sessions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)

/**
 * DELETE /api/security/sessions
 * Revokes a specific session or all sessions
 * Body: { sessionId: string } - use sessionId='all' to revoke all sessions
 */
export const DELETE = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { sessionId } = body

      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        )
      }

      if (sessionId === 'all') {
        const result = await revokeAllSessions(session.user.id!)

        return NextResponse.json({
          success: true,
          message: `All sessions revoked`,
          count: result.count,
        })
      }

      await revokeSession(sessionId, 'Revoked by user')

      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully',
      })
    } catch (error) {
      console.error('Revoke session error:', error)
      return NextResponse.json(
        {
          error: 'Failed to revoke session',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)
