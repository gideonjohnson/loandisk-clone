import { NextResponse } from 'next/server'
import { recordSignature, verifySignature } from '@/lib/esignature/esignatureService'

/**
 * POST /api/signature/capture
 * Capture and record a signature
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, signatureData } = body

    if (!token || !signatureData) {
      return NextResponse.json(
        { error: 'Missing required fields: token, signatureData' },
        { status: 400 }
      )
    }

    // Validate signature data format
    if (!verifySignature(signatureData)) {
      return NextResponse.json(
        { error: 'Invalid signature data format. Expected base64 image.' },
        { status: 400 }
      )
    }

    // Get client info for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const result = await recordSignature(token, signatureData, ipAddress, userAgent)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Signature recorded successfully',
    })
  } catch (error) {
    console.error('Signature capture error:', error)
    return NextResponse.json(
      {
        error: 'Failed to capture signature',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
