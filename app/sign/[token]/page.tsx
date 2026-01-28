'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Pen, RotateCcw, Loader2, FileText } from 'lucide-react'

interface DocumentInfo {
  requestId: string
  loanId: string
  borrowerName: string
  borrowerEmail: string | null
  documentType: string
  loanNumber: string
  principalAmount: number
  interestRate: number
  termMonths: number
}

export default function SignDocumentPage() {
  const params = useParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)

  useEffect(() => {
    verifyToken()
  }, [params.token])

  const verifyToken = async () => {
    try {
      const res = await fetch('/api/signature/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      })

      const data = await res.json()

      if (!data.valid) {
        setError(data.error || 'Invalid signing link')
      } else {
        setDocumentInfo(data.data)
      }
    } catch (err) {
      setError('Failed to verify signing link')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!documentInfo) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill with white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [documentInfo])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const submitSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !documentInfo) return

    setSubmitting(true)
    setError('')

    try {
      const signatureData = canvas.toDataURL('image/png')

      const res = await fetch('/api/signature/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          signatureData,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to submit signature')
      }
    } catch (err) {
      setError('Failed to submit signature. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LOAN_AGREEMENT: 'Loan Agreement',
      PROMISSORY_NOTE: 'Promissory Note',
      DISCLOSURE: 'Disclosure Statement',
      OTHER: 'Document',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Verifying signing link...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Signed</h1>
          <p className="text-gray-600 mb-6">
            Thank you! Your signature has been recorded successfully.
          </p>
          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-green-800">
              <strong>Loan:</strong> #{documentInfo?.loanNumber}
            </p>
            <p className="text-sm text-green-800">
              <strong>Document:</strong> {documentInfo && getDocumentTypeLabel(documentInfo.documentType)}
            </p>
            <p className="text-sm text-green-800">
              <strong>Signed by:</strong> {documentInfo?.borrowerName}
            </p>
          </div>
          <p className="text-sm text-gray-500">
            You may close this window. A confirmation has been sent to your email.
          </p>
        </div>
      </div>
    )
  }

  if (error && !documentInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Sign</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact your loan officer for assistance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pen className="w-6 h-6" />
              Sign Document
            </h1>
            <p className="text-blue-100 mt-1">
              {documentInfo && getDocumentTypeLabel(documentInfo.documentType)}
            </p>
          </div>

          {/* Loan Details */}
          <div className="bg-blue-50 border-b border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Loan #{documentInfo?.loanNumber}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <p className="text-blue-600">Principal</p>
                    <p className="font-semibold text-blue-900">
                      {documentInfo && formatCurrency(Number(documentInfo.principalAmount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600">Interest Rate</p>
                    <p className="font-semibold text-blue-900">
                      {documentInfo?.interestRate}% p.a.
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-600">Term</p>
                    <p className="font-semibold text-blue-900">
                      {documentInfo?.termMonths} months
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Agreement Terms
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto text-sm text-gray-700 border">
                <p className="mb-4">
                  <strong>Dear {documentInfo?.borrowerName},</strong>
                </p>
                <p className="mb-4">
                  By signing below, I acknowledge that I have read and understood the loan agreement
                  terms and conditions for Loan #{documentInfo?.loanNumber}. I agree to repay the loan
                  amount of {documentInfo && formatCurrency(Number(documentInfo.principalAmount))} according
                  to the specified schedule at an interest rate of {documentInfo?.interestRate}% per annum
                  over a period of {documentInfo?.termMonths} months.
                </p>
                <p className="mb-4">
                  I understand that failure to make payments on time may result in additional fees,
                  penalties, and may affect my credit standing.
                </p>
                <p className="mb-4">
                  I confirm that all information provided in my loan application is accurate and complete.
                </p>
                <p>
                  This electronic signature constitutes my legal signature for all purposes related to this agreement.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Your Signature
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Use your mouse or finger to sign in the box below
              </p>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={200}
                  className="w-full touch-none cursor-crosshair"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={clearSignature}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Signature
                </button>
                <p className="text-xs text-gray-500">
                  Signing as: {documentInfo?.borrowerName}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => window.close()}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitSignature}
                disabled={!hasSignature || submitting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Sign & Submit'
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Powered by Meek Microfinance
        </p>
      </div>
    </div>
  )
}
