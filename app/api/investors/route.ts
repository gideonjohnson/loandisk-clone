import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/investors - List all investors
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const investors = await prisma.investor.findMany({
      where: {
        AND: [
          status !== 'all' ? { active: status === 'active' } : {},
          search
            ? {
                OR: [
                  { firstName: { contains: search } },
                  { lastName: { contains: search } },
                  { email: { contains: search } },
                  { phone: { contains: search } },
                ],
              }
            : {},
        ],
      },
      include: {
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            principalAmount: true,
            interestEarned: true,
            status: true,
          },
        },
        _count: {
          select: { accounts: true, transactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals for each investor
    const investorsWithTotals = investors.map((investor) => ({
      ...investor,
      totalInvested: investor.accounts.reduce(
        (sum, acc) => sum + Number(acc.principalAmount),
        0
      ),
      totalInterestEarned: investor.accounts.reduce(
        (sum, acc) => sum + Number(acc.interestEarned),
        0
      ),
    }))

    return NextResponse.json(investorsWithTotals)
  } catch (error) {
    console.error('Error fetching investors:', error)
    return NextResponse.json({ error: 'Failed to fetch investors' }, { status: 500 })
  }
}

// POST /api/investors - Create new investor
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country,
      idNumber,
      taxId,
      bankName,
      bankAccount,
      bankBranch,
      notes,
    } = body

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, email, and phone are required' },
        { status: 400 }
      )
    }

    // Check for existing email
    const existing = await prisma.investor.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An investor with this email already exists' },
        { status: 400 }
      )
    }

    const investor = await prisma.investor.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        country,
        idNumber,
        taxId,
        bankName,
        bankAccount,
        bankBranch,
        notes,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_INVESTOR',
        entityType: 'Investor',
        entityId: investor.id,
        details: JSON.stringify({ name: `${firstName} ${lastName}`, email }),
      },
    })

    return NextResponse.json(investor, { status: 201 })
  } catch (error) {
    console.error('Error creating investor:', error)
    return NextResponse.json({ error: 'Failed to create investor' }, { status: 500 })
  }
}
