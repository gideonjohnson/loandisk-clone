import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getDevices, removeDevice } from '@/lib/security/deviceService'

/**
 * GET /api/security/devices
 * Returns all devices for the current authenticated user
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const devices = await getDevices(session.user.id!)

      return NextResponse.json({
        devices,
        total: devices.length,
      })
    } catch (error) {
      console.error('Get devices error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch devices',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)

/**
 * DELETE /api/security/devices
 * Removes a device by its ID
 * Body: { deviceId: string }
 */
export const DELETE = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { deviceId } = body

      if (!deviceId) {
        return NextResponse.json(
          { error: 'deviceId is required' },
          { status: 400 }
        )
      }

      await removeDevice(deviceId)

      return NextResponse.json({
        success: true,
        message: 'Device removed successfully',
      })
    } catch (error) {
      console.error('Remove device error:', error)
      return NextResponse.json(
        {
          error: 'Failed to remove device',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  []
)
