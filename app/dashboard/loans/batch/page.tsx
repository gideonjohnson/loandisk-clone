'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Clock, Download, AlertTriangle, RefreshCw } from 'lucide-react'

interface BatchJob {
  id: string
  type: string
  status: string
  fileName: string | null
  totalRecords: number
  processedRecords: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; message: string }> | null
  createdAt: string
  completedAt: string | null
}

export default function BatchLoansPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [currentJob, setCurrentJob] = useState<BatchJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/loans/batch')
      const data = await res.json()
      if (data.jobs) {
        setJobs(data.jobs.map((job: BatchJob) => ({
          ...job,
          errors: job.errors ? (typeof job.errors === 'string' ? JSON.parse(job.errors) : job.errors) : null,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch batch jobs:', err)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setCurrentJob(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/loans/batch', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setCurrentJob({
        id: data.jobId,
        type: 'LOAN_IMPORT',
        status: data.errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        fileName: file.name,
        totalRecords: data.totalRecords,
        processedRecords: data.totalRecords,
        successCount: data.successCount,
        errorCount: data.errorCount,
        errors: data.errors,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })

      setFile(null)
      fetchJobs()
    } catch (err) {
      setError('Failed to upload file')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = 'borrowerId,principalAmount,interestRate,termMonths,startDate,purpose,currency'
    const example = 'cuid_example,50000,12,12,2024-01-15,Business expansion,KES'
    const content = `${headers}\n${example}`

    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'COMPLETED_WITH_ERRORS':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED_WITH_ERRORS':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Batch Loan Import</h1>
        <p className="text-gray-600 mt-1">Upload a CSV file to create multiple loans at once</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-400">CSV files only</p>
            </label>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload and Process
              </>
            )}
          </button>

          {/* CSV Format Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Required Columns:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><code className="bg-gray-200 px-1 rounded">borrowerId</code> - Borrower CUID</li>
              <li><code className="bg-gray-200 px-1 rounded">principalAmount</code> - Loan amount</li>
              <li><code className="bg-gray-200 px-1 rounded">interestRate</code> - Annual rate (%)</li>
              <li><code className="bg-gray-200 px-1 rounded">termMonths</code> - Loan duration</li>
              <li><code className="bg-gray-200 px-1 rounded">startDate</code> - YYYY-MM-DD format</li>
            </ul>
            <h3 className="text-sm font-medium text-gray-700 mt-3 mb-2">Optional Columns:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><code className="bg-gray-200 px-1 rounded">purpose</code> - Loan purpose</li>
              <li><code className="bg-gray-200 px-1 rounded">currency</code> - Default: KES</li>
            </ul>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Current Job Result */}
          {currentJob && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Result</h2>

              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(currentJob.status)}
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(currentJob.status)}`}>
                  {currentJob.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{currentJob.totalRecords}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{currentJob.successCount}</p>
                  <p className="text-sm text-gray-600">Success</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{currentJob.errorCount}</p>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>

              {currentJob.errors && currentJob.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Errors:</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {currentJob.errors.slice(0, 10).map((err, i) => (
                      <div key={i} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                    {currentJob.errors.length > 10 && (
                      <p className="text-sm text-gray-500">
                        And {currentJob.errors.length - 10} more errors...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job History */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Import History</h2>
            </div>

            <div className="divide-y">
              {jobs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No batch imports yet</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium text-gray-900">
                            {job.fileName || 'Batch Import'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-green-600">{job.successCount}</span>
                          {' / '}
                          <span className="text-gray-900">{job.totalRecords}</span>
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
