/**
 * Disbursement Fee Service
 * Handles automatic application of processing fees when a loan is disbursed
 */

import { prisma } from '@/lib/prisma'
import { applyFeeToLoan } from '@/lib/utils/feeCalculator'

/**
 * Fee types that should be applied at disbursement
 */
const DISBURSEMENT_FEE_TYPES = ['PROCESSING', 'ORIGINATION', 'APPLICATION']

interface AppliedFee {
  feeId: string
  feeName: string
  feeType: string
  amount: number
}

/**
 * Get all active fees that should be applied at disbursement
 */
export async function getApplicableProcessingFees() {
  const fees = await prisma.fee.findMany({
    where: {
      active: true,
      type: {
        in: DISBURSEMENT_FEE_TYPES,
      },
    },
  })

  return fees
}

/**
 * Apply disbursement fees to a loan
 * Creates LoanFee records for each applicable fee
 *
 * @param loanId - The loan ID to apply fees to
 * @param principalAmount - The loan principal amount (for percentage calculations)
 * @param userId - The user applying the fees (for audit trail)
 * @returns Array of applied fees with their calculated amounts
 */
export async function applyDisbursementFees(
  loanId: string,
  principalAmount: number,
  userId: string
): Promise<AppliedFee[]> {
  const appliedFees: AppliedFee[] = []

  // Get all applicable fees
  const fees = await getApplicableProcessingFees()

  if (fees.length === 0) {
    return appliedFees
  }

  // Check for existing fees on this loan to avoid duplicates
  const existingFees = await prisma.loanFee.findMany({
    where: {
      loanId,
      fee: {
        type: {
          in: DISBURSEMENT_FEE_TYPES,
        },
      },
    },
    include: {
      fee: true,
    },
  })

  const existingFeeIds = new Set(existingFees.map((lf) => lf.feeId))

  // Apply each fee
  for (const fee of fees) {
    // Skip if this fee type is already applied to this loan
    if (existingFeeIds.has(fee.id)) {
      continue
    }

    // Calculate the fee amount
    const feeConfig = {
      id: fee.id,
      name: fee.name,
      type: fee.type,
      calculationType: fee.calculationType as 'FIXED' | 'PERCENTAGE',
      amount: fee.amount ? Number(fee.amount) : undefined,
      percentage: fee.percentage ? Number(fee.percentage) : undefined,
    }

    const calculatedAmount = applyFeeToLoan(principalAmount, feeConfig)

    if (calculatedAmount > 0) {
      // Create the LoanFee record
      await prisma.loanFee.create({
        data: {
          loanId,
          feeId: fee.id,
          amount: calculatedAmount,
          isPaid: false,
          paidAmount: 0,
          dueDate: new Date(), // Due immediately at disbursement
        },
      })

      appliedFees.push({
        feeId: fee.id,
        feeName: fee.name,
        feeType: fee.type,
        amount: calculatedAmount,
      })
    }
  }

  // Log the fee application activity
  if (appliedFees.length > 0) {
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'APPLY_DISBURSEMENT_FEES',
        entityType: 'Loan',
        entityId: loanId,
        details: JSON.stringify({
          feesApplied: appliedFees.map((f) => ({
            name: f.feeName,
            type: f.feeType,
            amount: f.amount,
          })),
          totalFees: appliedFees.reduce((sum, f) => sum + f.amount, 0),
        }),
      },
    })
  }

  return appliedFees
}

/**
 * Get total fees applied to a loan
 */
export async function getLoanFeeTotal(loanId: string): Promise<number> {
  const fees = await prisma.loanFee.findMany({
    where: { loanId },
  })

  return fees.reduce((sum, fee) => sum + Number(fee.amount), 0)
}

/**
 * Get unpaid fees for a loan
 */
export async function getUnpaidLoanFees(loanId: string) {
  return prisma.loanFee.findMany({
    where: {
      loanId,
      isPaid: false,
    },
    include: {
      fee: true,
    },
  })
}
