import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initiatePasswordReset } from '@/lib/auth/passwordResetService'
import { sendPasswordResetEmail } from '@/lib/email/emailService'
import { headers } from 'next/headers'

function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 *
 * Rate limited: 3 requests per hour per email
 * Always returns success to prevent email enumeration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body
    const ipAddress = getClientIP(request)

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Initiate password reset
    const { token, result } = await initiatePasswordReset(email, ipAddress)

    // Check if rate limited
    if (result.rateLimited) {
      return NextResponse.json(
        { error: result.error || 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Send email if we have a token (user exists)
    if (token) {
      // Get user name for email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { name: true },
      })

      if (user) {
        // Get base URL from headers or environment
        const headersList = await headers()
        const host = headersList.get('host') || 'localhost:3000'
        const protocol = headersList.get('x-forwarded-proto') || 'http'
        const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`

        // Send reset email (fire and forget)
        sendPasswordResetEmail(email, user.name, token, baseUrl).catch((err) => {
          console.error('Failed to send password reset email:', err)
        })
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, you will receive password reset instructions.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
