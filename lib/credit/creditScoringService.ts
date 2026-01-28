/**
 * Credit Scoring Service
 * Automated credit assessment for loan applications
 */

import { prisma } from '@/lib/prisma'

interface CreditFactors {
  paymentHistory: number      // 0-100
  creditUtilization: number   // 0-100
  accountAge: number          // 0-100
  recentInquiries: number     // 0-100
  incomeStability: number     // 0-100
}

interface CreditReport {
  score: number
  grade: string
  factors: CreditFactors
  recommendations: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  maxRecommendedLoan: number
  interestRateAdjustment: number
}

/**
 * Calculate credit score for a borrower
 */
export async function calculateCreditScore(borrowerId: string): Promise<CreditReport> {
  const borrower = await prisma.borrower.findUnique({
    where: { id: borrowerId },
    include: {
      loans: {
        include: {
          payments: true,
          schedules: true,
        },
      },
    },
  })

  if (!borrower) {
    throw new Error('Borrower not found')
  }

  // Calculate individual factors
  const factors = await calculateFactors(borrower)

  // Weighted score calculation
  const weights = {
    paymentHistory: 0.35,      // Most important
    creditUtilization: 0.20,
    accountAge: 0.15,
    recentInquiries: 0.10,
    incomeStability: 0.20,
  }

  const weightedScore = Math.round(
    factors.paymentHistory * weights.paymentHistory +
    factors.creditUtilization * weights.creditUtilization +
    factors.accountAge * weights.accountAge +
    factors.recentInquiries * weights.recentInquiries +
    factors.incomeStability * weights.incomeStability
  )

  // Convert to 300-850 scale (common credit score range)
  const score = Math.round(300 + (weightedScore / 100) * 550)

  // Determine grade and risk level
  const { grade, riskLevel } = getGradeAndRisk(score)

  // Generate recommendations
  const recommendations = generateRecommendations(factors, score)

  // Calculate max recommended loan amount based on income and score
  const monthlyIncome = Number(borrower.monthlyIncome) || 0
  const maxRecommendedLoan = calculateMaxLoan(score, monthlyIncome)

  // Interest rate adjustment based on score
  const interestRateAdjustment = calculateInterestAdjustment(score)

  return {
    score,
    grade,
    factors,
    recommendations,
    riskLevel,
    maxRecommendedLoan,
    interestRateAdjustment,
  }
}

async function calculateFactors(borrower: any): Promise<CreditFactors> {
  const loans = borrower.loans || []

  // Payment History (35% weight)
  let paymentHistory = 100
  let totalPayments = 0
  let latePayments = 0

  for (const loan of loans) {
    for (const schedule of loan.schedules || []) {
      totalPayments++
      if (schedule.lateDays > 0) {
        latePayments++
        // Deduct more for longer delays
        if (schedule.lateDays > 90) paymentHistory -= 15
        else if (schedule.lateDays > 60) paymentHistory -= 10
        else if (schedule.lateDays > 30) paymentHistory -= 5
        else paymentHistory -= 2
      }
    }
  }
  paymentHistory = Math.max(0, paymentHistory)

  // Credit Utilization (existing debt vs capacity)
  let creditUtilization = 100
  const activeLoans = loans.filter((l: any) => l.status === 'ACTIVE')
  const totalDebt = activeLoans.reduce((sum: number, l: any) => sum + Number(l.principalAmount), 0)
  const monthlyIncome = Number(borrower.monthlyIncome) || 1
  const debtToIncome = totalDebt / (monthlyIncome * 12)

  if (debtToIncome > 0.5) creditUtilization = 20
  else if (debtToIncome > 0.4) creditUtilization = 40
  else if (debtToIncome > 0.3) creditUtilization = 60
  else if (debtToIncome > 0.2) creditUtilization = 80
  else creditUtilization = 100

  // Account Age (how long customer relationship)
  let accountAge = 50 // Default for new customers
  const accountAgeMonths = Math.floor(
    (Date.now() - new Date(borrower.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )
  if (accountAgeMonths >= 36) accountAge = 100
  else if (accountAgeMonths >= 24) accountAge = 85
  else if (accountAgeMonths >= 12) accountAge = 70
  else if (accountAgeMonths >= 6) accountAge = 55
  else accountAge = 40

  // Recent Inquiries (loan applications in last 6 months)
  let recentInquiries = 100
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentLoans = loans.filter(
    (l: any) => new Date(l.createdAt) > sixMonthsAgo
  ).length
  if (recentLoans >= 5) recentInquiries = 30
  else if (recentLoans >= 3) recentInquiries = 60
  else if (recentLoans >= 2) recentInquiries = 80
  else recentInquiries = 100

  // Income Stability
  let incomeStability = 50
  if (borrower.employmentStatus === 'Employed') incomeStability = 90
  else if (borrower.employmentStatus === 'Self-Employed') incomeStability = 75
  else if (borrower.employmentStatus === 'Business Owner') incomeStability = 80
  else if (borrower.employmentStatus === 'Retired') incomeStability = 70
  else incomeStability = 40

  // Boost for verified KYC
  if (borrower.kycVerified) {
    incomeStability = Math.min(100, incomeStability + 10)
  }

  return {
    paymentHistory,
    creditUtilization,
    accountAge,
    recentInquiries,
    incomeStability,
  }
}

function getGradeAndRisk(score: number): { grade: string; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' } {
  if (score >= 750) return { grade: 'A', riskLevel: 'LOW' }
  if (score >= 700) return { grade: 'B', riskLevel: 'LOW' }
  if (score >= 650) return { grade: 'C', riskLevel: 'MEDIUM' }
  if (score >= 600) return { grade: 'D', riskLevel: 'MEDIUM' }
  if (score >= 550) return { grade: 'E', riskLevel: 'HIGH' }
  return { grade: 'F', riskLevel: 'VERY_HIGH' }
}

function generateRecommendations(factors: CreditFactors, score: number): string[] {
  const recommendations: string[] = []

  if (factors.paymentHistory < 70) {
    recommendations.push('Improve payment history by paying on time')
  }
  if (factors.creditUtilization < 60) {
    recommendations.push('Reduce existing debt to improve utilization ratio')
  }
  if (factors.accountAge < 50) {
    recommendations.push('Build longer relationship with timely payments')
  }
  if (factors.recentInquiries < 70) {
    recommendations.push('Avoid multiple loan applications in short period')
  }
  if (factors.incomeStability < 70) {
    recommendations.push('Provide proof of stable income')
  }

  if (score < 600) {
    recommendations.push('Consider a smaller loan amount to start')
    recommendations.push('Provide additional collateral or guarantor')
  }

  return recommendations
}

function calculateMaxLoan(score: number, monthlyIncome: number): number {
  // Base: 3x annual income, adjusted by score
  const baseMultiplier = 3
  let scoreMultiplier = 1

  if (score >= 750) scoreMultiplier = 1.5
  else if (score >= 700) scoreMultiplier = 1.25
  else if (score >= 650) scoreMultiplier = 1.0
  else if (score >= 600) scoreMultiplier = 0.75
  else if (score >= 550) scoreMultiplier = 0.5
  else scoreMultiplier = 0.25

  return Math.round(monthlyIncome * 12 * baseMultiplier * scoreMultiplier)
}

function calculateInterestAdjustment(score: number): number {
  // Higher score = lower interest rate adjustment
  if (score >= 750) return -2.0  // 2% discount
  if (score >= 700) return -1.0  // 1% discount
  if (score >= 650) return 0     // Standard rate
  if (score >= 600) return 1.0   // 1% premium
  if (score >= 550) return 2.0   // 2% premium
  return 4.0                      // 4% premium for very low scores
}

/**
 * Update borrower's credit score in database
 */
export async function updateBorrowerCreditScore(borrowerId: string): Promise<CreditReport> {
  const report = await calculateCreditScore(borrowerId)

  await prisma.borrower.update({
    where: { id: borrowerId },
    data: { creditScore: report.score },
  })

  return report
}

/**
 * Check if borrower qualifies for a loan product
 */
export async function checkLoanEligibility(
  borrowerId: string,
  productId: string,
  requestedAmount: number
): Promise<{
  eligible: boolean
  reason?: string
  creditReport: CreditReport
}> {
  const product = await prisma.loanProduct.findUnique({
    where: { id: productId },
  })

  if (!product) {
    throw new Error('Loan product not found')
  }

  const creditReport = await calculateCreditScore(borrowerId)

  // Check minimum credit score
  if (product.minCreditScore && creditReport.score < product.minCreditScore) {
    return {
      eligible: false,
      reason: `Credit score ${creditReport.score} is below minimum required ${product.minCreditScore}`,
      creditReport,
    }
  }

  // Check amount limits
  if (requestedAmount < Number(product.minAmount)) {
    return {
      eligible: false,
      reason: `Requested amount is below minimum KSh ${Number(product.minAmount).toLocaleString()}`,
      creditReport,
    }
  }

  if (requestedAmount > Number(product.maxAmount)) {
    return {
      eligible: false,
      reason: `Requested amount exceeds maximum KSh ${Number(product.maxAmount).toLocaleString()}`,
      creditReport,
    }
  }

  // Check recommended max based on credit
  if (requestedAmount > creditReport.maxRecommendedLoan) {
    return {
      eligible: false,
      reason: `Requested amount exceeds recommended maximum KSh ${creditReport.maxRecommendedLoan.toLocaleString()} based on credit assessment`,
      creditReport,
    }
  }

  return {
    eligible: true,
    creditReport,
  }
}
