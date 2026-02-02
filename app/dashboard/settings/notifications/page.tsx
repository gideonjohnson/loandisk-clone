'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Mail, MessageSquare, TestTube, CheckCircle, XCircle } from 'lucide-react'

interface NotificationSettings {
  // Email
  emailProvider: 'smtp' | 'sendgrid' | 'mock'
  emailFrom: string
  emailFromName: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  sendgridApiKey: string
  // SMS
  smsProvider: 'twilio' | 'africastalking' | 'mock'
  twilioAccountSid: string
  twilioAuthToken: string
  twilioFromNumber: string
  atApiKey: string
  atUsername: string
  atFrom: string
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailProvider: 'mock',
    emailFrom: '',
    emailFromName: 'Meek Microfinance',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: false,
    sendgridApiKey: '',
    smsProvider: 'mock',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    atApiKey: '',
    atUsername: '',
    atFrom: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingSMS, setTestingSMS] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?category=notifications')
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object') {
          setSettings((prev) => ({ ...prev, ...data }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'notifications', settings }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const testEmail = async () => {
    setTestingEmail(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Test email sent successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Email test failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Email test failed' })
    } finally {
      setTestingEmail(false)
    }
  }

  const testSMS = async () => {
    setTestingSMS(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Test SMS sent successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'SMS test failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'SMS test failed' })
    } finally {
      setTestingSMS(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading settings...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-gray-600 mt-1">Configure email and SMS providers</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Email Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold">Email Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Provider</label>
            <select
              value={settings.emailProvider}
              onChange={(e) => setSettings({ ...settings, emailProvider: e.target.value as NotificationSettings['emailProvider'] })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="mock">Mock (Development)</option>
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From Email</label>
              <input
                type="email"
                value={settings.emailFrom}
                onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="noreply@meek.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">From Name</label>
              <input
                type="text"
                value={settings.emailFromName}
                onChange={(e) => setSettings({ ...settings, emailFromName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Meek Microfinance"
              />
            </div>
          </div>

          {settings.emailProvider === 'smtp' && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">SMTP Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SMTP Password</label>
                  <input
                    type="password"
                    value={settings.smtpPass}
                    onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={settings.smtpSecure}
                  onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Use SSL/TLS</span>
              </label>
            </div>
          )}

          {settings.emailProvider === 'sendgrid' && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">SendGrid Configuration</h3>
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={settings.sendgridApiKey}
                  onChange={(e) => setSettings({ ...settings, sendgridApiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="SG.xxxx..."
                />
              </div>
            </div>
          )}

          <button
            onClick={testEmail}
            disabled={testingEmail}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Send Test Email
          </button>
        </div>
      </div>

      {/* SMS Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold">SMS Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">SMS Provider</label>
            <select
              value={settings.smsProvider}
              onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value as NotificationSettings['smsProvider'] })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="mock">Mock (Development)</option>
              <option value="twilio">Twilio</option>
              <option value="africastalking">Africa&apos;s Talking</option>
            </select>
          </div>

          {settings.smsProvider === 'twilio' && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Twilio Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Account SID</label>
                  <input
                    type="text"
                    value={settings.twilioAccountSid}
                    onChange={(e) => setSettings({ ...settings, twilioAccountSid: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="ACxxxx..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Auth Token</label>
                  <input
                    type="password"
                    value={settings.twilioAuthToken}
                    onChange={(e) => setSettings({ ...settings, twilioAuthToken: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">From Number</label>
                  <input
                    type="text"
                    value={settings.twilioFromNumber}
                    onChange={(e) => setSettings({ ...settings, twilioFromNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>
          )}

          {settings.smsProvider === 'africastalking' && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Africa&apos;s Talking Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">API Key</label>
                  <input
                    type="password"
                    value={settings.atApiKey}
                    onChange={(e) => setSettings({ ...settings, atApiKey: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={settings.atUsername}
                    onChange={(e) => setSettings({ ...settings, atUsername: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Sender ID</label>
                  <input
                    type="text"
                    value={settings.atFrom}
                    onChange={(e) => setSettings({ ...settings, atFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="MEEK"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={testSMS}
            disabled={testingSMS}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {testingSMS ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Send Test SMS
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  )
}
