'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface FraudDetail {
  id: string
  riskScore: number
  isSuspicious: boolean
  flags: string[]
  details: Record<string, { name: string; score: number; flags: string[]; details: string }>
  checkedAt: string
  borrower: { id: string; firstName: string; lastName: string; phone: string; email?: string; idNumber?: string; creditScore?: number }
  loan?: { id: string; loanNumber: string; principalAmount: number; status: string }
}

export default function FraudDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<FraudDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/fraud/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.flags && typeof d.flags === 'string') d.flags = JSON.parse(d.flags)
        if (d.details && typeof d.details === 'string') d.details = JSON.parse(d.details)
        setData(d)
      })
      .finally(() => setLoading(false))
  }, [params.id])

  const handleReview = async (decision: 'CLEAR' | 'CONFIRM') => {
    if (decision === 'CONFIRM' && !confirm('This will blacklist the borrower. Are you sure?')) return
    setActing(true)
    await fetch(`/api/fraud/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    router.push('/dashboard/fraud')
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>
  if (!data) return <div className="p-6 text-red-500">Fraud check not found</div>

  const scoreColor = (score: number) => {
    if (score >= 75) return 'bg-red-100 text-red-800'
    if (score >= 50) return 'bg-orange-100 text-orange-800'
    if (score >= 25) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/fraud')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Fraud Check Detail</h1>
          <p className="text-gray-500">{data.borrower.firstName} {data.borrower.lastName}</p>
        </div>
        <Badge className={`text-lg px-3 py-1 ${scoreColor(data.riskScore)}`}>Score: {data.riskScore}</Badge>
      </div>

      {/* Rule Results */}
      <Card>
        <CardHeader><CardTitle>Rule Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.details && typeof data.details === 'object' ? Object.entries(data.details).map(([key, rule]) => (
            <div key={key} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="font-medium text-sm">{rule.name || key}</p>
                <p className="text-xs text-gray-500 mt-0.5">{rule.details}</p>
                {rule.flags?.length > 0 && (
                  <div className="flex gap-1 mt-1">{rule.flags.map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}</div>
                )}
              </div>
              <div className="text-right">
                <div className="w-20 bg-gray-200 rounded-full h-2 mb-1">
                  <div className={`h-2 rounded-full ${rule.score >= 60 ? 'bg-red-500' : rule.score >= 30 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${rule.score}%` }} />
                </div>
                <span className="text-xs text-gray-500">{rule.score}/100</span>
              </div>
            </div>
          )) : <p className="text-gray-400">No rule details available</p>}
        </CardContent>
      </Card>

      {/* Borrower Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Borrower</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{data.borrower.firstName} {data.borrower.lastName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{data.borrower.phone}</span></div>
            {data.borrower.email && <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{data.borrower.email}</span></div>}
            {data.borrower.idNumber && <div className="flex justify-between"><span className="text-gray-500">ID</span><span>{data.borrower.idNumber}</span></div>}
            {data.borrower.creditScore && <div className="flex justify-between"><span className="text-gray-500">Credit Score</span><span>{data.borrower.creditScore}</span></div>}
          </CardContent>
        </Card>

        {data.loan && (
          <Card>
            <CardHeader><CardTitle>Linked Loan</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Loan #</span><a href={`/dashboard/loans/${data.loan.id}`} className="text-blue-600 hover:underline font-mono">{data.loan.loanNumber}</a></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span>${Number(data.loan.principalAmount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant="outline">{data.loan.status}</Badge></div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6 flex gap-3">
          <Button onClick={() => handleReview('CLEAR')} disabled={acting} className="bg-green-600 hover:bg-green-700">
            {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Clear (False Positive)
          </Button>
          <Button onClick={() => handleReview('CONFIRM')} disabled={acting} variant="destructive">
            {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
            Confirm Fraud & Blacklist
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
