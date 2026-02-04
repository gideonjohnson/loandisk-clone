/**
 * Service Worker Registration Helper
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return

  if ('serviceWorker' in navigator) {
    try {
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

      console.log('Service Worker registered successfully')
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
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
