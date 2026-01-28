import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { getAllBranches, createBranch, getBranchStats } from '@/lib/branch/branchService'

/**
 * GET /api/branches
 * Get all branches with stats
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const includeStats = searchParams.get('stats') === 'true'

      if (includeStats) {
        const stats = await getBranchStats()
        return NextResponse.json({ branches: stats })
      }

      const branches = await getAllBranches()
      return NextResponse.json({ branches })
    } catch (error) {
      console.error('Get branches error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch branches' },
        { status: 500 }
      )
    }
  },
  [],
  false
)

/**
 * POST /api/branches
 * Create a new branch
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const { name, code, address, city, phone } = body

      if (!name || !code) {
        return NextResponse.json(
          { error: 'Branch name and code are required' },
          { status: 400 }
        )
      }

      const branch = await createBranch({
        name,
        code,
        address,
        city,
        phone,
      })

      return NextResponse.json({ branch }, { status: 201 })
    } catch (error) {
      console.error('Create branch error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create branch' },
        { status: 500 }
      )
    }
  },
  [Permission.BRANCH_MANAGE]
)
