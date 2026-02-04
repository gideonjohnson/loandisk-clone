'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Building2, Mail, MessageSquare, Percent, Shield, ChevronRight, Bell, Lock, DollarSign, CreditCard } from 'lucide-react'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/currencyConfig'

interface Setting {
  id: string
  category: string
  key: string
  value: string
  label: string
  description: string | null
  type: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('company')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setSettings(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    )
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'currency', label: 'Currency', icon: DollarSign },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'loans', label: 'Loan Settings', icon: Percent },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/dashboard/settings/notifications' },
    { id: 'payments', label: 'Payments', icon: CreditCard, href: '/dashboard/settings/payments' },
    { id: 'permissions', label: 'Permissions', icon: Lock, href: '/dashboard/settings/permissions' },
    { id: 'security', label: 'Security', icon: Shield, href: '/dashboard/settings/security' },
  ]

  const filteredSettings = settings.filter((s) => s.category === activeTab)

  // Currency options from config
  const currencyOptions = Object.values(SUPPORTED_CURRENCIES).map((c) => ({
    value: c.code,
    label: `${c.code} - ${c.name} (${c.symbol})`,
  }))

  // Default settings structure if none exist
  const defaultSettings: Record<string, { label: string; description: string; type: string; defaultValue: string; options?: { value: string; label: string }[] }[]> = {
    company: [
      { label: 'Company Name', description: 'Your organization name', type: 'text', defaultValue: 'Meek Microfinance' },
      { label: 'Company Email', description: 'Main contact email', type: 'text', defaultValue: 'info@meek.co.ke' },
      { label: 'Company Phone', description: 'Main contact phone', type: 'text', defaultValue: '+254700000000' },
      { label: 'Company Address', description: 'Physical address', type: 'text', defaultValue: 'Nairobi, Kenya' },
    ],
    currency: [
      { label: 'Default Currency', description: 'Primary currency for new loans and transactions', type: 'currency-select', defaultValue: 'KES', options: currencyOptions },
      { label: 'Display Format', description: 'How currency amounts are displayed', type: 'select', defaultValue: 'symbol', options: [
        { value: 'symbol', label: 'Symbol (e.g., KSh 1,000)' },
        { value: 'code', label: 'Code (e.g., KES 1,000)' },
        { value: 'both', label: 'Both (e.g., KSh 1,000 KES)' },
      ]},
      { label: 'Decimal Places', description: 'Number of decimal places for currency', type: 'select', defaultValue: '2', options: [
        { value: '0', label: 'No decimals (1,000)' },
        { value: '2', label: 'Two decimals (1,000.00)' },
      ]},
    ],
    email: [
      { label: 'SMTP Host', description: 'Email server host', type: 'text', defaultValue: '' },
      { label: 'SMTP Port', description: 'Email server port', type: 'number', defaultValue: '587' },
      { label: 'SMTP User', description: 'Email username', type: 'text', defaultValue: '' },
      { label: 'From Email', description: 'Sender email address', type: 'text', defaultValue: '' },
      { label: 'From Name', description: 'Sender display name', type: 'text', defaultValue: 'Meek Microfinance' },
    ],
    sms: [
      { label: 'SMS Provider', description: 'SMS service provider', type: 'select', defaultValue: 'africastalking' },
      { label: 'API Key', description: 'SMS provider API key', type: 'password', defaultValue: '' },
      { label: 'Sender ID', description: 'SMS sender ID', type: 'text', defaultValue: 'MEEK' },
    ],
    loans: [
      { label: 'Default Interest Rate', description: 'Default annual interest rate (%)', type: 'number', defaultValue: '12' },
      { label: 'Max Loan Amount', description: 'Maximum loan amount (KSh)', type: 'number', defaultValue: '10000000' },
      { label: 'Min Loan Amount', description: 'Minimum loan amount (KSh)', type: 'number', defaultValue: '10000' },
      { label: 'Grace Period Days', description: 'Days before late fees apply', type: 'number', defaultValue: '3' },
      { label: 'Late Fee Percentage', description: 'Late payment fee (%)', type: 'number', defaultValue: '2' },
    ],
    security: [
      { label: 'Session Timeout', description: 'Minutes before auto-logout', type: 'number', defaultValue: '30' },
      { label: 'Max Login Attempts', description: 'Failed attempts before lockout', type: 'number', defaultValue: '5' },
      { label: 'Require 2FA for Admins', description: 'Force 2FA for admin users', type: 'boolean', defaultValue: 'false' },
      { label: 'Password Min Length', description: 'Minimum password characters', type: 'number', defaultValue: '8' },
    ],
  }

  if (loading) {
    return <div className="p-6">Loading settings...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure system settings and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const hasHref = 'href' in tab && tab.href
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (hasHref) {
                      router.push(tab.href as string)
                    } else {
                      setActiveTab(tab.id)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left rounded-lg ${
                    activeTab === tab.id && !hasHref
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1">{tab.label}</span>
                  {hasHref && <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {tabs.find((t) => t.id === activeTab)?.label} Settings
          </h2>

          <div className="space-y-6">
            {(defaultSettings[activeTab] || []).map((field, index) => {
              const setting = filteredSettings.find(
                (s) => s.label === field.label
              )
              const value = setting?.value || field.defaultValue

              return (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'boolean' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value === 'true'}
                        onChange={(e) =>
                          updateSetting(
                            field.label.toLowerCase().replace(/\s+/g, '_'),
                            e.target.checked ? 'true' : 'false'
                          )
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600">{field.description}</span>
                    </label>
                  ) : field.type === 'select' || field.type === 'currency-select' ? (
                    <select
                      value={value}
                      onChange={(e) =>
                        updateSetting(
                          field.label.toLowerCase().replace(/\s+/g, '_'),
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {field.options ? (
                        field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="africastalking">Africa&apos;s Talking</option>
                          <option value="twilio">Twilio</option>
                          <option value="nexmo">Vonage (Nexmo)</option>
                        </>
                      )}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={value}
                      onChange={(e) =>
                        updateSetting(
                          field.label.toLowerCase().replace(/\s+/g, '_'),
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {field.type !== 'boolean' && (
                    <p className="mt-1 text-sm text-gray-500">{field.description}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
