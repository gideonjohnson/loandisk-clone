import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/investors/[id] - Get single investor
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

    const investor = await prisma.investor.findUnique({
      where: { id },
      include: {
        accounts: {
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50,
          include: {
            account: {
              select: { accountNumber: true },
            },
          },
        },
      },
    })

    if (!investor) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    // Calculate summary
    const summary = {
      totalInvested: investor.accounts.reduce(
        (sum, acc) => sum + Number(acc.principalAmount),
        0
      ),
      totalInterestEarned: investor.accounts.reduce(
        (sum, acc) => sum + Number(acc.interestEarned),
        0
      ),
      activeAccounts: investor.accounts.filter((acc) => acc.status === 'ACTIVE').length,
      totalAccounts: investor.accounts.length,
    }

    return NextResponse.json({ ...investor, summary })
  } catch (error) {
    console.error('Error fetching investor:', error)
    return NextResponse.json({ error: 'Failed to fetch investor' }, { status: 500 })
  }
}

// PUT /api/investors/[id] - Update investor
export async function PUT(
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

    const investor = await prisma.investor.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        idNumber: body.idNumber,
        taxId: body.taxId,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        bankBranch: body.bankBranch,
        notes: body.notes,
        active: body.active,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_INVESTOR',
        entityType: 'Investor',
        entityId: id,
        details: JSON.stringify(body),
      },
    })

    return NextResponse.json(investor)
  } catch (error) {
    console.error('Error updating investor:', error)
    return NextResponse.json({ error: 'Failed to update investor' }, { status: 500 })
  }
}

// DELETE /api/investors/[id] - Soft delete investor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check for active accounts
    const activeAccounts = await prisma.investorAccount.count({
      where: { investorId: id, status: 'ACTIVE' },
    })

    if (activeAccounts > 0) {
      return NextResponse.json(
        { error: 'Cannot delete investor with active accounts' },
        { status: 400 }
      )
    }

    await prisma.investor.update({
      where: { id },
      data: { active: false },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_INVESTOR',
        entityType: 'Investor',
        entityId: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investor:', error)
    return NextResponse.json({ error: 'Failed to delete investor' }, { status: 500 })
  }
}
