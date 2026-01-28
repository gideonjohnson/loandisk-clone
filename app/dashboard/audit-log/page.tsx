'use client'

import { useEffect, useState } from 'react'
import { Activity, User, FileText, CreditCard, DollarSign, Settings, Search } from 'lucide-react'

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

export default function AuditLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

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

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      filter === '' ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.user.name.toLowerCase().includes(filter.toLowerCase()) ||
      log.entityId?.toLowerCase().includes(filter.toLowerCase())

    const matchesEntity =
      entityFilter === 'all' || log.entityType === entityFilter

    return matchesSearch && matchesEntity
  })

  const entityTypes = [...new Set(logs.map((l) => l.entityType).filter(Boolean))]

  if (loading) {
    return <div className="p-6">Loading audit logs...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-600 mt-1">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
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
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Activity Timeline ({filteredLogs.length} events)
          </h2>
        </div>

        <div className="divide-y">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
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
                          <p className="font-medium text-gray-900">
                            {formatAction(log.action)}
                          </p>
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
      </div>
    </div>
  )
}
