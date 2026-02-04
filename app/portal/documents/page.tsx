'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, Filter, FolderOpen } from 'lucide-react'

interface DocumentData {
  id: string
  loanId: string | null
  loanNumber: string | null
  type: string
  fileName: string
  fileUrl: string
  createdAt: string
}

interface LoanOption {
  id: string
  loanNumber: string
}

const TYPE_LABELS: Record<string, string> = {
  LOAN_AGREEMENT: 'Loan Agreement',
  REPAYMENT_SCHEDULE: 'Repayment Schedule',
  KYC_DOCUMENT: 'KYC Document',
  ID_DOCUMENT: 'ID Document',
  RECEIPT: 'Receipt',
  COLLATERAL: 'Collateral',
  GUARANTOR: 'Guarantor',
  OTHER: 'Other',
}

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [loans, setLoans] = useState<LoanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterLoan, setFilterLoan] = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/portal/documents')
      if (res.status === 401) {
        router.push('/portal/login')
        return
      }
      const result = await res.json()
      setDocuments(result.documents || [])
      setLoans(result.loans || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredDocuments = documents.filter(doc => {
    if (filterLoan && doc.loanId !== filterLoan) return false
    if (filterType && doc.type !== filterType) return false
    return true
  })

  const documentTypes = [...new Set(documents.map(d => d.type))]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-1">View and download your loan documents</p>
      </div>

      {/* Filters */}
      {documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 mt-2 sm:mt-0" />
            <select
              value={filterLoan}
              onChange={(e) => setFilterLoan(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-full sm:w-auto"
            >
              <option value="">All Loans</option>
              {loans.map(l => (
                <option key={l.id} value={l.id}>{l.loanNumber}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white w-full sm:w-auto"
            >
              <option value="">All Types</option>
              {documentTypes.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {documents.length === 0
              ? 'No documents available yet.'
              : 'No documents match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate" title={doc.fileName}>
                    {doc.fileName}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {TYPE_LABELS[doc.type] || doc.type}
                  </p>
                  {doc.loanNumber && (
                    <p className="text-xs text-gray-400 mt-0.5">{doc.loanNumber}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(doc.createdAt)}</p>
                </div>
              </div>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
