import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyAndEnable2FA, verifyTwoFactorCode } from '@/lib/auth/twoFactorService'

/**
 * POST /api/auth/2fa/verify
 * Verify a TOTP code and enable 2FA (during setup)
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
    const { code, action } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Clean the code (remove spaces and dashes)
    const cleanCode = code.replace(/[\s-]/g, '')

    if (action === 'enable') {
      // Verify and enable 2FA
      const result = await verifyAndEnable2FA(session.user.id, cleanCode)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '2FA has been enabled successfully',
        backupCodes: result.backupCodes,
      })
    } else {
      // Just verify the code (for login flow)
      const isValid = await verifyTwoFactorCode(session.user.id, cleanCode)

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Code verified successfully',
      })
    }
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
