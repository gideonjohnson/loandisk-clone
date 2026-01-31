import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/investors/[id]/transactions - Create transaction (deposit/withdrawal)
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
    const { accountId, type, amount, description } = body

    if (!accountId || !type || !amount) {
      return NextResponse.json(
        { error: 'Account ID, type, and amount are required' },
        { status: 400 }
      )
    }

    // Get account
    const account = await prisma.investorAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || account.investorId !== id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const currentBalance = Number(account.principalAmount)
    let newBalance: number

    if (type === 'WITHDRAWAL') {
      if (amount > currentBalance) {
        return NextResponse.json(
          { error: 'Insufficient balance' },
          { status: 400 }
        )
      }
      newBalance = currentBalance - amount
    } else if (type === 'DEPOSIT') {
      newBalance = currentBalance + amount
    } else if (type === 'INTEREST_CREDIT') {
      newBalance = currentBalance + amount
      // Also update interest earned
      await prisma.investorAccount.update({
        where: { id: accountId },
        data: {
          interestEarned: { increment: amount },
        },
      })
    } else {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    // Create transaction
    const transaction = await prisma.investorTransaction.create({
      data: {
        investorId: id,
        accountId,
        type,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        description,
        referenceNumber: `${type.substring(0, 3)}-${Date.now()}`,
        processedBy: session.user.id,
      },
    })

    // Update account balance
    await prisma.investorAccount.update({
      where: { id: accountId },
      data: { principalAmount: newBalance },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: `INVESTOR_${type}`,
        entityType: 'InvestorTransaction',
        entityId: transaction.id,
        details: JSON.stringify({
          investorId: id,
          accountId,
          amount,
          type,
        }),
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

// GET /api/investors/[id]/transactions - List transactions
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
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const transactions = await prisma.investorTransaction.findMany({
      where: {
        investorId: id,
        ...(accountId ? { accountId } : {}),
      },
      include: {
        account: {
          select: { accountNumber: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
