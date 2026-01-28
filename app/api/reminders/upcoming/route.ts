import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendPaymentReminders, getUpcomingPayments } from '@/lib/reminders/paymentReminderService'

/**
 * GET /api/reminders/upcoming
 * Get list of upcoming payments that will receive reminders
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const daysAhead = parseInt(searchParams.get('days') || '3', 10)

      const payments = await getUpcomingPayments(daysAhead)

      return NextResponse.json({
        success: true,
        daysAhead,
        count: payments.length,
        payments: payments.map(p => ({
          paymentId: p.id,
          loanId: p.loan.id,
          loanNumber: p.loan.loanNumber,
          borrowerName: `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}`,
          borrowerPhone: p.loan.borrower.phone,
          borrowerEmail: p.loan.borrower.email,
          amount: p.amount,
          dueDate: p.dueDate,
        })),
      })
    } catch (error) {
      console.error('Get upcoming payments error:', error)
      return NextResponse.json(
        {
          error: 'Failed to get upcoming payments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.PAYMENT_VIEW]
)

/**
 * POST /api/reminders/upcoming
 * Send reminders for upcoming payments
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json().catch(() => ({}))
      const daysAhead = body.daysAhead || 3

      const result = await sendPaymentReminders(daysAhead)

      return NextResponse.json({
        success: true,
        result,
      })
    } catch (error) {
      console.error('Send upcoming reminders error:', error)
      return NextResponse.json(
        {
          error: 'Failed to send reminders',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.NOTIFICATION_SEND]
)
