'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <WifiOff className="w-16 h-16 text-gray-300 mb-6" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">You&apos;re Offline</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        It looks like you&apos;ve lost your internet connection. Please check your network and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )
}
