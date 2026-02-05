/**
 * Service Worker Registration Helper
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return

  // Skip service worker in development or if not supported
  if (process.env.NODE_ENV === 'development') return

  if ('serviceWorker' in navigator) {
    try {
      // Check if sw.js exists before trying to register
      const swResponse = await fetch('/sw.js', { method: 'HEAD' })
      if (!swResponse.ok) {
        // Service worker file not available, skip silently
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, notify user
              if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
                window.dispatchEvent(new CustomEvent('sw-update-available'))
              }
            }
          })
        }
      })

      return registration
    } catch {
      // Service worker registration failed silently
    }
  }
}

export async function unregisterServiceWorker() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.unregister()
  }
}
