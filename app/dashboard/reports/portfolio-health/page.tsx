'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'

interface Forecast {
  month: string
  expectedCollections: number
  optimisticCollections: number
  pessimisticCollections: number
  expectedDisbursements: number
  netCashFlow: number
}

interface AtRiskLoan {
  id: string
  riskScore: number
  riskLevel: string
  calculatedAt: string
  loan: {
    id: string
    loanNumber: string
    principalAmount: number
    status: string
    borrower: { firstName: string; lastName: string }
  }
}

interface Warning {
  id: string
  severity: string
  type: string
  title: string
  description: string
  loanNumber?: string
  borrowerName?: string
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`
const pct = (n: number) => `${n.toFixed(1)}%`

export default function PortfolioHealthPage() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [trends, setTrends] = useState<Record<string, unknown>[]>([])
  const [forecast, setForecast] = useState<Forecast[]>([])
  const [atRisk, setAtRisk] = useState<AtRiskLoan[]>([])
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then(r => r.json()),
      fetch('/api/analytics/trends?months=12').then(r => r.json()).catch(() => []),
      fetch('/api/analytics/forecast?months=6').then(r => r.json()).catch(() => []),
      fetch('/api/analytics/at-risk?threshold=40').then(r => r.json()).catch(() => []),
      fetch('/api/analytics/warnings').then(r => r.json()).catch(() => []),
    ]).then(([s, t, f, a, w]) => {
      setStats(s)
      setTrends(Array.isArray(t) ? t.map((snap: Record<string, unknown>) => ({
        ...snap,
        month: new Date(snap.snapshotDate as string).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      })) : [])
      setForecast(Array.isArray(f) ? f : [])
      setAtRisk(Array.isArray(a) ? a : [])
      setWarnings(Array.isArray(w) ? w : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-gray-500">Loading analytics...</div>

  const riskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio Health</h1>
        <p className="text-gray-500">Predictive analytics and early warning indicators</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Loans', value: stats.activeLoans || 0, icon: Activity, color: 'text-blue-600' },
          { label: 'Portfolio at Risk', value: pct(stats.portfolioAtRisk || 0), icon: ShieldAlert, color: 'text-red-600' },
          { label: 'Collection Rate', value: pct(stats.collectionRate || 0), icon: TrendingUp, color: 'text-green-600' },
          { label: 'Total Disbursed', value: fmt(stats.totalDisbursed || 0), icon: DollarSign, color: 'text-indigo-600' },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{m.label}</p>
                  <p className="text-2xl font-bold mt-1">{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              Portfolio Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <LineChart
                data={trends}
                xKey="month"
                lines={[
                  { dataKey: 'totalOutstanding', name: 'Outstanding', color: '#2563eb' },
                  { dataKey: 'totalCollected', name: 'Collected', color: '#22c55e' },
                  { dataKey: 'totalOverdue', name: 'Overdue', color: '#ef4444' },
                ]}
                height={300}
                formatY={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
            ) : (
              <p className="text-gray-400 text-center py-12">No snapshot data yet. Snapshots are captured monthly.</p>
            )}
          </CardContent>
        </Card>

        {/* Cash Flow Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Cash Flow Forecast (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecast.length > 0 ? (
              <BarChart
                data={forecast}
                xKey="month"
                bars={[
                  { dataKey: 'expectedCollections', name: 'Collections', color: '#22c55e' },
                  { dataKey: 'expectedDisbursements', name: 'Disbursements', color: '#ef4444' },
                ]}
                height={300}
                formatY={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
            ) : (
              <p className="text-gray-400 text-center py-12">Insufficient data for forecasting.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Loans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            At-Risk Loans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {atRisk.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Loan #</th>
                    <th className="pb-2 pr-4">Borrower</th>
                    <th className="pb-2 pr-4">Risk Score</th>
                    <th className="pb-2 pr-4">Level</th>
                    <th className="pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <a href={`/dashboard/loans/${item.loan.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {item.loan.loanNumber}
                        </a>
                      </td>
                      <td className="py-2 pr-4">{item.loan.borrower.firstName} {item.loan.borrower.lastName}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${item.riskScore >= 75 ? 'bg-red-500' : item.riskScore >= 50 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                              style={{ width: `${item.riskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{item.riskScore}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge className={riskColor(item.riskLevel)}>{item.riskLevel}</Badge>
                      </td>
                      <td className="py-2">{fmt(Number(item.loan.principalAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No at-risk loans detected. Run risk scoring first.</p>
          )}
        </CardContent>
      </Card>

      {/* Early Warnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Early Warnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length > 0 ? (
            <div className="space-y-3">
              {warnings.map((w) => (
                <div key={w.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <Badge className={riskColor(w.severity)}>{w.severity}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{w.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>
                    {w.borrowerName && <p className="text-xs text-gray-400 mt-0.5">{w.borrowerName} {w.loanNumber ? `- ${w.loanNumber}` : ''}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No warnings at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
