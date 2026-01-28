/**
 * Fee and Penalty Calculator Utility
 * Handles calculation of various fees and penalties for loans
 */

export interface Fee {
  id: string
  name: string
  type: string
  calculationType: 'FIXED' | 'PERCENTAGE'
  amount?: number
  percentage?: number
}

export interface PenaltyConfig {
  type: 'FIXED' | 'PERCENTAGE' | 'DAILY_RATE'
  amount?: number
  percentage?: number
  dailyRate?: number
  gracePeriodDays?: number
}

/**
 * Calculate processing fee for a loan
 * @param principalAmount Loan principal amount
 * @param feeConfig Fee configuration
 * @returns Calculated fee amount
 */
export function calculateProcessingFee(
  principalAmount: number,
  feeConfig: Fee
): number {
  if (feeConfig.calculationType === 'FIXED') {
    return feeConfig.amount || 0
  }

  if (feeConfig.calculationType === 'PERCENTAGE') {
    const percentage = feeConfig.percentage || 0
    return (principalAmount * percentage) / 100
  }

  return 0
}

/**
 * Calculate late payment penalty
 * @param dueAmount Amount that was due
 * @param dueDate Date payment was due
 * @param currentDate Current date (or payment date)
 * @param penaltyConfig Penalty configuration
 * @returns Calculated penalty amount
 */
export function calculateLatePenalty(
  dueAmount: number,
  dueDate: Date,
  currentDate: Date = new Date(),
  penaltyConfig: PenaltyConfig
): number {
  // Calculate days late
  const daysLate = Math.max(
    0,
    Math.floor(
      (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  // Apply grace period
  const gracePeriod = penaltyConfig.gracePeriodDays || 0
  const chargeableDays = Math.max(0, daysLate - gracePeriod)

  if (chargeableDays === 0) {
    return 0
  }

  // Calculate penalty based on type
  if (penaltyConfig.type === 'FIXED') {
    return penaltyConfig.amount || 0
  }

  if (penaltyConfig.type === 'PERCENTAGE') {
    const percentage = penaltyConfig.percentage || 0
    return (dueAmount * percentage) / 100
  }

  if (penaltyConfig.type === 'DAILY_RATE') {
    const dailyRate = penaltyConfig.dailyRate || 0
    return dueAmount * (dailyRate / 100) * chargeableDays
  }

  return 0
}

/**
 * Calculate early settlement fee
 * @param remainingBalance Outstanding loan balance
 * @param feeConfig Fee configuration
 * @returns Calculated early settlement fee
 */
export function calculateEarlySettlementFee(
  remainingBalance: number,
  feeConfig: Fee
): number {
  if (feeConfig.calculationType === 'FIXED') {
    return feeConfig.amount || 0
  }

  if (feeConfig.calculationType === 'PERCENTAGE') {
    const percentage = feeConfig.percentage || 0
    return (remainingBalance * percentage) / 100
  }

  return 0
}

/**
 * Calculate total amount due including fees and penalties
 * @param principalDue Principal amount due
 * @param interestDue Interest amount due
 * @param fees Array of applicable fees
 * @param penalties Array of applicable penalties
 * @returns Total amount due
 */
export function calculateTotalDue(
  principalDue: number,
  interestDue: number,
  fees: number[] = [],
  penalties: number[] = []
): number {
  const totalFees = fees.reduce((sum, fee) => sum + fee, 0)
  const totalPenalties = penalties.reduce((sum, penalty) => sum + penalty, 0)

  return principalDue + interestDue + totalFees + totalPenalties
}

/**
 * Calculate days overdue
 * @param dueDate Payment due date
 * @param currentDate Current date (or payment date)
 * @returns Number of days overdue (0 if not overdue)
 */
export function calculateDaysOverdue(
  dueDate: Date,
  currentDate: Date = new Date()
): number {
  return Math.max(
    0,
    Math.floor(
      (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  )
}

/**
 * Check if payment is overdue
 * @param dueDate Payment due date
 * @param currentDate Current date
 * @param gracePeriodDays Grace period in days
 * @returns true if payment is overdue after grace period
 */
export function isOverdue(
  dueDate: Date,
  currentDate: Date = new Date(),
  gracePeriodDays: number = 0
): boolean {
  const daysLate = calculateDaysOverdue(dueDate, currentDate)
  return daysLate > gracePeriodDays
}

/**
 * Calculate penalty tier based on days overdue
 * @param daysOverdue Number of days overdue
 * @returns Penalty tier (1-4)
 */
export function getPenaltyTier(daysOverdue: number): {
  tier: number
  label: string
  multiplier: number
} {
  if (daysOverdue <= 7) {
    return { tier: 1, label: '1-7 days', multiplier: 1.0 }
  } else if (daysOverdue <= 30) {
    return { tier: 2, label: '8-30 days', multiplier: 1.5 }
  } else if (daysOverdue <= 60) {
    return { tier: 3, label: '31-60 days', multiplier: 2.0 }
  } else {
    return { tier: 4, label: '60+ days', multiplier: 3.0 }
  }
}

/**
 * Calculate tiered late penalty (increases with time)
 * @param dueAmount Amount due
 * @param daysOverdue Days overdue
 * @param basePercentage Base penalty percentage
 * @returns Calculated penalty with tier multiplier
 */
export function calculateTieredPenalty(
  dueAmount: number,
  daysOverdue: number,
  basePercentage: number = 5
): number {
  const { multiplier } = getPenaltyTier(daysOverdue)
  const effectivePercentage = basePercentage * multiplier
  return (dueAmount * effectivePercentage) / 100
}

/**
 * Apply fee to loan based on configuration
 * @param loanAmount Loan amount
 * @param fee Fee configuration
 * @returns Calculated fee amount
 */
export function applyFeeToLoan(loanAmount: number, fee: Fee): number {
  switch (fee.type) {
    case 'PROCESSING':
    case 'ORIGINATION':
    case 'APPLICATION':
      return calculateProcessingFee(loanAmount, fee)

    case 'LATE_PAYMENT':
      // For late payment fees, use the percentage or fixed amount
      if (fee.calculationType === 'FIXED') {
        return fee.amount || 0
      }
      return (loanAmount * (fee.percentage || 0)) / 100

    case 'EARLY_SETTLEMENT':
      return calculateEarlySettlementFee(loanAmount, fee)

    default:
      // Generic fee calculation
      if (fee.calculationType === 'FIXED') {
        return fee.amount || 0
      }
      return (loanAmount * (fee.percentage || 0)) / 100
  }
}

/**
 * Format currency amount
 * @param amount Amount to format
 * @param currency Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
