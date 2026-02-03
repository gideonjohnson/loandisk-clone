'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserCheck, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface KYCItem {
  id: string
  status: string
  documentType?: string
  submittedAt?: string
  amlCheckStatus?: string
  createdAt: string
  borrower: { firstName: string; lastName: string; phone: string; email?: string }
}

const statusColor: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  VERIFIED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export default function KYCDashboardPage() {
  const [items, setItems] = useState<KYCItem[]>([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = filter !== 'ALL' ? `?status=${filter}` : ''
    fetch(`/api/kyc${params}`)
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [filter])

  const counts = {
    total: items.length,
    pending: items.filter(i => i.status === 'PENDING').length,
    verified: items.filter(i => i.status === 'VERIFIED').length,
    rejected: items.filter(i => i.status === 'REJECTED').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KYC Verification</h1>
        <p className="text-gray-500">Manage borrower identity verification and AML checks</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{counts.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{counts.pending}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Verified</p><p className="text-2xl font-bold text-green-600">{counts.verified}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Rejected</p><p className="text-2xl font-bold text-red-600">{counts.rejected}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <p className="text-center text-gray-400 py-8">Loading...</p> : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No KYC verifications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Borrower</th>
                  <th className="pb-2 pr-4">Document</th>
                  <th className="pb-2 pr-4">Submitted</th>
                  <th className="pb-2 pr-4">AML</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Actions</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{item.borrower.firstName} {item.borrower.lastName}</td>
                      <td className="py-3 pr-4 text-xs">{item.documentType || '-'}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500">{item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="py-3 pr-4">
                        <Badge className={item.amlCheckStatus === 'CLEAR' ? 'bg-green-100 text-green-800' : item.amlCheckStatus === 'FLAGGED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                          {item.amlCheckStatus || 'PENDING'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4"><Badge className={statusColor[item.status] || ''}>{item.status}</Badge></td>
                      <td className="py-3">
                        <Link href={`/dashboard/kyc/${item.id}`}>
                          <Button size="sm" variant="ghost"><Eye className="h-4 w-4 mr-1" />Review</Button>
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
