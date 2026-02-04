'use client'

import { useEffect, useState, useRef } from 'react'
import { CheckCircle, Clock, XCircle, Upload, Loader2, FileText, ImageIcon, X } from 'lucide-react'

interface KYCStatus {
  status: string
  documentType?: string
  rejectionReason?: string
  submittedAt?: string
}

export default function PortalKYCPage() {
  const [kyc, setKyc] = useState<KYCStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFront, setUploadingFront] = useState(false)
  const [uploadingBack, setUploadingBack] = useState(false)
  const [error, setError] = useState('')
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    documentType: 'NATIONAL_ID',
    documentNumber: '',
    idFrontUrl: '',
    idBackUrl: '',
  })

  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/portal/kyc')
      .then(r => r.json())
      .then(d => setKyc(d.verification || { status: 'NOT_STARTED' }))
      .catch(() => setKyc({ status: 'NOT_STARTED' }))
      .finally(() => setLoading(false))
  }, [])

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/portal/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to upload file')
        return null
      }

      const data = await res.json()
      return data.url
    } catch {
      setError('Failed to upload file. Please try again.')
      return null
    }
  }

  const handleFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploadingFront(true)

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setFrontPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const url = await uploadFile(file)
    if (url) {
      setForm(prev => ({ ...prev, idFrontUrl: url }))
    } else {
      setFrontPreview(null)
    }
    setUploadingFront(false)
  }

  const handleBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploadingBack(true)

    const reader = new FileReader()
    reader.onload = (ev) => setBackPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    const url = await uploadFile(file)
    if (url) {
      setForm(prev => ({ ...prev, idBackUrl: url }))
    } else {
      setBackPreview(null)
    }
    setUploadingBack(false)
  }

  const removeFront = () => {
    setForm(prev => ({ ...prev, idFrontUrl: '' }))
    setFrontPreview(null)
    if (frontInputRef.current) frontInputRef.current.value = ''
  }

  const removeBack = () => {
    setForm(prev => ({ ...prev, idBackUrl: '' }))
    setBackPreview(null)
    if (backInputRef.current) backInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.documentNumber || !form.idFrontUrl) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setKyc({ status: 'PENDING', documentType: form.documentType, submittedAt: new Date().toISOString() })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to submit documents')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>

  const status = kyc?.status || 'NOT_STARTED'

  const steps = [
    { key: 'NOT_STARTED', label: 'Submit', done: status !== 'NOT_STARTED' },
    { key: 'PENDING', label: 'Review', done: ['VERIFIED', 'REJECTED'].includes(status) },
    { key: 'VERIFIED', label: 'Verified', done: status === 'VERIFIED' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold">KYC Verification</h1>
        <p className="text-gray-500 text-sm mt-1">Verify your identity to access all features</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {step.done ? <CheckCircle className="h-5 w-5" /> : i + 1}
            </div>
            <span className="ml-2 text-sm hidden sm:inline">{step.label}</span>
            {i < steps.length - 1 && <div className={`w-12 sm:w-20 h-0.5 mx-2 ${step.done ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Status-based content */}
      {status === 'VERIFIED' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-green-800">Identity Verified</h2>
          <p className="text-green-600 text-sm mt-1">Your KYC verification is complete.</p>
        </div>
      )}

      {(status === 'PENDING' || status === 'UNDER_REVIEW') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-yellow-800">Under Review</h2>
          <p className="text-yellow-600 text-sm mt-1">Your documents are being reviewed. We&apos;ll notify you once complete.</p>
          {kyc?.submittedAt && <p className="text-yellow-500 text-xs mt-2">Submitted {new Date(kyc.submittedAt).toLocaleDateString()}</p>}
        </div>
      )}

      {status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800">Verification Rejected</h2>
          {kyc?.rejectionReason && <p className="text-red-600 text-sm mt-1">{kyc.rejectionReason}</p>}
          <p className="text-red-500 text-xs mt-2">Please resubmit with correct documents.</p>
        </div>
      )}

      {(status === 'NOT_STARTED' || status === 'REJECTED') && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold">Submit Documents</h2>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select
              value={form.documentType}
              onChange={e => setForm({ ...form, documentType: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="NATIONAL_ID">National ID</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Document Number *</label>
            <input
              type="text"
              value={form.documentNumber}
              onChange={e => setForm({ ...form, documentNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Enter document number"
              required
            />
          </div>

          {/* Front Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">ID Front Image *</label>
            {frontPreview ? (
              <div className="relative border rounded-lg overflow-hidden">
                <img src={frontPreview} alt="ID Front" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={removeFront}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                {uploadingFront && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload front of ID</span>
                <span className="text-xs text-gray-400 mt-1">JPG or PNG, max 5MB</span>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFrontUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Back Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-1">ID Back Image</label>
            {backPreview ? (
              <div className="relative border rounded-lg overflow-hidden">
                <img src={backPreview} alt="ID Back" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={removeBack}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                {uploadingBack && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Click to upload back of ID</span>
                <span className="text-xs text-gray-400 mt-1">JPG or PNG, max 5MB (optional)</span>
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleBackUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || uploadingFront || uploadingBack || !form.documentNumber || !form.idFrontUrl}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Submit for Verification
          </button>
        </form>
      )}
    </div>
  )
}
