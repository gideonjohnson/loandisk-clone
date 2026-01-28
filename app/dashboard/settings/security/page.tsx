'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

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

  useEffect(() => {
    check2FAStatus()
  }, [])

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
              Store these codes safely. You'll need them if you lose access to your authenticator app.
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
                I've Saved These Codes
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
                    Can't scan? Enter this code manually in your authenticator app:
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
                      This will make your account less secure. You'll only need your password to sign in.
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
    </div>
  )
}
