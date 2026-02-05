'use client'

import { useEffect, useState } from 'react'
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react'
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
  }
}

export default function SavingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [filterType])

  const fetchAccounts = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('accountType', filterType)

      const res = await fetch(`/api/savings?${params}`)
      const data = await res.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
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

  const filteredAccounts = accounts.filter(account => {
    const searchLower = searchTerm.toLowerCase()
    return (
      account.accountNumber.toLowerCase().includes(searchLower) ||
      account.borrower.firstName.toLowerCase().includes(searchLower) ||
      account.borrower.lastName.toLowerCase().includes(searchLower)
    )
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)
  const activeAccounts = accounts.filter(acc => acc.active).length

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Savings Accounts</h1>
          <p className="text-gray-600 mt-2">Manage borrower savings and investment accounts</p>
        </div>
        <Link
          href="/dashboard/savings/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Account
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <ArrowUpCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowDownCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{activeAccounts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by account number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="SAVINGS">Savings</option>
            <option value="FIXED_DEPOSIT">Fixed Deposit</option>
            <option value="CURRENT">Current</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No accounts found. Create your first savings account.
          </div>
        ) : (
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account Holder</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Interest Rate</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/dashboard/savings/${account.id}`} className="text-blue-600 hover:underline font-medium">
                      {account.accountNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {account.borrower.firstName} {account.borrower.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      account.accountType === 'SAVINGS' ? 'bg-blue-100 text-blue-800' :
                      account.accountType === 'FIXED_DEPOSIT' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {account.accountType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                    {formatCurrency(Number(account.balance))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                    {account.interestRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      account.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {account.active ? 'Active' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Link
                      href={`/dashboard/savings/${account.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
