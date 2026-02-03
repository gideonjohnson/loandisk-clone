'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Shield, Eye, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface FraudCheck {
  id: string
  riskScore: number
  isSuspicious: boolean
  flags: string[]
  checkedAt: string
  borrower: { firstName: string; lastName: string }
  loan?: { loanNumber: string }
}

export default function FraudDashboardPage() {
  const [checks, setChecks] = useState<FraudCheck[]>([])
  const [filter, setFilter] = useState<'all' | 'suspicious' | 'clear'>('all')
  const [loading, setLoading] = useState(true)

  const fetchChecks = () => {
    const params = filter === 'suspicious' ? '?suspicious=true' : filter === 'clear' ? '?suspicious=false' : ''
    fetch(`/api/fraud${params}`)
      .then(r => r.json())
      .then(d => setChecks(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchChecks() }, [filter])

  const suspicious = checks.filter(c => c.isSuspicious).length
  const clear = checks.filter(c => !c.isSuspicious).length

  const scoreColor = (score: number) => {
    if (score >= 75) return 'bg-red-100 text-red-800'
    if (score >= 50) return 'bg-orange-100 text-orange-800'
    if (score >= 25) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fraud Detection</h1>
          <p className="text-gray-500">Review flagged loan applications and borrower activity</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Checks</p><p className="text-2xl font-bold">{checks.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Suspicious</p><p className="text-2xl font-bold text-red-600">{suspicious}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Clear</p><p className="text-2xl font-bold text-green-600">{clear}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'suspicious', 'clear'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? <p className="text-gray-400 text-center py-8">Loading...</p> : checks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No fraud checks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Borrower</th>
                  <th className="pb-2 pr-4">Loan</th>
                  <th className="pb-2 pr-4">Risk Score</th>
                  <th className="pb-2 pr-4">Flags</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Actions</th>
                </tr></thead>
                <tbody>
                  {checks.map(c => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{c.borrower.firstName} {c.borrower.lastName}</td>
                      <td className="py-3 pr-4 font-mono text-xs">{c.loan?.loanNumber || '-'}</td>
                      <td className="py-3 pr-4"><Badge className={scoreColor(c.riskScore)}>{c.riskScore}</Badge></td>
                      <td className="py-3 pr-4 text-xs text-gray-500 max-w-[200px] truncate">{c.flags?.join(', ') || 'None'}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{new Date(c.checkedAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <Link href={`/dashboard/fraud/${c.id}`}>
                          <Button size="sm" variant="ghost"><Eye className="h-4 w-4 mr-1" />View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
