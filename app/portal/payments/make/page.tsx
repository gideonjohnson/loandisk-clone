'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Smartphone, Building2, CheckCircle, Loader2, AlertCircle, Copy } from 'lucide-react'

interface LoanOption {
  id: string
  loanNumber: string
  remainingBalance: number
  nextPaymentAmount: number | null
  nextPaymentDate: string | null
}

interface BankDetails {
  bankName: string
  accountNumber: string
  accountName: string
  branchCode?: string
  swiftCode?: string
}

type PaymentMethod = 'mpesa' | 'airtel' | 'bank'

function MakePaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedLoanId = searchParams.get('loanId')

  const [loans, setLoans] = useState<LoanOption[]>([])
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [selectedLoan, setSelectedLoan] = useState('')
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa')

  const [result, setResult] = useState<{
    success: boolean
    message: string
    checkoutRequestId?: string
    reference?: string
  } | null>(null)

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (preselectedLoanId && loans.length > 0) {
      setSelectedLoan(preselectedLoanId)
      const loan = loans.find(l => l.id === preselectedLoanId)
      if (loan?.nextPaymentAmount) {
        setAmount(loan.nextPaymentAmount.toString())
      }
    }
  }, [preselectedLoanId, loans])

  const fetchData = async () => {
    try {
      const [loansRes, bankRes] = await Promise.all([
        fetch('/api/portal/loans'),
        fetch('/api/payments/bank')
      ])

      if (loansRes.status === 401) {
        router.push('/portal/login')
        return
      }

      const loansData = await loansRes.json()
      setLoans(loansData.loans?.filter((l: any) => l.status === 'ACTIVE').map((l: any) => ({
        id: l.id,
        loanNumber: l.loanNumber,
        remainingBalance: l.remainingBalance,
        nextPaymentAmount: l.nextPayment?.amount || null,
        nextPaymentDate: l.nextPayment?.dueDate || null
      })) || [])

      if (bankRes.ok) {
        const bankData = await bankRes.json()
        setBankDetails(bankData.bankDetails)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    setProcessing(true)

    try {
      const selectedLoanData = loans.find(l => l.id === selectedLoan)

      if (paymentMethod === 'mpesa') {
        const res = await fetch('/api/payments/mpesa/stk-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            amount: Number(amount),
            accountReference: selectedLoanData?.loanNumber || 'Loan Payment',
            transactionDesc: `Payment for loan ${selectedLoanData?.loanNumber}`,
            loanId: selectedLoan || undefined,
          }),
        })

        const data = await res.json()

        if (data.success) {
          setResult({
            success: true,
            message: 'Payment request sent! Please check your phone and enter your M-Pesa PIN to complete the payment.',
            checkoutRequestId: data.checkoutRequestId,
          })
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to initiate M-Pesa payment',
          })
        }
      } else if (paymentMethod === 'airtel') {
        const res = await fetch('/api/payments/airtel/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber,
            amount: Number(amount),
            reference: selectedLoanData?.loanNumber || 'Loan Payment',
            loanId: selectedLoan || undefined,
          }),
        })

        const data = await res.json()

        if (data.success) {
          setResult({
            success: true,
            message: 'Payment request sent! Please check your phone and authorize the payment.',
            reference: data.transactionId,
          })
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to initiate Airtel Money payment',
          })
        }
      } else if (paymentMethod === 'bank') {
        const res = await fetch('/api/payments/bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankName: bankDetails?.bankName || 'Bank',
            accountNumber: bankDetails?.accountNumber || '',
            accountName: bankDetails?.accountName || '',
            amount: Number(amount),
            reference: selectedLoanData?.loanNumber || '',
            loanId: selectedLoan || undefined,
            notes: `Bank transfer for loan ${selectedLoanData?.loanNumber}`,
          }),
        })

        const data = await res.json()

        if (data.success) {
          setResult({
            success: true,
            message: 'Bank transfer recorded. Please complete the transfer using the bank details below. Your payment will be verified within 24 hours.',
            reference: data.reference,
          })
        } else {
          setResult({
            success: false,
            message: data.error || 'Failed to record bank transfer',
          })
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      setResult({
        success: false,
        message: 'An error occurred. Please try again.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedLoanData = loans.find(l => l.id === selectedLoan)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/portal/payments"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Make a Payment</h1>
          <p className="text-gray-600 mt-1">Choose your preferred payment method</p>
        </div>
      </div>

      {/* Success/Error Result */}
      {result && (
        <div className={`mb-6 p-4 rounded-xl ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Payment Initiated' : 'Payment Failed'}
              </p>
              <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
              </p>
              {result.reference && (
                <p className="text-sm mt-2 text-gray-600">
                  Reference: <span className="font-mono font-medium">{result.reference}</span>
                </p>
              )}
            </div>
          </div>

          {/* Bank Details for Bank Transfer */}
          {result.success && paymentMethod === 'bank' && bankDetails && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
              <h4 className="font-medium text-gray-900 mb-3">Bank Transfer Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Bank Name:</span>
                  <span className="font-medium">{bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">{bankDetails.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(bankDetails.accountNumber)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name:</span>
                  <span className="font-medium">{bankDetails.accountName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Reference:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">{result.reference}</span>
                    <button
                      onClick={() => copyToClipboard(result.reference || '')}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium">{formatCurrency(Number(amount))}</span>
                </div>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-2">Copied to clipboard!</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Form */}
      {!result?.success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Loan Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Select Loan</h2>
            {loans.length === 0 ? (
              <p className="text-gray-500">No active loans to pay.</p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <label
                    key={loan.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedLoan === loan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="loan"
                        value={loan.id}
                        checked={selectedLoan === loan.id}
                        onChange={(e) => {
                          setSelectedLoan(e.target.value)
                          if (loan.nextPaymentAmount) {
                            setAmount(loan.nextPaymentAmount.toString())
                          }
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{loan.loanNumber}</p>
                        {loan.nextPaymentAmount && loan.nextPaymentDate && (
                          <p className="text-xs text-gray-500">
                            Next: {formatCurrency(loan.nextPaymentAmount)} due{' '}
                            {new Date(loan.nextPaymentDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(loan.remainingBalance)}</p>
                      <p className="text-xs text-gray-500">balance</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Amount</h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">KES</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max={selectedLoanData?.remainingBalance || undefined}
                required
                className="w-full pl-14 pr-4 py-3 text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {selectedLoanData && (
              <div className="mt-3 flex gap-2">
                {selectedLoanData.nextPaymentAmount && (
                  <button
                    type="button"
                    onClick={() => setAmount(selectedLoanData.nextPaymentAmount!.toString())}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    Next Payment: {formatCurrency(selectedLoanData.nextPaymentAmount)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAmount(selectedLoanData.remainingBalance.toString())}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  Full Balance: {formatCurrency(selectedLoanData.remainingBalance)}
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-colors ${
                  paymentMethod === 'mpesa'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  paymentMethod === 'mpesa' ? 'bg-green-500' : 'bg-green-100'
                }`}>
                  <Smartphone className={`w-6 h-6 ${paymentMethod === 'mpesa' ? 'text-white' : 'text-green-600'}`} />
                </div>
                <span className={`text-sm font-medium ${paymentMethod === 'mpesa' ? 'text-green-700' : 'text-gray-700'}`}>
                  M-Pesa
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('airtel')}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-colors ${
                  paymentMethod === 'airtel'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  paymentMethod === 'airtel' ? 'bg-red-500' : 'bg-red-100'
                }`}>
                  <Smartphone className={`w-6 h-6 ${paymentMethod === 'airtel' ? 'text-white' : 'text-red-600'}`} />
                </div>
                <span className={`text-sm font-medium ${paymentMethod === 'airtel' ? 'text-red-700' : 'text-gray-700'}`}>
                  Airtel
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`flex flex-col items-center gap-2 p-4 border rounded-xl transition-colors ${
                  paymentMethod === 'bank'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  paymentMethod === 'bank' ? 'bg-blue-500' : 'bg-blue-100'
                }`}>
                  <Building2 className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <span className={`text-sm font-medium ${paymentMethod === 'bank' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Bank
                </span>
              </button>
            </div>

            {/* Phone Number for Mobile Money */}
            {(paymentMethod === 'mpesa' || paymentMethod === 'airtel') && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={paymentMethod === 'mpesa' ? '0712345678' : '0733456789'}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the {paymentMethod === 'mpesa' ? 'Safaricom' : 'Airtel'} number to receive the payment prompt
                </p>
              </div>
            )}

            {/* Bank Details Preview */}
            {paymentMethod === 'bank' && bankDetails && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  After submitting, you&apos;ll receive bank details to complete the transfer.
                </p>
                <div className="text-sm">
                  <span className="text-gray-500">Bank:</span>{' '}
                  <span className="font-medium">{bankDetails.bankName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing || !amount || Number(amount) <= 0 || ((paymentMethod === 'mpesa' || paymentMethod === 'airtel') && !phoneNumber)}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {paymentMethod === 'bank' ? 'Record Bank Transfer' : 'Pay'} {amount && formatCurrency(Number(amount))}
              </>
            )}
          </button>
        </form>
      )}

      {/* Done Button */}
      {result?.success && (
        <div className="flex gap-3">
          <Link
            href="/portal/payments"
            className="flex-1 py-3 text-center bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            View Payment History
          </Link>
          <button
            onClick={() => {
              setResult(null)
              setAmount('')
              setPhoneNumber('')
              setSelectedLoan('')
            }}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Make Another Payment
          </button>
        </div>
      )}
    </div>
  )
}

export default function MakePaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <MakePaymentContent />
    </Suspense>
  )
}
