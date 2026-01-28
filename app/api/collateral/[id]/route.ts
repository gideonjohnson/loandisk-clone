import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * PUT /api/collateral/:id
 * Update collateral
 */
export const PUT = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { type, description, estimatedValue, documentUrl } = body

      const existingCollateral = await prisma.collateral.findUnique({
        where: { id },
        include: { loan: true },
      })

      if (!existingCollateral) {
        return NextResponse.json(
          { error: 'Collateral not found' },
          { status: 404 }
        )
      }

      const collateral = await prisma.collateral.update({
        where: { id },
        data: {
          type: type || existingCollateral.type,
          description: description || existingCollateral.description,
          estimatedValue: estimatedValue !== undefined ? estimatedValue : existingCollateral.estimatedValue,
          documentUrl: documentUrl !== undefined ? documentUrl : existingCollateral.documentUrl,
        },
      })

      // Update loan's total collateral value
      const allCollateral = await prisma.collateral.findMany({
        where: { loanId: existingCollateral.loanId },
      })

      const totalCollateralValue = allCollateral.reduce(
        (sum, c) => sum + Number(c.estimatedValue),
        0
      )

      await prisma.loan.update({
        where: { id: existingCollateral.loanId },
        data: { collateralValue: totalCollateralValue },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'UPDATE_COLLATERAL',
          entityType: 'Collateral',
          entityId: id,
          details: JSON.stringify({
            loanNumber: existingCollateral.loan.loanNumber,
            type,
            estimatedValue,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Collateral updated successfully',
        collateral,
      })
    } catch (error) {
      console.error('Update collateral error:', error)
      return NextResponse.json(
        { error: 'Failed to update collateral' },
        { status: 500 }
      )
    }
  },
  [Permission.COLLATERAL_MANAGE],
  false
)

/**
 * DELETE /api/collateral/:id
 * Delete collateral
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const collateral = await prisma.collateral.findUnique({
        where: { id },
        include: { loan: true },
      })

      if (!collateral) {
        return NextResponse.json(
          { error: 'Collateral not found' },
          { status: 404 }
        )
      }

      await prisma.collateral.delete({
        where: { id },
      })

      // Update loan's total collateral value
      const remainingCollateral = await prisma.collateral.findMany({
        where: { loanId: collateral.loanId },
      })

      const totalCollateralValue = remainingCollateral.reduce(
        (sum, c) => sum + Number(c.estimatedValue),
        0
      )

      await prisma.loan.update({
        where: { id: collateral.loanId },
        data: { collateralValue: totalCollateralValue },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'DELETE_COLLATERAL',
          entityType: 'Collateral',
          entityId: id,
          details: JSON.stringify({
            loanNumber: collateral.loan.loanNumber,
            type: collateral.type,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Collateral deleted successfully',
      })
    } catch (error) {
      console.error('Delete collateral error:', error)
      return NextResponse.json(
        { error: 'Failed to delete collateral' },
        { status: 500 }
      )
    }
  },
  [Permission.COLLATERAL_MANAGE],
  false
)
