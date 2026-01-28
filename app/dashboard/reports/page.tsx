'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, DollarSign, Target, TrendingUp, AlertTriangle, Percent, FileText, Users, ArrowRight } from 'lucide-react'
import { BarChart } from '@/components/charts/BarChart'
import { PieChart } from '@/components/charts/PieChart'

interface Stats {
  totalLoans: number
  activeLoans: number
  totalBorrowers: number
  totalDisbursed: number
  totalCollected: number
  portfolioAtRisk: number
}

interface CashFlowData {
  monthlyBreakdown: {
    month: string
    disbursements: number
    collections: number
    netCashFlow: number
  }[]
  summary: {
    totalDisbursements: number
    totalCollections: number
    netCashFlow: number
  }
}

interface PortfolioData {
  byStatus: {
    status: string
    count: number
    amount: number
    percentage: number
  }[]
  performanceMetrics: {
    portfolioAtRisk: number
    defaultRate: number
    collectionRate: number
  }
  summary: {
    totalLoans: number
    activeLoans: number
    totalDisbursed: number
    totalOutstanding: number
    totalCollected: number
    averageLoanSize: number
    averageInterestRate: number
  }
}

interface AgingData {
  current: { count: number; amount: number }
  days1to30: { count: number; amount: number }
  days31to60: { count: number; amount: number }
  days61to90: { count: number; amount: number }
  over90: { count: number; amount: number }
}

export default function ReportsPage() {
  const [stats, setStats] = useState<Stats>({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowers: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    portfolioAtRisk: 0,
  })
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null)
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [agingData, setAgingData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(res => res.json()),
      fetch('/api/reports/cash-flow').then(res => res.json()),
      fetch('/api/reports/portfolio').then(res => res.json()),
      fetch('/api/reports/aging').then(res => res.json()),
    ])
      .then(([statsData, cashFlow, portfolio, aging]) => {
        setStats(statsData)
        setCashFlowData(cashFlow)
        setPortfolioData(portfolio)
        setAgingData(aging)
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyShort = (value: number) => {
    if (value >= 1000000) {
      return `KSh ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `KSh ${(value / 1000).toFixed(0)}K`
    }
    return `KSh ${value.toFixed(0)}`
  }

  // Prepare chart data
  const cashFlowChartData = cashFlowData?.monthlyBreakdown || []

  const loanStatusChartData = portfolioData?.byStatus.map(item => ({
    name: item.status,
    value: item.count,
    amount: item.amount,
  })) || []

  const agingChartData = agingData ? [
    { bucket: 'Current', count: agingData.current.count, amount: agingData.current.amount },
    { bucket: '1-30 Days', count: agingData.days1to30.count, amount: agingData.days1to30.amount },
    { bucket: '31-60 Days', count: agingData.days31to60.count, amount: agingData.days31to60.amount },
    { bucket: '61-90 Days', count: agingData.days61to90.count, amount: agingData.days61to90.amount },
    { bucket: '90+ Days', count: agingData.over90.count, amount: agingData.over90.amount },
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">Financial insights from your loan portfolio</p>
      </div>

      {/* Detailed Reports Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/reports/profit-loss"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profit & Loss Report</h3>
                <p className="text-sm text-gray-500">Income, expenses & net profit breakdown</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
          </div>
        </Link>

        <Link
          href="/dashboard/reports/employee-performance"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Employee Performance</h3>
                <p className="text-sm text-gray-500">Loan officer metrics & commissions</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Portfolio Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Collection Rate</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {portfolioData?.performanceMetrics.collectionRate.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {formatCurrency(stats.totalCollected)} collected
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Portfolio at Risk</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {portfolioData?.performanceMetrics.portfolioAtRisk.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {formatCurrency(portfolioData?.summary.totalOutstanding || 0)} outstanding
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Percent className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Default Rate</h3>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            {portfolioData?.performanceMetrics.defaultRate.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-600 mt-2">
            of total loans
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Avg Loan Size</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(portfolioData?.summary.averageLoanSize || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {portfolioData?.summary.averageInterestRate.toFixed(1) || 0}% avg rate
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cash Flow Chart */}
        <BarChart
          title="Cash Flow"
          description="Monthly disbursements vs collections"
          data={cashFlowChartData}
          xKey="month"
          bars={[
            { key: 'disbursements', name: 'Disbursements', color: '#ef4444' },
            { key: 'collections', name: 'Collections', color: '#22c55e' },
          ]}
          height={300}
          formatYAxis={formatCurrencyShort}
        />

        {/* Loan Status Distribution */}
        <PieChart
          title="Loan Status Distribution"
          description="Breakdown by loan status"
          data={loanStatusChartData}
          dataKey="value"
          nameKey="name"
          height={300}
          colors={['#3b82f6', '#22c55e', '#f59e0b', '#6b7280', '#ef4444', '#ec4899']}
        />
      </div>

      {/* Aging Report Chart */}
      <div className="mb-8">
        <BarChart
          title="Aging Analysis"
          description="Outstanding amounts by days overdue"
          data={agingChartData}
          xKey="bucket"
          bars={[
            { key: 'amount', name: 'Outstanding Amount', color: '#8b5cf6' },
          ]}
          height={300}
          formatYAxis={formatCurrencyShort}
        />
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cash Flow Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Total Disbursements</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(cashFlowData?.summary.totalDisbursements || 0)}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Total Collections</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(cashFlowData?.summary.totalCollections || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Net Cash Flow</span>
              <span className={`font-semibold ${(cashFlowData?.summary.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashFlowData?.summary.netCashFlow || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Total Loans</span>
              <span className="font-semibold text-gray-900">{portfolioData?.summary.totalLoans || 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Active Loans</span>
              <span className="font-semibold text-gray-900">{portfolioData?.summary.activeLoans || 0}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Total Disbursed</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(portfolioData?.summary.totalDisbursed || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Collected</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(portfolioData?.summary.totalCollected || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aging Detail Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-medium text-gray-600">Aging Bucket</th>
                <th className="text-right py-3 font-medium text-gray-600">Count</th>
                <th className="text-right py-3 font-medium text-gray-600">Amount</th>
                <th className="text-right py-3 font-medium text-gray-600">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {agingChartData.map((bucket, index) => {
                const totalAmount = agingChartData.reduce((sum, b) => sum + b.amount, 0)
                const percentage = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0
                const bucketColors = ['text-green-600', 'text-yellow-600', 'text-orange-600', 'text-red-500', 'text-red-700']
                return (
                  <tr key={bucket.bucket} className="border-b border-gray-100">
                    <td className={`py-3 font-medium ${bucketColors[index]}`}>{bucket.bucket}</td>
                    <td className="py-3 text-right text-gray-900">{bucket.count}</td>
                    <td className="py-3 text-right text-gray-900">{formatCurrency(bucket.amount)}</td>
                    <td className="py-3 text-right text-gray-600">{percentage.toFixed(1)}%</td>
                  </tr>
                )
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="py-3">Total</td>
                <td className="py-3 text-right">{agingChartData.reduce((sum, b) => sum + b.count, 0)}</td>
                <td className="py-3 text-right">{formatCurrency(agingChartData.reduce((sum, b) => sum + b.amount, 0))}</td>
                <td className="py-3 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Collection Efficiency</h4>
            <p className="text-2xl font-bold text-indigo-600">
              {stats.totalDisbursed > 0 ? ((stats.totalCollected / stats.totalDisbursed) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-1">of total disbursed collected</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Avg Loan per Borrower</h4>
            <p className="text-2xl font-bold text-green-600">
              {(stats.totalLoans / Math.max(1, stats.totalBorrowers)).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">loans per borrower</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Active Portfolio Health</h4>
            <p className="text-2xl font-bold text-purple-600">
              {stats.totalLoans > 0 ? ((stats.activeLoans / stats.totalLoans) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-600 mt-1">of loans are active</p>
          </div>
        </div>
      </div>
    </div>
  )
}
