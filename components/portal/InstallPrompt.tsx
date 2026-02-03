'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (localStorage.getItem('pwa-install-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden animate-in slide-in-from-bottom-4">
      <div className="bg-blue-600 text-white rounded-xl p-4 shadow-lg flex items-center gap-3">
        <Download className="w-6 h-6 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Install Meek App</p>
          <p className="text-blue-100 text-xs">Quick access from your home screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-semibold flex-shrink-0"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="p-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
