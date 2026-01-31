import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  // Check for secret key to prevent unauthorized seeding
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'meek-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.user.upsert({
      where: { email: 'admin@meek.com' },
      update: {},
      create: {
        email: 'admin@meek.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
      },
    })

    // Create a loan officer
    const loanOfficerPassword = await bcrypt.hash('officer123', 10)

    const loanOfficer = await prisma.user.upsert({
      where: { email: 'officer@meek.com' },
      update: {},
      create: {
        email: 'officer@meek.com',
        name: 'Loan Officer',
        password: loanOfficerPassword,
        role: 'LOAN_OFFICER',
        active: true,
      },
    })

    return NextResponse.json({
      success: true,
      users: [
        { email: admin.email, role: admin.role },
        { email: loanOfficer.email, role: loanOfficer.role },
      ],
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
