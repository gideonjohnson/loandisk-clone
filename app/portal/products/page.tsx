'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CreditCard, Clock, Percent, DollarSign, Shield, Users,
  ArrowRight, Filter, TrendingUp, AlertCircle, CheckCircle
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
  gracePeriodDays: number
  lateFeeType: string | null
  lateFeeAmount: number | null
  processingFeeType: string | null
  processingFeeAmount: number | null
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

export default function PortalProductsPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [eligibility, setEligibility] = useState<EligibilityInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [amountFilter, setAmountFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'rate' | 'amount'>('name')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/portal/products')
      const data = await res.json()
      setProducts(data.products || [])
      setEligibility(data.eligibility)
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const filteredProducts = products
    .filter((product) => {
      if (!amountFilter) return true
      const amount = parseFloat(amountFilter)
      return amount >= product.minAmount && amount <= product.maxAmount
    })
    .sort((a, b) => {
      if (sortBy === 'rate') return a.interestRate - b.interestRate
      if (sortBy === 'amount') return b.maxAmount - a.maxAmount
      return a.name.localeCompare(b.name)
    })

  const getInterestTypeLabel = (type: string) => {
    return type === 'REDUCING_BALANCE' ? 'Reducing Balance' : 'Flat Rate'
  }

  const getEligibleForProduct = (product: LoanProduct) => {
    if (!eligibility) return null
    if (product.minCreditScore && eligibility.creditScore < product.minCreditScore) {
      return { eligible: false, reason: `Requires credit score of ${product.minCreditScore}+` }
    }
    if (product.maxAmount > eligibility.maxRecommendedLoan) {
      return { eligible: true, reason: `Recommended max: ${formatCurrency(eligibility.maxRecommendedLoan)}` }
    }
    return { eligible: true, reason: null }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Products</h1>
          <p className="text-gray-500">Browse available loan options and apply online</p>
        </div>
        <Link
          href="/portal/apply"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          Apply for Loan
        </Link>
      </div>

      {/* Credit Score Banner (if logged in) */}
      {eligibility && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Your Credit Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {eligibility.creditScore}
                  <span className="ml-2 text-sm font-medium text-blue-600">
                    Grade {eligibility.creditGrade}
                  </span>
                </p>
              </div>
            </div>
            <div className="sm:ml-auto text-left sm:text-right">
              <p className="text-sm text-gray-600">Max Recommended Loan</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(eligibility.maxRecommendedLoan)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Amount Needed
            </label>
            <input
              type="number"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              placeholder="Enter amount to filter"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'rate' | 'amount')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="rate">Interest Rate (Low to High)</option>
              <option value="amount">Max Amount (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Products Found</h3>
          <p className="text-gray-500 mt-1">
            {amountFilter
              ? 'Try adjusting your amount filter'
              : 'No loan products are currently available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const eligibilityStatus = getEligibleForProduct(product)
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.code}</p>
                    </div>
                    {eligibilityStatus && (
                      <div className={`flex-shrink-0 ${eligibilityStatus.eligible ? 'text-green-600' : 'text-amber-600'}`}>
                        {eligibilityStatus.eligible ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-3">
                    {/* Amount Range */}
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                      </span>
                    </div>

                    {/* Term Range */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Term:</span>
                      <span className="font-medium">
                        {product.minTerm} - {product.maxTerm} months
                      </span>
                    </div>

                    {/* Interest Rate */}
                    <div className="flex items-center gap-2 text-sm">
                      <Percent className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Interest:</span>
                      <span className="font-medium text-blue-600">
                        {product.interestRate}% {getInterestTypeLabel(product.interestType)}
                      </span>
                    </div>

                    {/* Requirements */}
                    <div className="flex items-center gap-3 text-sm">
                      {product.requiresCollateral && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                          <Shield className="w-3 h-3" />
                          Collateral
                        </span>
                      )}
                      {product.requiresGuarantor && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                          <Users className="w-3 h-3" />
                          Guarantor
                        </span>
                      )}
                    </div>

                    {/* Eligibility Warning */}
                    {eligibilityStatus?.reason && (
                      <p className={`text-xs ${eligibilityStatus.eligible ? 'text-amber-600' : 'text-red-600'}`}>
                        {eligibilityStatus.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t">
                  <Link
                    href={`/portal/apply?product=${product.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Banner */}
      {!eligibility && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Log in to see your eligibility
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Sign in to view your credit score and personalized loan recommendations.
              </p>
              <Link
                href="/portal/login"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline mt-2"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
