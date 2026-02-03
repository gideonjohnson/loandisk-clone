import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { getFraudChecks, runFraudCheck } from '@/lib/fraud/fraudDetectionService'

/**
 * GET /api/fraud
 * List fraud checks with optional filters.
 * Query params: ?suspicious=true, ?borrowerId=xxx
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const { searchParams } = new URL(request.url)
      const suspicious = searchParams.get('suspicious')
      const borrowerId = searchParams.get('borrowerId')
      const loanId = searchParams.get('loanId')

      const filters: {
        borrowerId?: string
        loanId?: string
        isSuspicious?: boolean
      } = {}

      if (borrowerId) {
        filters.borrowerId = borrowerId
      }

      if (loanId) {
        filters.loanId = loanId
      }

      if (suspicious === 'true') {
        filters.isSuspicious = true
      } else if (suspicious === 'false') {
        filters.isSuspicious = false
      }

      const fraudChecks = await getFraudChecks(filters)

      // Shape the response to include only needed borrower/loan fields
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
      console.error('Get fraud checks error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fraud checks' },
        { status: 500 }
      )
    }
  },
  [Permission.FRAUD_VIEW]
)

/**
 * POST /api/fraud
 * Run a manual fraud check.
 * Body: { borrowerId: string, loanId?: string, requestedAmount?: number }
 */
export const POST = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()

      const { borrowerId, loanId, requestedAmount } = body

      if (!borrowerId) {
        return NextResponse.json(
          { error: 'borrowerId is required' },
          { status: 400 }
        )
      }

      const fraudCheck = await runFraudCheck({
        borrowerId,
        loanId: loanId || undefined,
        requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
      })

      return NextResponse.json({
        id: fraudCheck.id,
        borrowerId: fraudCheck.borrowerId,
        loanId: fraudCheck.loanId,
        riskScore: fraudCheck.riskScore,
        isSuspicious: fraudCheck.isSuspicious,
        flags: JSON.parse(fraudCheck.flags),
        details: fraudCheck.details ? JSON.parse(fraudCheck.details) : null,
        checkedAt: fraudCheck.checkedAt,
        borrower: fraudCheck.borrower
          ? {
              firstName: fraudCheck.borrower.firstName,
              lastName: fraudCheck.borrower.lastName,
            }
          : null,
        loan: fraudCheck.loan
          ? {
              loanNumber: fraudCheck.loan.loanNumber,
            }
          : null,
      })
    } catch (error) {
      console.error('Run fraud check error:', error)
      return NextResponse.json(
        { error: 'Failed to run fraud check' },
        { status: 500 }
      )
    }
  },
  [Permission.FRAUD_REVIEW]
)
