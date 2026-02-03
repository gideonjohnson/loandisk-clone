/**
 * Loan Risk Scoring Service
 * Deterministic risk scoring for individual loans based on payment patterns
 */

import { prisma } from '@/lib/prisma'

interface RiskFactors {
  daysPastDue: number
  paymentConsistency: number
  creditScore: number
  dtiRatio: number
  loanAge: number
}

function calculateRiskScore(factors: RiskFactors): { score: number; level: string } {
  let score = 0

  // Days past due (0-40 points)
  if (factors.daysPastDue > 90) score += 40
  else if (factors.daysPastDue > 60) score += 30
  else if (factors.daysPastDue > 30) score += 20
  else if (factors.daysPastDue > 0) score += 10

  // Payment consistency - ratio of on-time payments (0-25 points)
  // Lower consistency = higher risk
  score += Math.round((1 - factors.paymentConsistency) * 25)

  // Credit score (0-15 points)
  if (factors.creditScore < 500) score += 15
  else if (factors.creditScore < 600) score += 10
  else if (factors.creditScore < 700) score += 5

  // DTI ratio (0-10 points)
  if (factors.dtiRatio > 0.5) score += 10
  else if (factors.dtiRatio > 0.4) score += 7
  else if (factors.dtiRatio > 0.3) score += 4

  // Loan age - newer loans are riskier (0-10 points)
  if (factors.loanAge < 3) score += 10
  else if (factors.loanAge < 6) score += 5

  score = Math.min(100, Math.max(0, score))

  let level: string
  if (score >= 75) level = 'CRITICAL'
  else if (score >= 50) level = 'HIGH'
  else if (score >= 25) level = 'MEDIUM'
  else level = 'LOW'

  return { score, level }
}

export async function scoreLoanRisk(loanId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      borrower: { select: { creditScore: true, monthlyIncome: true } },
      schedules: {
        select: { dueDate: true, isPaid: true, paidDate: true, totalDue: true, lateDays: true },
      },
    },
  })

  if (!loan) throw new Error('Loan not found')

  const now = new Date()

  // Calculate days past due (max across all unpaid schedules)
  const overdueSchedules = loan.schedules.filter(
    (s) => !s.isPaid && new Date(s.dueDate) < now
  )
  const maxDaysPastDue = overdueSchedules.reduce((max, s) => {
    const days = Math.floor((now.getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(max, days)
  }, 0)

  // Payment consistency
  const dueSchedules = loan.schedules.filter((s) => new Date(s.dueDate) <= now)
  const onTimePayments = dueSchedules.filter((s) => s.isPaid && s.lateDays <= 5).length
  const paymentConsistency = dueSchedules.length > 0 ? onTimePayments / dueSchedules.length : 1

  // DTI ratio
  const monthlyIncome = Number(loan.borrower.monthlyIncome || 0)
  const monthlyPayment = loan.schedules.length > 0
    ? Number(loan.schedules[0].totalDue)
    : 0
  const dtiRatio = monthlyIncome > 0 ? monthlyPayment / monthlyIncome : 0.5

  // Loan age in months
  const loanAge = Math.floor(
    (now.getTime() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  const factors: RiskFactors = {
    daysPastDue: maxDaysPastDue,
    paymentConsistency,
    creditScore: loan.borrower.creditScore || 600,
    dtiRatio,
    loanAge,
  }

  const { score, level } = calculateRiskScore(factors)

  return prisma.loanRiskScore.create({
    data: {
      loanId,
      riskScore: score,
      riskLevel: level,
      factors: JSON.stringify(factors),
      predictedDefault: score >= 70,
    },
  })
}

export async function getAtRiskLoans(threshold = 50) {
  const latestScores = await prisma.loanRiskScore.findMany({
    where: { riskScore: { gte: threshold } },
    orderBy: { calculatedAt: 'desc' },
    distinct: ['loanId'],
    include: {
      loan: {
        include: {
          borrower: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 50,
  })

  return latestScores
}

export async function scoreAllActiveLoans() {
  const activeLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  })

  const results = []
  for (const loan of activeLoans) {
    try {
      const result = await scoreLoanRisk(loan.id)
      results.push(result)
    } catch (error) {
      console.error(`Failed to score loan ${loan.id}:`, error)
    }
  }

  return { scored: results.length, total: activeLoans.length }
}
