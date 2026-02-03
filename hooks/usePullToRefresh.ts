'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const startY = useRef(0)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [])

  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!pulling.current) return
    pulling.current = false

    const endY = e.changedTouches[0].clientY
    const distance = endY - startY.current

    if (distance > threshold && window.scrollY === 0) {
      await onRefresh()
    }
  }, [onRefresh, threshold])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])
}
