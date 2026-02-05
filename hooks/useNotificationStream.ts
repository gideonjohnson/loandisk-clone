'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotificationStream() {
  const { data: session, status } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Get all store values and actions at the top level (proper hooks pattern)
  const notifications = useNotificationStore((state) => state.notifications)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const isConnected = useNotificationStore((state) => state.isConnected)
  const addNotification = useNotificationStore((state) => state.addNotification)
  const setConnected = useNotificationStore((state) => state.setConnected)
  const setNotifications = useNotificationStore((state) => state.setNotifications)
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/notifications/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'connected') {
          // Initial connection, fetch existing notifications
          fetchNotifications()
        } else if (data.id) {
          // New notification
          addNotification(data)
        }
      } catch (error) {
        console.error('Failed to parse notification:', error)
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
      eventSourceRef.current = null

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (session?.user) {
          connect()
        }
      }, 5000)
    }
  }, [session?.user, addNotification, setConnected])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [setNotifications, setUnreadCount])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      connect()
      fetchNotifications()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [status, session?.user, connect, fetchNotifications])

  return {
    isConnected,
    notifications,
    unreadCount,
    refetch: fetchNotifications,
  }
}
