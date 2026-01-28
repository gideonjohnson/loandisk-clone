import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

/**
 * PDF Export Utility
 * Generate PDFs for loans, reports, and statements
 */

export interface LoanStatementData {
  loan: {
    loanNumber: string
    principalAmount: number
    interestRate: number
    termMonths: number
    startDate: Date
    endDate: Date
    status: string
  }
  borrower: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    address?: string
  }
  schedules: Array<{
    dueDate: Date
    principalDue: number
    interestDue: number
    totalDue: number
    principalPaid: number
    interestPaid: number
    totalPaid: number
    isPaid: boolean
  }>
  payments: Array<{
    paymentDate: Date
    amount: number
    paymentMethod: string
    receiptNumber: string
  }>
}

/**
 * Generate Loan Statement PDF
 */
export function exportLoanStatement(data: LoanStatementData): Blob {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.text('LOAN STATEMENT', 105, 15, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 105, 22, {
    align: 'center',
  })

  // Loan Details
  doc.setFontSize(14)
  doc.text('Loan Information', 14, 35)

  doc.setFontSize(10)
  let y = 42
  doc.text(`Loan Number: ${data.loan.loanNumber}`, 14, y)
  y += 6
  doc.text(
    `Principal Amount: $${Number(data.loan.principalAmount).toLocaleString()}`,
    14,
    y
  )
  y += 6
  doc.text(`Interest Rate: ${data.loan.interestRate}% per annum`, 14, y)
  y += 6
  doc.text(`Term: ${data.loan.termMonths} months`, 14, y)
  y += 6
  doc.text(`Status: ${data.loan.status}`, 14, y)
  y += 6
  doc.text(
    `Start Date: ${format(new Date(data.loan.startDate), 'MMM dd, yyyy')}`,
    14,
    y
  )
  y += 6
  doc.text(
    `End Date: ${format(new Date(data.loan.endDate), 'MMM dd, yyyy')}`,
    14,
    y
  )

  // Borrower Details
  y += 12
  doc.setFontSize(14)
  doc.text('Borrower Information', 14, y)

  doc.setFontSize(10)
  y += 7
  doc.text(
    `Name: ${data.borrower.firstName} ${data.borrower.lastName}`,
    14,
    y
  )
  if (data.borrower.email) {
    y += 6
    doc.text(`Email: ${data.borrower.email}`, 14, y)
  }
  if (data.borrower.phone) {
    y += 6
    doc.text(`Phone: ${data.borrower.phone}`, 14, y)
  }
  if (data.borrower.address) {
    y += 6
    doc.text(`Address: ${data.borrower.address}`, 14, y)
  }

  // Payment Schedule
  y += 12
  doc.setFontSize(14)
  doc.text('Payment Schedule', 14, y)

  const scheduleData = data.schedules.map((s) => [
    format(new Date(s.dueDate), 'MMM dd, yyyy'),
    `$${Number(s.principalDue).toLocaleString()}`,
    `$${Number(s.interestDue).toLocaleString()}`,
    `$${Number(s.totalDue).toLocaleString()}`,
    `$${Number(s.totalPaid).toLocaleString()}`,
    s.isPaid ? 'Yes' : 'No',
  ])

  autoTable(doc, {
    startY: y + 5,
    head: [['Due Date', 'Principal', 'Interest', 'Total Due', 'Paid', 'Status']],
    body: scheduleData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 8 },
  })

  // Payment History
  if (data.payments.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 12

    doc.setFontSize(14)
    doc.text('Payment History', 14, y)

    const paymentData = data.payments.map((p) => [
      format(new Date(p.paymentDate), 'MMM dd, yyyy'),
      `$${Number(p.amount).toLocaleString()}`,
      p.paymentMethod,
      p.receiptNumber,
    ])

    autoTable(doc, {
      startY: y + 5,
      head: [['Payment Date', 'Amount', 'Method', 'Receipt #']],
      body: paymentData,
      theme: 'grid',
      headStyles: { fillColor: [92, 184, 92] },
      styles: { fontSize: 8 },
    })
  }

  // Summary
  const totalDue = data.schedules.reduce(
    (sum, s) => sum + Number(s.totalDue),
    0
  )
  const totalPaid = data.schedules.reduce(
    (sum, s) => sum + Number(s.totalPaid),
    0
  )
  const outstanding = totalDue - totalPaid

  y = (doc as any).lastAutoTable.finalY + 12

  doc.setFontSize(12)
  doc.text('Summary', 14, y)

  doc.setFontSize(10)
  y += 7
  doc.text(`Total Amount Due: $${totalDue.toLocaleString()}`, 14, y)
  y += 6
  doc.text(`Total Amount Paid: $${totalPaid.toLocaleString()}`, 14, y)
  y += 6
  doc.setFont(undefined, 'bold')
  doc.text(`Outstanding Balance: $${outstanding.toLocaleString()}`, 14, y)

  return doc.output('blob')
}

/**
 * Generate Payment Receipt PDF
 */
export function exportPaymentReceipt(payment: {
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
  receivedByUser: {
    name: string
  }
}): Blob {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(24)
  doc.text('PAYMENT RECEIPT', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.text(`Receipt #: ${payment.receiptNumber}`, 105, 30, { align: 'center' })

  // Receipt Details
  let y = 50
  doc.setFontSize(14)
  doc.text('Payment Details', 14, y)

  doc.setFontSize(11)
  y += 10
  doc.text(
    `Date: ${format(new Date(payment.paymentDate), 'MMMM dd, yyyy')}`,
    14,
    y
  )
  y += 8
  doc.text(
    `Amount Paid: $${Number(payment.amount).toLocaleString()}`,
    14,
    y
  )
  y += 8
  doc.text(`Payment Method: ${payment.paymentMethod}`, 14, y)

  y += 15
  doc.setFontSize(14)
  doc.text('Loan Information', 14, y)

  doc.setFontSize(11)
  y += 10
  doc.text(`Loan Number: ${payment.loan.loanNumber}`, 14, y)
  y += 8
  doc.text(
    `Borrower: ${payment.loan.borrower.firstName} ${payment.loan.borrower.lastName}`,
    14,
    y
  )

  y += 15
  doc.setFontSize(14)
  doc.text('Received By', 14, y)

  doc.setFontSize(11)
  y += 10
  doc.text(payment.receivedByUser.name, 14, y)
  y += 8
  doc.text(format(new Date(), 'MMM dd, yyyy HH:mm'), 14, y)

  // Footer
  y += 30
  doc.setFontSize(9)
  doc.text(
    'This is a computer-generated receipt and does not require a signature.',
    105,
    y,
    { align: 'center' }
  )

  return doc.output('blob')
}

/**
 * Generate Generic Report PDF
 */
export function exportReportToPDF(
  title: string,
  data: any[][],
  headers: string[]
): Blob {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.text(title, 105, 15, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 105, 22, {
    align: 'center',
  })

  // Table
  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
    styles: { fontSize: 9 },
  })

  return doc.output('blob')
}
