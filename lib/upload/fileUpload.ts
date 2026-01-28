import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * File Upload Utility
 * Handles file uploads to local storage (public/uploads)
 * For production, this can be replaced with cloud storage (S3, Cloudinary, etc.)
 */

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

/**
 * Validate file upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    }
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Allowed types: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX',
    }
  }

  return { valid: true }
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string, mimeType: string): string {
  const timestamp = Date.now()
  const randomString = randomBytes(8).toString('hex')
  const extension = MIME_TO_EXTENSION[mimeType] || originalName.split('.').pop() || 'bin'

  // Sanitize original name (remove extension and special chars)
  const safeName = originalName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-z0-9]/gi, '_') // Replace special chars with underscore
    .substring(0, 50) // Limit length

  return `${safeName}_${timestamp}_${randomString}.${extension}`
}

/**
 * Upload file to local storage
 */
export async function uploadFile(
  file: File,
  folder: string = 'documents'
): Promise<{ url: string; fileName: string }> {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Generate unique filename
    const fileName = generateUniqueFilename(file.name, file.type)

    // Create folder if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
    await mkdir(uploadDir, { recursive: true })

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Write file
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Return URL
    const url = `/uploads/${folder}/${fileName}`

    return { url, fileName }
  } catch (error) {
    console.error('File upload error:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to upload file'
    )
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string = 'documents'
): Promise<{ url: string; fileName: string }[]> {
  const uploads = await Promise.all(
    files.map((file) => uploadFile(file, folder))
  )
  return uploads
}

/**
 * Delete file from local storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const { unlink } = await import('fs/promises')

    // Extract path from URL
    const filePath = join(process.cwd(), 'public', fileUrl)

    // Delete file
    await unlink(filePath)
  } catch (error) {
    console.error('File deletion error:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * Get file info
 */
export function getFileInfo(url: string): {
  fileName: string
  extension: string
  folder: string
} {
  const parts = url.split('/')
  const fileName = parts[parts.length - 1]
  const extension = fileName.split('.').pop() || ''
  const folder = parts[parts.length - 2]

  return { fileName, extension, folder }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
