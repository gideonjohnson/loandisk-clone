import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portal/loans
 * List all loans for the authenticated borrower
 */
export async function GET() {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all loans for this borrower
    const loans = await prisma.loan.findMany({
      where: { borrowerId },
      include: {
        schedules: {
          orderBy: { dueDate: 'asc' },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            approver: {
              select: {
                name: true,
              },
            },
          },
        },
        disbursement: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format loans for response
    const formattedLoans = loans.map((loan) => {
      // Calculate paid and remaining amounts
      const totalPaid = loan.schedules.reduce(
        (sum, s) => sum + Number(s.totalPaid),
        0
      )
      const totalDue = loan.schedules.reduce(
        (sum, s) => sum + Number(s.totalDue),
        0
      )
      const remainingBalance = totalDue - totalPaid

      // Get next payment due
      const nextSchedule = loan.schedules.find((s) => !s.isPaid)

      // Get latest approval info
      const latestApproval = loan.approvals[0]

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        principalAmount: Number(loan.principalAmount),
        interestRate: Number(loan.interestRate),
        termMonths: loan.termMonths,
        status: loan.status,
        purpose: loan.purpose,
        loanProduct: loan.loanProduct,
        startDate: loan.startDate.toISOString(),
        endDate: loan.endDate.toISOString(),
        createdAt: loan.createdAt.toISOString(),
        approvalDate: loan.approvalDate?.toISOString() || null,
        disbursementDate: loan.disbursementDate?.toISOString() || null,
        rejectionReason: loan.rejectionReason,
        totalPaid,
        totalDue,
        remainingBalance,
        nextPayment: nextSchedule
          ? {
              dueDate: nextSchedule.dueDate.toISOString(),
              amount: Number(nextSchedule.totalDue) - Number(nextSchedule.totalPaid),
              lateDays: nextSchedule.lateDays,
            }
          : null,
        approval: latestApproval
          ? {
              status: latestApproval.status,
              comments: latestApproval.comments,
              approvedBy: latestApproval.approver.name,
              approvedAt: latestApproval.approvedAt?.toISOString() || null,
            }
          : null,
        disbursement: loan.disbursement
          ? {
              amount: Number(loan.disbursement.amount),
              method: loan.disbursement.disbursementMethod,
              referenceNumber: loan.disbursement.referenceNumber,
              disbursedAt: loan.disbursement.disbursedAt.toISOString(),
            }
          : null,
        schedulesCount: loan.schedules.length,
        paidSchedulesCount: loan.schedules.filter((s) => s.isPaid).length,
      }
    })

    return NextResponse.json({
      loans: formattedLoans,
    })
  } catch (error) {
    console.error('Portal loans API error:', error)
    return NextResponse.json(
      { error: 'Failed to load loans' },
      { status: 500 }
    )
  }
}
