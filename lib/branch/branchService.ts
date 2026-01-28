/**
 * Branch Management Service
 * Handles multi-branch operations
 */

import { prisma } from '@/lib/prisma'

export interface BranchStats {
  id: string
  name: string
  code: string
  totalLoans: number
  activeLoans: number
  totalDisbursed: number
  totalCollected: number
  totalBorrowers: number
  staffCount: number
}

/**
 * Get all branches
 */
export async function getAllBranches() {
  return prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          loans: true,
        },
      },
    },
  })
}

/**
 * Get branch by ID
 */
export async function getBranchById(id: string) {
  return prisma.branch.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
        },
      },
      _count: {
        select: {
          loans: true,
        },
      },
    },
  })
}

/**
 * Create a new branch
 */
export async function createBranch(data: {
  name: string
  code: string
  address?: string
  city?: string
  phone?: string
}) {
  // Check if code already exists
  const existing = await prisma.branch.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    throw new Error('Branch code already exists')
  }

  return prisma.branch.create({
    data: {
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address,
      city: data.city,
      phone: data.phone,
      active: true,
    },
  })
}

/**
 * Update a branch
 */
export async function updateBranch(id: string, data: {
  name?: string
  address?: string
  city?: string
  phone?: string
  active?: boolean
}) {
  return prisma.branch.update({
    where: { id },
    data,
  })
}

/**
 * Get branch statistics
 */
export async function getBranchStats(branchId?: string): Promise<BranchStats[]> {
  const where = branchId ? { id: branchId } : {}

  const branches = await prisma.branch.findMany({
    where,
    include: {
      users: true,
      loans: {
        include: {
          payments: true,
        },
      },
    },
  })

  return branches.map(branch => {
    const activeLoans = branch.loans.filter(l => l.status === 'ACTIVE')
    const totalDisbursed = branch.loans
      .filter(l => l.disbursementDate)
      .reduce((sum, l) => sum + Number(l.principalAmount), 0)
    const totalCollected = branch.loans.reduce(
      (sum, l) => sum + l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0
    )
    const uniqueBorrowers = new Set(branch.loans.map(l => l.borrowerId))

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      totalLoans: branch.loans.length,
      activeLoans: activeLoans.length,
      totalDisbursed,
      totalCollected,
      totalBorrowers: uniqueBorrowers.size,
      staffCount: branch.users.length,
    }
  })
}

/**
 * Assign user to branch
 */
export async function assignUserToBranch(userId: string, branchId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { branchId },
  })
}

/**
 * Remove user from branch
 */
export async function removeUserFromBranch(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { branchId: null },
  })
}

/**
 * Get branch performance comparison
 */
export async function getBranchComparison(startDate: Date, endDate: Date) {
  const branches = await prisma.branch.findMany({
    where: { active: true },
    include: {
      loans: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          payments: {
            where: {
              paymentDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      },
    },
  })

  return branches.map(branch => {
    const disbursements = branch.loans
      .filter(l => l.disbursementDate && l.disbursementDate >= startDate && l.disbursementDate <= endDate)
      .reduce((sum, l) => sum + Number(l.principalAmount), 0)

    const collections = branch.loans.reduce(
      (sum, l) => sum + l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
      0
    )

    const newLoans = branch.loans.filter(
      l => l.createdAt >= startDate && l.createdAt <= endDate
    ).length

    return {
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      disbursements,
      collections,
      newLoans,
      collectionRate: disbursements > 0 ? (collections / disbursements) * 100 : 0,
    }
  })
}

/**
 * Transfer loan to another branch
 */
export async function transferLoan(loanId: string, toBranchId: string, userId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { branch: true },
  })

  if (!loan) {
    throw new Error('Loan not found')
  }

  const fromBranchId = loan.branchId

  // Update loan branch
  await prisma.loan.update({
    where: { id: loanId },
    data: { branchId: toBranchId },
  })

  // Log the transfer
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'LOAN_TRANSFERRED',
      entityType: 'Loan',
      entityId: loanId,
      details: JSON.stringify({
        fromBranchId,
        toBranchId,
        loanNumber: loan.loanNumber,
      }),
    },
  })

  return { success: true }
}
