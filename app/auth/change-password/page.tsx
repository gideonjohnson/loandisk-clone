'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield } from 'lucide-react'

export default function ChangePasswordPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Password strength indicators
  const hasMinLength = formData.newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(formData.newPassword)
  const hasLowercase = /[a-z]/.test(formData.newPassword)
  const hasNumber = /[0-9]/.test(formData.newPassword)
  const passwordsMatch = formData.newPassword === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setSuccess(true)

      // Update session to remove mustChangePassword flag
      await update({ mustChangePassword: false })

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isFirstLogin = session?.user?.mustChangePassword

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4169E1] to-[#2a4494] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl mx-auto mb-4"
          >
            <Shield className="w-8 h-8 text-[#4169E1]" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </h1>
          <p className="mt-2 text-white/80">
            {isFirstLogin
              ? 'Please create a new secure password for your account'
              : 'Enter your current password and choose a new one'}
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
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Changed!</h2>
              <p className="text-gray-500">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {isFirstLogin && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">First Time Login</p>
                      <p className="mt-1">
                        For security, you must change your temporary password before continuing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isFirstLogin ? 'Temporary Password' : 'Current Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1]"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1]"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-3 space-y-1">
                  <div className={`flex items-center gap-2 text-sm ${hasMinLength ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-4 h-4" />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${hasUppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-4 h-4" />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${hasLowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-4 h-4" />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="w-4 h-4" />
                    One number
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] ${
                      formData.confirmPassword && !passwordsMatch
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading || !hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !passwordsMatch}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-xl text-base font-semibold text-white bg-[#4169E1] hover:bg-[#3457c9] shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </motion.button>

              {!isFirstLogin && (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full py-3 px-4 text-gray-600 hover:text-gray-900 text-sm"
                >
                  Cancel
                </button>
              )}
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
