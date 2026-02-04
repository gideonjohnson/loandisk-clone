import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { createSmileIdProvider } from '@/lib/kyc/providers/smileIdService'

/**
 * POST /api/kyc/verify
 * Initiate KYC verification with third-party provider
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const body = await request.json()
      const { borrowerId, idType, idNumber, useProvider = true } = body

      // Get borrower
      const borrower = await prisma.borrower.findUnique({
        where: { id: borrowerId },
      })

      if (!borrower) {
        return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
      }

      // Check for existing pending verification
      const existingVerification = await prisma.kYCVerification.findFirst({
        where: {
          borrowerId,
          status: { in: ['PENDING', 'UNDER_REVIEW'] },
        },
      })

      if (existingVerification) {
        return NextResponse.json(
          { error: 'A verification is already in progress' },
          { status: 400 }
        )
      }

      // Create verification record
      const verification = await prisma.kYCVerification.create({
        data: {
          borrowerId,
          status: 'PENDING',
          documentType: idType,
          documentNumber: idNumber,
          submittedAt: new Date(),
        },
      })

      // If using third-party provider
      if (useProvider) {
        const provider = createSmileIdProvider()

        if (!provider) {
          // Provider not configured, return verification for manual review
          await prisma.kYCVerification.update({
            where: { id: verification.id },
            data: { status: 'UNDER_REVIEW' },
          })

          return NextResponse.json({
            success: true,
            verificationId: verification.id,
            status: 'UNDER_REVIEW',
            message: 'KYC provider not configured. Verification will be reviewed manually.',
          })
        }

        // Initiate verification with provider
        const result = await provider.initiateVerification({
          borrowerId,
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          dateOfBirth: borrower.dateOfBirth?.toISOString().split('T')[0],
          idNumber: idNumber || borrower.idNumber || '',
          idType: idType || 'NATIONAL_ID',
          country: borrower.country || 'KE',
        })

        // Update verification with provider info
        await prisma.kYCVerification.update({
          where: { id: verification.id },
          data: {
            providerId: result.providerId,
            providerName: provider.name,
            providerResult: result.status,
          },
        })

        // Run AML check in parallel
        const amlResult = await provider.runAMLCheck({
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          dateOfBirth: borrower.dateOfBirth?.toISOString().split('T')[0],
          country: borrower.country || 'KE',
        })

        await prisma.kYCVerification.update({
          where: { id: verification.id },
          data: {
            amlCheckStatus: amlResult.status,
            amlCheckDate: new Date(),
            amlFlags: amlResult.flags ? JSON.stringify(amlResult.flags) : null,
          },
        })

        // Log activity
        await prisma.activityLog.create({
          data: {
            userId: session.user.id!,
            action: 'INITIATE_KYC_VERIFICATION',
            entityType: 'KYCVerification',
            entityId: verification.id,
            details: JSON.stringify({
              borrowerId,
              providerId: result.providerId,
              providerName: provider.name,
              amlStatus: amlResult.status,
            }),
          },
        })

        return NextResponse.json({
          success: true,
          verificationId: verification.id,
          providerId: result.providerId,
          status: result.status,
          webUrl: result.webUrl,
          message: result.message,
          amlStatus: amlResult.status,
          amlFlags: amlResult.flags,
        })
      }

      // Manual verification flow
      await prisma.kYCVerification.update({
        where: { id: verification.id },
        data: { status: 'UNDER_REVIEW' },
      })

      return NextResponse.json({
        success: true,
        verificationId: verification.id,
        status: 'UNDER_REVIEW',
        message: 'Verification submitted for manual review',
      })
    } catch (error) {
      console.error('KYC verification error:', error)
      return NextResponse.json(
        {
          error: 'Failed to initiate verification',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.KYC_MANAGE],
  false
)

/**
 * GET /api/kyc/verify
 * Get verification status
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const verificationId = searchParams.get('id')
      const providerId = searchParams.get('providerId')

      if (!verificationId && !providerId) {
        return NextResponse.json(
          { error: 'Verification ID or provider ID required' },
          { status: 400 }
        )
      }

      const verification = await prisma.kYCVerification.findFirst({
        where: verificationId
          ? { id: verificationId }
          : { providerId: providerId! },
        include: {
          borrower: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      })

      if (!verification) {
        return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
      }

      // If pending, check with provider for updates
      if (verification.status === 'PENDING' && verification.providerId) {
        const provider = createSmileIdProvider()

        if (provider) {
          const result = await provider.checkVerificationStatus(verification.providerId)

          if (result.status !== 'PENDING') {
            await prisma.kYCVerification.update({
              where: { id: verification.id },
              data: {
                status: result.status === 'VERIFIED' ? 'VERIFIED' : result.status === 'REJECTED' ? 'REJECTED' : verification.status,
                providerResult: result.result,
                providerScore: result.score,
                providerVerifiedAt: result.verifiedAt,
              },
            })

            if (result.status === 'VERIFIED') {
              await prisma.borrower.update({
                where: { id: verification.borrowerId },
                data: {
                  kycVerified: true,
                  kycVerifiedAt: new Date(),
                },
              })
            }
          }
        }
      }

      return NextResponse.json(verification)
    } catch (error) {
      console.error('Get KYC verification error:', error)
      return NextResponse.json(
        { error: 'Failed to get verification status' },
        { status: 500 }
      )
    }
  },
  [Permission.KYC_VIEW],
  false
)
