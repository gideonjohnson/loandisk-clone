'use client'

import { useState, useEffect } from 'react'
import { Shield, Check, X, Users, Save, Loader2 } from 'lucide-react'

// Permission categories for display
const PERMISSION_CATEGORIES = {
  borrower: {
    label: 'Borrowers',
    permissions: ['borrower:view', 'borrower:create', 'borrower:update', 'borrower:delete', 'borrower:export'],
  },
  loan: {
    label: 'Loans',
    permissions: ['loan:view', 'loan:create', 'loan:update', 'loan:delete', 'loan:approve', 'loan:reject', 'loan:disburse', 'loan:export'],
  },
  payment: {
    label: 'Payments',
    permissions: ['payment:view', 'payment:create', 'payment:update', 'payment:reverse', 'payment:export'],
  },
  fee: {
    label: 'Fees & Penalties',
    permissions: ['fee:view', 'fee:manage', 'penalty:view', 'penalty:apply'],
  },
  document: {
    label: 'Documents',
    permissions: ['document:view', 'document:upload', 'document:delete'],
  },
  collateral: {
    label: 'Collateral',
    permissions: ['collateral:view', 'collateral:manage'],
  },
  account: {
    label: 'Accounts',
    permissions: ['account:view', 'account:create', 'account:update', 'account:delete', 'account:transaction'],
  },
  reports: {
    label: 'Reports & Analytics',
    permissions: ['reports:view', 'reports:export', 'reports:custom-create', 'analytics:view', 'analytics:predictive'],
  },
  admin: {
    label: 'Administration',
    permissions: ['user:view', 'user:create', 'user:update', 'user:delete', 'branch:view', 'branch:manage', 'settings:view', 'settings:manage', 'audit:view'],
  },
  notification: {
    label: 'Notifications',
    permissions: ['notification:view', 'notification:send'],
  },
}

const ROLES = [
  { id: 'ADMIN', label: 'Admin', description: 'Full system access' },
  { id: 'MANAGER', label: 'Manager', description: 'Manage operations' },
  { id: 'BRANCH_MANAGER', label: 'Branch Manager', description: 'Branch-level management' },
  { id: 'OPERATIONS_MANAGER', label: 'Operations Manager', description: 'Approve and oversee operations' },
  { id: 'LOAN_OFFICER', label: 'Loan Officer', description: 'Process loans and manage borrowers' },
  { id: 'CASHIER', label: 'Cashier', description: 'Handle payments' },
  { id: 'TELLER', label: 'Teller', description: 'Basic payment operations' },
  { id: 'COLLECTOR', label: 'Collector', description: 'Collections and overdue payments' },
  { id: 'ACCOUNTANT', label: 'Accountant', description: 'Financial reporting' },
]

interface RolePermissions {
  [role: string]: string[]
}

export default function PermissionsPage() {
  const [rolePermissions, setRolePermissions] = useState<RolePermissions>({})
  const [selectedRole, setSelectedRole] = useState('ADMIN')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/settings/permissions')
      const data = await res.json()
      setRolePermissions(data.rolePermissions || {})
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermission = (permission: string) => {
    if (selectedRole === 'ADMIN') return // Admin always has all permissions

    setRolePermissions((prev) => {
      const currentPerms = prev[selectedRole] || []
      const newPerms = currentPerms.includes(permission)
        ? currentPerms.filter((p) => p !== permission)
        : [...currentPerms, permission]

      return { ...prev, [selectedRole]: newPerms }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolePermissions }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Permissions saved successfully!' })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save permissions' })
    } finally {
      setSaving(false)
    }
  }

  const hasPermission = (permission: string) => {
    if (selectedRole === 'ADMIN') return true
    return rolePermissions[selectedRole]?.includes(permission) || false
  }

  const formatPermissionLabel = (permission: string) => {
    const [resource, action] = permission.split(':')
    const actions: Record<string, string> = {
      view: 'View',
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      export: 'Export',
      approve: 'Approve',
      reject: 'Reject',
      disburse: 'Disburse',
      manage: 'Manage',
      apply: 'Apply',
      upload: 'Upload',
      reverse: 'Reverse',
      transaction: 'Transactions',
      send: 'Send',
      'custom-create': 'Custom Reports',
      predictive: 'Predictive',
    }
    return actions[action] || action
  }

  if (loading) {
    return <div className="p-6">Loading permissions...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Permissions</h1>
          <p className="text-gray-600 mt-1">Configure permissions for each user role</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* Role Selector */}
        <div className="col-span-1 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Roles
          </h2>
          <div className="space-y-2">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedRole === role.id
                    ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <p className="font-medium">{role.label}</p>
                <p className="text-xs text-gray-500">{role.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="col-span-3 bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">
                Permissions for {ROLES.find((r) => r.id === selectedRole)?.label}
              </h2>
            </div>
            {selectedRole === 'ADMIN' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                Admin has all permissions (cannot be modified)
              </span>
            )}
          </div>

          <div className="p-4 space-y-6">
            {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
              <div key={key}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{category.label}</h3>
                <div className="grid grid-cols-4 gap-2">
                  {category.permissions.map((permission) => (
                    <button
                      key={permission}
                      onClick={() => handleTogglePermission(permission)}
                      disabled={selectedRole === 'ADMIN'}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        hasPermission(permission)
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      } ${selectedRole === 'ADMIN' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {hasPermission(permission) ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      {formatPermissionLabel(permission)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How Permissions Work</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Permissions control what actions users can perform in the system</li>
          <li>- Users inherit permissions from their assigned role</li>
          <li>- Changes take effect immediately after saving</li>
          <li>- Admin role always has full access and cannot be modified</li>
        </ul>
      </div>
    </div>
  )
}
