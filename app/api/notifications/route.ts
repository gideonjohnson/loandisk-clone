import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
} from '@/lib/notifications/notificationService'

/**
 * GET /api/notifications
 * Get user notifications with optional filters
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      const unreadOnly = searchParams.get('unreadOnly') === 'true'

      const [notifications, unreadCount] = await Promise.all([
        getUserNotifications(session.user.id!, limit, !unreadOnly),
        getUnreadNotificationCount(session.user.id!),
      ])

      return NextResponse.json({
        notifications,
        unreadCount,
        total: notifications.length,
      })
    } catch (error) {
      console.error('Get notifications error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch notifications',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [], // No specific permission required, uses session user
  false
)

/**
 * POST /api/notifications
 * Mark all notifications as read
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const body = await request.json()
      const { action } = body

      if (action === 'markAllRead') {
        await markAllNotificationsAsRead(session.user.id!)

        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read',
        })
      }

      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    } catch (error) {
      console.error('Notification action error:', error)
      return NextResponse.json(
        {
          error: 'Failed to perform notification action',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [],
  false
)
