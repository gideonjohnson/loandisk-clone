/**
 * Document Template Service
 * Generate DOCX documents with placeholders filled from loan/borrower data
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} from 'docx'
import { prisma } from '@/lib/prisma'

export interface TemplatePlaceholder {
  key: string
  label: string
  category: 'borrower' | 'loan' | 'company' | 'date'
  example: string
}

// Available placeholders for document templates
export const TEMPLATE_PLACEHOLDERS: TemplatePlaceholder[] = [
  // Borrower
  { key: '{{borrower_name}}', label: 'Borrower Full Name', category: 'borrower', example: 'John Doe' },
  { key: '{{borrower_first_name}}', label: 'First Name', category: 'borrower', example: 'John' },
  { key: '{{borrower_last_name}}', label: 'Last Name', category: 'borrower', example: 'Doe' },
  { key: '{{borrower_email}}', label: 'Email', category: 'borrower', example: 'john@example.com' },
  { key: '{{borrower_phone}}', label: 'Phone', category: 'borrower', example: '+254712345678' },
  { key: '{{borrower_address}}', label: 'Address', category: 'borrower', example: '123 Main St' },
  { key: '{{borrower_city}}', label: 'City', category: 'borrower', example: 'Nairobi' },
  { key: '{{borrower_id_number}}', label: 'ID Number', category: 'borrower', example: '12345678' },

  // Loan
  { key: '{{loan_number}}', label: 'Loan Number', category: 'loan', example: 'LN-2026-0001' },
  { key: '{{loan_amount}}', label: 'Principal Amount', category: 'loan', example: '$10,000' },
  { key: '{{loan_interest_rate}}', label: 'Interest Rate', category: 'loan', example: '14%' },
  { key: '{{loan_term}}', label: 'Term (Months)', category: 'loan', example: '12' },
  { key: '{{loan_monthly_payment}}', label: 'Monthly Payment', category: 'loan', example: '$900' },
  { key: '{{loan_total_repayment}}', label: 'Total Repayment', category: 'loan', example: '$10,800' },
  { key: '{{loan_start_date}}', label: 'Start Date', category: 'loan', example: 'January 1, 2026' },
  { key: '{{loan_end_date}}', label: 'End Date', category: 'loan', example: 'December 31, 2026' },
  { key: '{{loan_purpose}}', label: 'Loan Purpose', category: 'loan', example: 'Business expansion' },
  { key: '{{loan_officer}}', label: 'Loan Officer', category: 'loan', example: 'Jane Smith' },

  // Company
  { key: '{{company_name}}', label: 'Company Name', category: 'company', example: 'Meek Microfinance' },
  { key: '{{company_address}}', label: 'Company Address', category: 'company', example: '456 Finance Ave' },
  { key: '{{company_phone}}', label: 'Company Phone', category: 'company', example: '+254700000000' },
  { key: '{{company_email}}', label: 'Company Email', category: 'company', example: 'info@meek.com' },

  // Date
  { key: '{{current_date}}', label: 'Current Date', category: 'date', example: 'January 31, 2026' },
  { key: '{{current_year}}', label: 'Current Year', category: 'date', example: '2026' },
]

export interface DocumentTemplate {
  id: string
  name: string
  type: 'LOAN_AGREEMENT' | 'LOAN_APPLICATION' | 'PAYMENT_RECEIPT' | 'DISBURSEMENT_VOUCHER' | 'CUSTOM'
  content: string
  isDefault: boolean
  createdAt: Date
}

/**
 * Replace placeholders in text with actual values
 */
export function replacePlaceholders(text: string, data: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value || '')
  }
  return result
}

/**
 * Get data for placeholders from loan and borrower
 */
export async function getPlaceholderData(loanId: string): Promise<Record<string, string>> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      borrower: true,
      loanOfficer: true,
      schedules: true,
    },
  })

  if (!loan) throw new Error('Loan not found')

  // Get company settings
  const companySettings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['company_name', 'company_address', 'company_phone', 'company_email'],
      },
    },
  })

  const companySetting = (key: string) =>
    companySettings.find((s) => s.key === key)?.value || ''

  // Calculate monthly payment (simplified)
  const monthlyPayment = loan.schedules[0]?.totalDue || 0
  const totalRepayment = loan.schedules.reduce((sum, s) => sum + Number(s.totalDue), 0)

  const formatDate = (date: Date | null) =>
    date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

  const formatCurrency = (val: number | null) =>
    val ? `$${Number(val).toLocaleString()}` : '$0'

  return {
    // Borrower
    '{{borrower_name}}': `${loan.borrower.firstName} ${loan.borrower.lastName}`,
    '{{borrower_first_name}}': loan.borrower.firstName,
    '{{borrower_last_name}}': loan.borrower.lastName,
    '{{borrower_email}}': loan.borrower.email || '',
    '{{borrower_phone}}': loan.borrower.phone,
    '{{borrower_address}}': loan.borrower.address || '',
    '{{borrower_city}}': loan.borrower.city || '',
    '{{borrower_id_number}}': loan.borrower.idNumber || '',

    // Loan
    '{{loan_number}}': loan.loanNumber,
    '{{loan_amount}}': formatCurrency(Number(loan.principalAmount)),
    '{{loan_interest_rate}}': `${loan.interestRate}%`,
    '{{loan_term}}': loan.termMonths.toString(),
    '{{loan_monthly_payment}}': formatCurrency(Number(monthlyPayment)),
    '{{loan_total_repayment}}': formatCurrency(totalRepayment),
    '{{loan_start_date}}': formatDate(loan.startDate),
    '{{loan_end_date}}': formatDate(loan.endDate),
    '{{loan_purpose}}': loan.purpose || '',
    '{{loan_officer}}': loan.loanOfficer.name,

    // Company
    '{{company_name}}': companySetting('company_name') || 'Meek Microfinance',
    '{{company_address}}': companySetting('company_address') || '',
    '{{company_phone}}': companySetting('company_phone') || '',
    '{{company_email}}': companySetting('company_email') || '',

    // Date
    '{{current_date}}': new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    '{{current_year}}': new Date().getFullYear().toString(),
  }
}

/**
 * Generate a DOCX document from template content
 */
export async function generateDocument(
  templateContent: string,
  data: Record<string, string>
): Promise<Buffer> {
  const filledContent = replacePlaceholders(templateContent, data)
  const paragraphs = filledContent.split('\n').filter(Boolean)

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs.map((text) => {
          // Check if it's a heading
          if (text.startsWith('# ')) {
            return new Paragraph({
              text: text.replace('# ', ''),
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            })
          }
          if (text.startsWith('## ')) {
            return new Paragraph({
              text: text.replace('## ', ''),
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150 },
            })
          }
          // Regular paragraph
          return new Paragraph({
            children: [new TextRun({ text })],
            spacing: { after: 120 },
          })
        }),
      },
    ],
  })

  return await Packer.toBuffer(doc)
}

/**
 * Generate loan agreement document
 */
export async function generateLoanAgreement(loanId: string): Promise<Buffer> {
  const data = await getPlaceholderData(loanId)

  const template = `# LOAN AGREEMENT

This Loan Agreement ("Agreement") is entered into on {{current_date}}.

## PARTIES

**LENDER:** {{company_name}}
Address: {{company_address}}
Phone: {{company_phone}}

**BORROWER:** {{borrower_name}}
Address: {{borrower_address}}, {{borrower_city}}
Phone: {{borrower_phone}}
ID Number: {{borrower_id_number}}

## LOAN DETAILS

Loan Number: {{loan_number}}
Principal Amount: {{loan_amount}}
Interest Rate: {{loan_interest_rate}} per annum
Loan Term: {{loan_term}} months
Monthly Payment: {{loan_monthly_payment}}
Total Repayment: {{loan_total_repayment}}
Purpose: {{loan_purpose}}

## TERMS AND CONDITIONS

1. The Borrower agrees to repay the loan in {{loan_term}} equal monthly installments of {{loan_monthly_payment}}.

2. Payments are due on the same date each month, starting from {{loan_start_date}}.

3. The final payment is due on {{loan_end_date}}.

4. Late payments may incur additional fees and penalties as per the lender's policy.

5. The Borrower may prepay the loan without penalty.

## SIGNATURES

_________________________
{{borrower_name}} (Borrower)
Date: _______________

_________________________
{{loan_officer}} (Loan Officer)
{{company_name}}
Date: _______________
`

  return generateDocument(template, data)
}

/**
 * Get default templates
 */
export function getDefaultTemplates(): Omit<DocumentTemplate, 'id' | 'createdAt'>[] {
  return [
    {
      name: 'Loan Agreement',
      type: 'LOAN_AGREEMENT',
      isDefault: true,
      content: `# LOAN AGREEMENT

This Loan Agreement is entered into on {{current_date}}.

## PARTIES
LENDER: {{company_name}}
BORROWER: {{borrower_name}}

## LOAN DETAILS
Loan Number: {{loan_number}}
Principal: {{loan_amount}}
Interest Rate: {{loan_interest_rate}}
Term: {{loan_term}} months
Monthly Payment: {{loan_monthly_payment}}

## SIGNATURES
_________________________
Borrower: {{borrower_name}}

_________________________
Loan Officer: {{loan_officer}}
`,
    },
    {
      name: 'Payment Receipt',
      type: 'PAYMENT_RECEIPT',
      isDefault: true,
      content: `# PAYMENT RECEIPT

Date: {{current_date}}
Receipt Number: _______________

Received from: {{borrower_name}}
Loan Number: {{loan_number}}
Amount: _______________

{{company_name}}
{{company_address}}
`,
    },
    {
      name: 'Disbursement Voucher',
      type: 'DISBURSEMENT_VOUCHER',
      isDefault: true,
      content: `# DISBURSEMENT VOUCHER

Date: {{current_date}}

Borrower: {{borrower_name}}
Loan Number: {{loan_number}}
Amount Disbursed: {{loan_amount}}

Purpose: {{loan_purpose}}

Approved by: {{loan_officer}}
{{company_name}}
`,
    },
  ]
}
