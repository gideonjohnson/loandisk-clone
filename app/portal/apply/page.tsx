'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CreditCard, DollarSign, Clock, CheckCircle, ArrowRight,
  ArrowLeft, AlertCircle, Calculator, FileText, Loader2
} from 'lucide-react'

interface LoanProduct {
  id: string
  name: string
  code: string
  description: string | null
  minAmount: number
  maxAmount: number
  minTerm: number
  maxTerm: number
  interestRate: number
  interestType: string
  repaymentFrequency: string
  requiresCollateral: boolean
  requiresGuarantor: boolean
  minCreditScore: number | null
}

interface EligibilityInfo {
  creditScore: number
  creditGrade: string
  maxRecommendedLoan: number
  riskLevel: string
}

interface ApplicationResult {
  success: boolean
  eligible: boolean
  reason?: string
  loan?: {
    id: string
    loanNumber: string
    amount: number
    termMonths: number
    interestRate: number
    status: string
  }
  creditReport?: {
    score: number
    grade: string
    maxRecommendedLoan?: number
    recommendations?: string[]
  }
}

function ApplyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedProductId = searchParams.get('product')

  const [step, setStep] = useState(1)
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [eligibility, setEligibility] = useState<EligibilityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ApplicationResult | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null)
  const [amount, setAmount] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [purpose, setPurpose] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (preselectedProductId && products.length > 0) {
      const product = products.find((p) => p.id === preselectedProductId)
      if (product) {
        setSelectedProduct(product)
        setStep(2)
      }
    }
  }, [preselectedProductId, products])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/portal/products')
      if (!res.ok) {
        router.push('/portal/login')
        return
      }
      const data = await res.json()
      setProducts(data.products || [])
      setEligibility(data.eligibility)
    } catch {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(num)
  }

  const calculateMonthlyPayment = () => {
    if (!selectedProduct || !amount || !termMonths) return null

    const principal = parseFloat(amount)
    const rate = selectedProduct.interestRate / 100 / 12
    const term = parseInt(termMonths)

    if (selectedProduct.interestType === 'REDUCING_BALANCE') {
      const payment = (principal * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)
      return payment
    } else {
      const totalInterest = principal * (selectedProduct.interestRate / 100) * (term / 12)
      return (principal + totalInterest) / term
    }
  }

  const calculateTotalRepayment = () => {
    const monthly = calculateMonthlyPayment()
    if (!monthly || !termMonths) return null
    return monthly * parseInt(termMonths)
  }

  const handleSelectProduct = (product: LoanProduct) => {
    setSelectedProduct(product)
    setAmount('')
    setTermMonths(String(product.minTerm))
    setStep(2)
  }

  const handleSubmit = async () => {
    if (!selectedProduct || !amount || !termMonths) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/portal/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          amount: parseFloat(amount),
          termMonths: parseInt(termMonths),
          purpose,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setStep(4)
      } else {
        setError(data.error || 'Application failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!eligibility) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Login Required</h2>
        <p className="text-gray-600 mt-2">Please log in to apply for a loan.</p>
        <Link
          href="/portal/login"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              <span className={`ml-2 text-sm hidden sm:block ${step >= s ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {s === 1 && 'Select Product'}
                {s === 2 && 'Loan Details'}
                {s === 3 && 'Review'}
                {s === 4 && 'Result'}
              </span>
              {s < 4 && (
                <div className={`w-12 sm:w-24 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: Select Product */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Loan Product</h2>
          <p className="text-gray-600 mb-6">Choose the loan that best fits your needs</p>

          {/* Credit Score Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{eligibility.creditGrade}</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Credit Score</p>
                <p className="text-xl font-bold">{eligibility.creditScore}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-600">Max Recommended</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(eligibility.maxRecommendedLoan)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="text-left p-4 border rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.code}</p>
                  </div>
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-600">
                    {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                  </p>
                  <p className="text-blue-600 font-medium">{product.interestRate}% interest</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Loan Details */}
      {step === 2 && selectedProduct && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loan Details</h2>
          <p className="text-gray-600 mb-6">Specify your loan amount and term</p>

          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500">{selectedProduct.interestRate}% {selectedProduct.interestType === 'REDUCING_BALANCE' ? 'Reducing Balance' : 'Flat Rate'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Loan Amount (KSh)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={selectedProduct.minAmount}
                  max={Math.min(selectedProduct.maxAmount, eligibility.maxRecommendedLoan)}
                  placeholder={`${selectedProduct.minAmount.toLocaleString()} - ${selectedProduct.maxAmount.toLocaleString()}`}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Range: {formatCurrency(selectedProduct.minAmount)} - {formatCurrency(selectedProduct.maxAmount)}
                  {eligibility.maxRecommendedLoan < selectedProduct.maxAmount && (
                    <span className="text-amber-600"> (Recommended max: {formatCurrency(eligibility.maxRecommendedLoan)})</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Loan Term (Months)
                </label>
                <select
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from(
                    { length: selectedProduct.maxTerm - selectedProduct.minTerm + 1 },
                    (_, i) => selectedProduct.minTerm + i
                  ).map((month) => (
                    <option key={month} value={month}>
                      {month} months
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Purpose of Loan (Optional)
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Business expansion, Education, Medical expenses"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Calculator */}
          {amount && termMonths && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Loan Calculation Preview
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Monthly Payment</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(calculateMonthlyPayment() || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Repayment</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(calculateTotalRepayment() || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!amount || parseFloat(amount) < selectedProduct.minAmount || parseFloat(amount) > selectedProduct.maxAmount}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
              <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && selectedProduct && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Application</h2>
          <p className="text-gray-600 mb-6">Please review the details before submitting</p>

          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Loan Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Product</span>
                <span className="font-medium">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Loan Amount</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Term</span>
                <span className="font-medium">{termMonths} months</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Interest Rate</span>
                <span className="font-medium">{selectedProduct.interestRate}%</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Monthly Payment</span>
                <span className="font-medium text-blue-600">{formatCurrency(calculateMonthlyPayment() || 0)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Total Repayment</span>
                <span className="font-bold text-lg">{formatCurrency(calculateTotalRepayment() || 0)}</span>
              </div>
              {purpose && (
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-600">Purpose</span>
                  <span className="font-medium">{purpose}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border p-4 mb-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I agree to the terms and conditions. I understand that this application will be subject to
                credit approval and that the loan officer will review my application before final approval.
              </span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!agreedToTerms || submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="w-4 h-4 inline ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 4 && result && (
        <div className="text-center py-8">
          {result.eligible && result.loan ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your loan application has been received and is under review.
              </p>

              <div className="bg-white rounded-xl border p-6 max-w-md mx-auto mb-6 text-left">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Application Number</span>
                    <span className="font-bold text-blue-600">{result.loan.loanNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium">{formatCurrency(result.loan.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      Under Review
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/portal/applications"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View My Applications
                </Link>
                <Link
                  href="/portal"
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Not Approved</h2>
              <p className="text-gray-600 mb-6">{result.reason}</p>

              {result.creditReport && (
                <div className="bg-white rounded-xl border p-6 max-w-md mx-auto mb-6 text-left">
                  <h4 className="font-semibold mb-3">Your Credit Assessment</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credit Score</span>
                      <span className="font-medium">{result.creditReport.score} (Grade {result.creditReport.grade})</span>
                    </div>
                    {result.creditReport.maxRecommendedLoan && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Recommended</span>
                        <span className="font-medium">{formatCurrency(result.creditReport.maxRecommendedLoan)}</span>
                      </div>
                    )}
                  </div>
                  {result.creditReport.recommendations && result.creditReport.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {result.creditReport.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    setStep(2)
                    setResult(null)
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Try Different Amount
                </button>
                <Link
                  href="/portal/products"
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Browse Other Products
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function PortalApplyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <ApplyPageContent />
    </Suspense>
  )
}
