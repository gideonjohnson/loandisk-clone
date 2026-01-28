import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/loans/:id/collateral
 * Get all collateral for a loan
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const collaterals = await prisma.collateral.findMany({
        where: { loanId: id },
        orderBy: { createdAt: 'desc' },
      })

      const totalValue = collaterals.reduce(
        (sum, c) => sum + Number(c.estimatedValue),
        0
      )

      return NextResponse.json({
        collaterals,
        count: collaterals.length,
        totalValue,
      })
    } catch (error) {
      console.error('Fetch collateral error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch collateral' },
        { status: 500 }
      )
    }
  },
  [Permission.COLLATERAL_VIEW],
  false
)

/**
 * POST /api/loans/:id/collateral
 * Add collateral to a loan
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { type, description, estimatedValue, documentUrl } = body

      if (!type || !description || !estimatedValue) {
        return NextResponse.json(
          { error: 'Type, description, and estimatedValue are required' },
          { status: 400 }
        )
      }

      // Verify loan exists
      const loan = await prisma.loan.findUnique({
        where: { id },
      })

      if (!loan) {
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        )
      }

      const collateral = await prisma.collateral.create({
        data: {
          loanId: id,
          type,
          description,
          estimatedValue,
          documentUrl: documentUrl || null,
        },
      })

      // Update loan's collateral value
      const allCollateral = await prisma.collateral.findMany({
        where: { loanId: id },
      })

      const totalCollateralValue = allCollateral.reduce(
        (sum, c) => sum + Number(c.estimatedValue),
        0
      )

      await prisma.loan.update({
        where: { id },
        data: { collateralValue: totalCollateralValue },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'ADD_COLLATERAL',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            type,
            estimatedValue,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Collateral added successfully',
        collateral,
      })
    } catch (error) {
      console.error('Add collateral error:', error)
      return NextResponse.json(
        { error: 'Failed to add collateral' },
        { status: 500 }
      )
    }
  },
  [Permission.COLLATERAL_MANAGE],
  false
)
