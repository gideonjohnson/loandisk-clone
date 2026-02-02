'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calculator, DollarSign, Percent, Calendar, ArrowRight, ChevronDown, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

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
  const { theme, setTheme } = useTheme()

  const calculations = useMemo(() => {
    const monthlyRate = interestRate / 100 / 12
    const n = termMonths

    let monthlyPayment: number
    if (monthlyRate === 0) {
      monthlyPayment = principal / n
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1)
    }

    const totalPayment = monthlyPayment * n
    const totalInterest = totalPayment - principal

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-[#4169E1] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25"
              >
                <span className="text-white font-bold text-xl">M</span>
              </motion.div>
              <span className="font-semibold text-xl text-gray-900 dark:text-white">Meek</span>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/portal/login"
                  className="bg-[#4169E1] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#3457c9] transition-all shadow-lg shadow-blue-500/25"
                >
                  Customer Portal
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
            <Calculator className="w-8 h-8 text-[#4169E1]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Loan Calculator</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Calculate your monthly payments and see the full amortization schedule</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Loan Details</h2>

            <div className="space-y-6">
              {/* Principal */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="w-4 h-4 text-[#4169E1]" />
                  Loan Amount
                </label>
                <input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  min="10000"
                  max="50000000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-lg focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                />
                <input
                  type="range"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  min="10000"
                  max="10000000"
                  step="10000"
                  className="w-full mt-2 accent-[#4169E1]"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>KSh 10,000</span>
                  <span>KSh 10,000,000</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Percent className="w-4 h-4 text-[#4169E1]" />
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-lg focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                />
                <input
                  type="range"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  min="0"
                  max="50"
                  step="0.5"
                  className="w-full mt-2 accent-[#4169E1]"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Term */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 text-[#4169E1]" />
                  Loan Term (months)
                </label>
                <input
                  type="number"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                  min="1"
                  max="360"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-lg focus:ring-2 focus:ring-[#4169E1] focus:border-[#4169E1] transition-all"
                />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                  {[6, 12, 24, 36, 48, 60].map((months) => (
                    <motion.button
                      key={months}
                      onClick={() => setTermMonths(months)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`py-2 text-sm rounded-xl transition-all font-medium ${
                        termMonths === months
                          ? 'bg-[#4169E1] text-white shadow-lg shadow-blue-500/25'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {months}mo
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-[#4169E1] to-[#2a4494] rounded-2xl shadow-xl p-6 sm:p-8 text-white">
              <h2 className="text-lg font-medium text-white/80 mb-4">Monthly Payment</h2>
              <motion.p
                key={calculations.monthlyPayment}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl sm:text-5xl font-bold"
              >
                {formatCurrency(calculations.monthlyPayment)}
              </motion.p>
              <p className="text-white/70 mt-2">for {termMonths} months</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Principal</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatCurrency(principal)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Interest</p>
                  <p className="text-xl font-semibold text-red-500">{formatCurrency(calculations.totalInterest)}</p>
                </div>
                <div className="col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount Payable</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(calculations.totalPayment)}</p>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => setShowSchedule(!showSchedule)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium"
            >
              {showSchedule ? 'Hide' : 'Show'} Amortization Schedule
              <ChevronDown className={`w-4 h-4 transition-transform ${showSchedule ? 'rotate-180' : ''}`} />
            </motion.button>

            <div className="text-center">
              <Link
                href="/portal/login"
                className="inline-flex items-center gap-2 text-[#4169E1] hover:underline font-medium"
              >
                Apply for a loan
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Amortization Schedule */}
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Amortization Schedule</h3>
            </div>
            {/* Mobile card view */}
            <div className="sm:hidden max-h-96 overflow-y-auto">
              {calculations.schedule.map((row) => (
                <div key={row.month} className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">Month {row.month}</span>
                    <span className="text-gray-900 dark:text-white font-semibold">{formatCurrency(row.payment)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Principal</p>
                      <p className="text-green-600 font-medium">{formatCurrency(row.principal)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Interest</p>
                      <p className="text-red-500 font-medium">{formatCurrency(row.interest)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Balance</p>
                      <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(row.balance)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Interest</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {calculations.schedule.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(row.payment)}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-500">{formatCurrency(row.interest)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Meek Microfinance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
