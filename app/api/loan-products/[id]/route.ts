import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/loan-products/:id
 * Get a single loan product
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const product = await prisma.loanProduct.findUnique({
        where: { id },
      })

      if (!product) {
        return NextResponse.json(
          { error: 'Loan product not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(product)
    } catch (error) {
      console.error('Get loan product error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loan product' },
        { status: 500 }
      )
    }
  },
  [],
  false
)

/**
 * PATCH /api/loan-products/:id
 * Update a loan product
 */
export const PATCH = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()

      const product = await prisma.loanProduct.update({
        where: { id },
        data: body,
      })

      return NextResponse.json({ product })
    } catch (error: any) {
      console.error('Update loan product error:', error)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Loan product not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update loan product' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)

/**
 * DELETE /api/loan-products/:id
 * Delete a loan product
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      await prisma.loanProduct.delete({
        where: { id },
      })

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Delete loan product error:', error)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Loan product not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to delete loan product' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)
