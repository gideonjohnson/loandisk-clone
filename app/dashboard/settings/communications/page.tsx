'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Save, Mail, MessageSquare, CheckCircle, XCircle, Eye, EyeOff, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface SettingField {
  key: string
  value: string
  label: string
  description: string
  type: 'text' | 'password' | 'select' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export default function CommunicationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const emailSettings: SettingField[] = [
    { key: 'email_provider', value: 'mock', label: 'Email Provider', description: 'Select your email service provider', type: 'select', options: [
      { value: 'mock', label: 'Mock (Testing Only)' },
      { value: 'smtp', label: 'SMTP Server' },
      { value: 'sendgrid', label: 'SendGrid' },
    ]},
    { key: 'email_from', value: '', label: 'From Email', description: 'Sender email address', type: 'text', placeholder: 'noreply@yourcompany.com' },
    { key: 'email_from_name', value: '', label: 'From Name', description: 'Sender display name', type: 'text', placeholder: 'Meek Microfinance' },
    // SMTP Settings
    { key: 'smtp_host', value: '', label: 'SMTP Host', description: 'SMTP server hostname', type: 'text', placeholder: 'smtp.gmail.com' },
    { key: 'smtp_port', value: '587', label: 'SMTP Port', description: 'SMTP server port (usually 587 for TLS or 465 for SSL)', type: 'number' },
    { key: 'smtp_user', value: '', label: 'SMTP Username', description: 'SMTP authentication username', type: 'text', placeholder: 'your-email@gmail.com' },
    { key: 'smtp_pass', value: '', label: 'SMTP Password', description: 'SMTP authentication password or app-specific password', type: 'password' },
    { key: 'smtp_secure', value: 'false', label: 'Use SSL', description: 'Enable for port 465, disable for port 587 with TLS', type: 'select', options: [
      { value: 'false', label: 'No (Use TLS - Recommended)' },
      { value: 'true', label: 'Yes (Use SSL)' },
    ]},
    // SendGrid Settings
    { key: 'sendgrid_api_key', value: '', label: 'SendGrid API Key', description: 'Your SendGrid API key', type: 'password', placeholder: 'SG.xxxxx' },
  ]

  const smsSettings: SettingField[] = [
    { key: 'sms_provider', value: 'mock', label: 'SMS Provider', description: 'Select your SMS service provider', type: 'select', options: [
      { value: 'mock', label: 'Mock (Testing Only)' },
      { value: 'africastalking', label: "Africa's Talking" },
      { value: 'twilio', label: 'Twilio' },
    ]},
    // Africa's Talking Settings
    { key: 'at_api_key', value: '', label: "Africa's Talking API Key", description: 'Your AT API key', type: 'password' },
    { key: 'at_username', value: '', label: "Africa's Talking Username", description: 'Your AT username (use "sandbox" for testing)', type: 'text', placeholder: 'sandbox' },
    { key: 'at_from', value: '', label: 'Sender ID', description: 'SMS sender ID (alphanumeric, max 11 chars)', type: 'text', placeholder: 'MEEK' },
    // Twilio Settings
    { key: 'twilio_account_sid', value: '', label: 'Twilio Account SID', description: 'Your Twilio Account SID', type: 'password', placeholder: 'ACxxxxx' },
    { key: 'twilio_auth_token', value: '', label: 'Twilio Auth Token', description: 'Your Twilio Auth Token', type: 'password' },
    { key: 'twilio_from_number', value: '', label: 'Twilio Phone Number', description: 'Your Twilio phone number', type: 'text', placeholder: '+1234567890' },
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/communications')
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(data.settings)
        }
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
    setResult(null)

    try {
      const res = await fetch('/api/settings/communications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      if (res.ok) {
        setResult({ success: true, message: 'Settings saved successfully!' })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setResult({ success: false, message: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const testConfiguration = async () => {
    const testRecipient = activeTab === 'email' ? testEmail : testPhone

    if (!testRecipient) {
      setResult({ success: false, message: `Please enter a test ${activeTab === 'email' ? 'email address' : 'phone number'}` })
      return
    }

    setTesting(true)
    setResult(null)

    try {
      const res = await fetch('/api/settings/communications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          recipient: testRecipient,
          settings,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setResult({ success: true, message: `Test ${activeTab === 'email' ? 'email' : 'SMS'} sent successfully!` })
      } else {
        setResult({ success: false, message: data.error || `Failed to send test ${activeTab}` })
      }
    } catch (error) {
      console.error('Test failed:', error)
      setResult({ success: false, message: `Failed to send test ${activeTab}` })
    } finally {
      setTesting(false)
    }
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const currentSettings = activeTab === 'email' ? emailSettings : smsSettings
  const selectedProvider = settings[activeTab === 'email' ? 'email_provider' : 'sms_provider'] || 'mock'

  // Filter settings based on selected provider
  const filteredSettings = currentSettings.filter((setting) => {
    if (activeTab === 'email') {
      // Always show provider selector and from fields
      if (['email_provider', 'email_from', 'email_from_name'].includes(setting.key)) return true
      // Show SMTP settings only for SMTP provider
      if (setting.key.startsWith('smtp_')) return selectedProvider === 'smtp'
      // Show SendGrid settings only for SendGrid provider
      if (setting.key.startsWith('sendgrid_')) return selectedProvider === 'sendgrid'
    } else {
      // Always show provider selector
      if (setting.key === 'sms_provider') return true
      // Show AT settings only for AT provider
      if (setting.key.startsWith('at_')) return selectedProvider === 'africastalking'
      // Show Twilio settings only for Twilio provider
      if (setting.key.startsWith('twilio_')) return selectedProvider === 'twilio'
    }
    return false
  })

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
          <h1 className="text-3xl font-bold text-gray-900">Communications Settings</h1>
          <p className="text-gray-600 mt-1">Configure Email and SMS notification providers</p>
        </div>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => { setActiveTab('email'); setResult(null) }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'email'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-5 h-5" />
              Email Settings
            </button>
            <button
              onClick={() => { setActiveTab('sms'); setResult(null) }}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              SMS Settings
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-2 space-y-6">
              {filteredSettings.map((setting) => (
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
                        placeholder={setting.placeholder}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      type={setting.type}
                      value={settings[setting.key] || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      placeholder={setting.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}

                  <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>

            {/* Test Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a test {activeTab === 'email' ? 'email' : 'SMS'} to verify your configuration is working correctly.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'email' ? 'Test Email Address' : 'Test Phone Number'}
                  </label>
                  {activeTab === 'email' ? (
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+254700000000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                <button
                  onClick={testConfiguration}
                  disabled={testing || selectedProvider === 'mock'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {testing ? 'Sending...' : `Send Test ${activeTab === 'email' ? 'Email' : 'SMS'}`}
                </button>

                {selectedProvider === 'mock' && (
                  <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Mock provider selected. Choose a real provider to send actual messages.
                  </p>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Provider Information</h4>
                  {activeTab === 'email' ? (
                    <div className="text-xs text-gray-500 space-y-2">
                      {selectedProvider === 'smtp' && (
                        <>
                          <p><strong>Gmail:</strong> Use smtp.gmail.com, port 587, and an App Password.</p>
                          <p><strong>Outlook:</strong> Use smtp.office365.com, port 587.</p>
                        </>
                      )}
                      {selectedProvider === 'sendgrid' && (
                        <p>Get your API key from <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">sendgrid.com</a></p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 space-y-2">
                      {selectedProvider === 'africastalking' && (
                        <p>Sign up at <a href="https://africastalking.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">africastalking.com</a>. Use username &quot;sandbox&quot; for testing.</p>
                      )}
                      {selectedProvider === 'twilio' && (
                        <p>Get your credentials from <a href="https://twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">twilio.com/console</a></p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
