'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle, XCircle, Check, X } from 'lucide-react'

interface BrandingConfig {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  loginTitle: string
  loginSubtitle: string
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [branding, setBranding] = useState<BrandingConfig>({
    companyName: 'Meek Microfinance',
    logoUrl: null,
    primaryColor: '#4169E1',
    secondaryColor: '#2a4494',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Sign in to Meek Loan Management',
  })

  // Password requirements
  const requirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
  ]
  const allRequirementsMet = requirements.every(r => r.met)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  useEffect(() => {
    fetch('/api/public/branding')
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) {
      setValidatingToken(false)
      setTokenValid(false)
      return
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        setTokenValid(data.valid)
        setValidatingToken(false)
      })
      .catch(() => {
        setTokenValid(false)
        setValidatingToken(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allRequirementsMet) {
      setError('Please meet all password requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        return
      }

      setSuccess(true)
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(to bottom right, ${branding.primaryColor}, ${branding.secondaryColor})`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/auth/signin" className="inline-flex items-center gap-2 mb-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl"
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <span style={{ color: branding.primaryColor }} className="font-bold text-3xl">
                  {branding.companyName.charAt(0)}
                </span>
              )}
            </motion.div>
          </Link>
          <h1 className="text-3xl font-bold text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-white/80">
            Create a new secure password
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {validatingToken ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-4 text-gray-600">Validating reset link...</p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Invalid or Expired Link</h2>
              <p className="text-gray-600">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Request New Link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Password Reset Successful!</h2>
              <p className="text-gray-600">
                Your password has been changed. Redirecting to sign in...
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 mt-4 text-sm font-medium hover:underline"
                style={{ color: branding.primaryColor }}
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Lock className="h-5 w-5" style={{ color: branding.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Create New Password</h3>
                    <p className="text-sm text-gray-500">
                      Choose a strong password you haven&apos;t used before
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl text-lg placeholder:text-gray-400 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': branding.primaryColor } as React.CSSProperties}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Password requirements */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                <div className="grid grid-cols-2 gap-1">
                  {requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      {req.met ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl text-lg placeholder:text-gray-400 focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': branding.primaryColor } as React.CSSProperties}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`mt-1 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
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
                disabled={loading || !allRequirementsMet || !passwordsMatch}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex justify-center py-3 px-4 rounded-xl text-base font-semibold text-white shadow-lg disabled:opacity-50 transition-all"
                style={{
                  backgroundColor: branding.primaryColor,
                  boxShadow: `0 10px 15px -3px ${branding.primaryColor}40`,
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Reset Password'
                )}
              </motion.button>

              <div className="pt-4 border-t text-center">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: branding.primaryColor }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </motion.div>

        {/* Footer */}
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

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#4169E1] to-[#2a4494] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
