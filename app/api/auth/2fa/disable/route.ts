import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disable2FA, verifyTwoFactorCode, is2FAEnabled } from '@/lib/auth/twoFactorService'

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA for the current user
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required to disable 2FA' },
        { status: 400 }
      )
    }

    // Check if 2FA is enabled
    const enabled = await is2FAEnabled(session.user.id)
    if (!enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify the code before disabling
    const cleanCode = code.replace(/[\s-]/g, '')
    const isValid = await verifyTwoFactorCode(session.user.id, cleanCode)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    await disable2FA(session.user.id)

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled',
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
