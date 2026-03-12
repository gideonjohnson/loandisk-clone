import { z } from "zod"

export const createLoanSchema = z.object({
  borrowerId: z.string().min(1, "Borrower is required"),
  principalAmount: z.coerce.number().min(1, "Principal amount must be greater than 0"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%"),
  termMonths: z.coerce.number().int("Term must be a whole number").min(1, "Term must be at least 1").max(3650, "Term value too large"),
  termUnit: z.enum(["days", "weeks", "months", "years"]).default("months"),
  startDate: z.string().or(z.date()),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})

export const updateLoanSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "ACTIVE", "PAID", "DEFAULTED", "REJECTED"]).optional(),
  notes: z.string().optional(),
  approvalDate: z.string().or(z.date()).optional(),
  disbursementDate: z.string().or(z.date()).optional(),
})

export const loanWorkflowSchema = z.object({
  notes: z.string().optional(),
  reason: z.string().optional(),
})

export type CreateLoanInput = z.infer<typeof createLoanSchema>
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>
export type LoanWorkflowInput = z.infer<typeof loanWorkflowSchema>
