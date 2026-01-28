import { NextResponse } from 'next/server'
import { uploadFile, uploadMultipleFiles } from '@/lib/upload/fileUpload'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * POST /api/upload
 * Upload one or multiple files
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const formData = await request.formData()
      const files = formData.getAll('files') as File[]
      const folder = (formData.get('folder') as string) || 'documents'

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: 'No files provided' },
          { status: 400 }
        )
      }

      // Upload single or multiple files
      let uploads

      if (files.length === 1) {
        const upload = await uploadFile(files[0], folder)
        uploads = [upload]
      } else {
        uploads = await uploadMultipleFiles(files, folder)
      }

      return NextResponse.json({
        success: true,
        message: `${uploads.length} file(s) uploaded successfully`,
        uploads,
      })
    } catch (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        {
          error: 'Failed to upload file',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_UPLOAD],
  false
)
