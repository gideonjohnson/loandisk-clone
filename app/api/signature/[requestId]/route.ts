import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getSignatureStatus } from '@/lib/esignature/esignatureService'

/**
 * GET /api/signature/:requestId
 * Get signature status by request ID
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { requestId } = context.params

      const status = await getSignatureStatus(requestId)

      if (!status) {
        return NextResponse.json(
          { error: 'Signature request not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(status)
    } catch (error) {
      console.error('Get signature status error:', error)
      return NextResponse.json(
        {
          error: 'Failed to get signature status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
