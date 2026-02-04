import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSmileIdProvider } from '@/lib/kyc/providers/smileIdService'

/**
 * POST /api/kyc/webhook
 * Handle KYC provider webhook callbacks
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Verify webhook signature (provider-specific)
    const signature = request.headers.get('x-smile-signature')

    // Get provider
    const provider = createSmileIdProvider()
    if (!provider) {
      console.error('KYC provider not configured')
      return NextResponse.json({ error: 'Provider not configured' }, { status: 500 })
    }

    // Process webhook
    const result = await provider.handleWebhook(payload)

    if (!result) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    // Find and update KYC verification by provider ID
    const verification = await prisma.kYCVerification.findFirst({
      where: { providerId: result.providerId },
    })

    if (!verification) {
      console.warn(`KYC verification not found for provider ID: ${result.providerId}`)
      // Still return success to acknowledge the webhook
      return NextResponse.json({ received: true })
    }

    // Update verification status
    await prisma.kYCVerification.update({
      where: { id: verification.id },
      data: {
        status: result.status === 'VERIFIED' ? 'VERIFIED' : result.status === 'REJECTED' ? 'REJECTED' : verification.status,
        providerResult: result.result,
        providerScore: result.score,
        providerVerifiedAt: result.verifiedAt,
        reviewedAt: result.status !== 'PENDING' ? new Date() : null,
        reviewNotes: result.message,
      },
    })

    // If verified, update borrower KYC status
    if (result.status === 'VERIFIED') {
      await prisma.borrower.update({
        where: { id: verification.borrowerId },
        data: {
          kycVerified: true,
          kycVerifiedAt: new Date(),
        },
      })
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: verification.borrowerId, // Using borrowerId as there's no user context
        action: 'KYC_WEBHOOK_RECEIVED',
        entityType: 'KYCVerification',
        entityId: verification.id,
        details: JSON.stringify({
          providerId: result.providerId,
          providerName: result.providerName,
          status: result.status,
          score: result.score,
        }),
      },
    })

    return NextResponse.json({ received: true, status: result.status })
  } catch (error) {
    console.error('KYC webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
