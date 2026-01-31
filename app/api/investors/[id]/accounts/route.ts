import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Generate unique account number
function generateAccountNumber(): string {
  const prefix = 'INV'
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${prefix}-${year}-${random}`
}

// POST /api/investors/[id]/accounts - Create investment account
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { principalAmount, interestRate, maturityDate, accountType } = body

    // Validate investor exists
    const investor = await prisma.investor.findUnique({ where: { id } })
    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    // Generate unique account number
    let accountNumber = generateAccountNumber()
    let exists = await prisma.investorAccount.findUnique({ where: { accountNumber } })
    while (exists) {
      accountNumber = generateAccountNumber()
      exists = await prisma.investorAccount.findUnique({ where: { accountNumber } })
    }

    const account = await prisma.investorAccount.create({
      data: {
        accountNumber,
        investorId: id,
        accountType: accountType || 'INVESTMENT',
        principalAmount: principalAmount || 0,
        interestRate: interestRate || 0,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
      },
    })

    // Create initial deposit transaction if principal > 0
    if (principalAmount && principalAmount > 0) {
      await prisma.investorTransaction.create({
        data: {
          investorId: id,
          accountId: account.id,
          type: 'DEPOSIT',
          amount: principalAmount,
          balanceBefore: 0,
          balanceAfter: principalAmount,
          description: 'Initial investment deposit',
          referenceNumber: `DEP-${Date.now()}`,
          processedBy: session.user.id,
        },
      })
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_INVESTOR_ACCOUNT',
        entityType: 'InvestorAccount',
        entityId: account.id,
        details: JSON.stringify({
          investorId: id,
          accountNumber,
          principalAmount,
          interestRate,
        }),
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Error creating investor account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

// GET /api/investors/[id]/accounts - List accounts for investor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const accounts = await prisma.investorAccount.findMany({
      where: { investorId: id },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
