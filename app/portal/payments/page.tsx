'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wallet, Clock, Filter, Receipt, AlertTriangle, Plus } from 'lucide-react'

interface PaymentData {
  id: string
  loanId: string
  loanNumber: string | null
  amount: number
  paymentDate: string
  paymentMethod: string
  receiptNumber: string
  status: string
  isReversed: boolean
  currency: string
}

interface UpcomingData {
  id: string
  loanId: string
  loanNumber: string
  dueDate: string
  totalDue: number
  totalPaid: number
  amountRemaining: number
  principalDue: number
  interestDue: number
  lateDays: number
}

interface LoanOption {
  id: string
  loanNumber: string
}

type Tab = 'history' | 'upcoming'
const PAGE_SIZE = 10

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingData[]>([])
  const [loans, setLoans] = useState<LoanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('history')
  const [filterLoan, setFilterLoan] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/portal/payments')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      const result = await res.json()
      setPayments(result.payments || [])
      setUpcoming(result.upcoming || [])
      setLoans(result.loans || [])
    } catch (err) {
      console.error('Failed to fetch payments:', err)
      setError('Failed to load payments. Please try again.')
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

  const allFilteredPayments = filterLoan
    ? payments.filter(p => p.loanId === filterLoan)
    : payments

  const allFilteredUpcoming = filterLoan
    ? upcoming.filter(u => u.loanId === filterLoan)
    : upcoming

  const historyTotalPages = Math.ceil(allFilteredPayments.length / PAGE_SIZE)
  const upcomingTotalPages = Math.ceil(allFilteredUpcoming.length / PAGE_SIZE)
  const filteredPayments = allFilteredPayments.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE)
  const filteredUpcoming = allFilteredUpcoming.slice((upcomingPage - 1) * PAGE_SIZE, upcomingPage * PAGE_SIZE)

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
    REVERSED: 'bg-gray-100 text-gray-700',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">View your payment history and upcoming schedules</p>
        </div>
        <Link
          href="/portal/payments/make"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Make Payment
        </Link>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          History ({payments.length})
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Upcoming ({upcoming.length})
        </button>
      </div>

      {/* Filter by Loan */}
      {loans.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterLoan}
              onChange={(e) => { setFilterLoan(e.target.value); setHistoryPage(1); setUpcomingPage(1) }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Loans</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>{l.loanNumber}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <>
          {filteredPayments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payment records found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{payment.receiptNumber}</span>
                        </div>
                        {payment.loanNumber && (
                          <p className="text-sm text-gray-500">{payment.loanNumber}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatDate(payment.paymentDate)} &middot; {payment.paymentMethod}
                        </p>
                      </div>
                      <div className="text-left sm:text-right space-y-1">
                        <p className="text-base font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          payment.isReversed
                            ? 'bg-gray-100 text-gray-700'
                            : statusColors[payment.status] || 'bg-gray-100 text-gray-700'
                        }`}>
                          {payment.isReversed ? 'REVERSED' : payment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(historyPage - 1) * PAGE_SIZE + 1}-{Math.min(historyPage * PAGE_SIZE, allFilteredPayments.length)} of {allFilteredPayments.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage === historyTotalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upcoming Tab */}
      {tab === 'upcoming' && (
        <>
          {filteredUpcoming.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming payments scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUpcoming.map((schedule) => (
                <div key={schedule.id} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">{schedule.loanNumber}</p>
                      <p className="text-sm text-gray-500">
                        Due: {formatDate(schedule.dueDate)}
                      </p>
                      {schedule.totalPaid > 0 && (
                        <p className="text-xs text-gray-400">
                          Partially paid: {formatCurrency(schedule.totalPaid)} of {formatCurrency(schedule.totalDue)}
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(schedule.amountRemaining)}
                      </p>
                      {schedule.lateDays > 0 ? (
                        <div className="flex items-center gap-1 text-red-600 text-sm sm:justify-end">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{schedule.lateDays} day{schedule.lateDays > 1 ? 's' : ''} overdue</span>
                        </div>
                      ) : (
                        <p className="text-xs text-green-600">On time</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {upcomingTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(upcomingPage - 1) * PAGE_SIZE + 1}-{Math.min(upcomingPage * PAGE_SIZE, allFilteredUpcoming.length)} of {allFilteredUpcoming.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                  disabled={upcomingPage === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setUpcomingPage(p => Math.min(upcomingTotalPages, p + 1))}
                  disabled={upcomingPage === upcomingTotalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
