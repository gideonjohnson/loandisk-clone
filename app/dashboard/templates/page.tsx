'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText, Edit2, Trash2, Copy, Download, Eye, Save, Loader2 } from 'lucide-react'

interface Template {
  id: string
  name: string
  type: string
  content: string
  isDefault: boolean
  createdAt: string
}

interface Placeholder {
  key: string
  label: string
  category: string
  example: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', type: 'CUSTOM', content: '' })
  const [saving, setSaving] = useState(false)
  const [showPlaceholders, setShowPlaceholders] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      setTemplates(data.templates || [])
      setPlaceholders(data.placeholders || [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedTemplate(null)
    setEditForm({ name: '', type: 'CUSTOM', content: '' })
    setIsEditing(true)
  }

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setEditForm({
      name: template.name,
      type: template.type,
      content: template.content,
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        fetchTemplates()
        setIsEditing(false)
        setSelectedTemplate(null)
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setSaving(false)
    }
  }

  const insertPlaceholder = (key: string) => {
    setEditForm((prev) => ({
      ...prev,
      content: prev.content + key,
    }))
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      LOAN_AGREEMENT: 'bg-blue-100 text-blue-700',
      LOAN_APPLICATION: 'bg-green-100 text-green-700',
      PAYMENT_RECEIPT: 'bg-purple-100 text-purple-700',
      DISBURSEMENT_VOUCHER: 'bg-yellow-100 text-yellow-700',
      CUSTOM: 'bg-gray-100 text-gray-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const groupedPlaceholders = placeholders.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Placeholder[]>)

  if (loading) {
    return <div className="p-6">Loading templates...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-gray-600 mt-1">Create and manage document templates with placeholders</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {isEditing ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <button
              onClick={() => setShowPlaceholders(!showPlaceholders)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showPlaceholders ? 'Hide' : 'Show'} Placeholders
            </button>
          </div>

          <div className="p-6 grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Loan Agreement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="LOAN_AGREEMENT">Loan Agreement</option>
                    <option value="LOAN_APPLICATION">Loan Application</option>
                    <option value="PAYMENT_RECEIPT">Payment Receipt</option>
                    <option value="DISBURSEMENT_VOUCHER">Disbursement Voucher</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Content (use # for headings, ## for subheadings)
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={20}
                  placeholder="# LOAN AGREEMENT

This agreement is made on {{current_date}}...

Borrower: {{borrower_name}}
Loan Amount: {{loan_amount}}"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editForm.name || !editForm.content}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Template
                </button>
              </div>
            </div>

            {showPlaceholders && (
              <div className="border-l pl-6">
                <h3 className="font-medium mb-3">Available Placeholders</h3>
                <p className="text-sm text-gray-500 mb-4">Click to insert</p>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {Object.entries(groupedPlaceholders).map(([category, items]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {category}
                      </h4>
                      <div className="space-y-1">
                        {items.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => insertPlaceholder(p.key)}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded group"
                          >
                            <code className="text-blue-600">{p.key}</code>
                            <span className="text-gray-400 text-xs ml-2 hidden group-hover:inline">
                              {p.example}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(template.type)}`}>
                      {template.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {template.isDefault && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-3 font-mono">
                {template.content.substring(0, 150)}...
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={() => {
                    setEditForm({
                      name: `${template.name} (Copy)`,
                      type: template.type,
                      content: template.content,
                    })
                    setSelectedTemplate(null)
                    setIsEditing(true)
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box about using templates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How to use templates</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Create or edit a template with placeholders like {`{{borrower_name}}`}</li>
          <li>2. Go to a loan detail page and click &quot;Generate Document&quot;</li>
          <li>3. Select the template and download the filled DOCX file</li>
        </ul>
      </div>
    </div>
  )
}
