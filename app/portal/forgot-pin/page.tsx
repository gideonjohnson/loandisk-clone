'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Lock, ArrowRight, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'

type Step = 'phone' | 'code' | 'success'

export default function ForgotPinPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/portal/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (res.ok) {
        setStep('code')
      } else {
        setError(data.error || 'Failed to send reset code')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    if (!/^\d{6}$/.test(newPin)) {
      setError('PIN must be exactly 6 digits')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/portal/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPin }),
      })

      const data = await res.json()

      if (res.ok) {
        setStep('success')
      } else {
        setError(data.error || 'Failed to reset PIN')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Reset PIN
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'phone' && 'Enter your phone number to receive a reset code'}
          {step === 'code' && 'Enter the code sent to your phone and your new PIN'}
          {step === 'success' && 'Your PIN has been reset successfully'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending...' : (
                  <>
                    Send Reset Code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleResetPin} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Reset Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter reset code"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base text-center tracking-widest"
                />
              </div>

              <div>
                <label htmlFor="newPin" className="block text-sm font-medium text-gray-700">
                  New PIN
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPin"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="\d{6}"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700">
                  Confirm New PIN
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPin"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm 6-digit PIN"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="\d{6}"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Resetting...' : (
                  <>
                    Reset PIN
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setError('') }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Didn&apos;t receive the code? Try again
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600">
                Your PIN has been reset successfully. You can now log in with your new PIN.
              </p>
              <button
                onClick={() => router.push('/portal/login')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Go to Login
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Link
                href="/portal/login"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
