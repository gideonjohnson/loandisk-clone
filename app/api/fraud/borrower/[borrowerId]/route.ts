import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { getFraudChecks } from '@/lib/fraud/fraudDetectionService'

/**
 * GET /api/fraud/borrower/[borrowerId]
 * Get all fraud checks for a specific borrower.
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session, context: { params: Record<string, string> }) => {
    try {
      const { borrowerId } = context.params

      if (!borrowerId) {
        return NextResponse.json(
          { error: 'Borrower ID is required' },
          { status: 400 }
        )
      }

      const fraudChecks = await getFraudChecks({ borrowerId })

      const result = fraudChecks.map((check) => ({
        id: check.id,
        borrowerId: check.borrowerId,
        loanId: check.loanId,
        riskScore: check.riskScore,
        isSuspicious: check.isSuspicious,
        flags: JSON.parse(check.flags),
        details: check.details ? JSON.parse(check.details) : null,
        checkedAt: check.checkedAt,
        borrower: check.borrower
          ? {
              firstName: check.borrower.firstName,
              lastName: check.borrower.lastName,
            }
          : null,
        loan: check.loan
          ? {
              loanNumber: check.loan.loanNumber,
            }
          : null,
      }))

      return NextResponse.json(result)
    } catch (error) {
      console.error('Get borrower fraud checks error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fraud checks for borrower' },
        { status: 500 }
      )
    }
  },
  [Permission.FRAUD_VIEW]
)
