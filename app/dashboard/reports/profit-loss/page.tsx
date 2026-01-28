'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  Calendar, Building2, Download, BarChart3, PieChart
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, Pie, Cell
} from 'recharts'

interface PeriodData {
  period: string
  interestIncome: number
  feeIncome: number
  penaltyIncome: number
  totalIncome: number
  provisionForBadDebt: number
  writeOffs: number
  totalExpenses: number
  netProfit: number
  loansDisbursed: number
  loansCount: number
  paymentsReceived: number
  paymentsCount: number
}

interface Branch {
  id: string
  name: string
}

interface ReportData {
  year: number
  periodType: string
  branchId: string | null
  periods: PeriodData[]
  totals: {
    interestIncome: number
    feeIncome: number
    penaltyIncome: number
    totalIncome: number
    provisionForBadDebt: number
    writeOffs: number
    totalExpenses: number
    netProfit: number
    loansDisbursed: number
    loansCount: number
    paymentsReceived: number
    paymentsCount: number
  }
  branches: Branch[]
  generatedAt: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ProfitLossReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [periodType, setPeriodType] = useState('monthly')
  const [branchId, setBranchId] = useState('')
  const [chartView, setChartView] = useState<'bar' | 'line'>('bar')

  const fetchReport = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      year: year.toString(),
      periodType,
    })
    if (branchId) params.set('branchId', branchId)

    try {
      const res = await fetch(`/api/reports/profit-loss?${params}`)
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [year, periodType, branchId])

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

  const downloadCSV = () => {
    if (!data) return

    const headers = [
      'Period', 'Interest Income', 'Fee Income', 'Penalty Income', 'Total Income',
      'Bad Debt Provision', 'Write-offs', 'Total Expenses', 'Net Profit',
      'Loans Disbursed', 'Loan Count', 'Payments Received', 'Payment Count'
    ]
    const rows = data.periods.map(p => [
      p.period,
      p.interestIncome.toFixed(2),
      p.feeIncome.toFixed(2),
      p.penaltyIncome.toFixed(2),
      p.totalIncome.toFixed(2),
      p.provisionForBadDebt.toFixed(2),
      p.writeOffs.toFixed(2),
      p.totalExpenses.toFixed(2),
      p.netProfit.toFixed(2),
      p.loansDisbursed.toFixed(2),
      p.loansCount,
      p.paymentsReceived.toFixed(2),
      p.paymentsCount,
    ])

    // Add totals row
    rows.push([
      'TOTAL',
      data.totals.interestIncome.toFixed(2),
      data.totals.feeIncome.toFixed(2),
      data.totals.penaltyIncome.toFixed(2),
      data.totals.totalIncome.toFixed(2),
      data.totals.provisionForBadDebt.toFixed(2),
      data.totals.writeOffs.toFixed(2),
      data.totals.totalExpenses.toFixed(2),
      data.totals.netProfit.toFixed(2),
      data.totals.loansDisbursed.toFixed(2),
      data.totals.loansCount.toString(),
      data.totals.paymentsReceived.toFixed(2),
      data.totals.paymentsCount.toString(),
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit_loss_${year}_${periodType}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const incomeBreakdown = data ? [
    { name: 'Interest', value: data.totals.interestIncome, color: '#3B82F6' },
    { name: 'Fees', value: data.totals.feeIncome, color: '#10B981' },
    { name: 'Penalties', value: data.totals.penaltyIncome, color: '#F59E0B' },
  ].filter(item => item.value > 0) : []

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
              Profit & Loss Report
            </h1>
            <p className="text-gray-500 mt-1">
              Company income and expenses breakdown
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {[...Array(5)].map((_, i) => {
                const y = new Date().getFullYear() - i
                return <option key={y} value={y}>{y}</option>
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart</label>
            <div className="flex gap-1">
              <button
                onClick={() => setChartView('bar')}
                className={`p-2 rounded ${chartView === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setChartView('line')}
                className={`p-2 rounded ${chartView === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              >
                <TrendingUp className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Income</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.totals.totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.totals.totalExpenses)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.totals.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`w-5 h-5 ${data.totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Net Profit</p>
                  <p className={`text-xl font-bold ${data.totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCompact(data.totals.netProfit)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Loans Disbursed</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompact(data.totals.loansDisbursed)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'bar' ? (
                    <BarChart data={data.periods}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="totalIncome" name="Income" fill="#3B82F6" />
                      <Bar dataKey="totalExpenses" name="Expenses" fill="#EF4444" />
                      <Bar dataKey="netProfit" name="Net Profit" fill="#10B981" />
                    </BarChart>
                  ) : (
                    <LineChart data={data.periods}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="totalIncome" name="Income" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="totalExpenses" name="Expenses" stroke="#EF4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#10B981" strokeWidth={2} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Income Breakdown Pie */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Income Breakdown</h3>
              {incomeBreakdown.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={incomeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {incomeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No income data</p>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    Interest
                  </span>
                  <span className="font-medium">{formatCurrency(data.totals.interestIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    Fees
                  </span>
                  <span className="font-medium">{formatCurrency(data.totals.feeIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-yellow-500"></span>
                    Penalties
                  </span>
                  <span className="font-medium">{formatCurrency(data.totals.penaltyIncome)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Detailed Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Period</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Interest</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Fees</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Penalties</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 bg-blue-50">Total Income</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Bad Debt</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 bg-red-50">Expenses</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 bg-green-50">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.periods.map((period) => (
                    <tr key={period.period} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{period.period}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(period.interestIncome)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(period.feeIncome)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(period.penaltyIncome)}</td>
                      <td className="px-4 py-3 text-right font-medium bg-blue-50 text-blue-700">
                        {formatCurrency(period.totalIncome)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(period.provisionForBadDebt)}</td>
                      <td className="px-4 py-3 text-right bg-red-50 text-red-700">
                        {formatCurrency(period.totalExpenses)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium bg-green-50 ${period.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(period.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.totals.interestIncome)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.totals.feeIncome)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(data.totals.penaltyIncome)}</td>
                    <td className="px-4 py-3 text-right text-blue-700 bg-blue-100">
                      {formatCurrency(data.totals.totalIncome)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(data.totals.provisionForBadDebt)}</td>
                    <td className="px-4 py-3 text-right text-red-700 bg-red-100">
                      {formatCurrency(data.totals.totalExpenses)}
                    </td>
                    <td className={`px-4 py-3 text-right bg-green-100 ${data.totals.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(data.totals.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Loan Activity</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Loans Disbursed</span>
                  <span className="font-semibold">{data.totals.loansCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(data.totals.loansDisbursed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Loan Size</span>
                  <span className="font-semibold">
                    {data.totals.loansCount > 0
                      ? formatCurrency(data.totals.loansDisbursed / data.totals.loansCount)
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Collections</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payments Received</span>
                  <span className="font-semibold">{data.totals.paymentsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Collected</span>
                  <span className="font-semibold">{formatCurrency(data.totals.paymentsReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Payment</span>
                  <span className="font-semibold">
                    {data.totals.paymentsCount > 0
                      ? formatCurrency(data.totals.paymentsReceived / data.totals.paymentsCount)
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Profitability</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className={`font-semibold ${data.totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.totals.totalIncome > 0
                      ? `${((data.totals.netProfit / data.totals.totalIncome) * 100).toFixed(1)}%`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bad Debt Ratio</span>
                  <span className="font-semibold text-orange-600">
                    {data.totals.loansDisbursed > 0
                      ? `${((data.totals.provisionForBadDebt / data.totals.loansDisbursed) * 100).toFixed(1)}%`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest Yield</span>
                  <span className="font-semibold text-blue-600">
                    {data.totals.loansDisbursed > 0
                      ? `${((data.totals.interestIncome / data.totals.loansDisbursed) * 100).toFixed(1)}%`
                      : '-'}
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
