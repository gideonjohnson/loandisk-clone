import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/guarantors/:id
 * Get a single guarantor
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const guarantor = await prisma.guarantor.findUnique({
        where: { id },
        include: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      })

      if (!guarantor) {
        return NextResponse.json(
          { error: 'Guarantor not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(guarantor)
    } catch (error) {
      console.error('Get guarantor error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch guarantor' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_VIEW]
)

/**
 * PATCH /api/guarantors/:id
 * Update a guarantor
 */
export const PATCH = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()

      const guarantor = await prisma.guarantor.update({
        where: { id },
        data: body,
      })

      return NextResponse.json({ guarantor })
    } catch (error: unknown) {
      console.error('Update guarantor error:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Guarantor not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update guarantor' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_UPDATE]
)

/**
 * DELETE /api/guarantors/:id
 * Delete a guarantor
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      await prisma.guarantor.delete({
        where: { id },
      })

      return NextResponse.json({ success: true })
    } catch (error: unknown) {
      console.error('Delete guarantor error:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Guarantor not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to delete guarantor' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_DELETE]
)
