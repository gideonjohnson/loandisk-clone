import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { uploadFile } from '@/lib/upload/fileUpload'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
const MAX_KYC_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Magic bytes for image formats
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF]
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47]

function validateImageMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 4) return false

  if (mimeType === 'image/png') {
    return PNG_MAGIC.every((b, i) => bytes[i] === b)
  }

  // JPEG / JPG
  return JPEG_MAGIC.every((b, i) => bytes[i] === b)
}

/**
 * POST /api/portal/upload
 * Upload a file from the borrower portal (KYC documents)
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_KYC_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG and PNG images are allowed' },
        { status: 400 }
      )
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.jpg') && !fileName.endsWith('.jpeg') && !fileName.endsWith('.png')) {
      return NextResponse.json(
        { error: 'Only .jpg, .jpeg, and .png files are allowed' },
        { status: 400 }
      )
    }

    // Validate actual file content via magic bytes
    const arrayBuffer = await file.arrayBuffer()
    if (!validateImageMagicBytes(arrayBuffer, file.type)) {
      return NextResponse.json(
        { error: 'File content does not match expected image format' },
        { status: 400 }
      )
    }

    // Sanitize borrowerId to prevent path traversal
    const safeBorrowerId = borrowerId.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeBorrowerId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    const result = await uploadFile(file, `kyc/${safeBorrowerId}`)

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
    })
  } catch (error) {
    console.error('Portal upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
