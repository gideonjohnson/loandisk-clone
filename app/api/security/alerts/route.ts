import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getAlerts, acknowledgeAlert, getUnacknowledgedCount } from '@/lib/security/securityAlertService'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/security/alerts
 * Returns security alerts for the current authenticated user
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const { searchParams } = new URL(request.url)
      const includeAcknowledged = searchParams.get('includeAcknowledged') === 'true'

      const [alerts, unacknowledgedCount] = await Promise.all([
        getAlerts(session.user.id!, includeAcknowledged),
        getUnacknowledgedCount(session.user.id!),
      ])

      return NextResponse.json({
        alerts,
        unacknowledgedCount,
        total: alerts.length,
      })
    } catch (error) {
      console.error('Get alerts error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch alerts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)

/**
 * PUT /api/security/alerts
 * Acknowledges one or all alerts
 * Body: { alertId: string } or { acknowledgeAll: true }
 */
export const PUT = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { alertId, acknowledgeAll } = body

      if (acknowledgeAll === true) {
        await prisma.securityAlert.updateMany({
          where: {
            userId: session.user.id!,
            acknowledged: false,
          },
          data: {
            acknowledged: true,
            acknowledgedAt: new Date(),
          },
        })

        return NextResponse.json({
          success: true,
          message: 'All alerts acknowledged',
        })
      }

      if (!alertId) {
        return NextResponse.json(
          { error: 'alertId or acknowledgeAll is required' },
          { status: 400 }
        )
      }

      const alert = await acknowledgeAlert(alertId)

      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged successfully',
        alert,
      })
    } catch (error) {
      console.error('Acknowledge alert error:', error)
      return NextResponse.json(
        {
          error: 'Failed to acknowledge alert',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)
