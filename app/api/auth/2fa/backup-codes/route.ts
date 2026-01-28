import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getBackupCodesCount,
  regenerateBackupCodes,
  verifyTwoFactorCode,
  is2FAEnabled,
} from '@/lib/auth/twoFactorService'

/**
 * GET /api/auth/2fa/backup-codes
 * Get remaining backup codes count
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
    if (!enabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    const count = await getBackupCodesCount(session.user.id)

    return NextResponse.json({
      remainingCodes: count,
    })
  } catch (error) {
    console.error('Backup codes count error:', error)
    return NextResponse.json(
      { error: 'Failed to get backup codes count' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/2fa/backup-codes
 * Regenerate backup codes (requires current 2FA code)
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
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    // Verify the code first
    const cleanCode = code.replace(/[\s-]/g, '')
    const isValid = await verifyTwoFactorCode(session.user.id, cleanCode)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    const newCodes = await regenerateBackupCodes(session.user.id)

    return NextResponse.json({
      success: true,
      backupCodes: newCodes,
    })
  } catch (error) {
    console.error('Regenerate backup codes error:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    )
  }
}
