/**
 * Portfolio Snapshot Service
 * Captures periodic snapshots of portfolio health metrics for trend analysis
 */

import { prisma } from '@/lib/prisma'

export async function captureSnapshot(branchId?: string) {
  const now = new Date()
  const snapshotDate = new Date(now.getFullYear(), now.getMonth(), 1) // first of month

  const branchFilter = branchId ? { branchId } : {}

  const [
    totalLoans,
    activeLoans,
    defaultedLoans,
    disbursedAgg,
    collectedAgg,
    overdueSchedules,
    newLoans,
  ] = await Promise.all([
    prisma.loan.count({ where: { ...branchFilter } }),

    prisma.loan.count({ where: { status: 'ACTIVE', ...branchFilter } }),

    prisma.loan.count({ where: { status: 'DEFAULTED', ...branchFilter } }),

    prisma.loan.aggregate({
      where: { status: { in: ['ACTIVE', 'PAID', 'COMPLETED', 'DEFAULTED'] }, ...branchFilter },
      _sum: { principalAmount: true },
    }),

    prisma.payment.aggregate({
      where: { status: 'COMPLETED', isReversed: false, loan: branchFilter },
      _sum: { amount: true },
    }),

    prisma.loanSchedule.findMany({
      where: {
        isPaid: false,
        dueDate: { lt: now },
        loan: { status: 'ACTIVE', ...branchFilter },
      },
      select: { totalDue: true, totalPaid: true },
    }),

    prisma.loan.findMany({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
        ...branchFilter,
      },
      select: { principalAmount: true },
    }),
  ])

  const totalDisbursed = Number(disbursedAgg._sum.principalAmount || 0)
  const totalCollected = Number(collectedAgg._sum.amount || 0)
  const totalOverdue = overdueSchedules.reduce(
    (sum, s) => sum + (Number(s.totalDue) - Number(s.totalPaid)),
    0
  )

  // Outstanding = sum of remaining balance on active loans
  const activeLoansData = await prisma.loan.findMany({
    where: { status: 'ACTIVE', ...branchFilter },
    select: {
      principalAmount: true,
      payments: {
        where: { status: 'COMPLETED', isReversed: false },
        select: { principalAmount: true },
      },
    },
  })

  const totalOutstanding = activeLoansData.reduce((sum, loan) => {
    const principal = Number(loan.principalAmount)
    const paid = loan.payments.reduce((s, p) => s + Number(p.principalAmount), 0)
    return sum + (principal - paid)
  }, 0)

  const portfolioAtRisk = totalDisbursed > 0 ? (totalOverdue / totalDisbursed) * 100 : 0
  const averageLoanSize = totalLoans > 0 ? totalDisbursed / totalLoans : 0
  const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0
  const collectionRate = totalDisbursed > 0 ? (totalCollected / totalDisbursed) * 100 : 0
  const newLoansCount = newLoans.length
  const newLoansAmount = newLoans.reduce((s, l) => s + Number(l.principalAmount), 0)

  return prisma.portfolioSnapshot.upsert({
    where: {
      snapshotDate_branchId: {
        snapshotDate,
        branchId: branchId || '',
      },
    },
    update: {
      totalLoans,
      activeLoans,
      totalDisbursed,
      totalOutstanding,
      totalCollected,
      totalOverdue,
      portfolioAtRisk,
      averageLoanSize,
      defaultRate,
      collectionRate,
      newLoansCount,
      newLoansAmount,
    },
    create: {
      snapshotDate,
      branchId: branchId || null,
      totalLoans,
      activeLoans,
      totalDisbursed,
      totalOutstanding,
      totalCollected,
      totalOverdue,
      portfolioAtRisk,
      averageLoanSize,
      defaultRate,
      collectionRate,
      newLoansCount,
      newLoansAmount,
    },
  })
}

export async function getSnapshotTrends(months = 12, branchId?: string) {
  const since = new Date()
  since.setMonth(since.getMonth() - months)

  return prisma.portfolioSnapshot.findMany({
    where: {
      snapshotDate: { gte: since },
      branchId: branchId || null,
    },
    orderBy: { snapshotDate: 'asc' },
  })
}
