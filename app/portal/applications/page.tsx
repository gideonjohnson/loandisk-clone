'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CreditCard, Clock, CheckCircle, XCircle, AlertCircle,
  ArrowRight, DollarSign, Calendar, ChevronRight, Loader2
} from 'lucide-react'

interface LoanApplication {
  id: string
  loanNumber: string
  principalAmount: number
  interestRate: number
  termMonths: number
  status: string
  purpose: string | null
  loanProduct: string | null
  startDate: string
  endDate: string
  createdAt: string
  approvalDate: string | null
  disbursementDate: string | null
  rejectionReason: string | null
  totalPaid: number
  totalDue: number
  remainingBalance: number
  nextPayment: {
    dueDate: string
    amount: number
    lateDays: number
  } | null
  approval: {
    status: string
    comments: string | null
    approvedBy: string
    approvedAt: string | null
  } | null
  disbursement: {
    amount: number
    method: string
    referenceNumber: string | null
    disbursedAt: string
  } | null
  schedulesCount: number
  paidSchedulesCount: number
}

export default function PortalApplicationsPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'active' | 'rejected'>('all')

  useEffect(() => {
    fetchLoans()
  }, [])

  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/portal/loans')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/portal/login')
          return
        }
        throw new Error('Failed to load loans')
      }
      const data = await res.json()
      setLoans(data.loans || [])
    } catch (error) {
      console.error('Failed to load loans:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Under Review',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          description: 'Your application is being reviewed',
        }
      case 'APPROVED':
        return {
          label: 'Approved',
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle,
          description: 'Awaiting disbursement',
        }
      case 'ACTIVE':
        return {
          label: 'Active',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          description: 'Loan disbursed',
        }
      case 'REJECTED':
        return {
          label: 'Not Approved',
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          description: 'Application not approved',
        }
      case 'COMPLETED':
        return {
          label: 'Completed',
          color: 'bg-gray-100 text-gray-800',
          icon: CheckCircle,
          description: 'Loan fully repaid',
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          description: '',
        }
    }
  }

  const filteredLoans = loans.filter((loan) => {
    if (filter === 'all') return true
    if (filter === 'pending') return loan.status === 'PENDING'
    if (filter === 'approved') return loan.status === 'APPROVED'
    if (filter === 'active') return loan.status === 'ACTIVE'
    if (filter === 'rejected') return loan.status === 'REJECTED'
    return true
  })

  const statusCounts = {
    all: loans.length,
    pending: loans.filter((l) => l.status === 'PENDING').length,
    approved: loans.filter((l) => l.status === 'APPROVED').length,
    active: loans.filter((l) => l.status === 'ACTIVE').length,
    rejected: loans.filter((l) => l.status === 'REJECTED').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
          <p className="mt-4 text-gray-500">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500">Track your loan applications and their status</p>
        </div>
        <Link
          href="/portal/apply"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          New Application
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'active', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1 opacity-75">({statusCounts[f]})</span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Applications Found</h3>
          <p className="text-gray-500 mt-1">
            {filter === 'all'
              ? "You haven't applied for any loans yet"
              : `No ${filter} applications found`}
          </p>
          {filter === 'all' && (
            <Link
              href="/portal/products"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Loan Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLoans.map((loan) => {
            const statusConfig = getStatusConfig(loan.status)
            const StatusIcon = statusConfig.icon

            return (
              <Link
                key={loan.id}
                href={`/portal/applications/${loan.id}`}
                className="block bg-white rounded-xl border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      loan.status === 'PENDING' ? 'bg-yellow-100' :
                      loan.status === 'APPROVED' ? 'bg-blue-100' :
                      loan.status === 'ACTIVE' ? 'bg-green-100' :
                      loan.status === 'REJECTED' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <StatusIcon className={`w-6 h-6 ${
                        loan.status === 'PENDING' ? 'text-yellow-600' :
                        loan.status === 'APPROVED' ? 'text-blue-600' :
                        loan.status === 'ACTIVE' ? 'text-green-600' :
                        loan.status === 'REJECTED' ? 'text-red-600' : 'text-gray-600'
                      }`} />
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{loan.loanNumber}</h3>
                          <p className="text-sm text-gray-500">{loan.loanProduct || 'Loan Application'}</p>
                        </div>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Amount
                          </p>
                          <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Term
                          </p>
                          <p className="font-medium">{loan.termMonths} months</p>
                        </div>
                        <div>
                          <p className="text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Applied
                          </p>
                          <p className="font-medium">{formatDate(loan.createdAt)}</p>
                        </div>
                        {loan.status === 'ACTIVE' && loan.nextPayment && (
                          <div>
                            <p className="text-gray-500">Next Payment</p>
                            <p className="font-medium text-blue-600">
                              {formatCurrency(loan.nextPayment.amount)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Rejection reason preview */}
                      {loan.status === 'REJECTED' && loan.rejectionReason && (
                        <p className="mt-2 text-sm text-red-600 line-clamp-1">
                          Reason: {loan.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-gray-400 hidden sm:block flex-shrink-0" />
                  </div>
                </div>

                {/* Progress bar for active loans */}
                {loan.status === 'ACTIVE' && loan.schedulesCount > 0 && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Repayment Progress</span>
                      <span>{loan.paidSchedulesCount} of {loan.schedulesCount} payments</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(loan.paidSchedulesCount / loan.schedulesCount) * 100}%` }}
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
