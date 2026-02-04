/**
 * Notification Broadcaster
 * In-memory broadcast service for real-time notifications via SSE
 */

type NotificationPayload = {
  id: string
  type: string
  category: string
  title: string
  message: string
  createdAt: string
}

type ClientController = ReadableStreamDefaultController<Uint8Array>

class NotificationBroadcaster {
  private clients: Map<string, Set<ClientController>> = new Map()

  /**
   * Add a client connection for a user
   */
  addClient(userId: string, controller: ClientController) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(controller)
  }

  /**
   * Remove a client connection
   */
  removeClient(userId: string, controller: ClientController) {
    const userClients = this.clients.get(userId)
    if (userClients) {
      userClients.delete(controller)
      if (userClients.size === 0) {
        this.clients.delete(userId)
      }
    }
  }

  /**
   * Broadcast a notification to a specific user
   */
  broadcastToUser(userId: string, notification: NotificationPayload) {
    const userClients = this.clients.get(userId)
    if (!userClients) return

    const data = `data: ${JSON.stringify(notification)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(data)

    for (const controller of userClients) {
      try {
        controller.enqueue(encoded)
      } catch {
        // Client disconnected, remove it
        this.removeClient(userId, controller)
      }
    }
  }

  /**
   * Broadcast a notification to multiple users
   */
  broadcastToUsers(userIds: string[], notification: NotificationPayload) {
    for (const userId of userIds) {
      this.broadcastToUser(userId, notification)
    }
  }

  /**
   * Broadcast a system-wide notification to all connected users
   */
  broadcastToAll(notification: NotificationPayload) {
    for (const userId of this.clients.keys()) {
      this.broadcastToUser(userId, notification)
    }
  }

  /**
   * Get the number of connected clients for a user
   */
  getClientCount(userId: string): number {
    return this.clients.get(userId)?.size || 0
  }

  /**
   * Get total connected clients
   */
  getTotalClientCount(): number {
    let total = 0
    for (const clients of this.clients.values()) {
      total += clients.size
    }
    return total
  }

  /**
   * Check if a user has any connected clients
   */
  isUserConnected(userId: string): boolean {
    return this.getClientCount(userId) > 0
  }
}

// Singleton instance
export const notificationBroadcaster = new NotificationBroadcaster()

// Helper function to create notification payload
export function createNotificationPayload(
  notification: {
    id: string
    type: string
    category: string
    title: string
    message: string
    createdAt: Date
  }
): NotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    createdAt: notification.createdAt.toISOString(),
  }
}
