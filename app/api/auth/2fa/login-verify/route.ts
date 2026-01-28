import { NextResponse } from 'next/server'
import { verifyTwoFactorCode } from '@/lib/auth/twoFactorService'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/2fa/login-verify
 * Verify 2FA code during login (before session is created)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, code } = body

    if (!userId || !code) {
      return NextResponse.json(
        { valid: false, error: 'User ID and code are required' },
        { status: 400 }
      )
    }

    // Verify the user exists and has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    })

    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json(
        { valid: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Clean the code
    const cleanCode = code.replace(/[\s-]/g, '')

    // Verify the 2FA code
    const isValid = await verifyTwoFactorCode(userId, cleanCode)

    if (!isValid) {
      return NextResponse.json(
        { valid: false, error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Store a temporary verification token (expires in 5 minutes)
    // This is used to verify the 2FA was completed when the actual login happens
    await prisma.activityLog.create({
      data: {
        userId,
        action: '2FA_VERIFIED',
        entityType: 'User',
        entityId: userId,
        details: JSON.stringify({
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }),
      },
    })

    return NextResponse.json({
      valid: true,
    })
  } catch (error) {
    console.error('2FA login verify error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
