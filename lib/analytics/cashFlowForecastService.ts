/**
 * Cash Flow Forecast Service
 * Projects future cash flows based on loan schedules and historical data
 */

import { prisma } from '@/lib/prisma'

interface MonthlyForecast {
  month: string // YYYY-MM
  expectedCollections: number
  optimisticCollections: number
  pessimisticCollections: number
  expectedDisbursements: number
  netCashFlow: number
}

export async function forecastCashFlow(months = 6): Promise<MonthlyForecast[]> {
  const now = new Date()

  // Get historical collection rate (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [scheduledTotal, collectedTotal] = await Promise.all([
    prisma.loanSchedule.aggregate({
      where: {
        dueDate: { gte: sixMonthsAgo, lte: now },
        loan: { status: { in: ['ACTIVE', 'PAID', 'COMPLETED'] } },
      },
      _sum: { totalDue: true },
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: { gte: sixMonthsAgo, lte: now },
        status: 'COMPLETED',
        isReversed: false,
      },
      _sum: { amount: true },
    }),
  ])

  const totalScheduled = Number(scheduledTotal._sum.totalDue || 0)
  const totalCollected = Number(collectedTotal._sum.amount || 0)
  const historicalCollectionRate = totalScheduled > 0 ? totalCollected / totalScheduled : 0.85

  // Get average monthly disbursements (last 6 months)
  const disbursements = await prisma.loan.aggregate({
    where: {
      disbursementDate: { gte: sixMonthsAgo, lte: now },
      status: { in: ['ACTIVE', 'PAID', 'COMPLETED'] },
    },
    _sum: { principalAmount: true },
    _count: true,
  })

  const avgMonthlyDisbursement = Number(disbursements._sum.principalAmount || 0) / 6

  const forecasts: MonthlyForecast[] = []

  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const monthLabel = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`

    // Get scheduled payments for this month
    const scheduled = await prisma.loanSchedule.aggregate({
      where: {
        dueDate: { gte: forecastDate, lte: endDate },
        isPaid: false,
        loan: { status: 'ACTIVE' },
      },
      _sum: { totalDue: true },
    })

    const scheduledAmount = Number(scheduled._sum.totalDue || 0)

    const expectedCollections = scheduledAmount * historicalCollectionRate
    const optimisticCollections = scheduledAmount * Math.min(1, historicalCollectionRate * 1.1)
    const pessimisticCollections = scheduledAmount * historicalCollectionRate * 0.8

    forecasts.push({
      month: monthLabel,
      expectedCollections: Math.round(expectedCollections * 100) / 100,
      optimisticCollections: Math.round(optimisticCollections * 100) / 100,
      pessimisticCollections: Math.round(pessimisticCollections * 100) / 100,
      expectedDisbursements: Math.round(avgMonthlyDisbursement * 100) / 100,
      netCashFlow: Math.round((expectedCollections - avgMonthlyDisbursement) * 100) / 100,
    })
  }

  return forecasts
}
