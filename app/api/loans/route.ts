import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateLoan, generateLoanNumber } from '@/lib/utils/loanCalculator'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        loanOfficer: {
          select: {
            name: true,
          }
        },
        _count: {
          select: { payments: true }
        }
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Get loans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const loanNumber = generateLoanNumber()
    const startDate = new Date(body.startDate)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + body.termMonths)

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        borrowerId: body.borrowerId,
        loanOfficerId: session.user.id,
        principalAmount: body.principalAmount,
        interestRate: body.interestRate,
        termMonths: body.termMonths,
        startDate,
        endDate,
        purpose: body.purpose,
        notes: body.notes,
        status: 'PENDING',
      }
    })

    // Calculate and create loan schedule
    const calculation = calculateLoan(
      parseFloat(body.principalAmount),
      parseFloat(body.interestRate),
      parseInt(body.termMonths),
      startDate
    )

    const scheduleData = calculation.schedule.map(item => ({
      loanId: loan.id,
      dueDate: item.dueDate,
      principalDue: item.principalDue,
      interestDue: item.interestDue,
      feesDue: 0,
      totalDue: item.totalDue,
    }))

    await prisma.loanSchedule.createMany({
      data: scheduleData
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Create loan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
