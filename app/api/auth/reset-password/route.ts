import { NextResponse } from 'next/server'
import { resetPassword, validateResetToken } from '@/lib/auth/passwordResetService'

function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Validate a reset token without using it
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const isValid = await validateResetToken(token)

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using token
 *
 * Body: { token: string, password: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body
    const ipAddress = getClientIP(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      )
    }

    // Validate password complexity
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Check for at least one uppercase, one lowercase, and one number
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        },
        { status: 400 }
      )
    }

    // Reset the password
    const result = await resetPassword(token, password, ipAddress)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset password' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
