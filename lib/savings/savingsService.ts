/**
 * Savings Account Service
 * Handles savings account operations including deposits, withdrawals, and interest calculations
 */

import { prisma } from '@/lib/prisma'

export interface CreateAccountParams {
  borrowerId: string
  accountType: 'SAVINGS' | 'FIXED_DEPOSIT' | 'CURRENT'
  interestRate?: number
  initialDeposit?: number
}

export interface TransactionParams {
  accountId: string
  amount: number
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE' | 'TRANSFER'
  description?: string
  performedBy: string
}

/**
 * Generate unique account number
 */
function generateAccountNumber(): string {
  const prefix = 'SAV'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}${timestamp}${random}`
}

/**
 * Create a new savings account
 */
export async function createSavingsAccount(params: CreateAccountParams) {
  const accountNumber = generateAccountNumber()

  const account = await prisma.account.create({
    data: {
      accountNumber,
      borrowerId: params.borrowerId,
      accountType: params.accountType,
      balance: params.initialDeposit || 0,
      interestRate: params.interestRate || 0,
      active: true,
    },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  })

  // Record initial deposit transaction if provided
  if (params.initialDeposit && params.initialDeposit > 0) {
    await prisma.transaction.create({
      data: {
        accountId: account.id,
        type: 'DEPOSIT',
        amount: params.initialDeposit,
        balance: params.initialDeposit,
        description: 'Initial deposit',
        transactionDate: new Date(),
      },
    })
  }

  return account
}

/**
 * Get account by ID
 */
export async function getAccountById(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      transactions: {
        orderBy: { transactionDate: 'desc' },
        take: 10,
      },
    },
  })
}

/**
 * Get accounts for a borrower
 */
export async function getBorrowerAccounts(borrowerId: string) {
  return prisma.account.findMany({
    where: { borrowerId },
    include: {
      transactions: {
        orderBy: { transactionDate: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all accounts with optional filters
 */
export async function getAllAccounts(params?: {
  accountType?: string
  active?: boolean
  limit?: number
  offset?: number
}) {
  const where: any = {}

  if (params?.accountType) {
    where.accountType = params.accountType
  }

  if (params?.active !== undefined) {
    where.active = params.active
  }

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      include: {
        borrower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: params?.limit || 50,
      skip: params?.offset || 0,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.account.count({ where }),
  ])

  return { accounts, total }
}

/**
 * Deposit funds into an account
 */
export async function deposit(params: TransactionParams) {
  const account = await prisma.account.findUnique({
    where: { id: params.accountId },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  if (!account.active) {
    throw new Error('Account is inactive')
  }

  const newBalance = Number(account.balance) + params.amount

  // Update account balance and create transaction
  const [updatedAccount, transaction] = await prisma.$transaction([
    prisma.account.update({
      where: { id: params.accountId },
      data: { balance: newBalance },
    }),
    prisma.transaction.create({
      data: {
        accountId: params.accountId,
        type: 'DEPOSIT',
        amount: params.amount,
        balance: newBalance,
        description: params.description || 'Deposit',
        transactionDate: new Date(),
      },
    }),
  ])

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: params.performedBy,
      action: 'ACCOUNT_DEPOSIT',
      entityType: 'Account',
      entityId: params.accountId,
      details: JSON.stringify({
        accountNumber: account.accountNumber,
        amount: params.amount,
        newBalance,
      }),
    },
  })

  return { account: updatedAccount, transaction }
}

/**
 * Withdraw funds from an account
 */
export async function withdraw(params: TransactionParams) {
  const account = await prisma.account.findUnique({
    where: { id: params.accountId },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  if (!account.active) {
    throw new Error('Account is inactive')
  }

  const currentBalance = Number(account.balance)

  if (params.amount > currentBalance) {
    throw new Error('Insufficient funds')
  }

  const newBalance = currentBalance - params.amount

  // Update account balance and create transaction
  const [updatedAccount, transaction] = await prisma.$transaction([
    prisma.account.update({
      where: { id: params.accountId },
      data: { balance: newBalance },
    }),
    prisma.transaction.create({
      data: {
        accountId: params.accountId,
        type: 'WITHDRAWAL',
        amount: -params.amount, // Negative for withdrawals
        balance: newBalance,
        description: params.description || 'Withdrawal',
        transactionDate: new Date(),
      },
    }),
  ])

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: params.performedBy,
      action: 'ACCOUNT_WITHDRAWAL',
      entityType: 'Account',
      entityId: params.accountId,
      details: JSON.stringify({
        accountNumber: account.accountNumber,
        amount: params.amount,
        newBalance,
      }),
    },
  })

  return { account: updatedAccount, transaction }
}

/**
 * Get account transactions
 */
export async function getAccountTransactions(
  accountId: string,
  limit: number = 50,
  offset: number = 0
) {
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { accountId },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.transaction.count({ where: { accountId } }),
  ])

  return { transactions, total }
}

/**
 * Calculate and apply interest to savings accounts
 */
export async function applyMonthlyInterest() {
  const accounts = await prisma.account.findMany({
    where: {
      active: true,
      interestRate: { gt: 0 },
    },
  })

  const results = []

  for (const account of accounts) {
    const balance = Number(account.balance)
    const monthlyRate = Number(account.interestRate) / 12 / 100
    const interest = balance * monthlyRate

    if (interest > 0) {
      const newBalance = balance + interest

      await prisma.$transaction([
        prisma.account.update({
          where: { id: account.id },
          data: { balance: newBalance },
        }),
        prisma.transaction.create({
          data: {
            accountId: account.id,
            type: 'INTEREST',
            amount: interest,
            balance: newBalance,
            description: `Monthly interest at ${account.interestRate}%`,
            transactionDate: new Date(),
          },
        }),
      ])

      results.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        interest,
        newBalance,
      })
    }
  }

  return results
}

/**
 * Get account statement
 */
export async function getAccountStatement(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      borrower: true,
    },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      transactionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { transactionDate: 'asc' },
  })

  // Calculate opening balance (balance before start date)
  const priorTransactions = await prisma.transaction.findMany({
    where: {
      accountId,
      transactionDate: { lt: startDate },
    },
    orderBy: { transactionDate: 'desc' },
    take: 1,
  })

  const openingBalance = priorTransactions[0]?.balance || 0
  const closingBalance = transactions[transactions.length - 1]?.balance || Number(account.balance)

  const totalDeposits = transactions
    .filter(t => t.type === 'DEPOSIT' || t.type === 'INTEREST')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const totalWithdrawals = transactions
    .filter(t => t.type === 'WITHDRAWAL' || t.type === 'FEE')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  return {
    account: {
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      borrowerName: `${account.borrower.firstName} ${account.borrower.lastName}`,
    },
    period: { startDate, endDate },
    openingBalance: Number(openingBalance),
    closingBalance: Number(closingBalance),
    totalDeposits,
    totalWithdrawals,
    transactions: transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      balance: Number(t.balance),
    })),
  }
}

/**
 * Close an account
 */
export async function closeAccount(accountId: string, performedBy: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  if (Number(account.balance) > 0) {
    throw new Error('Cannot close account with positive balance. Please withdraw all funds first.')
  }

  const updatedAccount = await prisma.account.update({
    where: { id: accountId },
    data: { active: false },
  })

  await prisma.activityLog.create({
    data: {
      userId: performedBy,
      action: 'ACCOUNT_CLOSED',
      entityType: 'Account',
      entityId: accountId,
      details: JSON.stringify({
        accountNumber: account.accountNumber,
      }),
    },
  })

  return updatedAccount
}
