'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Wallet, Calendar, Filter, Package } from 'lucide-react'

interface LoanData {
  id: string
  loanNumber: string
  principalAmount: number
  interestRate: number
  termMonths: number
  status: string
  loanProduct: string | null
  totalPaid: number
  totalDue: number
  remainingBalance: number
  nextPayment: {
    dueDate: string
    amount: number
    lateDays: number
  } | null
  schedulesCount: number
  paidSchedulesCount: number
}

const STATUS_FILTERS = ['All', 'ACTIVE', 'PENDING', 'CLOSED', 'DEFAULTED'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  DEFAULTED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-100 text-red-700',
  DISBURSED: 'bg-blue-100 text-blue-700',
}

export default function LoansPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<LoanData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('All')

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/portal/loans')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      const result = await res.json()
      setLoans(result.loans || [])
    } catch (error) {
      console.error('Failed to fetch loans:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredLoans = filter === 'All' ? loans : loans.filter(l => l.status === filter)

  const activeCount = loans.filter(l => l.status === 'ACTIVE').length
  const totalBalance = loans.reduce((sum, l) => sum + l.remainingBalance, 0)
  const nextPayment = loans
    .filter(l => l.nextPayment)
    .sort((a, b) => new Date(a.nextPayment!.dueDate).getTime() - new Date(b.nextPayment!.dueDate).getTime())[0]?.nextPayment

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Loans</h1>
        <p className="text-gray-600 mt-1">View and manage your loans</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Payment</p>
              {nextPayment ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(nextPayment.amount)}</p>
                  <p className="text-xs text-gray-500">Due {formatDate(nextPayment.dueDate)}</p>
                </>
              ) : (
                <p className="text-lg font-medium text-green-600">No upcoming</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'All' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {filter === 'All' ? "You don't have any loans yet." : `No ${filter.toLowerCase()} loans found.`}
          </p>
          {filter === 'All' && (
            <Link
              href="/portal/products"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Loan Products
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const progress = loan.totalDue > 0 ? (loan.totalPaid / loan.totalDue) * 100 : 0
            return (
              <Link
                key={loan.id}
                href={`/portal/loans/${loan.id}`}
                className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-gray-900">{loan.loanNumber}</p>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[loan.status] || 'bg-gray-100 text-gray-700'}`}>
                        {loan.status}
                      </span>
                    </div>
                    {loan.loanProduct && (
                      <p className="text-sm text-gray-500">{loan.loanProduct}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Principal: {formatCurrency(loan.principalAmount)} &middot; {loan.interestRate}% &middot; {loan.termMonths} months
                    </p>
                  </div>
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(loan.remainingBalance)}</p>
                    <p className="text-xs text-gray-500">remaining balance</p>
                    {loan.nextPayment && (
                      <p className="text-xs text-gray-500">
                        Next: {formatCurrency(loan.nextPayment.amount)} due {formatDate(loan.nextPayment.dueDate)}
                        {loan.nextPayment.lateDays > 0 && (
                          <span className="text-red-600 ml-1">({loan.nextPayment.lateDays}d late)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {loan.totalDue > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Repayment Progress</span>
                      <span>{loan.paidSchedulesCount}/{loan.schedulesCount} installments ({Math.round(progress)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
