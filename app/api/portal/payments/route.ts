import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portal/payments
 * Get payment history and upcoming schedules for the authenticated borrower
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all loans for this borrower
    const loans = await prisma.loan.findMany({
      where: { borrowerId },
      select: { id: true, loanNumber: true, status: true },
    })

    if (loans.length === 0) {
      return NextResponse.json({ payments: [], upcoming: [], loans: [] })
    }

    const loanIds = loans.map(l => l.id)
    const loanMap = Object.fromEntries(loans.map(l => [l.id, l.loanNumber]))

    // Get payment history
    const payments = await prisma.payment.findMany({
      where: {
        loanId: { in: loanIds },
      },
      orderBy: { paymentDate: 'desc' },
    })

    const formattedPayments = payments.map(p => ({
      id: p.id,
      loanId: p.loanId,
      loanNumber: loanMap[p.loanId] || null,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      paymentMethod: p.paymentMethod,
      receiptNumber: p.receiptNumber,
      status: p.status,
      isReversed: p.isReversed,
      currency: p.currency,
    }))

    // Get upcoming unpaid schedules
    const upcoming = await prisma.loanSchedule.findMany({
      where: {
        loanId: { in: loanIds },
        isPaid: false,
      },
      orderBy: { dueDate: 'asc' },
      include: {
        loan: {
          select: { loanNumber: true },
        },
      },
    })

    const formattedUpcoming = upcoming.map(s => {
      const now = new Date()
      const dueDate = new Date(s.dueDate)
      const lateDays = dueDate < now ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        id: s.id,
        loanId: s.loanId,
        loanNumber: s.loan.loanNumber,
        dueDate: s.dueDate.toISOString(),
        totalDue: Number(s.totalDue),
        totalPaid: Number(s.totalPaid),
        amountRemaining: Number(s.totalDue) - Number(s.totalPaid),
        principalDue: Number(s.principalDue),
        interestDue: Number(s.interestDue),
        lateDays,
      }
    })

    return NextResponse.json({
      payments: formattedPayments,
      upcoming: formattedUpcoming,
      loans: loans.map(l => ({ id: l.id, loanNumber: l.loanNumber })),
    })
  } catch (error) {
    console.error('Portal payments API error:', error)
    return NextResponse.json(
      { error: 'Failed to load payments' },
      { status: 500 }
    )
  }
}
