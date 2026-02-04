import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'crypto'

const MAX_VERIFY_ATTEMPTS = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const attemptCounts = new Map<string, { count: number; resetAt: number }>()

function checkVerifyLimit(key: string): boolean {
  const now = Date.now()
  const entry = attemptCounts.get(key)

  if (!entry || now > entry.resetAt) {
    attemptCounts.set(key, { count: 1, resetAt: now + LOCKOUT_WINDOW_MS })
    return false
  }

  if (entry.count >= MAX_VERIFY_ATTEMPTS) {
    return true
  }

  entry.count++
  return false
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * POST /api/portal/auth/reset-pin
 * Verify the reset code and set a new PIN
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, code, newPin } = body

    if (!phone || !code || !newPin) {
      return NextResponse.json(
        { error: 'Phone, code, and new PIN are required' },
        { status: 400 }
      )
    }

    // Validate new PIN format
    if (!/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    // Rate limit verification attempts per phone
    if (checkVerifyLimit(phone)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Find borrower by phone
    const borrower = await prisma.borrower.findFirst({
      where: { phone },
    })

    if (!borrower) {
      return NextResponse.json(
        { error: 'Invalid reset code' },
        { status: 400 }
      )
    }

    // Find the most recent unused reset code for this borrower
    const resetLogs = await prisma.activityLog.findMany({
      where: {
        userId: borrower.id,
        action: 'PIN_RESET_CODE',
        entityType: 'Borrower',
        entityId: borrower.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    let validCode = false
    let matchedLogId: string | null = null

    for (const log of resetLogs) {
      try {
        const details = JSON.parse(log.details || '{}')
        if (
          typeof details.code === 'string' &&
          safeCompare(details.code, code) &&
          !details.used &&
          new Date(details.expiresAt) > new Date()
        ) {
          validCode = true
          matchedLogId = log.id
          break
        }
      } catch {
        continue
      }
    }

    if (!validCode || !matchedLogId) {
      return NextResponse.json(
        { error: 'Invalid or expired reset code' },
        { status: 400 }
      )
    }

    // Use a transaction to atomically mark code as used and update PIN
    const hashedPin = await bcrypt.hash(newPin, 10)

    await prisma.$transaction(async (tx) => {
      // Re-check code is still unused inside transaction
      const logEntry = await tx.activityLog.findUnique({
        where: { id: matchedLogId! },
      })

      if (!logEntry) {
        throw new Error('Reset code not found')
      }

      const details = JSON.parse(logEntry.details || '{}')
      if (details.used) {
        throw new Error('Reset code already used')
      }

      // Mark code as used
      details.used = true
      await tx.activityLog.update({
        where: { id: matchedLogId! },
        data: { details: JSON.stringify(details) },
      })

      // Update borrower PIN
      await tx.borrower.update({
        where: { id: borrower.id },
        data: { portalPin: hashedPin },
      })

      // Log the PIN reset
      await tx.activityLog.create({
        data: {
          userId: borrower.id,
          action: 'PIN_RESET_COMPLETED',
          entityType: 'Borrower',
          entityId: borrower.id,
          details: JSON.stringify({
            phone,
            timestamp: new Date().toISOString(),
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'PIN has been reset successfully. You can now log in with your new PIN.',
    })
  } catch (error) {
    console.error('Reset PIN error:', error)
    const message = error instanceof Error ? error.message : 'Failed to reset PIN'

    if (message === 'Reset code already used') {
      return NextResponse.json(
        { error: 'This reset code has already been used' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reset PIN. Please try again.' },
      { status: 500 }
    )
  }
}
