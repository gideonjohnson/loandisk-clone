import { prisma } from '@/lib/prisma'

// ============================================================
// Types
// ============================================================

interface FraudRule {
  name: string
  weight: number
  check: (context: FraudContext) => Promise<FraudRuleResult>
}

interface FraudContext {
  borrowerId: string
  loanId?: string
  requestedAmount?: number
}

interface FraudRuleResult {
  score: number // 0-100, where 100 is max suspicious
  flags: string[]
  details: string
}

// ============================================================
// Rule 1: Velocity Check (weight: 25)
// ============================================================

const velocityCheckRule: FraudRule = {
  name: 'Velocity Check',
  weight: 25,
  check: async (context: FraudContext): Promise<FraudRuleResult> => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentLoanCount = await prisma.loan.count({
      where: {
        borrowerId: context.borrowerId,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    let score = 0
    const flags: string[] = []

    if (recentLoanCount <= 1) {
      score = 0
    } else if (recentLoanCount === 2) {
      score = 30
    } else if (recentLoanCount === 3) {
      score = 60
    } else {
      score = 100
    }

    if (score >= 60) {
      flags.push('VELOCITY_HIGH')
    }

    return {
      score,
      flags,
      details: `Borrower has ${recentLoanCount} loan application(s) in the last 30 days`,
    }
  },
}

// ============================================================
// Rule 2: Identity Duplication (weight: 30)
// ============================================================

const identityDuplicationRule: FraudRule = {
  name: 'Identity Duplication',
  weight: 30,
  check: async (context: FraudContext): Promise<FraudRuleResult> => {
    const borrower = await prisma.borrower.findUnique({
      where: { id: context.borrowerId },
      select: { phone: true, email: true, idNumber: true },
    })

    if (!borrower) {
      return { score: 0, flags: [], details: 'Borrower not found' }
    }

    let score = 0
    const flags: string[] = []
    const matches: string[] = []

    // Check phone duplication
    const phoneDuplicates = await prisma.borrower.count({
      where: {
        phone: borrower.phone,
        id: { not: context.borrowerId },
      },
    })
    if (phoneDuplicates > 0) {
      score += 40
      flags.push('DUPLICATE_PHONE')
      matches.push(`Phone matched ${phoneDuplicates} other borrower(s)`)
    }

    // Check email duplication (skip if null)
    if (borrower.email) {
      const emailDuplicates = await prisma.borrower.count({
        where: {
          email: borrower.email,
          id: { not: context.borrowerId },
        },
      })
      if (emailDuplicates > 0) {
        score += 30
        flags.push('DUPLICATE_EMAIL')
        matches.push(`Email matched ${emailDuplicates} other borrower(s)`)
      }
    }

    // Check idNumber duplication (skip if null)
    if (borrower.idNumber) {
      const idDuplicates = await prisma.borrower.count({
        where: {
          idNumber: borrower.idNumber,
          id: { not: context.borrowerId },
        },
      })
      if (idDuplicates > 0) {
        score += 100
        flags.push('DUPLICATE_ID')
        matches.push(`ID number matched ${idDuplicates} other borrower(s)`)
      }
    }

    // Cap at 100
    score = Math.min(score, 100)

    return {
      score,
      flags,
      details: matches.length > 0
        ? `Identity duplication detected: ${matches.join('; ')}`
        : 'No identity duplication detected',
    }
  },
}

// ============================================================
// Rule 3: Amount Anomaly (weight: 20)
// ============================================================

const amountAnomalyRule: FraudRule = {
  name: 'Amount Anomaly',
  weight: 20,
  check: async (context: FraudContext): Promise<FraudRuleResult> => {
    if (!context.requestedAmount) {
      return { score: 0, flags: [], details: 'No requested amount provided for analysis' }
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: context.borrowerId },
      select: { monthlyIncome: true },
    })

    if (!borrower || !borrower.monthlyIncome) {
      return {
        score: 20,
        flags: [],
        details: 'No income data available for borrower; assigning baseline score',
      }
    }

    const yearlyIncome = Number(borrower.monthlyIncome) * 12
    const ratio = context.requestedAmount / yearlyIncome
    let score = 0
    const flags: string[] = []

    if (ratio > 5) {
      score = 100
      flags.push('AMOUNT_EXTREME')
    } else if (ratio > 3) {
      score = 70
      flags.push('AMOUNT_HIGH')
    } else if (ratio > 2) {
      score = 40
    } else {
      score = 0
    }

    return {
      score,
      flags,
      details: `Requested amount is ${ratio.toFixed(2)}x yearly income (ratio threshold: >5 extreme, >3 high, >2 moderate)`,
    }
  },
}

// ============================================================
// Rule 4: Payment History (weight: 15)
// ============================================================

const paymentHistoryRule: FraudRule = {
  name: 'Payment History',
  weight: 15,
  check: async (context: FraudContext): Promise<FraudRuleResult> => {
    const defaultedCount = await prisma.loan.count({
      where: {
        borrowerId: context.borrowerId,
        status: 'DEFAULTED',
      },
    })

    let score = 0
    const flags: string[] = []

    if (defaultedCount === 0) {
      score = 0
    } else if (defaultedCount === 1) {
      score = 40
    } else if (defaultedCount === 2) {
      score = 70
    } else {
      score = 100
      flags.push('SERIAL_DEFAULTER')
    }

    return {
      score,
      flags,
      details: `Borrower has ${defaultedCount} defaulted loan(s)`,
    }
  },
}

// ============================================================
// Rule 5: Information Consistency (weight: 10)
// ============================================================

const informationConsistencyRule: FraudRule = {
  name: 'Information Consistency',
  weight: 10,
  check: async (context: FraudContext): Promise<FraudRuleResult> => {
    const borrower = await prisma.borrower.findUnique({
      where: { id: context.borrowerId },
      select: { updatedAt: true, blacklisted: true },
    })

    if (!borrower) {
      return { score: 0, flags: [], details: 'Borrower not found' }
    }

    let score = 0
    const flags: string[] = []
    const notes: string[] = []

    // Check if blacklisted
    if (borrower.blacklisted) {
      score = 100
      flags.push('BLACKLISTED')
      notes.push('Borrower is blacklisted')
      return { score, flags, details: notes.join('; ') }
    }

    // Check if profile was recently updated and has active loans
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    if (borrower.updatedAt >= sevenDaysAgo) {
      const activeLoans = await prisma.loan.count({
        where: {
          borrowerId: context.borrowerId,
          status: 'ACTIVE',
        },
      })

      if (activeLoans > 0) {
        score = 60
        flags.push('RECENT_PROFILE_CHANGE')
        notes.push(`Profile updated within last 7 days with ${activeLoans} active loan(s)`)
      }
    }

    if (notes.length === 0) {
      notes.push('No consistency issues detected')
    }

    return { score, flags, details: notes.join('; ') }
  },
}

// ============================================================
// All rules
// ============================================================

const fraudRules: FraudRule[] = [
  velocityCheckRule,
  identityDuplicationRule,
  amountAnomalyRule,
  paymentHistoryRule,
  informationConsistencyRule,
]

// ============================================================
// Main Functions
// ============================================================

/**
 * Run all fraud detection rules against a borrower/loan context.
 * Creates a FraudCheck record and returns it.
 */
export async function runFraudCheck(context: FraudContext) {
  const ruleResults: { ruleName: string; weight: number; result: FraudRuleResult }[] = []

  // Run all rules
  for (const rule of fraudRules) {
    const result = await rule.check(context)
    ruleResults.push({
      ruleName: rule.name,
      weight: rule.weight,
      result,
    })
  }

  // Compute weighted score
  const totalWeight = ruleResults.reduce((sum, r) => sum + r.weight, 0)
  const weightedScore = ruleResults.reduce(
    (sum, r) => sum + (r.result.score * r.weight) / totalWeight,
    0
  )
  const riskScore = Math.round(weightedScore)

  // Collect all flags
  const allFlags: string[] = []
  for (const r of ruleResults) {
    allFlags.push(...r.result.flags)
  }

  const isSuspicious = riskScore >= 60

  // Build details object
  const detailsObj = ruleResults.map((r) => ({
    rule: r.ruleName,
    weight: r.weight,
    score: r.result.score,
    flags: r.result.flags,
    details: r.result.details,
  }))

  // Create FraudCheck record
  const fraudCheck = await prisma.fraudCheck.create({
    data: {
      borrowerId: context.borrowerId,
      loanId: context.loanId || null,
      riskScore,
      isSuspicious,
      flags: JSON.stringify(allFlags),
      details: JSON.stringify(detailsObj),
    },
    include: {
      borrower: true,
      loan: true,
    },
  })

  return fraudCheck
}

/**
 * Query FraudCheck records with optional filters.
 */
export async function getFraudChecks(filters?: {
  borrowerId?: string
  loanId?: string
  isSuspicious?: boolean
}) {
  const where: {
    borrowerId?: string
    loanId?: string
    isSuspicious?: boolean
  } = {}

  if (filters?.borrowerId) {
    where.borrowerId = filters.borrowerId
  }
  if (filters?.loanId) {
    where.loanId = filters.loanId
  }
  if (filters?.isSuspicious !== undefined) {
    where.isSuspicious = filters.isSuspicious
  }

  const fraudChecks = await prisma.fraudCheck.findMany({
    where,
    include: {
      borrower: true,
      loan: true,
    },
    orderBy: { checkedAt: 'desc' },
  })

  return fraudChecks
}

/**
 * Get a single fraud check by ID with borrower and loan relations.
 */
export async function getFraudCheckById(id: string) {
  const fraudCheck = await prisma.fraudCheck.findUnique({
    where: { id },
    include: {
      borrower: true,
      loan: true,
    },
  })

  return fraudCheck
}

/**
 * Review a fraud check. Logs an ActivityLog entry.
 * If decision is CONFIRM, also sets borrower.blacklisted = true.
 */
export async function reviewFraudCheck(
  checkId: string,
  reviewerId: string,
  decision: 'CLEAR' | 'CONFIRM'
) {
  const fraudCheck = await prisma.fraudCheck.findUnique({
    where: { id: checkId },
    select: { id: true, borrowerId: true },
  })

  if (!fraudCheck) {
    throw new Error('Fraud check not found')
  }

  // Log the review as an ActivityLog entry
  await prisma.activityLog.create({
    data: {
      userId: reviewerId,
      action: `FRAUD_REVIEW_${decision}`,
      entityType: 'FraudCheck',
      entityId: checkId,
      details: JSON.stringify({
        decision,
        borrowerId: fraudCheck.borrowerId,
        reviewedAt: new Date().toISOString(),
      }),
    },
  })

  // If CONFIRM, blacklist the borrower
  if (decision === 'CONFIRM') {
    await prisma.borrower.update({
      where: { id: fraudCheck.borrowerId },
      data: {
        blacklisted: true,
        blacklistReason: `Confirmed fraud - Fraud check ${checkId}`,
      },
    })
  }

  return { success: true, decision }
}
