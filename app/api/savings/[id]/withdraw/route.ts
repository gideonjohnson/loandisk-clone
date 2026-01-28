import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { withdraw } from '@/lib/savings/savingsService'

/**
 * POST /api/savings/:id/withdraw
 * Withdraw funds from a savings account
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { amount, description } = body

      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Valid withdrawal amount is required' },
          { status: 400 }
        )
      }

      const result = await withdraw({
        accountId: id,
        amount,
        type: 'WITHDRAWAL',
        description,
        performedBy: session.user.id!,
      })

      return NextResponse.json({
        success: true,
        message: 'Withdrawal successful',
        ...result,
      })
    } catch (error) {
      console.error('Withdrawal error:', error)
      return NextResponse.json(
        {
          error: 'Failed to process withdrawal',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
