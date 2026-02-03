import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { getPendingKYCReviews, initiateKYC } from '@/lib/kyc/kycService'

/**
 * GET /api/kyc
 * List KYC verifications with optional ?status= filter.
 * Defaults to PENDING if no status is provided.
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') || undefined

      const verifications = await getPendingKYCReviews(status)

      return NextResponse.json({
        success: true,
        data: verifications,
        count: verifications.length,
      })
    } catch (error) {
      console.error('List KYC verifications error:', error)
      return NextResponse.json(
        { error: 'Failed to list KYC verifications', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  [Permission.KYC_VIEW]
)

/**
 * POST /api/kyc
 * Initiate KYC for a borrower. Expects { borrowerId }.
 */
export const POST = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { borrowerId } = body

      if (!borrowerId) {
        return NextResponse.json(
          { error: 'borrowerId is required' },
          { status: 400 }
        )
      }

      const verification = await initiateKYC(borrowerId)

      return NextResponse.json({
        success: true,
        data: verification,
      })
    } catch (error) {
      console.error('Initiate KYC error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('not found') ? 404 : message.includes('already exists') ? 409 : 500
      return NextResponse.json(
        { error: 'Failed to initiate KYC', details: message },
        { status }
      )
    }
  },
  [Permission.KYC_MANAGE]
)
