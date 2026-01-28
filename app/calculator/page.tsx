'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Calculator, DollarSign, Percent, Calendar, ArrowRight } from 'lucide-react'

interface AmortizationRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

export default function LoanCalculatorPage() {
  const [principal, setPrincipal] = useState(1000000)
  const [interestRate, setInterestRate] = useState(12)
  const [termMonths, setTermMonths] = useState(12)
  const [showSchedule, setShowSchedule] = useState(false)

  const calculations = useMemo(() => {
    const monthlyRate = interestRate / 100 / 12
    const n = termMonths

    // Calculate monthly payment using amortization formula
    let monthlyPayment: number
    if (monthlyRate === 0) {
      monthlyPayment = principal / n
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
    }

    const totalPayment = monthlyPayment * n
    const totalInterest = totalPayment - principal

    // Generate amortization schedule
    const schedule: AmortizationRow[] = []
    let balance = principal

    for (let month = 1; month <= n; month++) {
      const interestPayment = balance * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      balance -= principalPayment

      schedule.push({
        month,
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
      })
    }

    return {
      monthlyPayment,
      totalPayment,
      totalInterest,
      schedule,
    }
  }, [principal, interestRate, termMonths])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="font-semibold text-xl text-gray-900">Meek</span>
            </Link>
            <Link
              href="/portal/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Customer Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Loan Calculator</h1>
          <p className="text-gray-600 mt-2">Calculate your monthly payments and see the full amortization schedule</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Loan Details</h2>

            <div className="space-y-6">
              {/* Principal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4" />
                  Loan Amount
                </label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  min="10000"
                  max="50000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="range"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  min="10000"
                  max="10000000"
                  step="10000"
                  className="w-full mt-2 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>KSh 10,000</span>
                  <span>KSh 10,000,000</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Percent className="w-4 h-4" />
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="range"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  min="0"
                  max="50"
                  step="0.5"
                  className="w-full mt-2 accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Term */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4" />
                  Loan Term (months)
                </label>
                <input
                  type="number"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  min="1"
                  max="360"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                  {[6, 12, 24, 36, 48, 60].map((months) => (
                    <button
                      key={months}
                      onClick={() => setTermMonths(months)}
                      className={`py-2 text-sm rounded-lg transition-colors font-medium ${
                        termMonths === months
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {months}mo
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
              <h2 className="text-lg font-medium text-blue-100 mb-4">Monthly Payment</h2>
              <p className="text-4xl sm:text-5xl font-bold">
                {formatCurrency(calculations.monthlyPayment)}
              </p>
              <p className="text-blue-200 mt-2">for {termMonths} months</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Principal</p>
                  <p className="text-xl font-semibold text-gray-900">{formatCurrency(principal)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Interest</p>
                  <p className="text-xl font-semibold text-red-600">{formatCurrency(calculations.totalInterest)}</p>
                </div>
                <div className="col-span-2 pt-4 border-t">
                  <p className="text-sm text-gray-500">Total Amount Payable</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculations.totalPayment)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              {showSchedule ? 'Hide' : 'Show'} Amortization Schedule
              <ArrowRight className={`w-4 h-4 transition-transform ${showSchedule ? 'rotate-90' : ''}`} />
            </button>

            <div className="text-center">
              <Link
                href="/portal/login"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                Apply for a loan
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Amortization Schedule */}
        {showSchedule && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900">Amortization Schedule</h3>
            </div>
            {/* Mobile card view */}
            <div className="sm:hidden max-h-96 overflow-y-auto">
              {calculations.schedule.map((row) => (
                <div key={row.month} className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">Month {row.month}</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(row.payment)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Principal</p>
                      <p className="text-green-600 font-medium">{formatCurrency(row.principal)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Interest</p>
                      <p className="text-red-600 font-medium">{formatCurrency(row.interest)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Balance</p>
                      <p className="text-gray-900 font-medium">{formatCurrency(row.balance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calculations.schedule.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(row.payment)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(row.interest)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Meek Microfinance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
