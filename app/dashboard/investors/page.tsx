'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, DollarSign, TrendingUp, Building } from 'lucide-react'

interface Investor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  active: boolean
  createdAt: string
  totalInvested: number
  totalInterestEarned: number
  _count: {
    accounts: number
    transactions: number
  }
}

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchInvestors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const fetchInvestors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/investors?${params}`)
      const data = await res.json()
      setInvestors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch investors:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val)

  const totalInvested = investors.reduce((sum, i) => sum + i.totalInvested, 0)
  const totalInterest = investors.reduce((sum, i) => sum + i.totalInterestEarned, 0)
  const activeInvestors = investors.filter((i) => i.active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investors</h1>
          <p className="text-gray-600 mt-1">Manage investor accounts and investments</p>
        </div>
        <Link
          href="/dashboard/investors/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Investor
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Investors</p>
              <p className="text-2xl font-bold">{investors.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Invested</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Interest Earned</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInterest)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Building className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Investors</p>
              <p className="text-2xl font-bold">{activeInvestors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Investors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading investors...</div>
        ) : investors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No investors found</p>
            <Link
              href="/dashboard/investors/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Add your first investor
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accounts</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invested</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Interest Earned</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {investors.map((investor) => (
                <tr key={investor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/investors/${investor.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {investor.firstName} {investor.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <p>{investor.email}</p>
                      <p className="text-gray-500">{investor.phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {investor._count.accounts}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-medium">
                    {formatCurrency(investor.totalInvested)}
                  </td>
                  <td className="px-4 py-4 text-right text-green-600">
                    {formatCurrency(investor.totalInterestEarned)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        investor.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {investor.active ? 'Active' : 'Inactive'}
                    </span>
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
