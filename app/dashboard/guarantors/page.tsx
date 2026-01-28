'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, User, Phone, Mail, Edit, Trash2 } from 'lucide-react'

interface Guarantor {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  address: string | null
  relationship: string | null
  idNumber: string | null
  borrower: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

export default function GuarantorsPage() {
  const [guarantors, setGuarantors] = useState<Guarantor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchGuarantors()
  }, [])

  const fetchGuarantors = async () => {
    try {
      const res = await fetch('/api/guarantors')
      const data = await res.json()
      setGuarantors(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch guarantors:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteGuarantor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guarantor?')) return

    try {
      await fetch(`/api/guarantors/${id}`, { method: 'DELETE' })
      fetchGuarantors()
    } catch (error) {
      console.error('Failed to delete guarantor:', error)
    }
  }

  const filteredGuarantors = guarantors.filter(
    (g) =>
      search === '' ||
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      g.phone.includes(search) ||
      g.idNumber?.includes(search)
  )

  if (loading) {
    return <div className="p-6">Loading guarantors...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Guarantors</h1>
          <p className="text-gray-600 mt-1">Manage loan guarantors</p>
        </div>
        <Link
          href="/dashboard/guarantors/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Guarantor
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or ID number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Guarantors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Guarantor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Relationship
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                For Borrower
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredGuarantors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No guarantors found</p>
                </td>
              </tr>
            ) : (
              filteredGuarantors.map((guarantor) => (
                <tr key={guarantor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {guarantor.firstName} {guarantor.lastName}
                        </p>
                        {guarantor.address && (
                          <p className="text-sm text-gray-500">{guarantor.address}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {guarantor.phone}
                      </div>
                      {guarantor.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {guarantor.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {guarantor.idNumber || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {guarantor.relationship || 'Not specified'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/borrowers/${guarantor.borrower.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {guarantor.borrower.firstName} {guarantor.borrower.lastName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/guarantors/${guarantor.id}`}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => deleteGuarantor(guarantor.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
