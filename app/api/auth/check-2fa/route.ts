import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

/**
 * POST /api/auth/check-2fa
 * Check credentials and whether user has 2FA enabled
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        active: true,
        twoFactorEnabled: true,
      },
    })

    if (!user || !user.password || !user.active) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Verify 2FA is properly set up
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId: user.id },
        select: { verifiedAt: true },
      })

      if (twoFactorAuth?.verifiedAt) {
        return NextResponse.json({
          requires2FA: true,
          userId: user.id,
        })
      }
    }

    // No 2FA required
    return NextResponse.json({
      requires2FA: false,
    })
  } catch (error) {
    console.error('Check 2FA error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
