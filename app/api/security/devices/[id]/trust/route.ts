import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { trustDevice } from '@/lib/security/deviceService'

/**
 * POST /api/security/devices/:id/trust
 * Marks a device as trusted
 */
export const POST = createAuthHandler(
  async (request: Request, session: Session, context) => {
    try {
      const { id } = context.params

      if (!id) {
        return NextResponse.json(
          { error: 'Device ID is required' },
          { status: 400 }
        )
      }

      const device = await trustDevice(id)

      return NextResponse.json({
        success: true,
        message: 'Device trusted successfully',
        device,
      })
    } catch (error) {
      console.error('Trust device error:', error)
      return NextResponse.json(
        {
          error: 'Failed to trust device',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)
