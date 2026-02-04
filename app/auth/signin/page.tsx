'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [requires2FA, setRequires2FA] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        if (data.setupRequired) {
          router.push('/auth/setup')
        } else {
          setCheckingSetup(false)
        }
      })
      .catch(() => setCheckingSetup(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (requires2FA && pendingUserId) {
        // Verify 2FA code
        const verifyRes = await fetch('/api/auth/2fa/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: pendingUserId, code: twoFactorCode }),
        })

        const verifyData = await verifyRes.json()

        if (!verifyRes.ok || !verifyData.valid) {
          setError(verifyData.error || 'Invalid verification code')
          setLoading(false)
          return
        }

        const result = await signIn('credentials', {
          email,
          password,
          twoFactorVerified: 'true',
          redirect: false,
        })

        if (result?.error) {
          setError('Login failed. Please try again.')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
        // Check credentials and 2FA status
        const checkRes = await fetch('/api/auth/check-2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const checkData = await checkRes.json()

        if (!checkRes.ok) {
          setError(checkData.error || 'Invalid email or password')
          setLoading(false)
          return
        }

        if (checkData.requires2FA) {
          setRequires2FA(true)
          setPendingUserId(checkData.userId)
          setLoading(false)
          return
        }

        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid email or password')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#0dc5c1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-16 h-16 bg-[#0dc5c1] rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800">Sign In</h1>
          <p className="text-gray-500 mt-1">Access your loan management dashboard</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {requires2FA ? (
            // 2FA Form
            <form onSubmit={handleSubmit}>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#0dc5c1]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#0dc5c1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-gray-800">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-500 mt-1">Enter the code from your authenticator app</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#0dc5c1] focus:border-transparent"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false)
                    setPendingUserId(null)
                    setTwoFactorCode('')
                    setError('')
                  }}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length < 6}
                  className="flex-1 py-3 px-4 bg-[#0dc5c1] text-white font-medium rounded-md hover:bg-[#0bb5b1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Please wait..
                    </span>
                  ) : (
                    'Verify'
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Login Form
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0dc5c1] focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0dc5c1] focus:border-transparent"
                  placeholder="Enter your password"
                />
                <div className="mt-2 text-right">
                  <Link href="/auth/forgot-password" className="text-sm text-[#0dc5c1] hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#0dc5c1] text-white font-medium rounded-md hover:bg-[#0bb5b1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Please wait..
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
