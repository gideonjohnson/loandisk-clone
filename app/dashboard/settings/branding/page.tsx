'use client'

import { useState, useEffect } from 'react'
import { Save, Palette, Image, Type, RefreshCw, Eye } from 'lucide-react'

interface BrandingSettings {
  companyName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  loginTitle: string
  loginSubtitle: string
}

const DEFAULT_SETTINGS: BrandingSettings = {
  companyName: 'Meek Microfinance',
  logoUrl: '',
  primaryColor: '#4169E1',
  secondaryColor: '#2a4494',
  loginTitle: 'Welcome Back',
  loginSubtitle: 'Sign in to Meek Loan Management',
}

export default function BrandingSettingsPage() {
  const [settings, setSettings] = useState<BrandingSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<BrandingSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/public/branding')
      const data = await res.json()
      const loaded = {
        companyName: data.companyName || DEFAULT_SETTINGS.companyName,
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || DEFAULT_SETTINGS.primaryColor,
        secondaryColor: data.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
        loginTitle: data.loginTitle || DEFAULT_SETTINGS.loginTitle,
        loginSubtitle: data.loginSubtitle || DEFAULT_SETTINGS.loginSubtitle,
      }
      setSettings(loaded)
      setOriginalSettings(loaded)
    } catch (error) {
      console.error('Failed to fetch branding:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      setOriginalSettings(settings)
      setMessage({ type: 'success', text: 'Branding settings saved successfully!' })
    } catch (error) {
      console.error('Failed to save branding:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Branding Settings</h1>
          <p className="text-gray-600 mt-1">Customize the appearance of your login page</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-5 h-5" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding Configuration
          </h2>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your Company Name"
            />
            <p className="mt-1 text-sm text-gray-500">Displayed in emails and page headers</p>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Logo URL
            </label>
            <input
              type="text"
              value={settings.logoUrl}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/logo.png"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to show the first letter of company name. Recommended size: 80x80px
            </p>
            {settings.logoUrl && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="w-16 h-16 object-contain mx-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#4169E1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="#2a4494"
                />
              </div>
            </div>
          </div>

          {/* Login Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Login Title
            </label>
            <input
              type="text"
              value={settings.loginTitle}
              onChange={(e) => setSettings({ ...settings, loginTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Welcome Back"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login Subtitle
            </label>
            <input
              type="text"
              value={settings.loginSubtitle}
              onChange={(e) => setSettings({ ...settings, loginSubtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sign in to Your Account"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5" />
            Login Page Preview
          </h2>

          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: `linear-gradient(to bottom right, ${settings.primaryColor}, ${settings.secondaryColor})`,
            }}
          >
            <div className="p-8 flex flex-col items-center">
              {/* Logo Preview */}
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl mb-4">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = `<span style="color: ${settings.primaryColor}" class="font-bold text-3xl">${settings.companyName.charAt(0)}</span>`
                    }}
                  />
                ) : (
                  <span style={{ color: settings.primaryColor }} className="font-bold text-3xl">
                    {settings.companyName.charAt(0)}
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white text-center">
                {settings.loginTitle}
              </h3>
              <p className="text-white/80 text-sm text-center mt-1">
                {settings.loginSubtitle}
              </p>

              {/* Mock Login Form */}
              <div className="bg-white rounded-xl shadow-xl p-6 mt-6 w-full max-w-xs">
                <div className="space-y-3">
                  <div className="h-10 bg-gray-100 rounded-lg"></div>
                  <div className="h-10 bg-gray-100 rounded-lg"></div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: settings.primaryColor }}
                    ></div>
                    <span className="text-xs text-gray-500">Remember me for 30 days</span>
                  </div>
                  <button
                    className="w-full py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            This is a preview of how your login page will look
          </p>
        </div>
      </div>
    </div>
  )
}
