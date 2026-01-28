import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { deposit } from '@/lib/savings/savingsService'

/**
 * POST /api/savings/:id/deposit
 * Deposit funds into a savings account
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { amount, description } = body

      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Valid deposit amount is required' },
          { status: 400 }
        )
      }

      const result = await deposit({
        accountId: id,
        amount,
        type: 'DEPOSIT',
        description,
        performedBy: session.user.id!,
      })

      return NextResponse.json({
        success: true,
        message: 'Deposit successful',
        ...result,
      })
    } catch (error) {
      console.error('Deposit error:', error)
      return NextResponse.json(
        {
          error: 'Failed to process deposit',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
