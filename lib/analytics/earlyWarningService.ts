/**
 * Early Warning Service
 * Identifies loans and borrowers showing signs of stress
 */

import { prisma } from '@/lib/prisma'

interface Warning {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  type: string
  title: string
  description: string
  loanId?: string
  loanNumber?: string
  borrowerName?: string
}

export async function generateWarnings(): Promise<Warning[]> {
  const warnings: Warning[] = []
  const now = new Date()

  // 1. Loans with 2+ consecutive late payments
  const activeLoans = await prisma.loan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      borrower: { select: { firstName: true, lastName: true } },
      schedules: {
        where: { dueDate: { lte: now } },
        orderBy: { dueDate: 'desc' },
        take: 3,
        select: { isPaid: true, lateDays: true, dueDate: true },
      },
    },
  })

  for (const loan of activeLoans) {
    const recentSchedules = loan.schedules
    const consecutiveLate = recentSchedules.filter((s) => s.lateDays > 5 || !s.isPaid)

    if (consecutiveLate.length >= 2) {
      warnings.push({
        id: `late-${loan.id}`,
        severity: consecutiveLate.length >= 3 ? 'CRITICAL' : 'HIGH',
        type: 'DETERIORATING_PAYMENTS',
        title: 'Deteriorating Payment Pattern',
        description: `${consecutiveLate.length} consecutive late or missed payments.`,
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      })
    }
  }

  // 2. Loans approaching maturity with high outstanding balance
  const threeMonthsOut = new Date()
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3)

  const maturingLoans = await prisma.loan.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lte: threeMonthsOut, gte: now },
    },
    include: {
      borrower: { select: { firstName: true, lastName: true } },
      schedules: { select: { isPaid: true, totalDue: true, totalPaid: true } },
    },
  })

  for (const loan of maturingLoans) {
    const totalRemaining = loan.schedules
      .filter((s) => !s.isPaid)
      .reduce((sum, s) => sum + Number(s.totalDue) - Number(s.totalPaid), 0)
    const principal = Number(loan.principalAmount)

    if (totalRemaining / principal > 0.5) {
      warnings.push({
        id: `maturity-${loan.id}`,
        severity: 'HIGH',
        type: 'APPROACHING_MATURITY',
        title: 'High Balance Near Maturity',
        description: `Loan matures by ${loan.endDate.toLocaleDateString()} with ${Math.round((totalRemaining / principal) * 100)}% balance remaining.`,
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        borrowerName: `${loan.borrower.firstName} ${loan.borrower.lastName}`,
      })
    }
  }

  // 3. Borrowers with multiple active loans showing stress
  const borrowersWithMultipleLoans = await prisma.borrower.findMany({
    where: {
      loans: { some: { status: 'ACTIVE' } },
    },
    include: {
      loans: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          loanNumber: true,
          schedules: {
            where: { isPaid: false, dueDate: { lt: now } },
            select: { totalDue: true, totalPaid: true },
          },
        },
      },
    },
  })

  for (const borrower of borrowersWithMultipleLoans) {
    if (borrower.loans.length < 2) continue
    const loansWithOverdue = borrower.loans.filter((l) => l.schedules.length > 0)
    if (loansWithOverdue.length >= 2) {
      warnings.push({
        id: `multi-stress-${borrower.id}`,
        severity: 'HIGH',
        type: 'BORROWER_STRESS',
        title: 'Multiple Loans Under Stress',
        description: `${loansWithOverdue.length} of ${borrower.loans.length} active loans have overdue payments.`,
        borrowerName: `${borrower.firstName} ${borrower.lastName}`,
      })
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return warnings
}
