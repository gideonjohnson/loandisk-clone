'use client'

import { useEffect, useState } from 'react'
import { Activity, User, FileText, CreditCard, Settings, Search, Download, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface ActivityLog {
  id: string
  userId: string
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    name: string
    email: string
    role: string
  }
}

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT', 'CREATE_LOAN', 'APPROVE_LOAN', 'REJECT_LOAN', 'DISBURSE_LOAN',
  'CREATE_PAYMENT', 'REVERSE_PAYMENT', 'CREATE_BORROWER', 'UPDATE_BORROWER',
  'CREATE_USER', 'UPDATE_USER', 'UPDATE_SETTINGS', 'EXPORT_DATA', 'VIEW_REPORT',
]

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-800' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  LOW: { label: 'Low', color: 'bg-green-100 text-green-800' },
}

function getSeverity(action: string): string {
  const criticalActions = ['DELETE', 'REVERSE_PAYMENT', 'DISBURSE_LOAN']
  const highActions = ['APPROVE_LOAN', 'REJECT_LOAN', 'CREATE_USER', 'UPDATE_USER']
  const mediumActions = ['CREATE_LOAN', 'CREATE_PAYMENT', 'UPDATE', 'EXPORT']
  if (criticalActions.some((a) => action.includes(a))) return 'CRITICAL'
  if (highActions.some((a) => action.includes(a))) return 'HIGH'
  if (mediumActions.some((a) => action.includes(a))) return 'MEDIUM'
  return 'LOW'
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-log')
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (entityType: string | null) => {
    const icons: Record<string, typeof Activity> = {
      User: User,
      Loan: FileText,
      Payment: CreditCard,
      Borrower: User,
      Settings: Settings,
    }
    const Icon = icons[entityType || ''] || Activity
    return <Icon className="w-5 h-5" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'text-green-600 bg-green-100'
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-600 bg-red-100'
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-100'
    if (action.includes('APPROVE')) return 'text-green-600 bg-green-100'
    if (action.includes('REJECT')) return 'text-red-600 bg-red-100'
    if (action.includes('DISBURSE')) return 'text-purple-600 bg-purple-100'
    return 'text-gray-600 bg-gray-100'
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const parseDetails = (details: string | null) => {
    if (!details) return null
    try {
      return JSON.parse(details)
    } catch {
      return { raw: details }
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({ format })
      if (actionFilter) params.append('action', actionFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/audit-log/export?${params}`)
      const blob = await res.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export audit log')
    }
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      filter === '' ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.user.name.toLowerCase().includes(filter.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(filter.toLowerCase())

    const matchesEntity =
      entityFilter === 'all' || log.entityType === entityFilter

    const matchesAction =
      actionFilter === '' || log.action === actionFilter

    const logDate = new Date(log.createdAt)
    const matchesStartDate = !startDate || logDate >= new Date(startDate)
    const matchesEndDate = !endDate || logDate <= new Date(endDate + 'T23:59:59')

    return matchesSearch && matchesEntity && matchesAction && matchesStartDate && matchesEndDate
  })

  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize)

  const entityTypes = [...new Set(logs.map((l) => l.entityType).filter(Boolean))]

  if (loading) {
    return <div className="p-6">Loading audit logs...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600 mt-1">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, user, or ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Entities</option>
            {entityTypes.map((type) => (
              <option key={type} value={type!}>
                {type}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map((action) => (
                  <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-4 h-4 mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Activity Timeline ({filteredLogs.length} events)
          </h2>
        </div>

        <div className="divide-y">
          {paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity logs found</p>
            </div>
          ) : (
            paginatedLogs.map((log) => {
              const severity = getSeverity(log.action)
              const severityInfo = SEVERITY_MAP[severity]
              const details = parseDetails(log.details)
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.entityType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {formatAction(log.action)}
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${severityInfo.color}`}>
                              {severityInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            by <span className="font-medium">{log.user.name}</span>
                            {log.entityType && (
                              <>
                                {' '}
                                on <span className="font-medium">{log.entityType}</span>
                              </>
                            )}
                            {log.entityId && (
                              <span className="text-xs ml-2 px-2 py-0.5 bg-gray-100 rounded">
                                {log.entityId.substring(0, 8)}...
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-sm text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {details && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                          {Object.entries(details).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-gray-500">{key}:</span>
                              <span className="text-gray-700">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {log.ipAddress && (
                        <p className="text-xs text-gray-400 mt-2">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t">
            <p className="text-sm text-gray-700">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredLogs.length)} of {filteredLogs.length} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
