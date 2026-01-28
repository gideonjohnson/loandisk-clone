import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateTwoFactorSecret, is2FAEnabled } from '@/lib/auth/twoFactorService'

/**
 * POST /api/auth/2fa/setup
 * Generate a new 2FA secret and QR code
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if 2FA is already enabled
    const enabled = await is2FAEnabled(session.user.id)
    if (enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to set up again.' },
        { status: 400 }
      )
    }

    const result = await generateTwoFactorSecret(session.user.id)

    return NextResponse.json({
      success: true,
      qrCode: result.qrCodeDataUrl,
      secret: result.secret, // Show secret for manual entry
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/2fa/setup
 * Get current 2FA status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const enabled = await is2FAEnabled(session.user.id)

    return NextResponse.json({
      enabled,
    })
  } catch (error) {
    console.error('2FA status error:', error)
    return NextResponse.json(
      { error: 'Failed to get 2FA status' },
      { status: 500 }
    )
  }
}
