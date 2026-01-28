import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getLoanSignatures } from '@/lib/esignature/esignatureService'

/**
 * GET /api/loans/:id/signatures
 * Get all signature requests for a loan
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const signatures = await getLoanSignatures(id)

      return NextResponse.json({
        loanId: id,
        signatures,
      })
    } catch (error) {
      console.error('Get loan signatures error:', error)
      return NextResponse.json(
        {
          error: 'Failed to get loan signatures',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
