'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Upload, File, X, CheckCircle } from 'lucide-react'
import { formatFileSize } from '@/lib/upload/fileUpload'

interface DocumentUploadProps {
  loanId?: string
  onUploadComplete?: (documents: any[]) => void
}

export function DocumentUpload({ loanId, onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState('CONTRACT')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const { toast } = useToast()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles])
    },
    onDropRejected: (rejections) => {
      rejections.forEach((rejection) => {
        toast({
          title: 'File Rejected',
          description: rejection.errors[0]?.message || 'Invalid file',
          variant: 'destructive',
        })
      })
    },
  })

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please select files to upload',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    const uploadedDocs: any[] = []

    try {
      // Step 1: Upload files to storage
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('folder', 'documents')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload files')
      }

      const uploadData = await uploadResponse.json()
      const uploads = uploadData.uploads

      // Step 2: Create document records
      for (const upload of uploads) {
        const docResponse = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanId: loanId || null,
            type: documentType,
            fileName: upload.fileName,
            fileUrl: upload.url,
          }),
        })

        if (docResponse.ok) {
          const docData = await docResponse.json()
          uploadedDocs.push(docData.document)
          setUploadedFiles((prev) => [...prev, upload.fileName])
        }
      }

      toast({
        title: 'Upload Successful',
        description: `${uploadedDocs.length} document(s) uploaded successfully`,
      })

      setFiles([])
      onUploadComplete?.(uploadedDocs)
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload documents',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Upload loan-related documents (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX - Max 5MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="documentType">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="documentType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTRACT">Contract</SelectItem>
              <SelectItem value="ID_PROOF">ID Proof</SelectItem>
              <SelectItem value="INCOME_PROOF">Income Proof</SelectItem>
              <SelectItem value="ADDRESS_PROOF">Address Proof</SelectItem>
              <SelectItem value="COLLATERAL_PROOF">Collateral Proof</SelectItem>
              <SelectItem value="STATEMENT">Statement</SelectItem>
              <SelectItem value="RECEIPT">Receipt</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-muted-foreground">Drop the files here...</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (max 5MB each)
              </p>
            </>
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({files.length})</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-green-600">Recently Uploaded</Label>
            <div className="space-y-1">
              {uploadedFiles.map((fileName, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">
                    {fileName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  )
}
