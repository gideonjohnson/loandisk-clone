'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, FileText, Wallet } from 'lucide-react'
import Link from 'next/link'

interface Account {
  id: string
  accountNumber: string
  accountType: string
  balance: number
  interestRate: number
  active: boolean
  createdAt: string
  borrower: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  transactions: Transaction[]
}

interface Transaction {
  id: string
  type: string
  amount: number
  balance: number
  description: string
  transactionDate: string
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchAccount()
  }, [params.id])

  const fetchAccount = async () => {
    try {
      const res = await fetch(`/api/savings/${params.id}`)
      const data = await res.json()
      setAccount(data)
    } catch (error) {
      console.error('Failed to fetch account:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/savings/${params.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || 'Cash deposit',
        }),
      })

      if (res.ok) {
        await fetchAccount()
        setShowDepositModal(false)
        setAmount('')
        setDescription('')
      }
    } catch (error) {
      console.error('Deposit failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/savings/${params.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || 'Cash withdrawal',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        await fetchAccount()
        setShowWithdrawModal(false)
        setAmount('')
        setDescription('')
      } else {
        alert(data.error || 'Withdrawal failed')
      }
    } catch (error) {
      console.error('Withdrawal failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading account details...</div>
  }

  if (!account) {
    return <div className="p-8 text-center text-red-500">Account not found</div>
  }

  return (
    <div>
      <Link href="/dashboard/savings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-5 h-5" />
        Back to Accounts
      </Link>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{account.accountNumber}</h1>
          <p className="text-gray-600 mt-1">
            {account.borrower.firstName} {account.borrower.lastName}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowDepositModal(true)}
            disabled={!account.active}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowUpCircle className="w-5 h-5" />
            Deposit
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!account.active}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <ArrowDownCircle className="w-5 h-5" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Current Balance</p>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(Number(account.balance))}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Account Type</p>
          <p className="text-xl font-semibold text-gray-900">
            {account.accountType.replace('_', ' ')}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Interest Rate</p>
          <p className="text-xl font-semibold text-gray-900">{account.interestRate}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Status</p>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            account.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {account.active ? 'Active' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Account Holder Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Account Holder
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Full Name</p>
            <p className="text-gray-900">{account.borrower.firstName} {account.borrower.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="text-gray-900">{account.borrower.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-gray-900">{account.borrower.phone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Transactions
          </h2>
          <Link
            href={`/dashboard/savings/${account.id}/statement`}
            className="text-blue-600 hover:underline text-sm"
          >
            View Full Statement
          </Link>
        </div>

        {account.transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {account.transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(txn.transactionDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      txn.type === 'DEPOSIT' || txn.type === 'INTEREST' ? 'bg-green-100 text-green-800' :
                      txn.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.description}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${
                    Number(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Number(txn.amount) >= 0 ? '+' : ''}{formatCurrency(Number(txn.amount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                    {formatCurrency(Number(txn.balance))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make a Deposit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cash deposit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={processing || !amount}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Make a Withdrawal</h3>
            <p className="text-sm text-gray-600 mb-4">
              Available balance: {formatCurrency(Number(account.balance))}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={Number(account.balance)}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cash withdrawal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={processing || !amount}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
