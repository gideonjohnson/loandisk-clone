import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { calculateLatePenalty } from '@/lib/utils/feeCalculator'

/**
 * GET /api/loans/:id/penalties
 * Get all penalties for a loan
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const penalties = await prisma.penalty.findMany({
        where: { loanId: id },
        include: {
          schedule: true,
        },
        orderBy: { appliedDate: 'desc' },
      })

      const totalPenalties = penalties.reduce(
        (sum, penalty) => sum + Number(penalty.amount),
        0
      )
      const totalPaid = penalties.reduce(
        (sum, penalty) => sum + Number(penalty.paidAmount),
        0
      )
      const totalOutstanding = totalPenalties - totalPaid

      return NextResponse.json({
        penalties,
        count: penalties.length,
        summary: {
          totalPenalties,
          totalPaid,
          totalOutstanding,
        },
      })
    } catch (error) {
      console.error('Fetch penalties error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch penalties' },
        { status: 500 }
      )
    }
  },
  [Permission.PENALTY_VIEW],
  false
)

/**
 * POST /api/loans/:id/penalties
 * Apply a penalty to a loan
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { type, amount, scheduleId, reason, calculateAuto } = body

      if (!type) {
        return NextResponse.json(
          { error: 'Penalty type is required' },
          { status: 400 }
        )
      }

      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          schedules: {
            where: scheduleId ? { id: scheduleId } : {},
          },
        },
      })

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
      }

      let penaltyAmount = amount

      // Auto-calculate penalty if requested and schedule ID provided
      if (calculateAuto && scheduleId) {
        const schedule = loan.schedules.find((s) => s.id === scheduleId)
        if (schedule && !schedule.isPaid) {
          // Calculate late penalty (5% default, 3 days grace period)
          penaltyAmount = calculateLatePenalty(
            Number(schedule.totalDue - schedule.totalPaid),
            schedule.dueDate,
            new Date(),
            {
              type: 'PERCENTAGE',
              percentage: 5,
              gracePeriodDays: 3,
            }
          )

          // Update schedule with late days
          const daysLate = Math.max(
            0,
            Math.floor(
              (new Date().getTime() - schedule.dueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
          await prisma.loanSchedule.update({
            where: { id: scheduleId },
            data: { lateDays: daysLate },
          })
        }
      }

      if (!penaltyAmount || penaltyAmount <= 0) {
        return NextResponse.json(
          { error: 'Penalty amount must be greater than 0' },
          { status: 400 }
        )
      }

      // Create penalty
      const penalty = await prisma.penalty.create({
        data: {
          loanId: id,
          scheduleId: scheduleId || null,
          type,
          amount: penaltyAmount,
          isPaid: false,
          paidAmount: 0,
          reason: reason || null,
          appliedDate: new Date(),
        },
        include: {
          schedule: true,
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'APPLY_PENALTY',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            type,
            amount: penaltyAmount,
            reason,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Penalty applied successfully',
        penalty,
      })
    } catch (error) {
      console.error('Apply penalty error:', error)
      return NextResponse.json(
        { error: 'Failed to apply penalty' },
        { status: 500 }
      )
    }
  },
  [Permission.PENALTY_APPLY],
  false
)
