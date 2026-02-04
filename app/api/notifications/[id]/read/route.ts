import { NextResponse } from "next/server"
import { createAuthHandler } from "@/lib/middleware/withAuth"
import { markNotificationAsRead } from "@/lib/notifications/notificationService"

/**
 * POST /api/notifications/:id/read
 * Mark a specific notification as read
 */
export const POST = createAuthHandler(
  async (_request: Request, _session, context) => {
    try {
      const { id } = context.params

      await markNotificationAsRead(id)

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      })
    } catch (error) {
      console.error("Mark notification as read error:", error)
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 }
      )
    }
  },
  [],
  false
)
