import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/fees
 * Get all fee types
 */
export const GET = createAuthHandler(
  async (request: Request, _session) => {
    try {
      const { searchParams } = new URL(request.url)
      const activeOnly = searchParams.get('active') === 'true'

      const fees = await prisma.fee.findMany({
        where: activeOnly ? { active: true } : {},
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ fees, count: fees.length })
    } catch (error) {
      console.error('Fetch fees error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch fees' },
        { status: 500 }
      )
    }
  },
  [Permission.FEE_VIEW],
  false
)

/**
 * POST /api/fees
 * Create a new fee type
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const body = await request.json()
      const { name, type, calculationType, amount, percentage } = body

      // Validation
      if (!name || !type || !calculationType) {
        return NextResponse.json(
          { error: 'Name, type, and calculationType are required' },
          { status: 400 }
        )
      }

      if (calculationType === 'FIXED' && !amount) {
        return NextResponse.json(
          { error: 'Amount is required for FIXED calculation type' },
          { status: 400 }
        )
      }

      if (calculationType === 'PERCENTAGE' && !percentage) {
        return NextResponse.json(
          { error: 'Percentage is required for PERCENTAGE calculation type' },
          { status: 400 }
        )
      }

      const fee = await prisma.fee.create({
        data: {
          name,
          type,
          calculationType,
          amount: amount || null,
          percentage: percentage || null,
          active: true,
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'CREATE_FEE',
          entityType: 'Fee',
          entityId: fee.id,
          details: JSON.stringify({ name, type, calculationType }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Fee created successfully',
        fee,
      })
    } catch (error) {
      console.error('Create fee error:', error)
      return NextResponse.json(
        { error: 'Failed to create fee' },
        { status: 500 }
      )
    }
  },
  [Permission.FEE_MANAGE],
  false
)
