'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { Permission } from '@/lib/permissions'
import { Download, Trash2, File, FileText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

interface Document {
  id: string
  type: string
  fileName: string
  fileUrl: string
  createdAt: Date
  loan?: {
    loanNumber: string
  }
  generatedByUser: {
    name: string
  }
}

interface DocumentListProps {
  loanId?: string
  refreshTrigger?: number
}

export function DocumentList({ loanId, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { toast } = useToast()
  const { can } = usePermissions()

  const canDelete = can(Permission.DOCUMENT_DELETE)

  const fetchDocuments = async () => {
    try {
      const url = loanId ? `/api/documents?loanId=${loanId}` : '/api/documents'
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.documents)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [loanId, refreshTrigger])

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.click()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      toast({
        title: 'Document Deleted',
        description: 'Document has been deleted successfully',
      })

      fetchDocuments()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <ImageIcon className="h-4 w-4 text-blue-600" />
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      default:
        return <File className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      CONTRACT: 'bg-purple-100 text-purple-800',
      ID_PROOF: 'bg-blue-100 text-blue-800',
      INCOME_PROOF: 'bg-green-100 text-green-800',
      ADDRESS_PROOF: 'bg-yellow-100 text-yellow-800',
      COLLATERAL_PROOF: 'bg-orange-100 text-orange-800',
      STATEMENT: 'bg-indigo-100 text-indigo-800',
      RECEIPT: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800',
    }

    return (
      <Badge variant="outline" className={colors[type] || colors.OTHER}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>No documents uploaded yet</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
        <CardDescription>View and manage uploaded documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                {!loanId && <TableHead>Loan</TableHead>}
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.fileName)}
                      <span className="text-sm font-medium">{doc.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(doc.type)}</TableCell>
                  {!loanId && (
                    <TableCell>
                      {doc.loan ? (
                        <span className="text-sm font-mono">{doc.loan.loanNumber}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-sm">{doc.generatedByUser.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
