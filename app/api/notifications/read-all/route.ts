import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { markAllNotificationsAsRead } from '@/lib/notifications/notificationService'

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
export const POST = createAuthHandler(
  async (_request: Request, session) => {
    try {
      await markAllNotificationsAsRead(session.user.id!)

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      })
    } catch (error) {
      console.error('Mark all notifications as read error:', error)
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }
  },
  [],
  false
)
