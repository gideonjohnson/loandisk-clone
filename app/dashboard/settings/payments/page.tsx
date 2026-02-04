'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Smartphone, Building2, Wallet, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface PaymentSetting {
  key: string
  value: string
  label: string
  description: string
  type: 'text' | 'password' | 'select'
  options?: { value: string; label: string }[]
}

export default function PaymentSettingsPage() {
  const [activeProvider, setActiveProvider] = useState<'mpesa' | 'airtel' | 'bank'>('mpesa')
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const providers = [
    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'bg-green-500' },
    { id: 'airtel', label: 'Airtel Money', icon: Wallet, color: 'bg-red-500' },
    { id: 'bank', label: 'Bank Transfer', icon: Building2, color: 'bg-blue-500' },
  ]

  const providerSettings: Record<string, PaymentSetting[]> = {
    mpesa: [
      { key: 'mpesa_consumer_key', value: '', label: 'Consumer Key', description: 'Daraja API consumer key', type: 'password' },
      { key: 'mpesa_consumer_secret', value: '', label: 'Consumer Secret', description: 'Daraja API consumer secret', type: 'password' },
      { key: 'mpesa_pass_key', value: '', label: 'Pass Key', description: 'STK Push pass key', type: 'password' },
      { key: 'mpesa_short_code', value: '', label: 'Short Code', description: 'Paybill or Till number', type: 'text' },
      { key: 'mpesa_callback_url', value: '', label: 'Callback URL', description: 'URL for M-Pesa callbacks (e.g., https://yoursite.com/api/payments/mpesa/callback)', type: 'text' },
      { key: 'mpesa_environment', value: 'sandbox', label: 'Environment', description: 'API environment', type: 'select', options: [
        { value: 'sandbox', label: 'Sandbox (Testing)' },
        { value: 'production', label: 'Production (Live)' },
      ]},
    ],
    airtel: [
      { key: 'airtel_client_id', value: '', label: 'Client ID', description: 'Airtel API client ID', type: 'password' },
      { key: 'airtel_client_secret', value: '', label: 'Client Secret', description: 'Airtel API client secret', type: 'password' },
      { key: 'airtel_merchant_pin', value: '', label: 'Merchant PIN', description: 'Merchant PIN for transactions', type: 'password' },
      { key: 'airtel_callback_url', value: '', label: 'Callback URL', description: 'URL for Airtel callbacks', type: 'text' },
      { key: 'airtel_country', value: 'KE', label: 'Country', description: 'Country of operation', type: 'select', options: [
        { value: 'KE', label: 'Kenya' },
        { value: 'UG', label: 'Uganda' },
        { value: 'TZ', label: 'Tanzania' },
        { value: 'RW', label: 'Rwanda' },
        { value: 'ZM', label: 'Zambia' },
        { value: 'NG', label: 'Nigeria' },
        { value: 'GH', label: 'Ghana' },
      ]},
      { key: 'airtel_environment', value: 'sandbox', label: 'Environment', description: 'API environment', type: 'select', options: [
        { value: 'sandbox', label: 'Sandbox (Testing)' },
        { value: 'production', label: 'Production (Live)' },
      ]},
    ],
    bank: [
      { key: 'bank_name', value: '', label: 'Bank Name', description: 'Name of your bank', type: 'text' },
      { key: 'bank_account_number', value: '', label: 'Account Number', description: 'Bank account number for receiving payments', type: 'text' },
      { key: 'bank_account_name', value: '', label: 'Account Name', description: 'Name on the bank account', type: 'text' },
      { key: 'bank_branch_code', value: '', label: 'Branch Code', description: 'Bank branch code (optional)', type: 'text' },
      { key: 'bank_swift_code', value: '', label: 'SWIFT Code', description: 'SWIFT/BIC code for international transfers (optional)', type: 'text' },
    ],
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()

      if (Array.isArray(data)) {
        const settingsMap: Record<string, string> = {}
        data.forEach((s: { key: string; value: string }) => {
          settingsMap[s.key] = s.value
        })
        setSettings(settingsMap)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    setTestResult(null)

    try {
      const currentProviderSettings = providerSettings[activeProvider]
      const settingsToSave = currentProviderSettings.map((s) => ({
        key: s.key,
        value: settings[s.key] || s.value,
        category: 'payments',
        label: s.label,
        description: s.description,
        type: s.type === 'password' ? 'password' : 'text',
      }))

      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSave }),
      })

      setTestResult({ success: true, message: 'Settings saved successfully!' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setTestResult({ success: false, message: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const currentSettings = providerSettings[activeProvider]

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-gray-600 mt-1">Configure M-Pesa, Airtel Money, and Bank Transfer integrations</p>
        </div>
      </div>

      {testResult && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <div className="flex gap-6">
        {/* Provider Tabs */}
        <div className="w-64 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Payment Providers</h3>
          <nav className="space-y-2">
            {providers.map((provider) => {
              const Icon = provider.icon
              return (
                <button
                  key={provider.id}
                  onClick={() => {
                    setActiveProvider(provider.id as 'mpesa' | 'airtel' | 'bank')
                    setTestResult(null)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeProvider === provider.id
                      ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">{provider.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
            <p className="text-sm text-blue-700">
              {activeProvider === 'mpesa' && 'Get your API credentials from the Safaricom Daraja portal at developer.safaricom.co.ke'}
              {activeProvider === 'airtel' && 'Register for Airtel Money API access at developers.airtel.africa'}
              {activeProvider === 'bank' && 'Enter your bank details so borrowers know where to send payments.'}
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {providers.find((p) => p.id === activeProvider)?.label} Configuration
            </h2>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div className="space-y-6">
            {currentSettings.map((setting) => (
              <div key={setting.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {setting.label}
                </label>

                {setting.type === 'select' ? (
                  <select
                    value={settings[setting.key] || setting.value}
                    onChange={(e) => updateSetting(setting.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {setting.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : setting.type === 'password' ? (
                  <div className="relative">
                    <input
                      type={showSecrets[setting.key] ? 'text' : 'password'}
                      value={settings[setting.key] || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSecret(setting.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets[setting.key] ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={settings[setting.key] || setting.value}
                    onChange={(e) => updateSetting(setting.key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}

                <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
              </div>
            ))}
          </div>

          {activeProvider !== 'bank' && (
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-2">Callback URL Configuration</h4>
              <p className="text-sm text-amber-700 mb-2">
                Make sure to configure your callback URL in the {activeProvider === 'mpesa' ? 'Safaricom Daraja' : 'Airtel'} developer portal.
              </p>
              <p className="text-sm text-amber-800 font-mono bg-amber-100 px-3 py-2 rounded">
                {activeProvider === 'mpesa'
                  ? 'https://yourdomain.com/api/payments/mpesa/callback'
                  : 'https://yourdomain.com/api/payments/airtel/callback'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
