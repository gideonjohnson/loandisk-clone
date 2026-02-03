'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Shield,
  Plus,
  Trash2,
  Globe,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface IpRule {
  id: string
  ipAddress: string
  type: 'WHITELIST' | 'BLACKLIST'
  reason: string
  active: boolean
  createdAt: string
  expiresAt: string | null
  createdByUser?: { name: string }
}

export default function IpRulesPage() {
  const router = useRouter()
  const [rules, setRules] = useState<IpRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [ipAddress, setIpAddress] = useState('')
  const [type, setType] = useState<'WHITELIST' | 'BLACKLIST'>('WHITELIST')
  const [reason, setReason] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/security/ip-rules')
      if (res.ok) {
        const data = await res.json()
        setRules(data)
      }
    } catch (error) {
      console.error('Failed to fetch IP rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ipAddress.trim() || !reason.trim()) return

    setSubmitting(true)
    try {
      const body: Record<string, string> = {
        ipAddress: ipAddress.trim(),
        type,
        reason: reason.trim(),
      }
      if (expiresAt) {
        body.expiresAt = expiresAt
      }

      const res = await fetch('/api/security/ip-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setIpAddress('')
        setType('WHITELIST')
        setReason('')
        setExpiresAt('')
        setShowForm(false)
        await fetchRules()
      }
    } catch (error) {
      console.error('Failed to add IP rule:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (ruleId: string) => {
    setDeletingId(ruleId)
    try {
      const res = await fetch(`/api/security/ip-rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId))
      }
    } catch (error) {
      console.error('Failed to delete IP rule:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const totalRules = rules.length
  const whitelistCount = rules.filter((r) => r.type === 'WHITELIST').length
  const blacklistCount = rules.filter((r) => r.type === 'BLACKLIST').length

  const isExpired = (rule: IpRule) => {
    if (!rule.expiresAt) return false
    return new Date(rule.expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/settings')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">IP Access Rules</h1>
            <p className="text-muted-foreground">
              Manage IP whitelist and blacklist rules for access control
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Whitelist</CardTitle>
            <Globe className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{whitelistCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Blacklist</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blacklistCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inline Add Rule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">IP Address</label>
                  <Input
                    type="text"
                    placeholder="e.g. 192.168.1.1"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'WHITELIST' | 'BLACKLIST')}
                    className="flex h-12 w-full rounded-[10px] border border-input bg-transparent px-4 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    <option value="WHITELIST">Whitelist</option>
                    <option value="BLACKLIST">Blacklist</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Input
                    type="text"
                    placeholder="Reason for this rule"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Expiry Date <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Adding...' : 'Add Rule'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false)
                    setIpAddress('')
                    setType('WHITELIST')
                    setReason('')
                    setExpiresAt('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No IP rules configured</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add whitelist or blacklist rules to control access by IP address.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const expired = isExpired(rule)
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono font-medium">
                        {rule.ipAddress}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.type === 'WHITELIST' ? 'success' : 'destructive'}
                        >
                          {rule.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.reason}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {rule.createdByUser?.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rule.expiresAt
                          ? new Date(rule.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="secondary">Expired</Badge>
                        ) : rule.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          disabled={deletingId === rule.id}
                        >
                          {deletingId === rule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
