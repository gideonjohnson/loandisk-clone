import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/trust-device
 * Mark a device as trusted for the current user
 *
 * Body: { deviceId: string }
 * Requires: Active session
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    // Find the device
    const device = await prisma.userDevice.findFirst({
      where: {
        id: deviceId,
        userId: session.user.id,
      },
    })

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    // Mark as trusted
    await prisma.userDevice.update({
      where: { id: device.id },
      data: {
        isTrusted: true,
        lastSeenAt: new Date(),
      },
    })

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DEVICE_TRUSTED',
        entityType: 'UserDevice',
        entityId: device.id,
        details: JSON.stringify({
          deviceFingerprint: device.deviceFingerprint,
          deviceName: device.deviceName,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device has been marked as trusted',
    })
  } catch (error) {
    console.error('Trust device error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/auth/trust-device
 * Remove trust from a device
 *
 * Body: { deviceId: string }
 * Requires: Active session
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      )
    }

    // Find the device
    const device = await prisma.userDevice.findFirst({
      where: {
        id: deviceId,
        userId: session.user.id,
      },
    })

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    // Remove trust
    await prisma.userDevice.update({
      where: { id: device.id },
      data: { isTrusted: false },
    })

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DEVICE_UNTRUSTED',
        entityType: 'UserDevice',
        entityId: device.id,
        details: JSON.stringify({
          deviceFingerprint: device.deviceFingerprint,
          deviceName: device.deviceName,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Device trust has been removed',
    })
  } catch (error) {
    console.error('Untrust device error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
