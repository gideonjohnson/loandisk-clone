import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { applyFeeToLoan } from '@/lib/utils/feeCalculator'

/**
 * GET /api/loans/:id/fees
 * Get all fees for a loan
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const loanFees = await prisma.loanFee.findMany({
        where: { loanId: id },
        include: {
          fee: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ fees: loanFees, count: loanFees.length })
    } catch (error) {
      console.error('Fetch loan fees error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loan fees' },
        { status: 500 }
      )
    }
  },
  [Permission.FEE_VIEW],
  false
)

/**
 * POST /api/loans/:id/fees
 * Apply a fee to a loan
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { feeId, amount, dueDate } = body

      if (!feeId) {
        return NextResponse.json(
          { error: 'Fee ID is required' },
          { status: 400 }
        )
      }

      // Get the loan and fee
      const [loan, fee] = await Promise.all([
        prisma.loan.findUnique({ where: { id } }),
        prisma.fee.findUnique({ where: { id: feeId } }),
      ])

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
      }

      if (!fee) {
        return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
      }

      if (!fee.active) {
        return NextResponse.json(
          { error: 'Fee is not active' },
          { status: 400 }
        )
      }

      // Calculate fee amount if not provided
      const feeForCalc = {
        ...fee,
        amount: fee.amount ? Number(fee.amount) : null,
        percentage: fee.percentage ? Number(fee.percentage) : null,
      }
      const feeAmount =
        amount || applyFeeToLoan(Number(loan.principalAmount), feeForCalc)

      // Create loan fee
      const loanFee = await prisma.loanFee.create({
        data: {
          loanId: id,
          feeId: feeId,
          amount: feeAmount,
          isPaid: false,
          paidAmount: 0,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          fee: true,
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'APPLY_FEE',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            feeName: fee.name,
            amount: feeAmount,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Fee applied to loan successfully',
        loanFee,
      })
    } catch (error) {
      console.error('Apply loan fee error:', error)
      return NextResponse.json(
        { error: 'Failed to apply fee to loan' },
        { status: 500 }
      )
    }
  },
  [Permission.FEE_MANAGE],
  false
)
