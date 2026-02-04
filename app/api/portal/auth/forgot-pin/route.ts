import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms/smsService'

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3
const MAX_DAILY_REQUESTS = 5
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  entry.count++
  return false
}

/**
 * POST /api/portal/auth/forgot-pin
 * Send a PIN reset code to the borrower's phone number
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Rate limit by phone number
    if (isRateLimited(phone)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    // Find borrower by phone
    const borrower = await prisma.borrower.findFirst({
      where: { phone },
    })

    if (!borrower) {
      // Don't reveal whether the phone exists
      return NextResponse.json({
        success: true,
        message: 'If this phone number is registered, you will receive a reset code via SMS.',
      })
    }

    // Check daily limit using activity log
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentRequests = await prisma.activityLog.count({
      where: {
        userId: borrower.id,
        action: 'PIN_RESET_CODE',
        createdAt: { gte: dayAgo },
      },
    })

    if (recentRequests >= MAX_DAILY_REQUESTS) {
      return NextResponse.json(
        { error: 'Daily reset limit reached. Please try again tomorrow.' },
        { status: 429 }
      )
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store reset code in activity log (used for verification)
    await prisma.activityLog.create({
      data: {
        userId: borrower.id,
        action: 'PIN_RESET_CODE',
        entityType: 'Borrower',
        entityId: borrower.id,
        details: JSON.stringify({
          code: resetCode,
          expiresAt: expiresAt.toISOString(),
          phone,
          used: false,
        }),
      },
    })

    // Send SMS with reset code
    await sendSMS({
      to: phone,
      message: `Your PIN reset code is ${resetCode}. This code expires in 10 minutes. If you did not request this, please ignore.`,
      borrowerId: borrower.id,
      type: 'PIN_RESET',
    })

    // Log the request
    await prisma.activityLog.create({
      data: {
        userId: borrower.id,
        action: 'PIN_RESET_REQUESTED',
        entityType: 'Borrower',
        entityId: borrower.id,
        details: JSON.stringify({
          phone,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'If this phone number is registered, you will receive a reset code via SMS.',
    })
  } catch (error) {
    console.error('Forgot PIN error:', error)
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}
