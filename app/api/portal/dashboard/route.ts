import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portal/dashboard
 * Get borrower dashboard data
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get borrower info
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    // Get all loans for this borrower
    const loans = await prisma.loan.findMany({
      where: { borrowerId },
      include: {
        schedules: {
          where: {
            isPaid: false,
          },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals
    let totalBalance = 0
    let nextPayment = null

    const loanSummaries = loans.map(loan => {
      const balance = Number(loan.principalAmount) // In real app, calculate remaining balance
      totalBalance += balance

      const nextSchedule = loan.schedules[0]
      if (nextSchedule && (!nextPayment || new Date(nextSchedule.dueDate) < new Date(nextPayment.dueDate))) {
        nextPayment = {
          amount: Number(nextSchedule.totalDue) - Number(nextSchedule.totalPaid),
          dueDate: nextSchedule.dueDate.toISOString(),
          loanNumber: loan.loanNumber,
        }
      }

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        principalAmount: Number(loan.principalAmount),
        balance,
        status: loan.status,
        nextPaymentDate: nextSchedule?.dueDate.toISOString() || null,
        nextPaymentAmount: nextSchedule
          ? Number(nextSchedule.totalDue) - Number(nextSchedule.totalPaid)
          : null,
      }
    })

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: {
        userId: borrowerId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      borrower: {
        firstName: borrower.firstName,
        lastName: borrower.lastName,
      },
      loans: loanSummaries,
      totalBalance,
      nextPayment,
      notifications: notifications.map(n => ({
        id: n.id,
        message: n.message,
        type: n.type,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Portal dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard' },
      { status: 500 }
    )
  }
}
