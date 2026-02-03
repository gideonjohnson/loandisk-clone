'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Loader2, FileText, User, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface KYCDetail {
  id: string
  status: string
  documentType?: string
  documentNumber?: string
  idFrontUrl?: string
  idBackUrl?: string
  selfieUrl?: string
  proofOfAddress?: string
  amlCheckStatus?: string
  amlFlags?: string
  reviewNotes?: string
  rejectionReason?: string
  submittedAt?: string
  reviewedAt?: string
  borrower: { id: string; firstName: string; lastName: string; phone: string; email?: string; idNumber?: string; kycVerified: boolean; blacklisted: boolean }
  reviewer?: { name: string }
}

export default function KYCReviewPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<KYCDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/kyc/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setNotes(d.reviewNotes || '') })
      .finally(() => setLoading(false))
  }, [params.id])

  const handleReview = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    setActing(true)
    try {
      const res = await fetch(`/api/kyc/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes, rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined }),
      })
      if (res.ok) {
        router.push('/dashboard/kyc')
      } else {
        const err = await res.json()
        alert(err.error || 'Review failed')
      }
    } finally {
      setActing(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>
  if (!data) return <div className="p-6 text-red-500">KYC verification not found</div>

  const amlFlags = data.amlFlags ? JSON.parse(data.amlFlags) : []
  const isPending = data.status === 'PENDING' || data.status === 'UNDER_REVIEW'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/kyc')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">KYC Review</h1>
          <p className="text-gray-500">{data.borrower.firstName} {data.borrower.lastName}</p>
        </div>
        <Badge className={data.status === 'VERIFIED' ? 'bg-green-100 text-green-800' : data.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
          {data.status}
        </Badge>
      </div>

      {/* Borrower Info */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Borrower Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Name:</span> {data.borrower.firstName} {data.borrower.lastName}</div>
          <div><span className="text-gray-500">Phone:</span> {data.borrower.phone}</div>
          {data.borrower.email && <div><span className="text-gray-500">Email:</span> {data.borrower.email}</div>}
          {data.borrower.idNumber && <div><span className="text-gray-500">ID Number:</span> {data.borrower.idNumber}</div>}
          <div><span className="text-gray-500">KYC Verified:</span> {data.borrower.kycVerified ? 'Yes' : 'No'}</div>
          <div><span className="text-gray-500">Blacklisted:</span> {data.borrower.blacklisted ? <Badge variant="destructive">Yes</Badge> : 'No'}</div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Document Type:</span> {data.documentType || 'Not specified'}</div>
            <div><span className="text-gray-500">Document Number:</span> {data.documentNumber || 'Not specified'}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {data.idFrontUrl && (
              <div>
                <p className="text-sm text-gray-500 mb-1">ID Front</p>
                <img src={data.idFrontUrl} alt="ID Front" className="rounded-lg border max-h-48 object-cover" />
              </div>
            )}
            {data.idBackUrl && (
              <div>
                <p className="text-sm text-gray-500 mb-1">ID Back</p>
                <img src={data.idBackUrl} alt="ID Back" className="rounded-lg border max-h-48 object-cover" />
              </div>
            )}
            {data.selfieUrl && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Selfie</p>
                <img src={data.selfieUrl} alt="Selfie" className="rounded-lg border max-h-48 object-cover" />
              </div>
            )}
            {data.proofOfAddress && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Proof of Address</p>
                <img src={data.proofOfAddress} alt="Proof of Address" className="rounded-lg border max-h-48 object-cover" />
              </div>
            )}
          </div>
          {!data.idFrontUrl && !data.idBackUrl && <p className="text-gray-400">No documents uploaded</p>}
        </CardContent>
      </Card>

      {/* AML Check */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />AML Check</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-3">
            <Badge className={data.amlCheckStatus === 'CLEAR' ? 'bg-green-100 text-green-800' : data.amlCheckStatus === 'FLAGGED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
              {data.amlCheckStatus || 'PENDING'}
            </Badge>
          </div>
          {amlFlags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {amlFlags.map((f: string) => <Badge key={f} variant="destructive">{f}</Badge>)}
            </div>
          )}
          {amlFlags.length === 0 && data.amlCheckStatus === 'CLEAR' && <p className="text-green-600 text-sm">No AML flags detected</p>}
        </CardContent>
      </Card>

      {/* Review Actions */}
      {isPending && (
        <Card>
          <CardHeader><CardTitle>Review Decision</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Review Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional notes..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rejection Reason (required if rejecting)</label>
              <input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Reason for rejection..." />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleReview('VERIFIED')} disabled={acting} className="bg-green-600 hover:bg-green-700">
                {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve KYC
              </Button>
              <Button onClick={() => handleReview('REJECTED')} disabled={acting} variant="destructive">
                {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous review info */}
      {data.reviewedAt && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <p className="text-gray-500">Reviewed on {new Date(data.reviewedAt).toLocaleString()} by {data.reviewer?.name || 'Unknown'}</p>
            {data.reviewNotes && <p className="mt-1"><strong>Notes:</strong> {data.reviewNotes}</p>}
            {data.rejectionReason && <p className="mt-1 text-red-600"><strong>Rejection Reason:</strong> {data.rejectionReason}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
