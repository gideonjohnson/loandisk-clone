import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/portal/auth/register
 * Register a new borrower for the customer portal
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      idNumber,
      dateOfBirth,
      address,
      city,
      country,
      employmentStatus,
      monthlyIncome,
      pin,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !phone || !pin) {
      return NextResponse.json(
        { error: 'First name, last name, phone, and PIN are required' },
        { status: 400 }
      )
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    // Check if phone number is already registered
    const existingBorrower = await prisma.borrower.findFirst({
      where: { phone },
    })

    if (existingBorrower) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 409 }
      )
    }

    // Check if ID number is already registered (if provided)
    if (idNumber) {
      const existingIdNumber = await prisma.borrower.findFirst({
        where: { idNumber },
      })

      if (existingIdNumber) {
        return NextResponse.json(
          { error: 'This ID number is already registered' },
          { status: 409 }
        )
      }
    }

    // Hash PIN with bcrypt
    const hashedPin = await bcrypt.hash(pin, 10)

    // Create borrower record
    const borrower = await prisma.borrower.create({
      data: {
        firstName,
        lastName,
        email: email || null,
        phone,
        idNumber: idNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        city: city || null,
        country: country || null,
        employmentStatus: employmentStatus || null,
        monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : null,
        portalPin: hashedPin,
        active: true,
      },
    })

    // Set session cookies (auto-login after registration)
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

    // Log registration activity
    await prisma.activityLog.create({
      data: {
        userId: borrower.id,
        action: 'PORTAL_REGISTRATION',
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
    console.error('Portal registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
