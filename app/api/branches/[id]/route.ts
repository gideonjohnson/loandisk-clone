import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { getBranchById, updateBranch } from '@/lib/branch/branchService'

/**
 * GET /api/branches/:id
 * Get branch by ID with details
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const branch = await getBranchById(id)

      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ branch })
    } catch (error) {
      console.error('Get branch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch branch' },
        { status: 500 }
      )
    }
  },
  [],
  false
)

/**
 * PATCH /api/branches/:id
 * Update branch
 */
export const PATCH = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()

      const branch = await updateBranch(id, body)

      return NextResponse.json({ branch })
    } catch (error) {
      console.error('Update branch error:', error)
      return NextResponse.json(
        { error: 'Failed to update branch' },
        { status: 500 }
      )
    }
  },
  [Permission.BRANCH_MANAGE]
)
