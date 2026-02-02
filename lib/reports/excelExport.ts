import * as XLSX from 'xlsx'
import { format } from 'date-fns'

/**
 * Excel Export Utility
 * Generate Excel files for reports and data exports
 */

/**
 * Export data to Excel
 */
export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Sheet1'
): Blob {
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data)

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  // Convert to Blob
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Export loan schedule to Excel
 */
export function exportLoanScheduleToExcel(
  schedule: Array<{
    dueDate: Date
    principalDue: number
    interestDue: number
    feesDue: number
    totalDue: number
    principalPaid: number
    interestPaid: number
    feesPaid: number
    totalPaid: number
    isPaid: boolean
  }>,
  loanNumber: string
): Blob {
  const data = schedule.map((s, index) => ({
    'Installment #': index + 1,
    'Due Date': format(new Date(s.dueDate), 'yyyy-MM-dd'),
    'Principal Due': Number(s.principalDue),
    'Interest Due': Number(s.interestDue),
    'Fees Due': Number(s.feesDue),
    'Total Due': Number(s.totalDue),
    'Principal Paid': Number(s.principalPaid),
    'Interest Paid': Number(s.interestPaid),
    'Fees Paid': Number(s.feesPaid),
    'Total Paid': Number(s.totalPaid),
    Balance: Number(s.totalDue) - Number(s.totalPaid),
    Status: s.isPaid ? 'Paid' : 'Unpaid',
  }))

  return exportToExcel(data, `Loan_Schedule_${loanNumber}.xlsx`, 'Schedule')
}

/**
 * Export borrowers to Excel
 */
export function exportBorrowersToExcel(
  borrowers: Array<{
    firstName: string
    lastName: string
    email?: string
    phone?: string
    monthlyIncome?: number
    creditScore?: number
    active: boolean
    createdAt: Date
  }>
): Blob {
  const data = borrowers.map((b) => ({
    'First Name': b.firstName,
    'Last Name': b.lastName,
    Email: b.email || '',
    Phone: b.phone || '',
    'Monthly Income': b.monthlyIncome ? Number(b.monthlyIncome) : 0,
    'Credit Score': b.creditScore || '',
    Status: b.active ? 'Active' : 'Inactive',
    'Joined Date': format(new Date(b.createdAt), 'yyyy-MM-dd'),
  }))

  return exportToExcel(data, 'Borrowers.xlsx', 'Borrowers')
}

/**
 * Export loans to Excel
 */
export function exportLoansToExcel(
  loans: Array<{
    loanNumber: string
    borrower: {
      firstName: string
      lastName: string
    }
    principalAmount: number
    interestRate: number
    termMonths: number
    status: string
    startDate: Date
    disbursementDate?: Date
  }>
): Blob {
  const data = loans.map((l) => ({
    'Loan Number': l.loanNumber,
    Borrower: `${l.borrower.firstName} ${l.borrower.lastName}`,
    'Principal Amount': Number(l.principalAmount),
    'Interest Rate': Number(l.interestRate),
    'Term (Months)': l.termMonths,
    Status: l.status,
    'Start Date': format(new Date(l.startDate), 'yyyy-MM-dd'),
    'Disbursement Date': l.disbursementDate
      ? format(new Date(l.disbursementDate), 'yyyy-MM-dd')
      : '',
  }))

  return exportToExcel(data, 'Loans.xlsx', 'Loans')
}

/**
 * Export payments to Excel
 */
export function exportPaymentsToExcel(
  payments: Array<{
    receiptNumber: string
    paymentDate: Date
    amount: number
    paymentMethod: string
    loan: {
      loanNumber: string
      borrower: {
        firstName: string
        lastName: string
      }
    }
  }>
): Blob {
  const data = payments.map((p) => ({
    'Receipt Number': p.receiptNumber,
    'Payment Date': format(new Date(p.paymentDate), 'yyyy-MM-dd'),
    Amount: Number(p.amount),
    'Payment Method': p.paymentMethod,
    'Loan Number': p.loan.loanNumber,
    Borrower: `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}`,
  }))

  return exportToExcel(data, 'Payments.xlsx', 'Payments')
}

/**
 * Export cash flow report to Excel
 */
export function exportCashFlowToExcel(data: {
  period: { start: Date; end: Date }
  monthlyBreakdown: Array<{
    month: string
    disbursements: number
    collections: number
    netCashFlow: number
  }>
}): Blob {
  const monthlyData = data.monthlyBreakdown.map((m) => ({
    Month: m.month,
    Disbursements: m.disbursements,
    Collections: m.collections,
    'Net Cash Flow': m.netCashFlow,
  }))

  const ws = XLSX.utils.json_to_sheet(monthlyData)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Export portfolio report to Excel
 */
export function exportPortfolioToExcel(data: {
  summary: {
    totalLoans: number
    activeLoans: number
    totalDisbursed: number
    totalOutstanding: number
    totalCollected: number
  }
  byStatus: Array<{
    status: string
    count: number
    amount: number
    percentage: number
  }>
}): Blob {
  const summaryData = [
    { Metric: 'Total Loans', Value: data.summary.totalLoans },
    { Metric: 'Active Loans', Value: data.summary.activeLoans },
    { Metric: 'Total Disbursed', Value: data.summary.totalDisbursed },
    { Metric: 'Total Outstanding', Value: data.summary.totalOutstanding },
    { Metric: 'Total Collected', Value: data.summary.totalCollected },
  ]

  const statusData = data.byStatus.map((s) => ({
    Status: s.status,
    'Loan Count': s.count,
    Amount: s.amount,
    'Percentage': `${s.percentage.toFixed(2)}%`,
  }))

  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  const wsStatus = XLSX.utils.json_to_sheet(statusData)
  XLSX.utils.book_append_sheet(wb, wsStatus, 'By Status')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Export aging report to Excel
 */
export function exportAgingToExcel(data: {
  current: { count: number; amount: number }
  days1to30: { count: number; amount: number }
  days31to60: { count: number; amount: number }
  days61to90: { count: number; amount: number }
  over90: { count: number; amount: number }
  loans: Array<{
    loanNumber: string
    borrowerName: string
    dueDate: Date
    amountDue: number
    amountPaid: number
    daysOverdue: number
  }>
}): Blob {
  const summaryData = [
    { 'Aging Bucket': 'Current', Count: data.current.count, Amount: data.current.amount },
    { 'Aging Bucket': '1-30 Days', Count: data.days1to30.count, Amount: data.days1to30.amount },
    { 'Aging Bucket': '31-60 Days', Count: data.days31to60.count, Amount: data.days31to60.amount },
    { 'Aging Bucket': '61-90 Days', Count: data.days61to90.count, Amount: data.days61to90.amount },
    { 'Aging Bucket': '90+ Days', Count: data.over90.count, Amount: data.over90.amount },
  ]

  const loanData = data.loans.map((l) => ({
    'Loan Number': l.loanNumber,
    Borrower: l.borrowerName,
    'Due Date': format(new Date(l.dueDate), 'yyyy-MM-dd'),
    'Amount Due': l.amountDue,
    'Amount Paid': l.amountPaid,
    Outstanding: l.amountDue - l.amountPaid,
    'Days Overdue': l.daysOverdue,
  }))

  const wb = XLSX.utils.book_new()

  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  const wsLoans = XLSX.utils.json_to_sheet(loanData)
  XLSX.utils.book_append_sheet(wb, wsLoans, 'Overdue Loans')

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
