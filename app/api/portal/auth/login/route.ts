import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/portal/auth/login
 * Authenticate borrower for customer portal
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, pin } = body

    if (!phone || !pin) {
      return NextResponse.json(
        { error: 'Phone number and PIN are required' },
        { status: 400 }
      )
    }

    // Find borrower by phone
    const borrower = await prisma.borrower.findFirst({
      where: {
        phone: phone,
        active: true,
      },
    })

    if (!borrower) {
      return NextResponse.json(
        { error: 'Invalid phone number or PIN' },
        { status: 401 }
      )
    }

    // Check if borrower has a PIN set
    const storedPin = (borrower as { portalPin?: string }).portalPin

    if (!storedPin) {
      return NextResponse.json(
        { error: 'Account not set up for portal access. Please register first.' },
        { status: 401 }
      )
    }

    // Verify PIN using bcrypt
    const isValidPin = await bcrypt.compare(pin, storedPin)

    if (!isValidPin) {
      return NextResponse.json(
        { error: 'Invalid phone number or PIN' },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    const sessionToken = Buffer.from(`${borrower.id}:${Date.now()}`).toString('base64')

    cookieStore.set('portal_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    cookieStore.set('portal_borrower_id', borrower.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Log login activity
    await prisma.activityLog.create({
      data: {
        userId: borrower.id,
        action: 'PORTAL_LOGIN',
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
      borrower: {
        id: borrower.id,
        firstName: borrower.firstName,
        lastName: borrower.lastName,
      },
    })
  } catch (error) {
    console.error('Portal login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
