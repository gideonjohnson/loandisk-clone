import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { addDays } from 'date-fns'

/**
 * GET /api/dashboard/upcoming-payments
 * Get payments due in the next 7 days
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const days = parseInt(searchParams.get('days') || '7', 10)
      const limit = parseInt(searchParams.get('limit') || '20', 10)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = addDays(today, days)

      // Get unpaid schedules due within the specified date range
      const schedules = await prisma.loanSchedule.findMany({
        where: {
          isPaid: false,
          dueDate: {
            gte: today,
            lte: endDate,
          },
          loan: {
            status: 'ACTIVE',
          },
        },
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          loan: {
            include: {
              borrower: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      })

      const upcomingPayments = schedules.map((schedule) => ({
        id: schedule.id,
        loanId: schedule.loan.id,
        loanNumber: schedule.loan.loanNumber,
        borrowerId: schedule.loan.borrower.id,
        borrowerName: `${schedule.loan.borrower.firstName} ${schedule.loan.borrower.lastName}`,
        dueDate: schedule.dueDate,
        principalDue: Number(schedule.principalDue),
        interestDue: Number(schedule.interestDue),
        feesDue: Number(schedule.feesDue),
        totalDue: Number(schedule.totalDue),
        amountPaid: Number(schedule.totalPaid),
        amountRemaining: Number(schedule.totalDue) - Number(schedule.totalPaid),
      }))

      return NextResponse.json(upcomingPayments)
    } catch (error) {
      console.error('Upcoming payments error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch upcoming payments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
