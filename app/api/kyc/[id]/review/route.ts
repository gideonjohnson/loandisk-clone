import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { reviewKYC } from '@/lib/kyc/kycService'
import { runAMLCheck, updateAMLStatus } from '@/lib/kyc/amlService'

/**
 * POST /api/kyc/:id/review
 * Review a KYC verification (approve or reject).
 * Expects { decision: 'VERIFIED' | 'REJECTED', notes?, rejectionReason? }.
 * Runs AML check before approving.
 */
export const POST = createAuthHandler(
  async (request: Request, session: Session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()

      const { decision, notes, rejectionReason } = body

      if (!decision || (decision !== 'VERIFIED' && decision !== 'REJECTED')) {
        return NextResponse.json(
          { error: 'decision must be either VERIFIED or REJECTED' },
          { status: 400 }
        )
      }

      if (decision === 'REJECTED' && !rejectionReason) {
        return NextResponse.json(
          { error: 'rejectionReason is required when rejecting a KYC verification' },
          { status: 400 }
        )
      }

      // Get the verification to find the borrower
      const verification = await prisma.kYCVerification.findUnique({
        where: { id },
      })

      if (!verification) {
        return NextResponse.json(
          { error: 'KYC verification not found' },
          { status: 404 }
        )
      }

      // Run AML check before approving
      let amlResult = null
      if (decision === 'VERIFIED') {
        amlResult = await runAMLCheck(verification.borrowerId)
        await updateAMLStatus(id, amlResult)

        // If AML check flagged the borrower, do not approve automatically
        if (!amlResult.clear) {
          return NextResponse.json({
            success: false,
            error: 'AML check flagged this borrower. Review the flags before proceeding.',
            amlResult,
          }, { status: 422 })
        }
      } else {
        // For rejections, still run AML check for record-keeping
        amlResult = await runAMLCheck(verification.borrowerId)
        await updateAMLStatus(id, amlResult)
      }

      const reviewerId = session.user.id!
      const updated = await reviewKYC(id, reviewerId, decision, notes, rejectionReason)

      return NextResponse.json({
        success: true,
        data: updated,
        amlResult,
      })
    } catch (error) {
      console.error('Review KYC error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('not found') ? 404 : message.includes('Cannot review') ? 400 : 500
      return NextResponse.json(
        { error: 'Failed to review KYC verification', details: message },
        { status }
      )
    }
  },
  [Permission.KYC_REVIEW]
)
