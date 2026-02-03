'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Download,
  Monitor,
  Globe,
  Clock,
  Bell,
  Trash2,
  LogOut,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Laptop,
  Tablet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

// ---------- Type definitions for new sections ----------

interface LoginHistoryEntry {
  id: string
  ipAddress: string
  userAgent: string
  deviceType: string
  browser: string
  os: string
  location: string
  status: string
  createdAt: string
}

interface DeviceEntry {
  id: string
  deviceName: string
  deviceType: string
  browser: string
  os: string
  lastIpAddress: string
  isTrusted: boolean
  lastUsedAt: string
}

interface SessionEntry {
  id: string
  ipAddress: string
  userAgent: string
  isActive: boolean
  lastActivity: string
  createdAt: string
  device?: { deviceName: string }
}

interface AlertEntry {
  id: string
  type: string
  title: string
  message: string
  severity: string
  acknowledged: boolean
  createdAt: string
}

type SecurityTab = 'login-history' | 'devices' | 'sessions' | 'alerts'

// ---------- Helper functions ----------

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return formatDate(dateStr)
}

function getDeviceIcon(deviceType: string) {
  const dt = deviceType?.toLowerCase() || ''
  if (dt.includes('mobile') || dt.includes('phone')) return Smartphone
  if (dt.includes('tablet')) return Tablet
  if (dt.includes('laptop')) return Laptop
  return Monitor
}

export default function SecuritySettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupMode, setSetupMode] = useState(false)
  const [disableMode, setDisableMode] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesCount, setBackupCodesCount] = useState(0)
  const [regeneratingCodes, setRegeneratingCodes] = useState(false)
  const [copied, setCopied] = useState(false)

  // ---------- New state for tabbed sections ----------
  const [activeSecurityTab, setActiveSecurityTab] = useState<SecurityTab>('login-history')
  const [tabLoading, setTabLoading] = useState(false)

  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([])
  const [loginHistoryLoaded, setLoginHistoryLoaded] = useState(false)

  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [devicesLoaded, setDevicesLoaded] = useState(false)

  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  const [alerts, setAlerts] = useState<AlertEntry[]>([])
  const [alertsLoaded, setAlertsLoaded] = useState(false)

  useEffect(() => {
    check2FAStatus()
  }, [])

  // ---------- Fetch data when tab changes ----------

  const fetchLoginHistory = useCallback(async () => {
    if (loginHistoryLoaded) return
    setTabLoading(true)
    try {
      const res = await fetch('/api/security/login-history')
      if (res.ok) {
        const data = await res.json()
        setLoginHistory(Array.isArray(data) ? data.slice(0, 20) : [])
        setLoginHistoryLoaded(true)
      }
    } catch (error) {
      console.error('Failed to fetch login history:', error)
    } finally {
      setTabLoading(false)
    }
  }, [loginHistoryLoaded])

  const fetchDevices = useCallback(async () => {
    if (devicesLoaded) return
    setTabLoading(true)
    try {
      const res = await fetch('/api/security/devices')
      if (res.ok) {
        const data = await res.json()
        setDevices(Array.isArray(data) ? data : [])
        setDevicesLoaded(true)
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setTabLoading(false)
    }
  }, [devicesLoaded])

  const fetchSessions = useCallback(async () => {
    if (sessionsLoaded) return
    setTabLoading(true)
    try {
      const res = await fetch('/api/security/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : [])
        setSessionsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setTabLoading(false)
    }
  }, [sessionsLoaded])

  const fetchAlerts = useCallback(async () => {
    if (alertsLoaded) return
    setTabLoading(true)
    try {
      const res = await fetch('/api/security/alerts')
      if (res.ok) {
        const data = await res.json()
        setAlerts(Array.isArray(data) ? data : [])
        setAlertsLoaded(true)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setTabLoading(false)
    }
  }, [alertsLoaded])

  useEffect(() => {
    switch (activeSecurityTab) {
      case 'login-history':
        fetchLoginHistory()
        break
      case 'devices':
        fetchDevices()
        break
      case 'sessions':
        fetchSessions()
        break
      case 'alerts':
        fetchAlerts()
        break
    }
  }, [activeSecurityTab, fetchLoginHistory, fetchDevices, fetchSessions, fetchAlerts])

  // ---------- Action handlers for new sections ----------

  const handleTrustDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/security/devices/${deviceId}/trust`, { method: 'POST' })
      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, isTrusted: true } : d))
        )
        toast({ title: 'Device trusted', description: 'This device has been marked as trusted.' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to trust device', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to trust device', variant: 'destructive' })
    }
  }

  const handleUntrustDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/security/devices/${deviceId}/trust`, { method: 'POST' })
      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, isTrusted: false } : d))
        )
        toast({ title: 'Device untrusted', description: 'Trust has been removed from this device.' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to update device', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update device', variant: 'destructive' })
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to remove this device?')) return
    try {
      const res = await fetch(`/api/security/devices?deviceId=${deviceId}`, { method: 'DELETE' })
      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d.id !== deviceId))
        toast({ title: 'Device removed', description: 'The device has been removed.' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to remove device', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove device', variant: 'destructive' })
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/security/sessions?sessionId=${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
        toast({ title: 'Session revoked', description: 'The session has been terminated.' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to revoke session', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke session', variant: 'destructive' })
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('This will sign you out of all other sessions. Continue?')) return
    try {
      const res = await fetch('/api/security/sessions?all=true', { method: 'DELETE' })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isActive).slice(0, 1))
        setSessionsLoaded(false)
        fetchSessions()
        toast({ title: 'All sessions revoked', description: 'All other sessions have been terminated.' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to revoke sessions', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke sessions', variant: 'destructive' })
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/security/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      })
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
        )
        toast({ title: 'Alert acknowledged' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to acknowledge alert', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to acknowledge alert', variant: 'destructive' })
    }
  }

  const handleAcknowledgeAllAlerts = async () => {
    try {
      const res = await fetch('/api/security/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))
        toast({ title: 'All alerts acknowledged' })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Failed to acknowledge alerts', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to acknowledge alerts', variant: 'destructive' })
    }
  }

  // ---------- Existing 2FA handlers ----------

  const check2FAStatus = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup')
      const data = await res.json()
      setIs2FAEnabled(data.enabled)

      if (data.enabled) {
        const codesRes = await fetch('/api/auth/2fa/backup-codes')
        const codesData = await codesRes.json()
        setBackupCodesCount(codesData.remainingCodes || 0)
      }
    } catch (error) {
      console.error('Failed to check 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const startSetup = async () => {
    setSetupMode(true)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setQrCode(data.qrCode)
        setSecret(data.secret)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to start 2FA setup',
          variant: 'destructive',
        })
        setSetupMode(false)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start 2FA setup',
        variant: 'destructive',
      })
      setSetupMode(false)
    }
  }

  const verifyAndEnable = async () => {
    if (verificationCode.length < 6) {
      toast({
        title: 'Error',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      })
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode, action: 'enable' }),
      })

      const data = await res.json()

      if (res.ok) {
        setBackupCodes(data.backupCodes || [])
        setShowBackupCodes(true)
        setIs2FAEnabled(true)
        setSetupMode(false)
        toast({
          title: 'Success',
          description: '2FA has been enabled successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Invalid verification code',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify code',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
      setVerificationCode('')
    }
  }

  const disable2FA = async () => {
    if (verificationCode.length < 6) {
      toast({
        title: 'Error',
        description: 'Please enter a 6-digit code or backup code',
        variant: 'destructive',
      })
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })

      const data = await res.json()

      if (res.ok) {
        setIs2FAEnabled(false)
        setDisableMode(false)
        setBackupCodesCount(0)
        toast({
          title: 'Success',
          description: '2FA has been disabled',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to disable 2FA',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disable 2FA',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
      setVerificationCode('')
    }
  }

  const regenerateBackupCodes = async () => {
    const code = prompt('Enter your current 2FA code to regenerate backup codes:')
    if (!code) return

    setRegeneratingCodes(true)
    try {
      const res = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (res.ok) {
        setBackupCodes(data.backupCodes || [])
        setShowBackupCodes(true)
        setBackupCodesCount(data.backupCodes?.length || 0)
        toast({
          title: 'Success',
          description: 'Backup codes have been regenerated',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to regenerate codes',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate backup codes',
        variant: 'destructive',
      })
    } finally {
      setRegeneratingCodes(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
    toast({
      title: 'Copied',
      description: 'Backup codes copied to clipboard',
    })
  }

  const downloadBackupCodes = () => {
    const codesText = `Meek Microfinance - 2FA Backup Codes\n${'='.repeat(40)}\n\nKeep these codes safe. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'meek-2fa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---------- Severity badge helper ----------

  const severityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'LOW':
        return <Badge variant="secondary">{severity}</Badge>
      case 'MEDIUM':
        return <Badge variant="warning">{severity}</Badge>
      case 'HIGH':
        return <Badge variant="destructive">{severity}</Badge>
      case 'CRITICAL':
        return (
          <Badge variant="destructive" className="bg-red-700 hover:bg-red-800">
            {severity}
          </Badge>
        )
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  // ---------- Tab configuration ----------

  const securityTabs: { key: SecurityTab; label: string; icon: React.ElementType }[] = [
    { key: 'login-history', label: 'Login History', icon: Clock },
    { key: 'devices', label: 'Devices', icon: Monitor },
    { key: 'sessions', label: 'Sessions', icon: Globe },
    { key: 'alerts', label: 'Alerts', icon: Bell },
  ]

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/settings')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground">Manage your account security</p>
        </div>
      </div>

      {/* Backup Codes Modal */}
      {showBackupCodes && backupCodes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Key className="h-5 w-5" />
              Save Your Backup Codes
            </CardTitle>
            <CardDescription className="text-amber-700">
              Store these codes safely. You&apos;ll need them if you lose access to your authenticator app.
              Each code can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-4 bg-white rounded-lg border font-mono text-sm">
              {backupCodes.map((code, i) => (
                <div key={i} className="p-2 bg-gray-50 rounded text-center">
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowBackupCodes(false)}
                className="ml-auto"
              >
                I&apos;ve Saved These Codes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2FA Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Shield className={`h-6 w-6 ${is2FAEnabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
              {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!setupMode && !disableMode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {is2FAEnabled
                  ? 'Your account is protected with two-factor authentication using an authenticator app.'
                  : 'Protect your account by requiring a verification code from your authenticator app when signing in.'}
              </p>

              {is2FAEnabled && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Backup Codes</p>
                    <p className="text-sm text-muted-foreground">
                      {backupCodesCount} codes remaining
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateBackupCodes}
                    disabled={regeneratingCodes}
                  >
                    {regeneratingCodes ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                {is2FAEnabled ? (
                  <Button
                    variant="destructive"
                    onClick={() => setDisableMode(true)}
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button onClick={startSetup}>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>
          ) : setupMode ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use an authenticator app like Google Authenticator, Authy, or 1Password to scan this QR code.
                  </p>
                  {qrCode && (
                    <div className="inline-block p-4 bg-white border rounded-lg">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Or Enter Manually</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Can&apos;t scan? Enter this code manually in your authenticator app:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                      {secret}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copySecret}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Verify Code</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter the 6-digit code from your authenticator app:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="w-32 text-center font-mono text-lg tracking-widest"
                    />
                    <Button onClick={verifyAndEnable} disabled={verifying || verificationCode.length < 6}>
                      {verifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Verify & Enable'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="ghost" onClick={() => setSetupMode(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : disableMode ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Disable Two-Factor Authentication?</h3>
                    <p className="text-sm text-red-700 mt-1">
                      This will make your account less secure. You&apos;ll only need your password to sign in.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your 2FA code or backup code to confirm:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="destructive" onClick={disable2FA} disabled={verifying}>
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Disable 2FA'
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    setDisableMode(false)
                    setVerificationCode('')
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Additional Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommended Authenticator Apps</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Google Authenticator (iOS, Android)</span>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Authy (iOS, Android, Desktop)</span>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>1Password (iOS, Android, Desktop)</span>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span>Microsoft Authenticator (iOS, Android)</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Security Monitoring Tabs                                      */}
      {/* ============================================================ */}

      <div className="space-y-4">
        {/* Tab Bar */}
        <div className="flex border-b">
          {securityTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeSecurityTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSecurityTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.key === 'alerts' && unacknowledgedCount > 0 && (
                  <span className="ml-1 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                    {unacknowledgedCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {tabLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ---- Login History Tab ---- */}
            {activeSecurityTab === 'login-history' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5" />
                    Login History
                  </CardTitle>
                  <CardDescription>
                    Your most recent sign-in activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loginHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No login history available.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {loginHistory.map((entry) => {
                        const DeviceIcon = getDeviceIcon(entry.deviceType)
                        return (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-gray-100 mt-0.5">
                              <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {entry.browser || 'Unknown Browser'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  on {entry.os || 'Unknown OS'}
                                </span>
                                {entry.status?.toUpperCase() === 'SUCCESS' ? (
                                  <Badge variant="success" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Success
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {entry.ipAddress}
                                </span>
                                {entry.location && (
                                  <span>{entry.location}</span>
                                )}
                                <span className="capitalize">{entry.deviceType}</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ---- Devices Tab ---- */}
            {activeSecurityTab === 'devices' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Monitor className="h-5 w-5" />
                    Recognized Devices
                  </CardTitle>
                  <CardDescription>
                    Devices that have been used to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {devices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No devices found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {devices.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.deviceType)
                        return (
                          <div
                            key={device.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                          >
                            <div className={`p-2 rounded-lg ${device.isTrusted ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <DeviceIcon className={`h-4 w-4 ${device.isTrusted ? 'text-green-600' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {device.deviceName || `${device.browser} on ${device.os}`}
                                </span>
                                {device.isTrusted && (
                                  <Badge variant="success" className="text-xs">Trusted</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{device.browser} / {device.os}</span>
                                <span className="flex items-center gap-1">
                                  <Globe className="h-3 w-3" />
                                  {device.lastIpAddress}
                                </span>
                                <span>Last used {formatRelativeTime(device.lastUsedAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {device.isTrusted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUntrustDevice(device.id)}
                                >
                                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                  Untrust
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTrustDevice(device.id)}
                                >
                                  <Shield className="h-3.5 w-3.5 mr-1" />
                                  Trust
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveDevice(device.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ---- Sessions Tab ---- */}
            {activeSecurityTab === 'sessions' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5" />
                        Active Sessions
                      </CardTitle>
                      <CardDescription>
                        Sessions currently signed into your account
                      </CardDescription>
                    </div>
                    {sessions.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRevokeAllSessions}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1" />
                        Revoke All Others
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active sessions found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className={`p-2 rounded-lg ${session.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Globe className={`h-4 w-4 ${session.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {session.device?.deviceName || session.userAgent?.split(' ')[0] || 'Unknown Device'}
                              </span>
                              {session.isActive && (
                                <Badge variant="success" className="text-xs">Active</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                {session.ipAddress}
                              </span>
                              <span>
                                Last activity {formatRelativeTime(session.lastActivity)}
                              </span>
                              <span>
                                Started {formatDate(session.createdAt)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            <LogOut className="h-3.5 w-3.5 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ---- Alerts Tab ---- */}
            {activeSecurityTab === 'alerts' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Bell className="h-5 w-5" />
                        Security Alerts
                      </CardTitle>
                      <CardDescription>
                        Notifications about security events on your account
                      </CardDescription>
                    </div>
                    {unacknowledgedCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAcknowledgeAllAlerts}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Acknowledge All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No security alerts.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            alert.acknowledged
                              ? 'bg-card opacity-60'
                              : 'bg-card border-amber-200'
                          }`}
                        >
                          <div className={`p-2 rounded-lg mt-0.5 ${
                            alert.severity?.toUpperCase() === 'CRITICAL' || alert.severity?.toUpperCase() === 'HIGH'
                              ? 'bg-red-100'
                              : alert.severity?.toUpperCase() === 'MEDIUM'
                                ? 'bg-amber-100'
                                : 'bg-gray-100'
                          }`}>
                            <ShieldAlert className={`h-4 w-4 ${
                              alert.severity?.toUpperCase() === 'CRITICAL' || alert.severity?.toUpperCase() === 'HIGH'
                                ? 'text-red-600'
                                : alert.severity?.toUpperCase() === 'MEDIUM'
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {alert.title}
                              </span>
                              {severityBadge(alert.severity)}
                              {alert.acknowledged && (
                                <Badge variant="secondary" className="text-xs">Acknowledged</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.message}
                            </p>
                            <span className="text-xs text-muted-foreground mt-1 inline-block">
                              {formatRelativeTime(alert.createdAt)}
                            </span>
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
