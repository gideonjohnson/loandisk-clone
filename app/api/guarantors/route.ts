import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/guarantors
 * Get all guarantors
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const borrowerId = searchParams.get('borrowerId')

      const guarantors = await prisma.guarantor.findMany({
        where: borrowerId ? { borrowerId } : {},
        include: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(guarantors)
    } catch (error) {
      console.error('Get guarantors error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch guarantors' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_VIEW]
)

/**
 * POST /api/guarantors
 * Create a new guarantor
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const {
        borrowerId,
        firstName,
        lastName,
        email,
        phone,
        address,
        relationship,
        idNumber,
      } = body

      if (!borrowerId || !firstName || !lastName || !phone) {
        return NextResponse.json(
          { error: 'Borrower ID, name, and phone are required' },
          { status: 400 }
        )
      }

      const guarantor = await prisma.guarantor.create({
        data: {
          borrowerId,
          firstName,
          lastName,
          email,
          phone,
          address,
          relationship,
          idNumber,
        },
        include: {
          borrower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      return NextResponse.json({ guarantor }, { status: 201 })
    } catch (error) {
      console.error('Create guarantor error:', error)
      return NextResponse.json(
        { error: 'Failed to create guarantor' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_CREATE]
)
