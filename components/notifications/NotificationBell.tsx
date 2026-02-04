'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { useNotificationStream } from '@/hooks/useNotificationStream'
import { useNotificationStore } from '@/stores/notificationStore'
import { formatDateTime } from '@/lib/utils'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, isConnected } = useNotificationStream()
  const { markAsRead, markAllAsRead, removeNotification } = useNotificationStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    markAsRead(id)
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    markAllAsRead()
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    removeNotification(id)
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'LOAN':
        return 'bg-blue-100 text-blue-800'
      case 'PAYMENT':
        return 'bg-green-100 text-green-800'
      case 'ALERT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!isConnected && (
          <span className="absolute bottom-0 right-0 h-2 w-2 bg-yellow-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      notification.status !== 'READ' ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(
                              notification.category
                            )}`}
                          >
                            {notification.category}
                          </span>
                          {notification.status !== 'READ' && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {notification.status !== 'READ' && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-3 border-t bg-gray-50 text-center">
            <a
              href="/dashboard/reminders"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
