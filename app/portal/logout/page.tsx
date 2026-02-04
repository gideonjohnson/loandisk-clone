'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch('/api/portal/auth/logout', { method: 'POST' })
      } catch {
        // Continue with redirect even if API call fails
      }
      router.push('/portal/login')
    }
    logout()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse text-gray-500">Logging out...</div>
    </div>
  )
}
