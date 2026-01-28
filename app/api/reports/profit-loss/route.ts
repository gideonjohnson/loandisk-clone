import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface PeriodData {
  period: string
  interestIncome: number
  feeIncome: number
  penaltyIncome: number
  totalIncome: number
  provisionForBadDebt: number
  writeOffs: number
  totalExpenses: number
  netProfit: number
  loansDisbursed: number
  loansCount: number
  paymentsReceived: number
  paymentsCount: number
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodType = searchParams.get('periodType') || 'monthly' // monthly, quarterly, yearly
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const branchId = searchParams.get('branchId')

    // Build branch filter
    const branchFilter = branchId ? { branchId } : {}

    // Get all payments with loan details
    const payments = await prisma.payment.findMany({
      where: {
        isReversed: false,
        paymentDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
        loan: branchFilter,
      },
      include: {
        loan: {
          select: {
            id: true,
            branchId: true,
            loanNumber: true,
          },
        },
      },
    })

    // Get all fees collected
    const loanFees = await prisma.loanFee.findMany({
      where: {
        isPaid: true,
        loan: {
          ...branchFilter,
          createdAt: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      },
      include: {
        loan: true,
      },
    })

    // Get all penalties collected
    const penalties = await prisma.penalty.findMany({
      where: {
        isPaid: true,
        loan: {
          ...branchFilter,
          createdAt: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      },
    })

    // Get disbursements
    const disbursements = await prisma.loanDisbursement.findMany({
      where: {
        disbursedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
        loan: branchFilter,
      },
      include: {
        loan: true,
      },
    })

    // Get defaulted loans for bad debt provisions
    const defaultedLoans = await prisma.loan.findMany({
      where: {
        status: 'DEFAULTED',
        ...branchFilter,
        updatedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      include: {
        schedules: true,
      },
    })

    // Helper to get period key
    const getPeriodKey = (date: Date): string => {
      const month = date.getMonth()
      const quarter = Math.floor(month / 3) + 1

      switch (periodType) {
        case 'quarterly':
          return `Q${quarter} ${year}`
        case 'yearly':
          return `${year}`
        default: // monthly
          return date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      }
    }

    // Initialize periods
    const periodsMap = new Map<string, PeriodData>()

    const initPeriod = (key: string): PeriodData => ({
      period: key,
      interestIncome: 0,
      feeIncome: 0,
      penaltyIncome: 0,
      totalIncome: 0,
      provisionForBadDebt: 0,
      writeOffs: 0,
      totalExpenses: 0,
      netProfit: 0,
      loansDisbursed: 0,
      loansCount: 0,
      paymentsReceived: 0,
      paymentsCount: 0,
    })

    // Generate all periods for the year
    if (periodType === 'yearly') {
      periodsMap.set(`${year}`, initPeriod(`${year}`))
    } else if (periodType === 'quarterly') {
      for (let q = 1; q <= 4; q++) {
        periodsMap.set(`Q${q} ${year}`, initPeriod(`Q${q} ${year}`))
      }
    } else {
      for (let m = 0; m < 12; m++) {
        const date = new Date(year, m, 1)
        const key = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        periodsMap.set(key, initPeriod(key))
      }
    }

    // Process payments (interest income)
    for (const payment of payments) {
      const periodKey = getPeriodKey(new Date(payment.paymentDate))
      const period = periodsMap.get(periodKey)
      if (period) {
        period.interestIncome += Number(payment.interestAmount)
        period.paymentsReceived += Number(payment.amount)
        period.paymentsCount++
      }
    }

    // Process fees
    for (const loanFee of loanFees) {
      const periodKey = getPeriodKey(new Date(loanFee.createdAt))
      const period = periodsMap.get(periodKey)
      if (period) {
        period.feeIncome += Number(loanFee.paidAmount)
      }
    }

    // Process penalties
    for (const penalty of penalties) {
      const periodKey = getPeriodKey(new Date(penalty.appliedDate))
      const period = periodsMap.get(periodKey)
      if (period) {
        period.penaltyIncome += Number(penalty.paidAmount)
      }
    }

    // Process disbursements
    for (const disbursement of disbursements) {
      const periodKey = getPeriodKey(new Date(disbursement.disbursedAt))
      const period = periodsMap.get(periodKey)
      if (period) {
        period.loansDisbursed += Number(disbursement.amount)
        period.loansCount++
      }
    }

    // Process bad debt provisions (defaulted loans)
    for (const loan of defaultedLoans) {
      const periodKey = getPeriodKey(new Date(loan.updatedAt))
      const period = periodsMap.get(periodKey)
      if (period) {
        // Outstanding balance on defaulted loans
        const totalDue = loan.schedules.reduce((sum, s) => sum + Number(s.totalDue), 0)
        const totalPaid = loan.schedules.reduce((sum, s) => sum + Number(s.totalPaid), 0)
        period.provisionForBadDebt += totalDue - totalPaid
      }
    }

    // Calculate totals for each period
    const periods: PeriodData[] = []
    for (const [, period] of periodsMap) {
      period.totalIncome = period.interestIncome + period.feeIncome + period.penaltyIncome
      period.totalExpenses = period.provisionForBadDebt + period.writeOffs
      period.netProfit = period.totalIncome - period.totalExpenses
      periods.push(period)
    }

    // Sort periods chronologically
    periods.sort((a, b) => {
      if (periodType === 'yearly') return 0
      if (periodType === 'quarterly') {
        return a.period.localeCompare(b.period)
      }
      return new Date(a.period).getTime() - new Date(b.period).getTime()
    })

    // Calculate grand totals
    const totals = periods.reduce(
      (acc, p) => ({
        interestIncome: acc.interestIncome + p.interestIncome,
        feeIncome: acc.feeIncome + p.feeIncome,
        penaltyIncome: acc.penaltyIncome + p.penaltyIncome,
        totalIncome: acc.totalIncome + p.totalIncome,
        provisionForBadDebt: acc.provisionForBadDebt + p.provisionForBadDebt,
        writeOffs: acc.writeOffs + p.writeOffs,
        totalExpenses: acc.totalExpenses + p.totalExpenses,
        netProfit: acc.netProfit + p.netProfit,
        loansDisbursed: acc.loansDisbursed + p.loansDisbursed,
        loansCount: acc.loansCount + p.loansCount,
        paymentsReceived: acc.paymentsReceived + p.paymentsReceived,
        paymentsCount: acc.paymentsCount + p.paymentsCount,
      }),
      {
        interestIncome: 0,
        feeIncome: 0,
        penaltyIncome: 0,
        totalIncome: 0,
        provisionForBadDebt: 0,
        writeOffs: 0,
        totalExpenses: 0,
        netProfit: 0,
        loansDisbursed: 0,
        loansCount: 0,
        paymentsReceived: 0,
        paymentsCount: 0,
      }
    )

    // Get branches for filter
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, name: true },
    })

    return NextResponse.json({
      year,
      periodType,
      branchId,
      periods,
      totals,
      branches,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating P&L report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
