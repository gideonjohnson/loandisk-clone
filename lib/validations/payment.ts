import { z } from "zod"

export const createPaymentSchema = z.object({
  loanId: z.string().min(1, "Loan is required"),
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  paymentDate: z.string().or(z.date()),
  paymentMethod: z.enum(["Cash", "Bank Transfer", "Cheque", "M-Pesa", "Airtel Money", "Card"]),
  principalAmount: z.number().min(0, "Principal amount cannot be negative"),
  interestAmount: z.number().min(0, "Interest amount cannot be negative"),
  feesAmount: z.number().min(0, "Fees amount cannot be negative").optional(),
  notes: z.string().optional(),
  scheduleId: z.string().optional(),
}).refine(
  (data) => {
    const total = data.principalAmount + data.interestAmount + (data.feesAmount || 0)
    return Math.abs(total - data.amount) < 0.01 // Allow small floating point differences
  },
  {
    message: "Principal + Interest + Fees must equal the total payment amount",
    path: ["amount"],
  }
)

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
