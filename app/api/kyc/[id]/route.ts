import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { submitKYCDocuments } from '@/lib/kyc/kycService'

/**
 * GET /api/kyc/:id
 * Get KYC verification detail by id.
 * Includes borrower and reviewer relations.
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session, context) => {
    try {
      const { id } = context.params

      const verification = await prisma.kYCVerification.findUnique({
        where: { id },
        include: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              idNumber: true,
              kycVerified: true,
              kycVerifiedAt: true,
              blacklisted: true,
              blacklistReason: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      if (!verification) {
        return NextResponse.json(
          { error: 'KYC verification not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: verification,
      })
    } catch (error) {
      console.error('Get KYC verification error:', error)
      return NextResponse.json(
        { error: 'Failed to get KYC verification', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  [Permission.KYC_VIEW]
)

/**
 * PUT /api/kyc/:id
 * Submit KYC documents for a verification.
 * Expects { documentType, documentNumber, idFrontUrl, idBackUrl?, selfieUrl?, proofOfAddress? }.
 */
export const PUT = createAuthHandler(
  async (request: Request, session: Session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()

      const { documentType, documentNumber, idFrontUrl, idBackUrl, selfieUrl, proofOfAddress } = body

      if (!documentType || !documentNumber || !idFrontUrl) {
        return NextResponse.json(
          { error: 'documentType, documentNumber, and idFrontUrl are required' },
          { status: 400 }
        )
      }

      const updated = await submitKYCDocuments(id, {
        documentType,
        documentNumber,
        idFrontUrl,
        idBackUrl,
        selfieUrl,
        proofOfAddress,
      })

      return NextResponse.json({
        success: true,
        data: updated,
      })
    } catch (error) {
      console.error('Submit KYC documents error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('not found') ? 404 : message.includes('Cannot submit') ? 400 : 500
      return NextResponse.json(
        { error: 'Failed to submit KYC documents', details: message },
        { status }
      )
    }
  },
  [Permission.KYC_MANAGE]
)
