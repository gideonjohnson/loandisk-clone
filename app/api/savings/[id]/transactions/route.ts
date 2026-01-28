import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getAccountTransactions, getAccountStatement } from '@/lib/savings/savingsService'

/**
 * GET /api/savings/:id/transactions
 * Get account transactions or statement
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const { searchParams } = new URL(request.url)

      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const offset = parseInt(searchParams.get('offset') || '0', 10)
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')
      const statement = searchParams.get('statement') === 'true'

      // If statement is requested with date range
      if (statement && startDate && endDate) {
        const result = await getAccountStatement(
          id,
          new Date(startDate),
          new Date(endDate)
        )
        return NextResponse.json(result)
      }

      // Otherwise return transactions list
      const result = await getAccountTransactions(id, limit, offset)

      return NextResponse.json(result)
    } catch (error) {
      console.error('Get transactions error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch transactions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
