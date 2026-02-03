import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getKYCStatus, submitKYCDocuments, initiateKYC } from '@/lib/kyc/kycService'

/**
 * Helper to authenticate borrower from portal cookie.
 * Returns the borrowerId or null if not authenticated.
 */
async function getPortalBorrowerId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('portal_borrower_id')?.value || null
}

/**
 * GET /api/portal/kyc
 * Returns KYC status for the authenticated borrower.
 */
export async function GET() {
  try {
    const borrowerId = await getPortalBorrowerId()

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the borrower exists
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        kycVerified: true,
        kycVerifiedAt: true,
      },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    const verification = await getKYCStatus(borrowerId)

    return NextResponse.json({
      success: true,
      data: {
        borrower: {
          id: borrower.id,
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          kycVerified: borrower.kycVerified,
          kycVerifiedAt: borrower.kycVerifiedAt,
        },
        verification: verification
          ? {
              id: verification.id,
              status: verification.status,
              submittedAt: verification.submittedAt,
              reviewedAt: verification.reviewedAt,
              rejectionReason: verification.rejectionReason,
              documentType: verification.documentType,
              amlCheckStatus: verification.amlCheckStatus,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Portal KYC status error:', error)
    return NextResponse.json(
      { error: 'Failed to get KYC status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portal/kyc
 * Submit KYC documents from the borrower portal.
 * Expects { documentType, documentNumber, idFrontUrl, idBackUrl?, selfieUrl?, proofOfAddress? }.
 * If no verification exists, it will be initiated first.
 */
export async function POST(request: Request) {
  try {
    const borrowerId = await getPortalBorrowerId()

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the borrower exists
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    const body = await request.json()
    const { documentType, documentNumber, idFrontUrl, idBackUrl, selfieUrl, proofOfAddress } = body

    if (!documentType || !documentNumber || !idFrontUrl) {
      return NextResponse.json(
        { error: 'documentType, documentNumber, and idFrontUrl are required' },
        { status: 400 }
      )
    }

    // Get the latest verification or create one
    let verification = await prisma.kYCVerification.findFirst({
      where: {
        borrowerId,
        status: { in: ['NOT_STARTED', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verification) {
      // Check if there is already a pending or verified one
      const activeVerification = await prisma.kYCVerification.findFirst({
        where: {
          borrowerId,
          status: { in: ['PENDING', 'UNDER_REVIEW', 'VERIFIED'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (activeVerification) {
        return NextResponse.json(
          { error: `KYC verification is already ${activeVerification.status.toLowerCase()}` },
          { status: 409 }
        )
      }

      // Initiate a new verification
      verification = await initiateKYC(borrowerId)
    }

    // Submit documents
    const updated = await submitKYCDocuments(verification.id, {
      documentType,
      documentNumber,
      idFrontUrl,
      idBackUrl,
      selfieUrl,
      proofOfAddress,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        submittedAt: updated.submittedAt,
        documentType: updated.documentType,
      },
    })
  } catch (error) {
    console.error('Portal KYC submit error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to submit KYC documents', details: message },
      { status: 500 }
    )
  }
}
