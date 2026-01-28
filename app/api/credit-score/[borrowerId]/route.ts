import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { calculateCreditScore, updateBorrowerCreditScore } from '@/lib/credit/creditScoringService'

/**
 * GET /api/credit-score/:borrowerId
 * Get credit score for a borrower
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { borrowerId } = context.params

      const report = await calculateCreditScore(borrowerId)

      return NextResponse.json(report)
    } catch (error) {
      console.error('Get credit score error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to calculate credit score' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_VIEW]
)

/**
 * POST /api/credit-score/:borrowerId
 * Recalculate and update credit score
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { borrowerId } = context.params

      const report = await updateBorrowerCreditScore(borrowerId)

      return NextResponse.json({
        success: true,
        message: 'Credit score updated',
        report,
      })
    } catch (error) {
      console.error('Update credit score error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to update credit score' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_UPDATE]
)
