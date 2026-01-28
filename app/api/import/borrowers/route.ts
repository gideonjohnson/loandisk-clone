import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { importBorrowers } from '@/lib/import-export/importExportService'

/**
 * POST /api/import/borrowers
 * Import borrowers from CSV
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        )
      }

      if (!file.name.endsWith('.csv')) {
        return NextResponse.json(
          { error: 'File must be a CSV' },
          { status: 400 }
        )
      }

      const csvContent = await file.text()
      const result = await importBorrowers(csvContent, session.user.id)

      return NextResponse.json({
        success: result.success,
        imported: result.imported,
        errors: result.errors,
        message: result.success
          ? `Successfully imported ${result.imported} borrowers`
          : `Imported ${result.imported} borrowers with ${result.errors.length} errors`,
      })
    } catch (error) {
      console.error('Import error:', error)
      return NextResponse.json(
        { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  [Permission.BORROWER_CREATE]
)
