import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { requestLoanAgreementSignature } from '@/lib/esignature/esignatureService'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/signature/request
 * Request a signature for a loan document
 */
export const POST = createAuthHandler(
  async (request: Request, _session) => {
    try {
      const body = await request.json()
      const { loanId, documentUrl } = body

      if (!loanId) {
        return NextResponse.json(
          { error: 'Loan ID is required' },
          { status: 400 }
        )
      }

      // Get loan with borrower info
      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          borrower: true,
        },
      })

      if (!loan) {
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        )
      }

      // Request signature
      const result = await requestLoanAgreementSignature(
        loanId,
        loan.borrowerId,
        loan.borrower.email || '',
        `${loan.borrower.firstName} ${loan.borrower.lastName}`,
        documentUrl || `/api/loans/${loanId}/agreement`
      )

      return NextResponse.json({
        success: true,
        signature: result,
      })
    } catch (error) {
      console.error('Signature request error:', error)
      return NextResponse.json(
        {
          error: 'Failed to request signature',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_UPLOAD]
)
