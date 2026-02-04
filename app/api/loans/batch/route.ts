import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import {
  parseCSV,
  processBatchLoans,
  createBatchJob,
  getUserBatchJobs,
} from '@/lib/loans/batchLoanService'

/**
 * POST /api/loans/batch
 * Upload and process batch loan import
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (!file.name.endsWith('.csv')) {
        return NextResponse.json(
          { error: 'Only CSV files are supported' },
          { status: 400 }
        )
      }

      const csvContent = await file.text()

      // Parse CSV
      let records
      try {
        records = parseCSV(csvContent)
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to parse CSV',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 400 }
        )
      }

      if (records.length === 0) {
        return NextResponse.json(
          { error: 'No valid records found in CSV' },
          { status: 400 }
        )
      }

      // Create batch job
      const jobId = await createBatchJob(
        session.user.id!,
        'LOAN_IMPORT',
        records.length,
        file.name
      )

      // Process in background (for small batches, process synchronously)
      // For larger batches, you'd want to use a queue
      const result = await processBatchLoans(records, session.user.id!, jobId)

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'BATCH_LOAN_IMPORT',
          entityType: 'BatchJob',
          entityId: jobId,
          details: JSON.stringify({
            fileName: file.name,
            totalRecords: result.totalRecords,
            successCount: result.successCount,
            errorCount: result.errorCount,
          }),
        },
      })

      return NextResponse.json({
        success: result.success,
        jobId: result.jobId,
        totalRecords: result.totalRecords,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors.slice(0, 20), // Limit errors returned
      })
    } catch (error) {
      console.error('Batch loan import error:', error)
      return NextResponse.json(
        {
          error: 'Failed to process batch import',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_CREATE],
  false
)

/**
 * GET /api/loans/batch
 * Get user's batch job history
 */
export const GET = createAuthHandler(
  async (_request: Request, session) => {
    try {
      const jobs = await getUserBatchJobs(session.user.id!)

      return NextResponse.json({ jobs })
    } catch (error) {
      console.error('Get batch jobs error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch batch jobs' },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_VIEW],
  false
)

// Import prisma for activity logging
import { prisma } from '@/lib/prisma'
