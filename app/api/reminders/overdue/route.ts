import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendOverdueNotices, getOverduePayments } from '@/lib/reminders/paymentReminderService'

/**
 * GET /api/reminders/overdue
 * Get list of overdue payments
 */
export const GET = createAuthHandler(
  async (_request: Request) => {
    try {
      const payments = await getOverduePayments()

      return NextResponse.json({
        success: true,
        count: payments.length,
        payments: payments.map(p => {
          const today = new Date()
          const dueDate = new Date(p.dueDate)
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

          return {
            paymentId: p.id,
            loanId: p.loan.id,
            loanNumber: p.loan.loanNumber,
            borrowerName: `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}`,
            borrowerPhone: p.loan.borrower.phone,
            borrowerEmail: p.loan.borrower.email,
            amount: p.amount,
            dueDate: p.dueDate,
            daysOverdue,
          }
        }),
      })
    } catch (error) {
      console.error('Get overdue payments error:', error)
      return NextResponse.json(
        {
          error: 'Failed to get overdue payments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.PAYMENT_VIEW]
)

/**
 * POST /api/reminders/overdue
 * Send notices for overdue payments
 */
export const POST = createAuthHandler(
  async (_request: Request) => {
    try {
      const result = await sendOverdueNotices()

      return NextResponse.json({
        success: true,
        result,
      })
    } catch (error) {
      console.error('Send overdue notices error:', error)
      return NextResponse.json(
        {
          error: 'Failed to send overdue notices',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.NOTIFICATION_SEND]
)
