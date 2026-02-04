'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react'

interface ProfileData {
  readOnly: {
    firstName: string
    lastName: string
    phone: string
    idNumber: string | null
    dateOfBirth: string | null
    kycVerified: boolean
    creditScore: number | null
  }
  editable: {
    email: string
    address: string
    city: string
    country: string
    employmentStatus: string
    monthlyIncome: number | null
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Editable form state
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState('')

  // PIN change state
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/portal/profile')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      const result = await res.json()
      setProfile(result)
      setEmail(result.editable.email || '')
      setAddress(result.editable.address || '')
      setCity(result.editable.city || '')
      setCountry(result.editable.country || '')
      setEmploymentStatus(result.editable.employmentStatus || '')
      setMonthlyIncome(result.editable.monthlyIncome?.toString() || '')
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          address,
          city,
          country,
          employmentStatus,
          monthlyIncome: monthlyIncome ? Number(monthlyIncome) : null,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: result.message || 'Profile updated successfully' })
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinMessage(null)

    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PIN and confirmation do not match' })
      return
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage({ type: 'error', text: 'PIN must be exactly 4 digits' })
      return
    }

    setPinSaving(true)

    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      })

      const result = await res.json()
      if (res.ok) {
        setPinMessage({ type: 'success', text: result.message || 'PIN changed successfully' })
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      } else {
        setPinMessage({ type: 'error', text: result.error || 'Failed to change PIN' })
      }
    } catch (error) {
      console.error('Failed to change PIN:', error)
      setPinMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setPinSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load profile. Please try again.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">View and manage your account information</p>
      </div>

      {/* Read-Only Info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Personal Information</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-medium text-gray-900">{profile.readOnly.firstName} {profile.readOnly.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone Number</p>
            <p className="font-medium text-gray-900">{profile.readOnly.phone}</p>
          </div>
          {profile.readOnly.idNumber && (
            <div>
              <p className="text-sm text-gray-500">ID Number</p>
              <p className="font-medium text-gray-900">{profile.readOnly.idNumber}</p>
            </div>
          )}
          {profile.readOnly.dateOfBirth && (
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium text-gray-900">{formatDate(profile.readOnly.dateOfBirth)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">KYC Status</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
              profile.readOnly.kycVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {profile.readOnly.kycVerified ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Not Verified
                </>
              )}
            </span>
          </div>
          {profile.readOnly.creditScore !== null && (
            <div>
              <p className="text-sm text-gray-500">Credit Score</p>
              <p className="font-medium text-gray-900">{profile.readOnly.creditScore}</p>
            </div>
          )}
        </div>
      </div>

      {/* Editable Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="font-semibold text-gray-900">Editable Information</h2>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter country"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
            <select
              value={employmentStatus}
              onChange={(e) => setEmploymentStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="EMPLOYED">Employed</option>
              <option value="SELF_EMPLOYED">Self Employed</option>
              <option value="BUSINESS_OWNER">Business Owner</option>
              <option value="UNEMPLOYED">Unemployed</option>
              <option value="RETIRED">Retired</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (KES)</label>
            <input
              type="number"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter monthly income"
              min="0"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change PIN */}
      <form onSubmit={handleChangePin} className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900">Change PIN</h2>
        </div>

        {pinMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            pinMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {pinMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {pinMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="****"
              maxLength={4}
              inputMode="numeric"
              pattern="\d{4}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="****"
              maxLength={4}
              inputMode="numeric"
              pattern="\d{4}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="****"
              maxLength={4}
              inputMode="numeric"
              pattern="\d{4}"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pinSaving || !currentPin || !newPin || !confirmPin}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pinSaving ? 'Changing...' : 'Change PIN'}
        </button>
      </form>
    </div>
  )
}
