import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { getFraudCheckById, reviewFraudCheck } from '@/lib/fraud/fraudDetectionService'

/**
 * GET /api/fraud/[id]
 * Get a single fraud check detail by ID.
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session, context: { params: Record<string, string> }) => {
    try {
      const { id } = context.params

      if (!id) {
        return NextResponse.json(
          { error: 'Fraud check ID is required' },
          { status: 400 }
        )
      }

      const fraudCheck = await getFraudCheckById(id)

      if (!fraudCheck) {
        return NextResponse.json(
          { error: 'Fraud check not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        id: fraudCheck.id,
        borrowerId: fraudCheck.borrowerId,
        loanId: fraudCheck.loanId,
        riskScore: fraudCheck.riskScore,
        isSuspicious: fraudCheck.isSuspicious,
        flags: JSON.parse(fraudCheck.flags),
        details: fraudCheck.details ? JSON.parse(fraudCheck.details) : null,
        checkedAt: fraudCheck.checkedAt,
        borrower: fraudCheck.borrower,
        loan: fraudCheck.loan,
      })
    } catch (error) {
      console.error('Get fraud check detail error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fraud check' },
        { status: 500 }
      )
    }
  },
  [Permission.FRAUD_VIEW]
)

/**
 * PUT /api/fraud/[id]
 * Review a fraud check.
 * Body: { decision: 'CLEAR' | 'CONFIRM' }
 */
export const PUT = createAuthHandler(
  async (request: Request, session: Session, context: { params: Record<string, string> }) => {
    try {
      const { id } = context.params

      if (!id) {
        return NextResponse.json(
          { error: 'Fraud check ID is required' },
          { status: 400 }
        )
      }

      const body = await request.json()
      const { decision } = body

      if (!decision || (decision !== 'CLEAR' && decision !== 'CONFIRM')) {
        return NextResponse.json(
          { error: 'decision must be either "CLEAR" or "CONFIRM"' },
          { status: 400 }
        )
      }

      const reviewerId = session.user.id

      const result = await reviewFraudCheck(id, reviewerId, decision)

      return NextResponse.json(result)
    } catch (error) {
      console.error('Review fraud check error:', error)
      const message = error instanceof Error ? error.message : 'Failed to review fraud check'
      return NextResponse.json(
        { error: message },
        { status: 500 }
      )
    }
  },
  [Permission.FRAUD_REVIEW]
)
