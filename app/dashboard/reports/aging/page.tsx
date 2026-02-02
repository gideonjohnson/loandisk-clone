'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Phone, Mail, TrendingUp, Users, DollarSign } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AgingBucket {
  label: string
  count: number
  principal: number
  interest: number
  total: number
  loans: LoanDetail[]
}

interface LoanDetail {
  id: string
  loanNumber: string
  borrowerName: string
  borrowerPhone: string
  borrowerEmail: string | null
  loanOfficer: string
  branch: string
  principalAmount: number
  daysOverdue: number
  overdueSchedules: number
  overduePrincipal: number
  overdueInterest: number
  overdueFees: number
  totalOverdue: number
  oldestDueDate: string
}

interface AgingData {
  summary: {
    totalActiveLoans: number
    totalPortfolio: number
    totalOverdueLoans: number
    totalOverdueAmount: number
    par30: string
    par90: string
  }
  agingBuckets: Record<string, AgingBucket>
  overdueLoans: LoanDetail[]
  branches: { id: string; name: string }[]
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626', '#991b1b']

export default function AgingReportPage() {
  const [data, setData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState('all')
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (branchFilter !== 'all') params.set('branchId', branchFilter)

      const res = await fetch(`/api/reports/aging?${params}`)
      const result = await res.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch aging data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return

    const headers = ['Loan #', 'Borrower', 'Phone', 'Officer', 'Branch', 'Principal', 'Days Overdue', 'Overdue Amount', 'Oldest Due Date']
    const rows = data.overdueLoans.map(l => [
      l.loanNumber,
      l.borrowerName,
      l.borrowerPhone,
      l.loanOfficer,
      l.branch,
      l.principalAmount.toFixed(2),
      l.daysOverdue,
      l.totalOverdue.toFixed(2),
      new Date(l.oldestDueDate).toLocaleDateString()
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aging_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val)

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Failed to load aging report</div>
  }

  const chartData = Object.entries(data.agingBuckets)
    .filter(([key]) => key !== 'current')
    .map(([key, bucket], idx) => ({
      name: bucket.label,
      count: bucket.count,
      amount: bucket.total,
      color: COLORS[idx + 1]
    }))

  const pieData = Object.entries(data.agingBuckets).map(([key, bucket], idx) => ({
    name: bucket.label,
    value: bucket.count,
    color: COLORS[idx]
  })).filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aging / Collection Report</h1>
          <p className="text-gray-600 mt-1">Portfolio at Risk (PAR) Analysis</p>
        </div>
        <div className="flex gap-3">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Branches</option>
            {data.branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Loans</p>
              <p className="text-2xl font-bold">{data.summary.totalActiveLoans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Portfolio</p>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalPortfolio)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">PAR &gt; 30 Days</p>
              <p className="text-2xl font-bold text-yellow-600">{data.summary.par30}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">PAR &gt; 90 Days</p>
              <p className="text-2xl font-bold text-red-600">{data.summary.par90}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-4">Overdue Amount by Aging Bucket</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold mb-4">Loan Distribution by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Aging Breakdown</h3>
        </div>
        <div className="divide-y">
          {Object.entries(data.agingBuckets).map(([key, bucket], idx) => (
            <div key={key}>
              <button
                onClick={() => setExpandedBucket(expandedBucket === key ? null : key)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <span className="font-medium">{bucket.label}</span>
                  <span className="text-sm text-gray-500">({bucket.count} loans)</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(bucket.total)}</p>
                  <p className="text-xs text-gray-500">
                    Principal: {formatCurrency(bucket.principal)} | Interest: {formatCurrency(bucket.interest)}
                  </p>
                </div>
              </button>

              {expandedBucket === key && bucket.loans.length > 0 && (
                <div className="bg-gray-50 p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-2">Loan #</th>
                        <th className="pb-2">Borrower</th>
                        <th className="pb-2">Contact</th>
                        <th className="pb-2">Officer</th>
                        <th className="pb-2 text-right">Days Overdue</th>
                        <th className="pb-2 text-right">Overdue Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bucket.loans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-100">
                          <td className="py-2 font-medium">{loan.loanNumber}</td>
                          <td className="py-2">{loan.borrowerName}</td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <a href={`tel:${loan.borrowerPhone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {loan.borrowerPhone}
                              </a>
                            </div>
                          </td>
                          <td className="py-2 text-gray-600">{loan.loanOfficer}</td>
                          <td className="py-2 text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              loan.daysOverdue > 90 ? 'bg-red-100 text-red-700' :
                              loan.daysOverdue > 30 ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {loan.daysOverdue} days
                            </span>
                          </td>
                          <td className="py-2 text-right font-medium text-red-600">
                            {formatCurrency(loan.totalOverdue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Loans Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">All Overdue Loans ({data.overdueLoans.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrower</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.overdueLoans.slice(0, 50).map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a href={`/dashboard/loans/${loan.id}`} className="text-blue-600 hover:underline font-medium">
                      {loan.loanNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3">{loan.borrowerName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <a href={`tel:${loan.borrowerPhone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {loan.borrowerPhone}
                      </a>
                      {loan.borrowerEmail && (
                        <a href={`mailto:${loan.borrowerEmail}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{loan.loanOfficer}</td>
                  <td className="px-4 py-3 text-gray-600">{loan.branch}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      loan.daysOverdue > 90 ? 'bg-red-100 text-red-700' :
                      loan.daysOverdue > 60 ? 'bg-orange-100 text-orange-700' :
                      loan.daysOverdue > 30 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {loan.daysOverdue}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {formatCurrency(loan.totalOverdue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.overdueLoans.length > 50 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Showing 50 of {data.overdueLoans.length} overdue loans. Export CSV for full list.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
