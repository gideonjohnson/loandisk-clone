import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const loanId = searchParams.get('loanId')

    const borrower = await prisma.borrower.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        idNumber: true,
      }
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Get all transactions for this borrower
    const loans = await prisma.loan.findMany({
      where: {
        borrowerId: id,
        ...(loanId ? { id: loanId } : {}),
      },
      include: {
        payments: {
          where: startDate || endDate ? { paymentDate: dateFilter } : {},
          orderBy: { paymentDate: 'asc' },
        },
        schedules: {
          orderBy: { dueDate: 'asc' },
        },
        fees: {
          include: { fee: true },
        },
        penalties: true,
        disbursement: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Build statement transactions
    interface StatementTransaction {
      date: Date
      type: 'DISBURSEMENT' | 'PAYMENT' | 'FEE' | 'PENALTY' | 'INTEREST_ACCRUED'
      description: string
      debit: number
      credit: number
      balance: number
      loanNumber: string
      reference?: string
    }

    const transactions: StatementTransaction[] = []
    let runningBalance = 0

    for (const loan of loans) {
      // Add disbursement
      if (loan.disbursement) {
        const amount = Number(loan.principalAmount)
        runningBalance += amount
        transactions.push({
          date: loan.disbursement.disbursedAt,
          type: 'DISBURSEMENT',
          description: `Loan disbursement - ${loan.loanNumber}`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          loanNumber: loan.loanNumber,
          reference: loan.disbursement.referenceNumber || undefined,
        })
      }

      // Add fees
      for (const loanFee of loan.fees) {
        const amount = Number(loanFee.amount)
        runningBalance += amount
        transactions.push({
          date: loanFee.createdAt,
          type: 'FEE',
          description: `${loanFee.fee.name} - ${loan.loanNumber}`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          loanNumber: loan.loanNumber,
        })
      }

      // Add penalties
      for (const penalty of loan.penalties) {
        const amount = Number(penalty.amount)
        runningBalance += amount
        transactions.push({
          date: penalty.appliedDate,
          type: 'PENALTY',
          description: `Late penalty - ${loan.loanNumber}`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          loanNumber: loan.loanNumber,
        })
      }

      // Add payments
      for (const payment of loan.payments) {
        if (payment.isReversed) continue
        const amount = Number(payment.amount)
        runningBalance -= amount
        transactions.push({
          date: payment.paymentDate,
          type: 'PAYMENT',
          description: `Payment received - ${loan.loanNumber}`,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          loanNumber: loan.loanNumber,
          reference: payment.receiptNumber,
        })
      }
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Recalculate running balance after sorting
    let balance = 0
    for (const tx of transactions) {
      balance += tx.debit - tx.credit
      tx.balance = balance
    }

    // Calculate summary
    const totalDisbursed = transactions
      .filter(t => t.type === 'DISBURSEMENT')
      .reduce((sum, t) => sum + t.debit, 0)

    const totalPayments = transactions
      .filter(t => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.credit, 0)

    const totalFees = transactions
      .filter(t => t.type === 'FEE')
      .reduce((sum, t) => sum + t.debit, 0)

    const totalPenalties = transactions
      .filter(t => t.type === 'PENALTY')
      .reduce((sum, t) => sum + t.debit, 0)

    const outstandingBalance = balance

    return NextResponse.json({
      borrower,
      statement: {
        generatedAt: new Date().toISOString(),
        periodStart: startDate || null,
        periodEnd: endDate || null,
        transactions,
        summary: {
          totalDisbursed,
          totalPayments,
          totalFees,
          totalPenalties,
          outstandingBalance,
          totalTransactions: transactions.length,
        },
      },
    })
  } catch (error) {
    console.error('Error generating statement:', error)
    return NextResponse.json({ error: 'Failed to generate statement' }, { status: 500 })
  }
}
