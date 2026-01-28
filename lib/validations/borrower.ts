import { z } from "zod"

export const createBorrowerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  dateOfBirth: z.string().optional().or(z.date().optional()),
  idNumber: z.string().optional(),
  employmentStatus: z.enum(["Employed", "Self-Employed", "Unemployed", "Retired", ""]).optional(),
  monthlyIncome: z.number().min(0, "Monthly income cannot be negative").optional().or(z.nan()),
  creditScore: z.number().min(300, "Credit score must be at least 300").max(850, "Credit score cannot exceed 850").optional().or(z.nan()),
})

export const updateBorrowerSchema = createBorrowerSchema.extend({
  active: z.boolean().optional(),
})

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>
