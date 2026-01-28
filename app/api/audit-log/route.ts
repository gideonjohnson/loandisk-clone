import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/audit-log
 * Get activity logs
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '100')
      const entityType = searchParams.get('entityType')
      const userId = searchParams.get('userId')

      const logs = await prisma.activityLog.findMany({
        where: {
          ...(entityType ? { entityType } : {}),
          ...(userId ? { userId } : {}),
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return NextResponse.json(logs)
    } catch (error) {
      console.error('Get audit logs error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }
  },
  [Permission.AUDIT_LOG_VIEW]
)
