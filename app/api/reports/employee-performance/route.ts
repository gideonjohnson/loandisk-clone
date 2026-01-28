import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface EmployeePerformance {
  id: string
  name: string
  email: string
  role: string
  branch: string | null
  loansManaged: number
  activeLoans: number
  totalDisbursed: number
  totalCollected: number
  interestEarned: number
  feesEarned: number
  penaltiesEarned: number
  totalIncome: number
  defaultedLoans: number
  defaultedAmount: number
  collectionRate: number
  averageLoanSize: number
  newBorrowers: number
  commission: number
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const branchId = searchParams.get('branchId')
    const commissionRate = parseFloat(searchParams.get('commissionRate') || '2') / 100 // Default 2%

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Default to current month if no dates
    if (!startDate && !endDate) {
      const now = new Date()
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter.lte = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Get all loan officers
    const users = await prisma.user.findMany({
      where: {
        active: true,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        branch: true,
        loans: {
          where: {
            createdAt: dateFilter,
          },
          include: {
            payments: {
              where: {
                isReversed: false,
                paymentDate: dateFilter,
              },
            },
            schedules: true,
            fees: {
              where: { isPaid: true },
            },
            penalties: {
              where: { isPaid: true },
            },
            disbursement: true,
            borrower: true,
          },
        },
        payments: {
          where: {
            isReversed: false,
            paymentDate: dateFilter,
          },
        },
      },
    })

    const employees: EmployeePerformance[] = []

    for (const user of users) {
      const loans = user.loans
      const activeLoans = loans.filter(l => l.status === 'ACTIVE').length
      const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED')

      // Calculate total disbursed
      const totalDisbursed = loans
        .filter(l => l.disbursement)
        .reduce((sum, l) => sum + Number(l.disbursement!.amount), 0)

      // Calculate collections (payments received by this officer)
      const totalCollected = user.payments.reduce((sum, p) => sum + Number(p.amount), 0)

      // Calculate interest earned from all loans managed by this officer
      let interestEarned = 0
      for (const loan of loans) {
        for (const payment of loan.payments) {
          interestEarned += Number(payment.interestAmount)
        }
      }

      // Calculate fees earned
      let feesEarned = 0
      for (const loan of loans) {
        for (const fee of loan.fees) {
          feesEarned += Number(fee.paidAmount)
        }
      }

      // Calculate penalties earned
      let penaltiesEarned = 0
      for (const loan of loans) {
        for (const penalty of loan.penalties) {
          penaltiesEarned += Number(penalty.paidAmount)
        }
      }

      const totalIncome = interestEarned + feesEarned + penaltiesEarned

      // Calculate defaulted amount
      let defaultedAmount = 0
      for (const loan of defaultedLoans) {
        const totalDue = loan.schedules.reduce((sum, s) => sum + Number(s.totalDue), 0)
        const totalPaid = loan.schedules.reduce((sum, s) => sum + Number(s.totalPaid), 0)
        defaultedAmount += totalDue - totalPaid
      }

      // Calculate collection rate
      const expectedCollections = loans.reduce((sum, loan) => {
        return sum + loan.schedules
          .filter(s => new Date(s.dueDate) <= (dateFilter.lte || new Date()))
          .reduce((ssum, s) => ssum + Number(s.totalDue), 0)
      }, 0)
      const collectionRate = expectedCollections > 0
        ? (totalCollected / expectedCollections) * 100
        : 0

      // Average loan size
      const averageLoanSize = loans.length > 0
        ? totalDisbursed / loans.length
        : 0

      // Count unique new borrowers
      const borrowerIds = new Set(loans.map(l => l.borrowerId))
      const newBorrowers = borrowerIds.size

      // Calculate commission (based on collections)
      const commission = totalCollected * commissionRate

      employees.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch?.name || null,
        loansManaged: loans.length,
        activeLoans,
        totalDisbursed,
        totalCollected,
        interestEarned,
        feesEarned,
        penaltiesEarned,
        totalIncome,
        defaultedLoans: defaultedLoans.length,
        defaultedAmount,
        collectionRate: Math.min(100, collectionRate),
        averageLoanSize,
        newBorrowers,
        commission,
      })
    }

    // Sort by total income descending
    employees.sort((a, b) => b.totalIncome - a.totalIncome)

    // Calculate team totals
    const teamTotals = employees.reduce(
      (acc, e) => ({
        loansManaged: acc.loansManaged + e.loansManaged,
        activeLoans: acc.activeLoans + e.activeLoans,
        totalDisbursed: acc.totalDisbursed + e.totalDisbursed,
        totalCollected: acc.totalCollected + e.totalCollected,
        interestEarned: acc.interestEarned + e.interestEarned,
        feesEarned: acc.feesEarned + e.feesEarned,
        penaltiesEarned: acc.penaltiesEarned + e.penaltiesEarned,
        totalIncome: acc.totalIncome + e.totalIncome,
        defaultedLoans: acc.defaultedLoans + e.defaultedLoans,
        defaultedAmount: acc.defaultedAmount + e.defaultedAmount,
        newBorrowers: acc.newBorrowers + e.newBorrowers,
        commission: acc.commission + e.commission,
      }),
      {
        loansManaged: 0,
        activeLoans: 0,
        totalDisbursed: 0,
        totalCollected: 0,
        interestEarned: 0,
        feesEarned: 0,
        penaltiesEarned: 0,
        totalIncome: 0,
        defaultedLoans: 0,
        defaultedAmount: 0,
        newBorrowers: 0,
        commission: 0,
      }
    )

    // Get branches for filter
    const branches = await prisma.branch.findMany({
      where: { active: true },
      select: { id: true, name: true },
    })

    return NextResponse.json({
      startDate: dateFilter.gte?.toISOString(),
      endDate: dateFilter.lte?.toISOString(),
      branchId,
      commissionRate: commissionRate * 100,
      employees,
      teamTotals,
      branches,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating employee performance report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
