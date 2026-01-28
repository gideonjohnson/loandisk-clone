import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { getAccountById, closeAccount } from '@/lib/savings/savingsService'

/**
 * GET /api/savings/:id
 * Get savings account details
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const account = await getAccountById(id)

      if (!account) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(account)
    } catch (error) {
      console.error('Get account error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch account',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)

/**
 * DELETE /api/savings/:id
 * Close a savings account
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const account = await closeAccount(id, session.user.id!)

      return NextResponse.json({
        success: true,
        message: 'Account closed successfully',
        account,
      })
    } catch (error) {
      console.error('Close account error:', error)
      return NextResponse.json(
        {
          error: 'Failed to close account',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
