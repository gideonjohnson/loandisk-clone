import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

/**
 * Report Generator Utilities
 * Generate various financial and operational reports
 */

export interface CashFlowReport {
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalDisbursements: number
    totalCollections: number
    netCashFlow: number
  }
  disbursements: {
    date: Date
    amount: number
    loanNumber: string
    borrowerName: string
  }[]
  collections: {
    date: Date
    amount: number
    loanNumber: string
    borrowerName: string
    method: string
  }[]
  monthlyBreakdown: {
    month: string
    disbursements: number
    collections: number
    netCashFlow: number
  }[]
}

export interface ProfitLossReport {
  period: {
    start: Date
    end: Date
  }
  revenue: {
    interestIncome: number
    feeIncome: number
    penaltyIncome: number
    totalRevenue: number
  }
  expenses: {
    operatingExpenses: number
    loanLosses: number
    totalExpenses: number
  }
  netProfit: number
  profitMargin: number
}

export interface PortfolioReport {
  summary: {
    totalLoans: number
    activeLoans: number
    totalDisbursed: number
    totalOutstanding: number
    totalCollected: number
    averageLoanSize: number
    averageInterestRate: number
  }
  byStatus: {
    status: string
    count: number
    amount: number
    percentage: number
  }[]
  byProduct: {
    product: string
    count: number
    amount: number
  }[]
  performanceMetrics: {
    portfolioAtRisk: number
    defaultRate: number
    collectionRate: number
  }
}

export interface AgingReport {
  current: { count: number; amount: number }
  days1to30: { count: number; amount: number }
  days31to60: { count: number; amount: number }
  days61to90: { count: number; amount: number }
  over90: { count: number; amount: number }
  loans: {
    loanNumber: string
    borrowerName: string
    dueDate: Date
    amountDue: number
    amountPaid: number
    daysOverdue: number
    status: string
  }[]
}

/**
 * Generate Cash Flow Report
 */
export async function generateCashFlowReport(
  startDate: Date,
  endDate: Date,
  branchId?: string
): Promise<CashFlowReport> {
  const where: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (branchId) {
    where.branchId = branchId
  }

  // Get disbursements
  const disbursements = await prisma.loanDisbursement.findMany({
    where: {
      disbursedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(branchId && {
        loan: {
          branchId,
        },
      }),
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: { disbursedAt: 'asc' },
  })

  // Get collections (payments)
  const collections = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      isReversed: false,
      ...(branchId && {
        loan: {
          branchId,
        },
      }),
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: { paymentDate: 'asc' },
  })

  const totalDisbursements = disbursements.reduce(
    (sum, d) => sum + Number(d.amount),
    0
  )

  const totalCollections = collections.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  )

  // Generate monthly breakdown
  const monthlyBreakdown: CashFlowReport['monthlyBreakdown'] = []
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)

    const monthDisbursements = disbursements
      .filter(
        (d) => d.disbursedAt >= monthStart && d.disbursedAt <= monthEnd
      )
      .reduce((sum, d) => sum + Number(d.amount), 0)

    const monthCollections = collections
      .filter(
        (c) => c.paymentDate >= monthStart && c.paymentDate <= monthEnd
      )
      .reduce((sum, c) => sum + Number(c.amount), 0)

    monthlyBreakdown.push({
      month: format(monthStart, 'MMM yyyy'),
      disbursements: monthDisbursements,
      collections: monthCollections,
      netCashFlow: monthCollections - monthDisbursements,
    })

    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  }

  return {
    period: {
      start: startDate,
      end: endDate,
    },
    summary: {
      totalDisbursements,
      totalCollections,
      netCashFlow: totalCollections - totalDisbursements,
    },
    disbursements: disbursements.map((d) => ({
      date: d.disbursedAt,
      amount: Number(d.amount),
      loanNumber: d.loan.loanNumber,
      borrowerName: `${d.loan.borrower.firstName} ${d.loan.borrower.lastName}`,
    })),
    collections: collections.map((c) => ({
      date: c.paymentDate,
      amount: Number(c.amount),
      loanNumber: c.loan.loanNumber,
      borrowerName: `${c.loan.borrower.firstName} ${c.loan.borrower.lastName}`,
      method: c.paymentMethod,
    })),
    monthlyBreakdown,
  }
}

/**
 * Generate Portfolio Report
 */
export async function generatePortfolioReport(
  branchId?: string
): Promise<PortfolioReport> {
  const where: any = {}

  if (branchId) {
    where.branchId = branchId
  }

  const loans = await prisma.loan.findMany({
    where,
    include: {
      payments: {
        where: { isReversed: false },
      },
      schedules: true,
    },
  })

  const totalLoans = loans.length
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE').length

  const totalDisbursed = loans.reduce(
    (sum, l) => sum + Number(l.principalAmount),
    0
  )

  let totalCollected = 0
  let totalOutstanding = 0

  loans.forEach((loan) => {
    const collected = loan.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )
    totalCollected += collected

    if (loan.status === 'ACTIVE') {
      const totalDue = loan.schedules.reduce(
        (sum, s) => sum + Number(s.totalDue),
        0
      )
      const totalPaid = loan.schedules.reduce(
        (sum, s) => sum + Number(s.totalPaid),
        0
      )
      totalOutstanding += totalDue - totalPaid
    }
  })

  const averageLoanSize = totalLoans > 0 ? totalDisbursed / totalLoans : 0
  const averageInterestRate =
    totalLoans > 0
      ? loans.reduce((sum, l) => sum + Number(l.interestRate), 0) /
        totalLoans
      : 0

  // Group by status
  const statusGroups = loans.reduce((acc, loan) => {
    if (!acc[loan.status]) {
      acc[loan.status] = { count: 0, amount: 0 }
    }
    acc[loan.status].count++
    acc[loan.status].amount += Number(loan.principalAmount)
    return acc
  }, {} as Record<string, { count: number; amount: number }>)

  const byStatus = Object.entries(statusGroups).map(([status, data]) => ({
    status,
    count: data.count,
    amount: data.amount,
    percentage: (data.count / totalLoans) * 100,
  }))

  // Group by product
  const productGroups = loans.reduce((acc, loan) => {
    const product = loan.loanProduct || 'General'
    if (!acc[product]) {
      acc[product] = { count: 0, amount: 0 }
    }
    acc[product].count++
    acc[product].amount += Number(loan.principalAmount)
    return acc
  }, {} as Record<string, { count: number; amount: number }>)

  const byProduct = Object.entries(productGroups).map(([product, data]) => ({
    product,
    count: data.count,
    amount: data.amount,
  }))

  // Calculate performance metrics
  const portfolioAtRisk = totalDisbursed > 0 ? (totalOutstanding / totalDisbursed) * 100 : 0
  const defaultedLoans = loans.filter((l) => l.status === 'DEFAULTED').length
  const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0
  const collectionRate = totalDisbursed > 0 ? (totalCollected / totalDisbursed) * 100 : 0

  return {
    summary: {
      totalLoans,
      activeLoans,
      totalDisbursed,
      totalOutstanding,
      totalCollected,
      averageLoanSize,
      averageInterestRate,
    },
    byStatus,
    byProduct,
    performanceMetrics: {
      portfolioAtRisk,
      defaultRate,
      collectionRate,
    },
  }
}

/**
 * Generate Aging Report
 */
export async function generateAgingReport(): Promise<AgingReport> {
  const today = new Date()

  // Get all unpaid schedules
  const schedules = await prisma.loanSchedule.findMany({
    where: {
      isPaid: false,
      loan: {
        status: 'ACTIVE',
      },
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
  })

  const current = { count: 0, amount: 0 }
  const days1to30 = { count: 0, amount: 0 }
  const days31to60 = { count: 0, amount: 0 }
  const days61to90 = { count: 0, amount: 0 }
  const over90 = { count: 0, amount: 0 }

  const loans: AgingReport['loans'] = []

  schedules.forEach((schedule) => {
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (today.getTime() - schedule.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    )

    const amountDue = Number(schedule.totalDue)
    const amountPaid = Number(schedule.totalPaid)
    const outstanding = amountDue - amountPaid

    if (outstanding <= 0) return

    if (daysOverdue === 0) {
      current.count++
      current.amount += outstanding
    } else if (daysOverdue <= 30) {
      days1to30.count++
      days1to30.amount += outstanding
    } else if (daysOverdue <= 60) {
      days31to60.count++
      days31to60.amount += outstanding
    } else if (daysOverdue <= 90) {
      days61to90.count++
      days61to90.amount += outstanding
    } else {
      over90.count++
      over90.amount += outstanding
    }

    loans.push({
      loanNumber: schedule.loan.loanNumber,
      borrowerName: `${schedule.loan.borrower.firstName} ${schedule.loan.borrower.lastName}`,
      dueDate: schedule.dueDate,
      amountDue,
      amountPaid,
      daysOverdue,
      status: schedule.loan.status,
    })
  })

  return {
    current,
    days1to30,
    days31to60,
    days61to90,
    over90,
    loans: loans.sort((a, b) => b.daysOverdue - a.daysOverdue),
  }
}
