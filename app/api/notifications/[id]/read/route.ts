import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { markNotificationAsRead } from '@/lib/notifications/notificationService'

/**
 * POST /api/notifications/:id/read
 * Mark a specific notification as read
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      // Verify the notification belongs to the user
      const notification = await prisma.notification.findUnique({
        where: { id },
      })

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      if (notification.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized to access this notification' },
          { status: 403 }
        )
      }

      const updatedNotification = await markNotificationAsRead(id)

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        notification: updatedNotification,
      })
    } catch (error) {
      console.error('Mark notification as read error:', error)
      return NextResponse.json(
        {
          error: 'Failed to mark notification as read',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
