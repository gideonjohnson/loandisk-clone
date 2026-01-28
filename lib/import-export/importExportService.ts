/**
 * Data Import/Export Service
 * Handles CSV import and Excel export for bulk data operations
 */

import { prisma } from '@/lib/prisma'

// ==================== CSV Parser ====================

interface CSVParseResult<T> {
  success: boolean
  data: T[]
  errors: string[]
  rowCount: number
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV<T>(csvContent: string, requiredFields: string[]): CSVParseResult<T> {
  const lines = csvContent.trim().split('\n')
  const errors: string[] = []
  const data: T[] = []

  if (lines.length < 2) {
    return { success: false, data: [], errors: ['CSV file is empty or has no data rows'], rowCount: 0 }
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

  // Check required fields
  const missingFields = requiredFields.filter(f => !headers.includes(f.toLowerCase()))
  if (missingFields.length > 0) {
    return {
      success: false,
      data: [],
      errors: [`Missing required fields: ${missingFields.join(', ')}`],
      rowCount: 0,
    }
  }

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)

    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`)
      continue
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })

    data.push(row as T)
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    rowCount: data.length,
  }
}

/**
 * Parse a single CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}

// ==================== Borrower Import ====================

interface BorrowerImportRow {
  firstname: string
  lastname: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  idnumber?: string
  monthlyincome?: string
}

export async function importBorrowers(csvContent: string, userId: string): Promise<{
  success: boolean
  imported: number
  errors: string[]
}> {
  const parseResult = parseCSV<BorrowerImportRow>(csvContent, ['firstname', 'lastname'])

  if (!parseResult.success && parseResult.errors.length > 0) {
    return { success: false, imported: 0, errors: parseResult.errors }
  }

  const errors: string[] = [...parseResult.errors]
  let imported = 0

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i]

    try {
      await prisma.borrower.create({
        data: {
          firstName: row.firstname,
          lastName: row.lastname,
          email: row.email || null,
          phone: row.phone || '',
          address: row.address || null,
          city: row.city || null,
          country: row.country || null,
          idNumber: row.idnumber || null,
          monthlyIncome: row.monthlyincome ? parseFloat(row.monthlyincome) : null,
          active: true,
        },
      })
      imported++
    } catch (error) {
      errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Import failed'}`)
    }
  }

  // Log import activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'BULK_IMPORT',
      entityType: 'Borrower',
      details: JSON.stringify({
        type: 'borrowers',
        totalRows: parseResult.rowCount,
        imported,
        errors: errors.length,
      }),
    },
  })

  return {
    success: errors.length === 0,
    imported,
    errors,
  }
}

// ==================== Excel Export ====================

/**
 * Generate CSV content from data
 */
export function generateCSV(data: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const headers = columns.map(c => c.header)
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key]
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Escape quotes and wrap in quotes if contains comma
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Export borrowers to CSV
 */
export async function exportBorrowers(filters?: { active?: boolean }): Promise<string> {
  const borrowers = await prisma.borrower.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
  })

  const columns = [
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'address', header: 'Address' },
    { key: 'city', header: 'City' },
    { key: 'country', header: 'Country' },
    { key: 'idNumber', header: 'ID Number' },
    { key: 'monthlyIncome', header: 'Monthly Income' },
    { key: 'creditScore', header: 'Credit Score' },
    { key: 'active', header: 'Active' },
    { key: 'createdAt', header: 'Created At' },
  ]

  return generateCSV(borrowers as unknown as Record<string, unknown>[], columns)
}

/**
 * Export loans to CSV
 */
export async function exportLoans(filters?: { status?: string }): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: filters,
    include: {
      borrower: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = loans.map(loan => ({
    loanNumber: loan.loanNumber,
    borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
    borrowerPhone: loan.borrower.phone,
    principalAmount: loan.principalAmount,
    interestRate: loan.interestRate,
    termMonths: loan.termMonths,
    status: loan.status,
    startDate: loan.startDate,
    endDate: loan.endDate,
    purpose: loan.purpose,
    createdAt: loan.createdAt,
  }))

  const columns = [
    { key: 'loanNumber', header: 'Loan Number' },
    { key: 'borrowerName', header: 'Borrower Name' },
    { key: 'borrowerPhone', header: 'Borrower Phone' },
    { key: 'principalAmount', header: 'Principal Amount' },
    { key: 'interestRate', header: 'Interest Rate (%)' },
    { key: 'termMonths', header: 'Term (Months)' },
    { key: 'status', header: 'Status' },
    { key: 'startDate', header: 'Start Date' },
    { key: 'endDate', header: 'End Date' },
    { key: 'purpose', header: 'Purpose' },
    { key: 'createdAt', header: 'Created At' },
  ]

  return generateCSV(data as unknown as Record<string, unknown>[], columns)
}

/**
 * Export payments to CSV
 */
export async function exportPayments(filters?: { startDate?: Date; endDate?: Date }): Promise<string> {
  const where: Record<string, unknown> = {}
  if (filters?.startDate || filters?.endDate) {
    where.paymentDate = {}
    if (filters.startDate) (where.paymentDate as Record<string, Date>).gte = filters.startDate
    if (filters.endDate) (where.paymentDate as Record<string, Date>).lte = filters.endDate
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  })

  const data = payments.map(payment => ({
    receiptNumber: payment.receiptNumber,
    loanNumber: payment.loan.loanNumber,
    borrowerName: `${payment.loan.borrower.firstName} ${payment.loan.borrower.lastName}`,
    amount: payment.amount,
    principalAmount: payment.principalAmount,
    interestAmount: payment.interestAmount,
    feesAmount: payment.feesAmount,
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate,
    status: payment.status,
  }))

  const columns = [
    { key: 'receiptNumber', header: 'Receipt Number' },
    { key: 'loanNumber', header: 'Loan Number' },
    { key: 'borrowerName', header: 'Borrower Name' },
    { key: 'amount', header: 'Total Amount' },
    { key: 'principalAmount', header: 'Principal' },
    { key: 'interestAmount', header: 'Interest' },
    { key: 'feesAmount', header: 'Fees' },
    { key: 'paymentMethod', header: 'Payment Method' },
    { key: 'paymentDate', header: 'Payment Date' },
    { key: 'status', header: 'Status' },
  ]

  return generateCSV(data as unknown as Record<string, unknown>[], columns)
}

/**
 * Export report to CSV
 */
export async function exportReport(reportType: string, startDate: Date, endDate: Date): Promise<string> {
  switch (reportType) {
    case 'disbursements':
      return exportDisbursementsReport(startDate, endDate)
    case 'collections':
      return exportCollectionsReport(startDate, endDate)
    case 'portfolio':
      return exportPortfolioReport()
    default:
      throw new Error(`Unknown report type: ${reportType}`)
  }
}

async function exportDisbursementsReport(startDate: Date, endDate: Date): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: {
      disbursementDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      borrower: true,
    },
    orderBy: { disbursementDate: 'desc' },
  })

  const data = loans.map(loan => ({
    date: loan.disbursementDate,
    loanNumber: loan.loanNumber,
    borrower: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
    amount: loan.principalAmount,
    interestRate: loan.interestRate,
    term: loan.termMonths,
  }))

  const columns = [
    { key: 'date', header: 'Disbursement Date' },
    { key: 'loanNumber', header: 'Loan Number' },
    { key: 'borrower', header: 'Borrower' },
    { key: 'amount', header: 'Amount' },
    { key: 'interestRate', header: 'Interest Rate (%)' },
    { key: 'term', header: 'Term (Months)' },
  ]

  return generateCSV(data as unknown as Record<string, unknown>[], columns)
}

async function exportCollectionsReport(startDate: Date, endDate: Date): Promise<string> {
  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      status: 'COMPLETED',
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  })

  const data = payments.map(payment => ({
    date: payment.paymentDate,
    receipt: payment.receiptNumber,
    loan: payment.loan.loanNumber,
    borrower: `${payment.loan.borrower.firstName} ${payment.loan.borrower.lastName}`,
    amount: payment.amount,
    method: payment.paymentMethod,
  }))

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'receipt', header: 'Receipt' },
    { key: 'loan', header: 'Loan Number' },
    { key: 'borrower', header: 'Borrower' },
    { key: 'amount', header: 'Amount' },
    { key: 'method', header: 'Method' },
  ]

  return generateCSV(data as unknown as Record<string, unknown>[], columns)
}

async function exportPortfolioReport(): Promise<string> {
  const loans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      borrower: true,
      schedules: {
        where: {
          isPaid: false,
        },
      },
    },
  })

  const data = loans.map(loan => {
    const overdueSchedules = loan.schedules.filter(
      s => new Date(s.dueDate) < new Date()
    )
    const overdueAmount = overdueSchedules.reduce(
      (sum, s) => sum + (Number(s.totalDue) - Number(s.totalPaid)),
      0
    )

    return {
      loanNumber: loan.loanNumber,
      borrower: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      principal: loan.principalAmount,
      outstandingPrincipal: loan.principalAmount, // Simplified
      overdueAmount,
      daysOverdue: overdueSchedules.length > 0
        ? Math.floor((Date.now() - new Date(overdueSchedules[0].dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      status: overdueAmount > 0 ? 'OVERDUE' : 'CURRENT',
    }
  })

  const columns = [
    { key: 'loanNumber', header: 'Loan Number' },
    { key: 'borrower', header: 'Borrower' },
    { key: 'principal', header: 'Principal' },
    { key: 'outstandingPrincipal', header: 'Outstanding Principal' },
    { key: 'overdueAmount', header: 'Overdue Amount' },
    { key: 'daysOverdue', header: 'Days Overdue' },
    { key: 'status', header: 'Status' },
  ]

  return generateCSV(data as unknown as Record<string, unknown>[], columns)
}
