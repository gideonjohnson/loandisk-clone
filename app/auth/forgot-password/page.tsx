'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

interface BrandingConfig {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  loginTitle: string
  loginSubtitle: string
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    fetch('/api/public/branding')
      .then(res => res.json())
      .then(data => setBranding(data))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'An error occurred. Please try again.')
        return
      }

      setSuccess(true)
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
            Forgot Password?
          </h1>
          <p className="mt-2 text-white/80">
            Enter your email to receive reset instructions
          </p>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Check Your Email</h2>
              <p className="text-gray-600">
                If an account exists with <strong>{email}</strong>, you will receive password reset instructions shortly.
              </p>
              <p className="text-sm text-gray-500">
                The link will expire in 1 hour for security reasons.
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 mt-4 text-sm font-medium hover:underline"
                style={{ color: branding.primaryColor }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="h-5 w-5" style={{ color: branding.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Reset Your Password</h3>
                    <p className="text-sm text-gray-500">
                      We&apos;ll send you instructions to reset your password
                    </p>
                  </div>
                </div>
              </div>

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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg placeholder:text-gray-400 focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': branding.primaryColor } as React.CSSProperties}
                  placeholder="you@example.com"
                />
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
                className="w-full flex justify-center py-3 px-4 rounded-xl text-base font-semibold text-white shadow-lg disabled:opacity-50 transition-all"
                style={{
                  backgroundColor: branding.primaryColor,
                  boxShadow: `0 10px 15px -3px ${branding.primaryColor}40`,
                }}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Send Reset Instructions'
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
