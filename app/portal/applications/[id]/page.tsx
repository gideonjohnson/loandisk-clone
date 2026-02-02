'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CreditCard, DollarSign, Clock, Calendar,
  CheckCircle, XCircle, AlertCircle, FileText, Banknote,
  User, Percent, Loader2
} from 'lucide-react'

interface LoanDetail {
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

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loan, setLoan] = useState<LoanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLoan()
  }, [id])

  const fetchLoan = async () => {
    try {
      const res = await fetch('/api/portal/loans')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/portal/login')
          return
        }
        throw new Error('Failed to load loan')
      }
      const data = await res.json()
      const found = data.loans?.find((l: LoanDetail) => l.id === id)
      if (found) {
        setLoan(found)
      } else {
        setError('Application not found')
      }
    } catch {
      setError('Failed to load application details')
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
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Under Review',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          bgColor: 'bg-yellow-50',
        }
      case 'APPROVED':
        return {
          label: 'Approved - Awaiting Disbursement',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircle,
          bgColor: 'bg-blue-50',
        }
      case 'ACTIVE':
        return {
          label: 'Disbursed - Active',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          bgColor: 'bg-green-50',
        }
      case 'REJECTED':
        return {
          label: 'Not Approved',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          bgColor: 'bg-red-50',
        }
      case 'COMPLETED':
        return {
          label: 'Completed',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: CheckCircle,
          bgColor: 'bg-gray-50',
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle,
          bgColor: 'bg-gray-50',
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
          <p className="mt-4 text-gray-500">Loading application...</p>
        </div>
      </div>
    )
  }

  if (error || !loan) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">{error || 'Application Not Found'}</h2>
        <Link
          href="/portal/applications"
          className="inline-flex items-center gap-2 mt-6 text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Link>
      </div>
    )
  }

  const statusConfig = getStatusConfig(loan.status)
  const StatusIcon = statusConfig.icon

  // Timeline events
  const timelineEvents = [
    {
      label: 'Application Submitted',
      date: loan.createdAt,
      completed: true,
      icon: FileText,
    },
    {
      label: 'Under Review',
      date: loan.createdAt,
      completed: loan.status !== 'PENDING',
      icon: Clock,
      current: loan.status === 'PENDING',
    },
    {
      label: loan.status === 'REJECTED' ? 'Rejected' : 'Approved',
      date: loan.approvalDate || loan.approval?.approvedAt,
      completed: ['APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED'].includes(loan.status),
      icon: loan.status === 'REJECTED' ? XCircle : CheckCircle,
      current: loan.status === 'APPROVED',
      failed: loan.status === 'REJECTED',
    },
    {
      label: 'Disbursed',
      date: loan.disbursementDate || loan.disbursement?.disbursedAt,
      completed: ['ACTIVE', 'COMPLETED'].includes(loan.status),
      icon: Banknote,
      current: loan.status === 'ACTIVE',
      hidden: loan.status === 'REJECTED',
    },
  ].filter((e) => !e.hidden)

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/portal/applications"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className={`rounded-xl border p-6 ${statusConfig.bgColor}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
            <StatusIcon className={`w-8 h-8 ${
              loan.status === 'PENDING' ? 'text-yellow-600' :
              loan.status === 'APPROVED' ? 'text-blue-600' :
              loan.status === 'ACTIVE' ? 'text-green-600' :
              loan.status === 'REJECTED' ? 'text-red-600' : 'text-gray-600'
            }`} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{loan.loanNumber}</h1>
            <p className="text-gray-600">{loan.loanProduct || 'Loan Application'}</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Loan Details */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Principal Amount
                </p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Percent className="w-4 h-4" />
                  Interest Rate
                </p>
                <p className="text-xl font-bold text-gray-900">{loan.interestRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Term
                </p>
                <p className="text-xl font-bold text-gray-900">{loan.termMonths} months</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Applied On
                </p>
                <p className="text-xl font-bold text-gray-900">{formatDate(loan.createdAt)}</p>
              </div>
              {loan.purpose && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Purpose</p>
                  <p className="font-medium text-gray-900">{loan.purpose}</p>
                </div>
              )}
            </div>
          </div>

          {/* Repayment Info (for active loans) */}
          {['ACTIVE', 'COMPLETED'].includes(loan.status) && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Repayment Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Due</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(loan.totalDue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(loan.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(loan.remainingBalance)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{loan.paidSchedulesCount} of {loan.schedulesCount} payments</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${loan.schedulesCount > 0 ? (loan.paidSchedulesCount / loan.schedulesCount) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {loan.nextPayment && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Next Payment Due</p>
                      <p className="font-medium">{formatDate(loan.nextPayment.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Amount</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(loan.nextPayment.amount)}</p>
                    </div>
                  </div>
                  {loan.nextPayment.lateDays > 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      Payment is {loan.nextPayment.lateDays} days overdue
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rejection Reason */}
          {loan.status === 'REJECTED' && loan.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Rejection Reason</h2>
              <p className="text-red-700">{loan.rejectionReason}</p>
              {loan.approval?.comments && (
                <div className="mt-4">
                  <p className="text-sm text-red-600">Additional Comments:</p>
                  <p className="text-red-700">{loan.approval.comments}</p>
                </div>
              )}
            </div>
          )}

          {/* Disbursement Info */}
          {loan.disbursement && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Disbursement Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Amount Disbursed</p>
                  <p className="font-bold text-green-600">{formatCurrency(loan.disbursement.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Method</p>
                  <p className="font-medium">{loan.disbursement.method}</p>
                </div>
                {loan.disbursement.referenceNumber && (
                  <div>
                    <p className="text-sm text-gray-500">Reference Number</p>
                    <p className="font-medium font-mono">{loan.disbursement.referenceNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Disbursed On</p>
                  <p className="font-medium">{formatDateTime(loan.disbursement.disbursedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Timeline</h2>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const EventIcon = event.icon
                return (
                  <div key={index} className="flex gap-3">
                    <div className="relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          event.failed
                            ? 'bg-red-100'
                            : event.completed
                            ? 'bg-green-100'
                            : event.current
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <EventIcon
                          className={`w-4 h-4 ${
                            event.failed
                              ? 'text-red-600'
                              : event.completed
                              ? 'text-green-600'
                              : event.current
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      {index < timelineEvents.length - 1 && (
                        <div
                          className={`absolute top-8 left-4 w-0.5 h-8 -ml-px ${
                            event.completed && !timelineEvents[index + 1]?.failed
                              ? 'bg-green-300'
                              : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p
                        className={`font-medium ${
                          event.failed
                            ? 'text-red-700'
                            : event.completed || event.current
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {event.label}
                      </p>
                      {event.date && (event.completed || event.current) && (
                        <p className="text-sm text-gray-500">{formatDateTime(event.date)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Approval Info */}
          {loan.approval && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Reviewed by:</span>
                  <span className="font-medium">{loan.approval.approvedBy}</span>
                </div>
                {loan.approval.approvedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Date:</span>
                    <span className="font-medium">{formatDateTime(loan.approval.approvedAt)}</span>
                  </div>
                )}
                {loan.approval.comments && loan.status !== 'REJECTED' && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-500 mb-1">Comments:</p>
                    <p className="text-gray-700">{loan.approval.comments}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              {loan.status === 'ACTIVE' && (
                <Link
                  href="/portal/payments"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Make a Payment
                </Link>
              )}
              {loan.status === 'REJECTED' && (
                <Link
                  href="/portal/apply"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Again
                </Link>
              )}
              <Link
                href="/portal/help"
                className="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Need Help?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
