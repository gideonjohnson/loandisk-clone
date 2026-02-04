import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * GET /api/portal/profile
 * Get borrower profile data
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    return NextResponse.json({
      readOnly: {
        firstName: borrower.firstName,
        lastName: borrower.lastName,
        phone: borrower.phone,
        idNumber: borrower.idNumber || null,
        dateOfBirth: borrower.dateOfBirth?.toISOString() || null,
        kycVerified: borrower.kycVerified,
        creditScore: borrower.creditScore || null,
      },
      editable: {
        email: borrower.email || '',
        address: borrower.address || '',
        city: borrower.city || '',
        country: borrower.country || '',
        employmentStatus: borrower.employmentStatus || '',
        monthlyIncome: borrower.monthlyIncome ? Number(borrower.monthlyIncome) : null,
      },
    })
  } catch (error) {
    console.error('Portal profile GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/portal/profile
 * Update borrower profile fields
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    const body = await request.json()
    const { email, address, city, country, employmentStatus, monthlyIncome, currentPin, newPin } = body

    // Handle PIN change
    if (currentPin && newPin) {
      if (!borrower.portalPin) {
        return NextResponse.json({ error: 'No PIN set on account' }, { status: 400 })
      }

      const pinValid = await bcrypt.compare(currentPin, borrower.portalPin)
      if (!pinValid) {
        return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 400 })
      }

      if (!/^\d{6}$/.test(newPin)) {
        return NextResponse.json({ error: 'New PIN must be exactly 6 digits' }, { status: 400 })
      }

      const hashedPin = await bcrypt.hash(newPin, 10)
      await prisma.borrower.update({
        where: { id: borrowerId },
        data: { portalPin: hashedPin },
      })

      return NextResponse.json({ success: true, message: 'PIN updated successfully' })
    }

    // Update profile fields
    const updateData: Record<string, unknown> = {}
    if (email !== undefined) updateData.email = email || null
    if (address !== undefined) updateData.address = address || null
    if (city !== undefined) updateData.city = city || null
    if (country !== undefined) updateData.country = country || null
    if (employmentStatus !== undefined) updateData.employmentStatus = employmentStatus || null
    if (monthlyIncome !== undefined) updateData.monthlyIncome = monthlyIncome ? Number(monthlyIncome) : null

    await prisma.borrower.update({
      where: { id: borrowerId },
      data: updateData,
    })

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Portal profile PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
