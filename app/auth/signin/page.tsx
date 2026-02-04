'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [sessionDuration, setSessionDuration] = useState('24')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (requires2FA && pendingUserId) {
        const verifyRes = await fetch('/api/auth/2fa/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: pendingUserId,
            code: twoFactorCode,
          }),
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
          sessionDuration,
          redirect: false,
        })

        if (result?.error) {
          setError('Login failed. Please try again.')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } else {
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
          sessionDuration,
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

  const handleBack = () => {
    setRequires2FA(false)
    setPendingUserId(null)
    setTwoFactorCode('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4169E1] to-[#2a4494] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl"
            >
              <span className="text-[#4169E1] font-bold text-3xl">M</span>
            </motion.div>
          </Link>
          <h1 className="text-3xl font-bold text-white">
            Welcome Back
          </h1>
          <p className="mt-2 text-white/80">
            Sign in to Meek Loan Management
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {requires2FA ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Shield className="h-5 w-5 text-[#4169E1]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={8}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9-]/g, ''))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                    placeholder="000000"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    You can also use a backup code
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-xl p-3"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={handleBack}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading || twoFactorCode.length < 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 flex justify-center items-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-[#4169E1] hover:bg-[#3457c9] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-2">
                  Stay signed in for
                </label>
                <select
                  id="sessionDuration"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base text-gray-700 focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                >
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                </select>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-xl p-3"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-base font-semibold text-white bg-[#4169E1] hover:bg-[#3457c9] shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Sign in'
                )}
              </motion.button>

              <div className="pt-4 border-t text-center">
                <p className="text-sm text-gray-500 mb-2">Demo credentials:</p>
                <p className="font-mono text-xs text-gray-700 bg-gray-100 rounded-lg py-2 px-3 inline-block">
                  admin@meek.com / admin123
                </p>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <Link href="/" className="text-white/80 hover:text-white text-sm transition-colors">
            &larr; Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
