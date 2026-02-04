'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Clock, Filter, Receipt, AlertTriangle } from 'lucide-react'

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

export default function PaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingData[]>([])
  const [loans, setLoans] = useState<LoanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('history')
  const [filterLoan, setFilterLoan] = useState('')

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
    } catch (error) {
      console.error('Failed to fetch payments:', error)
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

  const filteredPayments = filterLoan
    ? payments.filter(p => p.loanId === filterLoan)
    : payments

  const filteredUpcoming = filterLoan
    ? upcoming.filter(u => u.loanId === filterLoan)
    : upcoming

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
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">View your payment history and upcoming schedules</p>
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
              onChange={(e) => setFilterLoan(e.target.value)}
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
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
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
        </>
      )}
    </div>
  )
}
