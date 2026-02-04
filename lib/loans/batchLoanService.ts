/**
 * Batch Loan Processing Service
 * Handles bulk import of loans from CSV files
 */

import { prisma } from '@/lib/prisma'
import { calculateLoan, generateLoanNumber } from '@/lib/utils/loanCalculator'

export interface BatchLoanRecord {
  borrowerId: string
  principalAmount: string | number
  interestRate: string | number
  termMonths: string | number
  startDate: string
  purpose?: string
  currency?: string
}

export interface BatchProcessResult {
  jobId: string
  success: boolean
  totalRecords: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; message: string; data?: unknown }>
}

export interface BatchJobStatus {
  id: string
  type: string
  status: string
  fileName: string | null
  totalRecords: number
  processedRecords: number
  successCount: number
  errorCount: number
  errors: string | null
  createdAt: Date
  completedAt: Date | null
}

/**
 * Parse CSV content into loan records
 */
export function parseCSV(csvContent: string): BatchLoanRecord[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row')
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const requiredHeaders = ['borrowerid', 'principalamount', 'interestrate', 'termmonths', 'startdate']

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`)
    }
  }

  const records: BatchLoanRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    if (values.length < headers.length) continue

    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index]
    })

    records.push({
      borrowerId: record.borrowerid,
      principalAmount: record.principalamount,
      interestRate: record.interestrate,
      termMonths: record.termmonths,
      startDate: record.startdate,
      purpose: record.purpose,
      currency: record.currency || 'KES',
    })
  }

  return records
}

/**
 * Validate a single loan record
 */
function validateRecord(record: BatchLoanRecord, rowIndex: number): string[] {
  const errors: string[] = []

  if (!record.borrowerId) {
    errors.push(`Row ${rowIndex}: Missing borrowerId`)
  }

  const principal = parseFloat(String(record.principalAmount))
  if (isNaN(principal) || principal <= 0) {
    errors.push(`Row ${rowIndex}: Invalid principalAmount - must be a positive number`)
  }

  const interest = parseFloat(String(record.interestRate))
  if (isNaN(interest) || interest < 0 || interest > 100) {
    errors.push(`Row ${rowIndex}: Invalid interestRate - must be between 0 and 100`)
  }

  const term = parseInt(String(record.termMonths))
  if (isNaN(term) || term <= 0 || term > 120) {
    errors.push(`Row ${rowIndex}: Invalid termMonths - must be between 1 and 120`)
  }

  const startDate = new Date(record.startDate)
  if (isNaN(startDate.getTime())) {
    errors.push(`Row ${rowIndex}: Invalid startDate - must be a valid date`)
  }

  return errors
}

/**
 * Create a batch job
 */
export async function createBatchJob(
  userId: string,
  type: string,
  totalRecords: number,
  fileName?: string
): Promise<string> {
  const job = await prisma.batchJob.create({
    data: {
      type,
      status: 'PENDING',
      fileName,
      totalRecords,
      createdBy: userId,
    },
  })
  return job.id
}

/**
 * Update batch job progress
 */
export async function updateBatchJobProgress(
  jobId: string,
  processedRecords: number,
  successCount: number,
  errorCount: number,
  errors?: Array<{ row: number; message: string }>
): Promise<void> {
  await prisma.batchJob.update({
    where: { id: jobId },
    data: {
      processedRecords,
      successCount,
      errorCount,
      errors: errors ? JSON.stringify(errors) : null,
      status: 'PROCESSING',
    },
  })
}

/**
 * Complete a batch job
 */
export async function completeBatchJob(
  jobId: string,
  successCount: number,
  errorCount: number,
  errors?: Array<{ row: number; message: string }>
): Promise<void> {
  await prisma.batchJob.update({
    where: { id: jobId },
    data: {
      successCount,
      errorCount,
      errors: errors ? JSON.stringify(errors) : null,
      status: errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      completedAt: new Date(),
    },
  })
}

/**
 * Process batch loan import
 */
export async function processBatchLoans(
  records: BatchLoanRecord[],
  userId: string,
  jobId: string
): Promise<BatchProcessResult> {
  const errors: Array<{ row: number; message: string; data?: unknown }> = []
  let successCount = 0

  // Validate all records first
  for (let i = 0; i < records.length; i++) {
    const validationErrors = validateRecord(records[i], i + 2) // +2 for 1-based and header row
    if (validationErrors.length > 0) {
      errors.push(...validationErrors.map((msg) => ({ row: i + 2, message: msg })))
    }
  }

  // If too many validation errors, abort early
  if (errors.length > records.length * 0.5) {
    await completeBatchJob(jobId, 0, errors.length, errors)
    return {
      jobId,
      success: false,
      totalRecords: records.length,
      successCount: 0,
      errorCount: errors.length,
      errors,
    }
  }

  // Process valid records
  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const rowIndex = i + 2

    // Skip records with validation errors
    if (errors.some((e) => e.row === rowIndex)) {
      continue
    }

    try {
      // Verify borrower exists
      const borrower = await prisma.borrower.findUnique({
        where: { id: record.borrowerId },
      })

      if (!borrower) {
        errors.push({ row: rowIndex, message: `Borrower not found: ${record.borrowerId}` })
        continue
      }

      const principalAmount = parseFloat(String(record.principalAmount))
      const interestRate = parseFloat(String(record.interestRate))
      const termMonths = parseInt(String(record.termMonths))
      const startDate = new Date(record.startDate)
      const endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + termMonths)

      // Create loan
      const loan = await prisma.loan.create({
        data: {
          loanNumber: generateLoanNumber(),
          borrowerId: record.borrowerId,
          loanOfficerId: userId,
          principalAmount,
          interestRate,
          termMonths,
          startDate,
          endDate,
          purpose: record.purpose,
          currency: record.currency || 'KES',
          status: 'PENDING',
        },
      })

      // Calculate and create loan schedule
      const calculation = calculateLoan(principalAmount, interestRate, termMonths, startDate)

      const scheduleData = calculation.schedule.map((item) => ({
        loanId: loan.id,
        dueDate: item.dueDate,
        principalDue: item.principalDue,
        interestDue: item.interestDue,
        feesDue: 0,
        totalDue: item.totalDue,
      }))

      await prisma.loanSchedule.createMany({
        data: scheduleData,
      })

      successCount++

      // Update progress every 10 records
      if ((i + 1) % 10 === 0) {
        await updateBatchJobProgress(jobId, i + 1, successCount, errors.length, errors)
      }
    } catch (error) {
      errors.push({
        row: rowIndex,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: record,
      })
    }
  }

  // Complete the job
  await completeBatchJob(jobId, successCount, errors.length, errors)

  return {
    jobId,
    success: errors.length === 0,
    totalRecords: records.length,
    successCount,
    errorCount: errors.length,
    errors,
  }
}

/**
 * Get batch job status
 */
export async function getBatchJobStatus(jobId: string): Promise<BatchJobStatus | null> {
  const job = await prisma.batchJob.findUnique({
    where: { id: jobId },
  })

  return job
}

/**
 * Get user's batch jobs
 */
export async function getUserBatchJobs(userId: string, limit = 10): Promise<BatchJobStatus[]> {
  const jobs = await prisma.batchJob.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return jobs
}
