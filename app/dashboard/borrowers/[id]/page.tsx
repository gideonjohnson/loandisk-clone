'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, Phone, Mail, MapPin, CreditCard, Calendar,
  DollarSign, FileText, Download, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Clock, Banknote
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Borrower {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  country: string | null
  dateOfBirth: string | null
  idNumber: string | null
  employmentStatus: string | null
  monthlyIncome: number | null
  creditScore: number | null
  active: boolean
  blacklisted: boolean
  kycVerified: boolean
  createdAt: string
  loans: Loan[]
  summary: {
    totalLoans: number
    activeLoans: number
    totalBorrowed: number
    totalPaid: number
    totalOutstanding: number
    totalFees: number
    totalPenalties: number
  }
}

interface Loan {
  id: string
  loanNumber: string
  principalAmount: number
  interestRate: number
  termMonths: number
  status: string
  startDate: string
  endDate: string
  createdAt: string
  loanOfficer: { id: string; name: string }
  payments: Payment[]
  schedules: Schedule[]
  fees: LoanFee[]
  penalties: Penalty[]
  disbursement: { disbursedAt: string; amount: number } | null
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  receiptNumber: string
  paymentMethod: string
  principalAmount: number
  interestAmount: number
  feesAmount: number
  isReversed: boolean
}

interface Schedule {
  id: string
  dueDate: string
  totalDue: number
  totalPaid: number
  isPaid: boolean
  principalDue: number
  interestDue: number
}

interface LoanFee {
  id: string
  amount: number
  isPaid: boolean
  fee: { name: string }
}

interface Penalty {
  id: string
  amount: number
  isPaid: boolean
  reason: string | null
}

interface StatementTransaction {
  date: string
  type: string
  description: string
  debit: number
  credit: number
  balance: number
  loanNumber: string
  reference?: string
}

interface Statement {
  generatedAt: string
  transactions: StatementTransaction[]
  summary: {
    totalDisbursed: number
    totalPayments: number
    totalFees: number
    totalPenalties: number
    outstandingBalance: number
    totalTransactions: number
  }
}

export default function BorrowerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [statementLoading, setStatementLoading] = useState(false)
  const [expandedLoans, setExpandedLoans] = useState<Set<string>>(new Set())
  const [showStatement, setShowStatement] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    if (params.id) {
      fetch(`/api/borrowers/${params.id}`)
        .then(res => res.json())
        .then(data => {
          setBorrower(data)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [params.id])

  const fetchStatement = async () => {
    setStatementLoading(true)
    const queryParams = new URLSearchParams()
    if (dateRange.start) queryParams.set('startDate', dateRange.start)
    if (dateRange.end) queryParams.set('endDate', dateRange.end)

    try {
      const res = await fetch(`/api/borrowers/${params.id}/statement?${queryParams}`)
      const data = await res.json()
      setStatement(data.statement)
      setShowStatement(true)
    } catch (err) {
      console.error(err)
    }
    setStatementLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  const toggleLoanExpand = (loanId: string) => {
    const newExpanded = new Set(expandedLoans)
    if (newExpanded.has(loanId)) {
      newExpanded.delete(loanId)
    } else {
      newExpanded.add(loanId)
    }
    setExpandedLoans(newExpanded)
  }

  const downloadStatementCSV = () => {
    if (!statement || !borrower) return

    const headers = ['Date', 'Type', 'Description', 'Loan #', 'Reference', 'Debit', 'Credit', 'Balance']
    const rows = statement.transactions.map(t => [
      formatDate(t.date),
      t.type,
      t.description,
      t.loanNumber,
      t.reference || '',
      t.debit > 0 ? t.debit.toFixed(2) : '',
      t.credit > 0 ? t.credit.toFixed(2) : '',
      t.balance.toFixed(2),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `statement_${borrower.firstName}_${borrower.lastName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (!borrower) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Borrower not found</p>
        <Link href="/dashboard/borrowers" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Borrowers
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {borrower.firstName} {borrower.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {borrower.blacklisted && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Blacklisted
                </span>
              )}
              {borrower.kycVerified && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> KYC Verified
                </span>
              )}
              {!borrower.active && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  Inactive
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/loans?action=new&borrowerId=${borrower.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              New Loan
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Borrower Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h2>
          <div className="space-y-3 text-sm">
            {borrower.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{borrower.phone}</span>
              </div>
            )}
            {borrower.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{borrower.email}</span>
              </div>
            )}
            {(borrower.address || borrower.city) && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{[borrower.address, borrower.city, borrower.country].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {borrower.idNumber && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>ID: {borrower.idNumber}</span>
              </div>
            )}
            {borrower.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>DOB: {formatDate(borrower.dateOfBirth)}</span>
              </div>
            )}
            {borrower.employmentStatus && (
              <div className="flex items-center gap-3">
                <Banknote className="w-4 h-4 text-gray-400" />
                <span>{borrower.employmentStatus} {borrower.monthlyIncome ? `- ${formatCurrency(borrower.monthlyIncome)}/mo` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Account Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{borrower.summary.totalLoans}</p>
              <p className="text-xs text-gray-600">Total Loans</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{borrower.summary.activeLoans}</p>
              <p className="text-xs text-gray-600">Active Loans</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">{formatCurrency(borrower.summary.totalBorrowed)}</p>
              <p className="text-xs text-gray-600">Total Borrowed</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{formatCurrency(borrower.summary.totalPaid)}</p>
              <p className="text-xs text-gray-600">Total Paid</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(borrower.summary.totalOutstanding)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Fees</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(borrower.summary.totalFees)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Penalties</p>
              <p className="text-lg font-semibold text-orange-600">{formatCurrency(borrower.summary.totalPenalties)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Statement Section */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Account Statement
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1.5 border rounded-lg text-sm"
              placeholder="Start Date"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1.5 border rounded-lg text-sm"
              placeholder="End Date"
            />
            <button
              onClick={fetchStatement}
              disabled={statementLoading}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            >
              {statementLoading ? 'Loading...' : 'Generate Statement'}
            </button>
          </div>
        </div>

        {showStatement && statement && (
          <>
            <div className="flex justify-between items-center mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{statement.summary.totalTransactions}</span> transactions
                {dateRange.start && ` from ${formatDate(dateRange.start)}`}
                {dateRange.end && ` to ${formatDate(dateRange.end)}`}
              </div>
              <button
                onClick={downloadStatementCSV}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>

            {/* Statement Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Disbursed</p>
                <p className="font-semibold text-red-600">{formatCurrency(statement.summary.totalDisbursed)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Payments</p>
                <p className="font-semibold text-green-600">{formatCurrency(statement.summary.totalPayments)}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Fees</p>
                <p className="font-semibold text-orange-600">{formatCurrency(statement.summary.totalFees)}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Penalties</p>
                <p className="font-semibold text-yellow-600">{formatCurrency(statement.summary.totalPenalties)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center col-span-2 sm:col-span-1">
                <p className="text-sm text-gray-600">Balance</p>
                <p className="font-bold text-purple-600">{formatCurrency(statement.summary.outstandingBalance)}</p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 hidden sm:table-cell">Loan #</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Debit</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Credit</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${
                          tx.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                          tx.type === 'DISBURSEMENT' ? 'bg-blue-100 text-blue-700' :
                          tx.type === 'FEE' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="text-gray-700">{tx.description}</span>
                        {tx.reference && <span className="text-gray-400 text-xs ml-1">({tx.reference})</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{tx.loanNumber}</td>
                      <td className="px-3 py-2 text-right text-red-600">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right text-green-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(tx.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!showStatement && (
          <p className="text-gray-500 text-center py-8">
            Click &quot;Generate Statement&quot; to view the account statement
          </p>
        )}
      </div>

      {/* Loans List */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan History</h2>
        <div className="space-y-4">
          {borrower.loans.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No loans found</p>
          ) : (
            borrower.loans.map((loan) => {
              const isExpanded = expandedLoans.has(loan.id)
              const totalPaid = loan.payments.filter(p => !p.isReversed).reduce((sum, p) => sum + Number(p.amount), 0)
              const totalDue = loan.schedules.reduce((sum, s) => sum + Number(s.totalDue), 0)
              const progress = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0

              return (
                <div key={loan.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleLoanExpand(loan.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <Link
                          href={`/dashboard/loans/${loan.id}`}
                          className="font-medium text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {loan.loanNumber}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(Number(loan.principalAmount))} at {Number(loan.interestRate)}% for {loan.termMonths} months
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                        {loan.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium">{formatCurrency(totalPaid)} / {formatCurrency(totalDue)}</p>
                        <div className="w-24 h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Payment Schedule */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Payment Schedule
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {loan.schedules.map((schedule, idx) => (
                              <div
                                key={schedule.id}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  schedule.isPaid ? 'bg-green-50' : new Date(schedule.dueDate) < new Date() ? 'bg-red-50' : 'bg-white'
                                }`}
                              >
                                <span className="text-gray-600">#{idx + 1} - {formatDate(schedule.dueDate)}</span>
                                <span className={schedule.isPaid ? 'text-green-600' : 'text-gray-900'}>
                                  {formatCurrency(Number(schedule.totalDue))}
                                  {schedule.isPaid && ' (Paid)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent Payments */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Recent Payments
                          </h4>
                          {loan.payments.length === 0 ? (
                            <p className="text-gray-500 text-sm">No payments yet</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {loan.payments.slice(0, 5).map((payment) => (
                                <div
                                  key={payment.id}
                                  className={`flex items-center justify-between p-2 rounded text-sm bg-white ${
                                    payment.isReversed ? 'opacity-50 line-through' : ''
                                  }`}
                                >
                                  <div>
                                    <span className="text-gray-600">{formatDate(payment.paymentDate)}</span>
                                    <span className="text-gray-400 text-xs ml-2">({payment.receiptNumber})</span>
                                  </div>
                                  <span className="text-green-600 font-medium">{formatCurrency(Number(payment.amount))}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
