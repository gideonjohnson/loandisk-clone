'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Users, Trophy, TrendingUp, DollarSign,
  Download, AlertTriangle, Target, Award, ChevronDown, ChevronUp
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts'

interface EmployeePerformance {
  id: string
  name: string
  email: string
  role: string
  branch: string | null
  loansManaged: number
  activeLoans: number
  totalDisbursed: number
  totalCollected: number
  interestEarned: number
  feesEarned: number
  penaltiesEarned: number
  totalIncome: number
  defaultedLoans: number
  defaultedAmount: number
  collectionRate: number
  averageLoanSize: number
  newBorrowers: number
  commission: number
}

interface Branch {
  id: string
  name: string
}

interface ReportData {
  startDate: string
  endDate: string
  branchId: string | null
  commissionRate: number
  employees: EmployeePerformance[]
  teamTotals: {
    loansManaged: number
    activeLoans: number
    totalDisbursed: number
    totalCollected: number
    interestEarned: number
    feesEarned: number
    penaltiesEarned: number
    totalIncome: number
    defaultedLoans: number
    defaultedAmount: number
    newBorrowers: number
    commission: number
  }
  branches: Branch[]
  generatedAt: string
}

export default function EmployeePerformanceReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()}`
  })
  const [branchId, setBranchId] = useState('')
  const [commissionRate, setCommissionRate] = useState('2')
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<keyof EmployeePerformance>('totalIncome')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchReport = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      startDate,
      endDate,
      commissionRate,
    })
    if (branchId) params.set('branchId', branchId)

    try {
      const res = await fetch(`/api/reports/employee-performance?${params}`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [startDate, endDate, branchId, commissionRate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(0)}K`
    }
    return formatCurrency(amount)
  }

  const handleSort = (field: keyof EmployeePerformance) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const sortedEmployees = data?.employees.slice().sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    const modifier = sortOrder === 'asc' ? 1 : -1
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier
    }
    return String(aVal).localeCompare(String(bVal)) * modifier
  }) || []

  const downloadCSV = () => {
    if (!data) return

    const headers = [
      'Name', 'Email', 'Role', 'Branch', 'Loans Managed', 'Active Loans',
      'Total Disbursed', 'Total Collected', 'Interest Earned', 'Fees Earned',
      'Penalties Earned', 'Total Income', 'Defaulted Loans', 'Defaulted Amount',
      'Collection Rate %', 'Avg Loan Size', 'New Borrowers', 'Commission'
    ]
    const rows = data.employees.map(e => [
      e.name,
      e.email,
      e.role,
      e.branch || '',
      e.loansManaged,
      e.activeLoans,
      e.totalDisbursed.toFixed(2),
      e.totalCollected.toFixed(2),
      e.interestEarned.toFixed(2),
      e.feesEarned.toFixed(2),
      e.penaltiesEarned.toFixed(2),
      e.totalIncome.toFixed(2),
      e.defaultedLoans,
      e.defaultedAmount.toFixed(2),
      e.collectionRate.toFixed(1),
      e.averageLoanSize.toFixed(2),
      e.newBorrowers,
      e.commission.toFixed(2),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employee_performance_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const topPerformers = sortedEmployees.slice(0, 3)
  const chartData = sortedEmployees.slice(0, 10).map(e => ({
    name: e.name.split(' ')[0],
    income: e.totalIncome,
    collected: e.totalCollected,
    disbursed: e.totalDisbursed,
  }))

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Employee Performance Report
            </h1>
            <p className="text-gray-500 mt-1">
              Loan officer metrics and commission calculations
            </p>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          {data?.branches && data.branches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Branches</option>
                {data.branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm w-24"
            />
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Team Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Team Size</p>
                  <p className="text-xl font-bold text-gray-900">{data.employees.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.teamTotals.totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Collected</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.teamTotals.totalCollected)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Commission</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.teamTotals.commission)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Top Performers */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Performers
              </h3>
              <div className="space-y-3">
                {topPerformers.map((emp, idx) => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-sm text-gray-500">{emp.branch || 'No branch'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCompact(emp.totalIncome)}</p>
                      <p className="text-xs text-gray-500">{emp.loansManaged} loans</p>
                    </div>
                  </div>
                ))}
                {topPerformers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Performance Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Comparison (Top 10)</h3>
              {chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" width={60} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#10B981" />
                      <Bar dataKey="collected" name="Collected" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>
          </div>

          {/* Detailed Employee Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Individual Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('loansManaged')}
                    >
                      Loans {sortBy === 'loansManaged' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalDisbursed')}
                    >
                      Disbursed {sortBy === 'totalDisbursed' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalCollected')}
                    >
                      Collected {sortBy === 'totalCollected' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100 bg-green-50"
                      onClick={() => handleSort('totalIncome')}
                    >
                      Income {sortBy === 'totalIncome' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('collectionRate')}
                    >
                      Rate % {sortBy === 'collectionRate' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:bg-gray-100 bg-yellow-50"
                      onClick={() => handleSort('commission')}
                    >
                      Commission {sortBy === 'commission' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedEmployees.map((emp) => (
                    <>
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.role} {emp.branch && `• ${emp.branch}`}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium">{emp.loansManaged}</span>
                          <span className="text-gray-400 text-xs ml-1">({emp.activeLoans} active)</span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(emp.totalDisbursed)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(emp.totalCollected)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600 bg-green-50">
                          {formatCurrency(emp.totalIncome)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            emp.collectionRate >= 90 ? 'bg-green-100 text-green-700' :
                            emp.collectionRate >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {emp.collectionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-yellow-600 bg-yellow-50">
                          {formatCurrency(emp.commission)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedEmployee === emp.id ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedEmployee === emp.id && (
                        <tr key={`${emp.id}-details`} className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Interest Earned</p>
                                <p className="font-medium">{formatCurrency(emp.interestEarned)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Fees Earned</p>
                                <p className="font-medium">{formatCurrency(emp.feesEarned)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Penalties Earned</p>
                                <p className="font-medium">{formatCurrency(emp.penaltiesEarned)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Avg Loan Size</p>
                                <p className="font-medium">{formatCurrency(emp.averageLoanSize)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">New Borrowers</p>
                                <p className="font-medium">{emp.newBorrowers}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Defaulted Loans</p>
                                <p className={`font-medium ${emp.defaultedLoans > 0 ? 'text-red-600' : ''}`}>
                                  {emp.defaultedLoans}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Defaulted Amount</p>
                                <p className={`font-medium ${emp.defaultedAmount > 0 ? 'text-red-600' : ''}`}>
                                  {formatCurrency(emp.defaultedAmount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Email</p>
                                <p className="font-medium text-blue-600">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3">TEAM TOTAL</td>
                    <td className="px-4 py-3 text-right">{data.teamTotals.loansManaged}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.teamTotals.totalDisbursed)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.teamTotals.totalCollected)}</td>
                    <td className="px-4 py-3 text-right text-green-700 bg-green-100">
                      {formatCurrency(data.teamTotals.totalIncome)}
                    </td>
                    <td className="px-4 py-3 text-right">-</td>
                    <td className="px-4 py-3 text-right text-yellow-700 bg-yellow-100">
                      {formatCurrency(data.teamTotals.commission)}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Risk Indicators
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Defaulted Loans</span>
                  <span className="font-semibold text-red-600">{data.teamTotals.defaultedLoans}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Defaulted Amount</span>
                  <span className="font-semibold text-red-600">{formatCurrency(data.teamTotals.defaultedAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Default Rate</span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    data.teamTotals.loansManaged > 0 && (data.teamTotals.defaultedLoans / data.teamTotals.loansManaged) > 0.1
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {data.teamTotals.loansManaged > 0
                      ? `${((data.teamTotals.defaultedLoans / data.teamTotals.loansManaged) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Growth Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">New Borrowers</span>
                  <span className="font-semibold">{data.teamTotals.newBorrowers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Loans per Officer</span>
                  <span className="font-semibold">
                    {data.employees.length > 0
                      ? (data.teamTotals.loansManaged / data.employees.length).toFixed(1)
                      : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Income per Officer</span>
                  <span className="font-semibold text-green-600">
                    {data.employees.length > 0
                      ? formatCurrency(data.teamTotals.totalIncome / data.employees.length)
                      : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
