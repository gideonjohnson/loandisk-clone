'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Building,
} from 'lucide-react'

interface Account {
  id: string
  accountNumber: string
  accountType: string
  principalAmount: number
  interestRate: number
  interestEarned: number
  maturityDate: string | null
  status: string
  createdAt: string
}

interface Transaction {
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  referenceNumber: string | null
  transactionDate: string
  account: { accountNumber: string }
}

interface Investor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string | null
  city: string | null
  country: string | null
  idNumber: string | null
  bankName: string | null
  bankAccount: string | null
  active: boolean
  accounts: Account[]
  transactions: Transaction[]
  summary: {
    totalInvested: number
    totalInterestEarned: number
    activeAccounts: number
    totalAccounts: number
  }
}

export default function InvestorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [transactionType, setTransactionType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionDesc, setTransactionDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New account form
  const [newAccount, setNewAccount] = useState({
    principalAmount: '',
    interestRate: '',
    maturityDate: '',
    accountType: 'INVESTMENT',
  })

  useEffect(() => {
    fetchInvestor()
  }, [params.id])

  const fetchInvestor = async () => {
    try {
      const res = await fetch(`/api/investors/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch investor')
      const data = await res.json()
      setInvestor(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccount.principalAmount) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/investors/${params.id}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalAmount: parseFloat(newAccount.principalAmount),
          interestRate: parseFloat(newAccount.interestRate) || 0,
          maturityDate: newAccount.maturityDate || null,
          accountType: newAccount.accountType,
        }),
      })

      if (!res.ok) throw new Error('Failed to create account')

      setShowNewAccountModal(false)
      setNewAccount({ principalAmount: '', interestRate: '', maturityDate: '', accountType: 'INVESTMENT' })
      fetchInvestor()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (!selectedAccount || !transactionAmount) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/investors/${params.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          type: transactionType,
          amount: parseFloat(transactionAmount),
          description: transactionDesc,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to create transaction')
        return
      }

      setShowTransactionModal(false)
      setSelectedAccount('')
      setTransactionAmount('')
      setTransactionDesc('')
      fetchInvestor()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!investor) {
    return <div className="p-6 text-center text-red-500">Investor not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            href="/dashboard/investors"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Investors
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {investor.firstName} {investor.lastName}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-gray-600">
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" /> {investor.email}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" /> {investor.phone}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <DollarSign className="w-4 h-4" /> New Transaction
          </button>
          <button
            onClick={() => setShowNewAccountModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Invested</p>
              <p className="text-2xl font-bold">{formatCurrency(investor.summary.totalInvested)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Earned</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(investor.summary.totalInterestEarned)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-2xl font-bold">{investor.summary.activeAccounts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Building className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bank</p>
              <p className="text-lg font-medium">{investor.bankName || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Investment Accounts</h2>
        </div>
        {investor.accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No accounts yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {investor.accounts.map((account) => (
              <div key={account.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{account.accountNumber}</p>
                    <p className="text-sm text-gray-500">
                      {account.accountType} | {account.interestRate}% p.a.
                    </p>
                    {account.maturityDate && (
                      <p className="text-xs text-gray-400">
                        Matures: {new Date(account.maturityDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(Number(account.principalAmount))}</p>
                    <p className="text-sm text-green-600">
                      +{formatCurrency(Number(account.interestEarned))} earned
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        account.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Recent Transactions</h2>
        </div>
        {investor.transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {investor.transactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center gap-4">
                <div
                  className={`p-2 rounded-full ${
                    tx.type === 'DEPOSIT' || tx.type === 'INTEREST_CREDIT'
                      ? 'bg-green-100'
                      : 'bg-red-100'
                  }`}
                >
                  {tx.type === 'DEPOSIT' || tx.type === 'INTEREST_CREDIT' ? (
                    <ArrowDownRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{tx.type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">
                    {tx.account.accountNumber} | {tx.description || 'No description'}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.type === 'DEPOSIT' || tx.type === 'INTEREST_CREDIT'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}
                    {formatCurrency(Number(tx.amount))}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.transactionDate).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Investment Account</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Amount *</label>
                <input
                  type="number"
                  value={newAccount.principalAmount}
                  onChange={(e) => setNewAccount({ ...newAccount, principalAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newAccount.interestRate}
                  onChange={(e) => setNewAccount({ ...newAccount, interestRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={newAccount.maturityDate}
                  onChange={(e) => setNewAccount({ ...newAccount, maturityDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account Type</label>
                <select
                  value={newAccount.accountType}
                  onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="INVESTMENT">Investment</option>
                  <option value="SAVINGS">Savings</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewAccountModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={submitting || !newAccount.principalAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Transaction</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account *</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select account</option>
                  {investor.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} ({formatCurrency(Number(acc.principalAmount))})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'DEPOSIT' | 'WITHDRAWAL')}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={transactionDesc}
                  onChange={(e) => setTransactionDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTransactionModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTransaction}
                disabled={submitting || !selectedAccount || !transactionAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
