import { NextResponse } from 'next/server'
import { verifySigningToken } from '@/lib/esignature/esignatureService'

/**
 * POST /api/signature/verify
 * Verify a signing token and return document details
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const result = await verifySigningToken(token)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to verify token',
      },
      { status: 500 }
    )
  }
}
