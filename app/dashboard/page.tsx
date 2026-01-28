'use client'

import { useEffect, useState } from 'react'
import { DollarSign, BarChart3, Users, Banknote, CreditCard, AlertTriangle, Calendar, Clock, Plus, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  totalLoans: number
  activeLoans: number
  totalBorrowers: number
  totalDisbursed: number
  totalCollected: number
  portfolioAtRisk: number
}

interface RecentLoan {
  id: string
  loanNumber: string
  borrowerName: string
  borrowerId: string
  amount: number
  status: string
  date: string
}

interface UpcomingPayment {
  id: string
  loanId: string
  loanNumber: string
  borrowerId: string
  borrowerName: string
  dueDate: string
  totalDue: number
  amountRemaining: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowers: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    portfolioAtRisk: 0,
  })
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(res => res.json()),
      fetch('/api/dashboard/recent-loans').then(res => res.json()),
      fetch('/api/dashboard/upcoming-payments').then(res => res.json()),
    ])
      .then(([statsData, loansData, paymentsData]) => {
        setStats(statsData)
        setRecentLoans(Array.isArray(loansData) ? loansData : [])
        setUpcomingPayments(Array.isArray(paymentsData) ? paymentsData : [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      PAID: 'bg-gray-100 text-gray-800',
      DEFAULTED: 'bg-red-100 text-red-800',
      REJECTED: 'bg-red-100 text-red-600',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const statCards: Array<{
    name: string
    value: string | number
    icon: LucideIcon
    color: string
  }> = [
    {
      name: 'Total Loans',
      value: stats.totalLoans,
      icon: DollarSign,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Loans',
      value: stats.activeLoans,
      icon: BarChart3,
      color: 'bg-green-500',
    },
    {
      name: 'Total Borrowers',
      value: stats.totalBorrowers,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Disbursed',
      value: formatCurrency(stats.totalDisbursed),
      icon: Banknote,
      color: 'bg-yellow-500',
    },
    {
      name: 'Total Collected',
      value: formatCurrency(stats.totalCollected),
      icon: CreditCard,
      color: 'bg-indigo-500',
    },
    {
      name: 'Portfolio at Risk',
      value: stats.portfolioAtRisk.toFixed(2) + '%',
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ]

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome to your loan management system</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/borrowers?action=new"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Add Borrower</span>
              <span className="sm:hidden">Borrower</span>
            </Link>
            <Link
              href="/dashboard/loans?action=new"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Loan</span>
              <span className="sm:hidden">Loan</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                  <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                </div>
              </div>
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.name}
                  className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                        {stat.value}
                      </p>
                    </div>
                    <div className={'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 ' + stat.color}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                </div>
              )
            })}
      </div>

      <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Loans */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              Recent Loans
            </h2>
            <Link href="/dashboard/loans" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentLoans.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent loans to display</p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {recentLoans.map((loan) => (
                  <Link
                    key={loan.id}
                    href={`/dashboard/loans/${loan.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-blue-600">{loan.loanNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{loan.borrowerName}</span>
                      <span className="font-medium">{formatCurrency(loan.amount)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-600">Loan #</th>
                      <th className="text-left py-2 font-medium text-gray-600">Borrower</th>
                      <th className="text-right py-2 font-medium text-gray-600">Amount</th>
                      <th className="text-center py-2 font-medium text-gray-600">Status</th>
                      <th className="text-right py-2 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLoans.map((loan) => (
                      <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2">
                          <Link href={`/dashboard/loans/${loan.id}`} className="text-blue-600 hover:underline">
                            {loan.loanNumber}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-700">{loan.borrowerName}</td>
                        <td className="py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(loan.amount)}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="py-2 text-right text-gray-500">{formatDate(loan.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              Upcoming Payments
            </h2>
            <Link href="/dashboard/payments" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : upcomingPayments.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming payments in the next 7 days</p>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {upcomingPayments.map((payment) => {
                  const daysUntil = getDaysUntilDue(payment.dueDate)
                  const urgentBg = daysUntil <= 1 ? 'bg-red-50 border-red-200' :
                                   daysUntil <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
                  return (
                    <Link
                      key={payment.id}
                      href={`/dashboard/loans/${payment.loanId}`}
                      className={`block p-3 rounded-lg border hover:shadow-sm transition-shadow ${urgentBg}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">{payment.borrowerName}</span>
                        <span className="text-xs font-medium">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-600">{payment.loanNumber}</span>
                        <span className="font-semibold">{formatCurrency(payment.amountRemaining)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-600">Due Date</th>
                      <th className="text-left py-2 font-medium text-gray-600">Borrower</th>
                      <th className="text-left py-2 font-medium text-gray-600">Loan #</th>
                      <th className="text-right py-2 font-medium text-gray-600">Amount Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingPayments.map((payment) => {
                      const daysUntil = getDaysUntilDue(payment.dueDate)
                      const urgentClass = daysUntil <= 1 ? 'text-red-600 font-medium' :
                                         daysUntil <= 3 ? 'text-orange-600' : 'text-gray-700'
                      return (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className={`py-2 ${urgentClass}`}>
                            {formatDate(payment.dueDate)}
                            <span className="block text-xs text-gray-500">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </span>
                          </td>
                          <td className="py-2 text-gray-700">{payment.borrowerName}</td>
                          <td className="py-2">
                            <Link href={`/dashboard/loans/${payment.loanId}`} className="text-blue-600 hover:underline">
                              {payment.loanNumber}
                            </Link>
                          </td>
                          <td className="py-2 text-right text-gray-900 font-medium">
                            {formatCurrency(payment.amountRemaining)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
