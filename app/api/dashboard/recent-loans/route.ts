import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'

/**
 * GET /api/dashboard/recent-loans
 * Get the 10 most recent loans
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '10', 10)

      const loans = await prisma.loan.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          loanOfficer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      const formattedLoans = loans.map((loan) => ({
        id: loan.id,
        loanNumber: loan.loanNumber,
        borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
        borrowerId: loan.borrower.id,
        amount: Number(loan.principalAmount),
        status: loan.status,
        date: loan.createdAt,
        loanOfficer: loan.loanOfficer.name,
      }))

      return NextResponse.json(formattedLoans)
    } catch (error) {
      console.error('Recent loans error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch recent loans',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [], // No specific permission required
  false
)
