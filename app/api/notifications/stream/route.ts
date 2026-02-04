import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationBroadcaster } from '@/lib/notifications/notificationBroadcaster'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/notifications/stream
 * Server-Sent Events endpoint for real-time notifications
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  const stream = new ReadableStream({
    start(controller) {
      // Add client to broadcaster
      notificationBroadcaster.addClient(userId, controller)

      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Handle connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        notificationBroadcaster.removeClient(userId, controller)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
