/**
 * Zod Validation Schemas
 * Centralized input validation for API endpoints
 */

import { z } from 'zod'

// Common validation patterns
const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ==================== User Schemas ====================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['ADMIN', 'MANAGER', 'OFFICER', 'TELLER']).optional(),
})

// ==================== Borrower Schemas ====================

export const createBorrowerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex, 'Invalid phone number').optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().max(50).optional(),
  idType: z.string().max(50).optional(),
  employmentStatus: z.string().max(50).optional(),
  employer: z.string().max(100).optional(),
  monthlyIncome: z.number().min(0).optional(),
  creditScore: z.number().min(0).max(850).optional(),
})

export const updateBorrowerSchema = createBorrowerSchema.partial()

// ==================== Loan Schemas ====================

export const createLoanSchema = z.object({
  borrowerId: z.string().uuid('Invalid borrower ID'),
  principalAmount: z.number().positive('Principal must be positive').max(10000000),
  interestRate: z.number().min(0).max(100, 'Interest rate must be between 0-100%'),
  termMonths: z.number().int().positive().max(360, 'Term cannot exceed 360 months'),
  startDate: z.string().optional(),
  purpose: z.string().max(500).optional(),
  collateral: z.string().max(500).optional(),
  guarantorName: z.string().max(100).optional(),
  guarantorPhone: z.string().regex(phoneRegex, 'Invalid guarantor phone').optional().or(z.literal('')),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
})

export const approveLoanSchema = z.object({
  approvedAmount: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
})

export const rejectLoanSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(1000),
})

export const disburseLoanSchema = z.object({
  disbursementMethod: z.enum(['CASH', 'BANK_TRANSFER', 'M_PESA', 'AIRTEL_MONEY', 'CHECK']).optional(),
  disbursementAccount: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

// ==================== Payment Schemas ====================

export const createPaymentSchema = z.object({
  loanId: z.string().uuid('Invalid loan ID'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'M_PESA', 'AIRTEL_MONEY', 'CHECK', 'CARD']),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
  receiptNumber: z.string().max(50).optional(),
})

// ==================== Savings Schemas ====================

export const createSavingsAccountSchema = z.object({
  borrowerId: z.string().uuid('Invalid borrower ID'),
  accountType: z.enum(['SAVINGS', 'FIXED_DEPOSIT', 'CURRENT']),
  interestRate: z.number().min(0).max(50).optional(),
  initialDeposit: z.number().min(0).optional(),
})

export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(200).optional(),
})

export const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(200).optional(),
})

// ==================== Signature Schemas ====================

export const signatureRequestSchema = z.object({
  loanId: z.string().uuid('Invalid loan ID'),
  documentUrl: z.string().url().optional(),
})

export const signatureCaptureSchema = z.object({
  loanId: z.string(),
  requestId: z.string(),
  signatureData: z.string().startsWith('data:image', 'Invalid signature data'),
  signedBy: z.string().optional(),
})

// ==================== Utility Functions ====================

/**
 * Validate input against a schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.issues.map(err =>
    `${err.path.join('.')}: ${err.message}`
  )

  return { success: false, errors }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}
