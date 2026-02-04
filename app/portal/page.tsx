'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Wallet, Calendar, ArrowRight, Bell } from 'lucide-react'

interface LoanSummary {
  id: string
  loanNumber: string
  principalAmount: number
  balance: number
  status: string
  nextPaymentDate: string | null
  nextPaymentAmount: number | null
}

interface PortalDashboard {
  borrower: {
    firstName: string
    lastName: string
  }
  loans: LoanSummary[]
  totalBalance: number
  nextPayment: {
    amount: number
    dueDate: string
    loanNumber: string
  } | null
  notifications: {
    id: string
    message: string
    type: string
    createdAt: string
  }[]
}

export default function PortalDashboard() {
  const router = useRouter()
  const [data, setData] = useState<PortalDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/portal/dashboard')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard. Please try again.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Welcome back, {data.borrower.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s your account summary</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.loans.filter(l => l.status === 'ACTIVE').length}
              </p>
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
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.totalBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Payment</p>
              {data.nextPayment ? (
                <>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(data.nextPayment.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due {formatDate(data.nextPayment.dueDate)}
                  </p>
                </>
              ) : (
                <p className="text-lg font-medium text-green-600">No upcoming payments</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Next Payment Action */}
      {data.nextPayment && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-100 text-sm">Upcoming Payment - {data.nextPayment.loanNumber}</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(data.nextPayment.amount)}</p>
              <p className="text-blue-100 mt-1">Due on {formatDate(data.nextPayment.dueDate)}</p>
            </div>
            <Link
              href="/portal/payments/make"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Make Payment
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Loans List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">My Loans</h2>
          <Link href="/portal/loans" className="text-blue-600 text-sm hover:underline">
            View All
          </Link>
        </div>

        {data.loans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            You don&apos;t have any loans yet.
          </div>
        ) : (
          <div className="divide-y">
            {data.loans.slice(0, 3).map((loan) => (
              <Link
                key={loan.id}
                href={`/portal/loans/${loan.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{loan.loanNumber}</p>
                  <p className="text-sm text-gray-500">
                    Principal: {formatCurrency(loan.principalAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatCurrency(loan.balance)}
                  </p>
                  <span className={`
                    inline-block px-2 py-0.5 text-xs font-medium rounded-full
                    ${loan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      loan.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }
                  `}>
                    {loan.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {data.notifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Notifications</h2>
          </div>
          <div className="divide-y">
            {data.notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="p-4">
                <p className="text-gray-900">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
