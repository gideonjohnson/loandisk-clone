import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import bcrypt from 'bcrypt'

/**
 * GET /api/users/:id
 * Get a single user
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          phoneNumber: true,
          lastLogin: true,
          twoFactorEnabled: true,
          profileImage: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(user)
    } catch (error) {
      console.error('Get user error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }
  },
  [Permission.USER_VIEW]
)

/**
 * PATCH /api/users/:id
 * Update a user
 */
export const PATCH = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { password, ...updateData } = body

      // If password is being updated, hash it
      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          phoneNumber: true,
          active: true,
          updatedAt: true,
        },
      })

      return NextResponse.json({ user })
    } catch (error: any) {
      console.error('Update user error:', error)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }
  },
  [Permission.USER_UPDATE]
)

/**
 * DELETE /api/users/:id
 * Deactivate a user (soft delete)
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      // Don't allow deleting yourself
      if (id === session.user.id) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        )
      }

      const user = await prisma.user.update({
        where: { id },
        data: { active: false },
      })

      return NextResponse.json({ success: true, user })
    } catch (error: any) {
      console.error('Delete user error:', error)
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to deactivate user' },
        { status: 500 }
      )
    }
  },
  [Permission.USER_DELETE]
)
