import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  notificationBroadcaster,
  createNotificationPayload,
} from '@/lib/notifications/notificationBroadcaster'

describe('Notification Broadcaster', () => {
  // Create a mock controller
  function createMockController() {
    const enqueue = vi.fn()
    const close = vi.fn()
    return {
      enqueue,
      close,
      desiredSize: null,
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController<Uint8Array>
  }

  describe('client management', () => {
    it('should add a client', () => {
      const controller = createMockController()
      const userId = 'user-add-1'

      notificationBroadcaster.addClient(userId, controller)

      expect(notificationBroadcaster.isUserConnected(userId)).toBe(true)
      expect(notificationBroadcaster.getClientCount(userId)).toBe(1)
    })

    it('should add multiple clients for same user', () => {
      const controller1 = createMockController()
      const controller2 = createMockController()
      const userId = 'user-multi-1'

      notificationBroadcaster.addClient(userId, controller1)
      notificationBroadcaster.addClient(userId, controller2)

      expect(notificationBroadcaster.getClientCount(userId)).toBe(2)
    })

    it('should remove a client', () => {
      const controller = createMockController()
      const userId = 'user-remove-1'

      notificationBroadcaster.addClient(userId, controller)
      expect(notificationBroadcaster.isUserConnected(userId)).toBe(true)

      notificationBroadcaster.removeClient(userId, controller)
      expect(notificationBroadcaster.isUserConnected(userId)).toBe(false)
    })

    it('should track users independently', () => {
      const controller1 = createMockController()
      const controller2 = createMockController()
      const userId1 = 'user-ind-1'
      const userId2 = 'user-ind-2'

      notificationBroadcaster.addClient(userId1, controller1)
      notificationBroadcaster.addClient(userId2, controller2)

      expect(notificationBroadcaster.isUserConnected(userId1)).toBe(true)
      expect(notificationBroadcaster.isUserConnected(userId2)).toBe(true)

      notificationBroadcaster.removeClient(userId1, controller1)

      expect(notificationBroadcaster.isUserConnected(userId1)).toBe(false)
      expect(notificationBroadcaster.isUserConnected(userId2)).toBe(true)
    })
  })

  describe('broadcasting', () => {
    it('should broadcast to specific user', () => {
      const controller = createMockController()
      const userId = 'user-broadcast-1'

      notificationBroadcaster.addClient(userId, controller)

      const notification = {
        id: 'notif-1',
        type: 'LOAN_APPROVED',
        category: 'LOAN',
        title: 'Loan Approved',
        message: 'Your loan has been approved',
        createdAt: new Date().toISOString(),
      }

      notificationBroadcaster.broadcastToUser(userId, notification)

      expect(controller.enqueue).toHaveBeenCalled()
      const call = (controller.enqueue as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const decoded = new TextDecoder().decode(call)
      expect(decoded).toContain('data:')
      expect(decoded).toContain('LOAN_APPROVED')
    })

    it('should not fail when broadcasting to non-existent user', () => {
      const notification = {
        id: 'notif-2',
        type: 'SYSTEM',
        category: 'SYSTEM',
        title: 'Test',
        message: 'Test message',
        createdAt: new Date().toISOString(),
      }

      // Should not throw
      expect(() => {
        notificationBroadcaster.broadcastToUser('non-existent-user', notification)
      }).not.toThrow()
    })

    it('should broadcast to multiple users', () => {
      const controller1 = createMockController()
      const controller2 = createMockController()
      const userId1 = 'user-multi-broadcast-1'
      const userId2 = 'user-multi-broadcast-2'

      notificationBroadcaster.addClient(userId1, controller1)
      notificationBroadcaster.addClient(userId2, controller2)

      const notification = {
        id: 'notif-3',
        type: 'SYSTEM',
        category: 'SYSTEM',
        title: 'Announcement',
        message: 'System maintenance',
        createdAt: new Date().toISOString(),
      }

      notificationBroadcaster.broadcastToUsers([userId1, userId2], notification)

      expect(controller1.enqueue).toHaveBeenCalled()
      expect(controller2.enqueue).toHaveBeenCalled()
    })

    it('should broadcast to all connected users', () => {
      const controller1 = createMockController()
      const controller2 = createMockController()
      const userId1 = 'user-all-1'
      const userId2 = 'user-all-2'

      notificationBroadcaster.addClient(userId1, controller1)
      notificationBroadcaster.addClient(userId2, controller2)

      const notification = {
        id: 'notif-4',
        type: 'SYSTEM',
        category: 'SYSTEM',
        title: 'Global Alert',
        message: 'Important update',
        createdAt: new Date().toISOString(),
      }

      notificationBroadcaster.broadcastToAll(notification)

      expect(controller1.enqueue).toHaveBeenCalled()
      expect(controller2.enqueue).toHaveBeenCalled()
    })

    it('should handle disconnected clients gracefully', () => {
      const errorController = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error('Client disconnected')
        }),
        close: vi.fn(),
        desiredSize: null,
        error: vi.fn(),
      } as unknown as ReadableStreamDefaultController<Uint8Array>

      const userId = 'user-error-1'
      notificationBroadcaster.addClient(userId, errorController)

      const notification = {
        id: 'notif-5',
        type: 'SYSTEM',
        category: 'SYSTEM',
        title: 'Test',
        message: 'Test',
        createdAt: new Date().toISOString(),
      }

      // Should not throw
      expect(() => {
        notificationBroadcaster.broadcastToUser(userId, notification)
      }).not.toThrow()
    })
  })

  describe('createNotificationPayload', () => {
    it('should create proper payload structure', () => {
      const notification = {
        id: 'test-id',
        type: 'LOAN_APPROVED',
        category: 'LOAN',
        title: 'Test Title',
        message: 'Test Message',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      }

      const payload = createNotificationPayload(notification)

      expect(payload.id).toBe('test-id')
      expect(payload.type).toBe('LOAN_APPROVED')
      expect(payload.category).toBe('LOAN')
      expect(payload.title).toBe('Test Title')
      expect(payload.message).toBe('Test Message')
      expect(payload.createdAt).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('statistics', () => {
    it('should return correct client count', () => {
      const controller = createMockController()
      const userId = 'user-stats-1'

      expect(notificationBroadcaster.getClientCount(userId)).toBe(0)

      notificationBroadcaster.addClient(userId, controller)
      expect(notificationBroadcaster.getClientCount(userId)).toBe(1)
    })

    it('should track total connected clients', () => {
      const initialCount = notificationBroadcaster.getTotalClientCount()

      const controller1 = createMockController()
      const controller2 = createMockController()

      notificationBroadcaster.addClient('user-total-1', controller1)
      notificationBroadcaster.addClient('user-total-2', controller2)

      expect(notificationBroadcaster.getTotalClientCount()).toBe(initialCount + 2)
    })
  })
})
