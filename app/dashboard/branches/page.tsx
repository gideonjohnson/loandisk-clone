'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Users, DollarSign, TrendingUp } from 'lucide-react'

interface BranchStats {
  id: string
  name: string
  code: string
  totalLoans: number
  activeLoans: number
  totalDisbursed: number
  totalCollected: number
  totalBorrowers: number
  staffCount: number
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchBranches()
  }, [])

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches?stats=true')
      const data = await res.json()
      setBranches(data.branches || [])
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowCreateModal(false)
        setFormData({ name: '', code: '', address: '', city: '', phone: '' })
        fetchBranches()
      }
    } catch (error) {
      console.error('Failed to create branch:', error)
    } finally {
      setCreating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      notation: 'compact',
    }).format(amount)
  }

  // Calculate totals
  const totals = branches.reduce(
    (acc, branch) => ({
      loans: acc.loans + branch.totalLoans,
      disbursed: acc.disbursed + branch.totalDisbursed,
      collected: acc.collected + branch.totalCollected,
      staff: acc.staff + branch.staffCount,
    }),
    { loans: 0, disbursed: 0, collected: 0, staff: 0 }
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Branch Management</h1>
          <p className="text-gray-600 mt-1">Manage your organization&apos;s branches</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Branch
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Branches</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{branches.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Disbursed</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(totals.disbursed)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Collected</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{formatCurrency(totals.collected)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Staff</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totals.staff}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading branches...</div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
          <p className="text-gray-500 mb-4">Create your first branch to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Branch
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mt-1">
                      {branch.code}
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Active Loans</p>
                  <p className="text-lg font-semibold text-gray-900">{branch.activeLoans}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Borrowers</p>
                  <p className="text-lg font-semibold text-gray-900">{branch.totalBorrowers}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Disbursed</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(branch.totalDisbursed)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Collected</p>
                  <p className="text-lg font-semibold text-purple-600">{formatCurrency(branch.totalCollected)}</p>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {branch.staffCount} staff
                </span>
                <button className="text-sm text-blue-600 hover:underline">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Create New Branch</h2>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Main Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="MAIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
