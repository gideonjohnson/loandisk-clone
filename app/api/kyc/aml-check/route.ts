import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { Session } from 'next-auth'
import { runAMLCheck } from '@/lib/kyc/amlService'

/**
 * POST /api/kyc/aml-check
 * Run an AML check for a borrower.
 * Expects { borrowerId }. Returns the AML result.
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

      const result = await runAMLCheck(borrowerId)

      return NextResponse.json({
        success: true,
        data: {
          borrowerId,
          clear: result.clear,
          flags: result.flags,
          checkedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('AML check error:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('not found') ? 404 : 500
      return NextResponse.json(
        { error: 'Failed to run AML check', details: message },
        { status }
      )
    }
  },
  [Permission.KYC_REVIEW]
)
