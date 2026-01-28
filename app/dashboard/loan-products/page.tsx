'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

interface LoanProduct {
  id: string
  name: string
  code: string
  description: string | null
  minAmount: number
  maxAmount: number
  minTerm: number
  maxTerm: number
  interestRate: number
  interestType: string
  repaymentFrequency: string
  requiresCollateral: boolean
  requiresGuarantor: boolean
  active: boolean
}

export default function LoanProductsPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/loan-products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/loan-products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      fetchProducts()
    } catch (error) {
      console.error('Failed to update product:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <div className="p-6">Loading loan products...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loan Products</h1>
          <p className="text-gray-600 mt-1">Manage loan product types and configurations</p>
        </div>
        <Link
          href="/dashboard/loan-products/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No loan products</h3>
          <p className="text-gray-500 mt-2">Get started by creating a loan product.</p>
          <Link
            href="/dashboard/loan-products/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Product
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                product.active ? 'border-green-500' : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                  <span className="text-sm text-gray-500">{product.code}</span>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {product.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 mb-4">{product.description}</p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Range:</span>
                  <span className="font-medium">
                    {formatCurrency(product.minAmount)} - {formatCurrency(product.maxAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Term:</span>
                  <span className="font-medium">
                    {product.minTerm} - {product.maxTerm} months
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Interest Rate:</span>
                  <span className="font-medium">{Number(product.interestRate)}% ({product.interestType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Repayment:</span>
                  <span className="font-medium">{product.repaymentFrequency}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                {product.requiresCollateral && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Collateral Required
                  </span>
                )}
                {product.requiresGuarantor && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                    Guarantor Required
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dashboard/loan-products/${product.id}`}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={() => toggleActive(product.id, product.active)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg ${
                    product.active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {product.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
