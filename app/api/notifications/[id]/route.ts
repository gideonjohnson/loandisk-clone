import { NextResponse } from "next/server"
import { createAuthHandler } from "@/lib/middleware/withAuth"
import { deleteNotification } from "@/lib/notifications/notificationService"

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification
 */
export const DELETE = createAuthHandler(
  async (_request: Request, _session, context) => {
    try {
      const { id } = context.params

      await deleteNotification(id)

      return NextResponse.json({
        success: true,
        message: "Notification deleted",
      })
    } catch (error) {
      console.error("Delete notification error:", error)
      return NextResponse.json(
        { error: "Failed to delete notification" },
        { status: 500 }
      )
    }
  },
  [],
  false
)
