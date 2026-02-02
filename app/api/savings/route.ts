import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { createSavingsAccount, getAllAccounts } from '@/lib/savings/savingsService'

/**
 * GET /api/savings
 * Get all savings accounts
 */
export const GET = createAuthHandler(
  async (request: Request, _session) => {
    try {
      const { searchParams } = new URL(request.url)
      const accountType = searchParams.get('accountType') || undefined
      const active = searchParams.get('active')
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const offset = parseInt(searchParams.get('offset') || '0', 10)

      const result = await getAllAccounts({
        accountType,
        active: active ? active === 'true' : undefined,
        limit,
        offset,
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error('Get accounts error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch accounts',
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
 * POST /api/savings
 * Create a new savings account
 */
export const POST = createAuthHandler(
  async (request: Request, _session) => {
    try {
      const body = await request.json()
      const { borrowerId, accountType, interestRate, initialDeposit } = body

      if (!borrowerId) {
        return NextResponse.json(
          { error: 'Borrower ID is required' },
          { status: 400 }
        )
      }

      if (!accountType || !['SAVINGS', 'FIXED_DEPOSIT', 'CURRENT'].includes(accountType)) {
        return NextResponse.json(
          { error: 'Valid account type is required (SAVINGS, FIXED_DEPOSIT, CURRENT)' },
          { status: 400 }
        )
      }

      const account = await createSavingsAccount({
        borrowerId,
        accountType,
        interestRate: interestRate || 0,
        initialDeposit: initialDeposit || 0,
      })

      return NextResponse.json({
        success: true,
        message: 'Account created successfully',
        account,
      })
    } catch (error) {
      console.error('Create account error:', error)
      return NextResponse.json(
        {
          error: 'Failed to create account',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
