import { create } from 'zustand'

export interface Notification {
  id: string
  type: string
  category: string
  title: string
  message: string
  createdAt: string
  status?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  setNotifications: (notifications: Notification[]) => void
  setUnreadCount: (count: number) => void
  setConnected: (connected: boolean) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
      unreadCount: state.unreadCount + 1,
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, status: 'READ' } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, status: 'READ' })),
      unreadCount: 0,
    })),

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => n.status !== 'READ').length,
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setConnected: (connected) => set({ isConnected: connected }),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}))
