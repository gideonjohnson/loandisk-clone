import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateLoan, generateLoanNumber } from '@/lib/utils/loanCalculator'
import { runFraudCheck } from '@/lib/fraud/fraudDetectionService'
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rateLimit'

async function getHandler() {
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
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function postHandler(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const loanNumber = generateLoanNumber()
    const startDate = new Date(body.startDate)
    const termUnit = body.termUnit || 'months'
    const termValue = parseInt(body.termMonths)

    // Calculate end date based on term unit
    const endDate = new Date(startDate)
    switch (termUnit) {
      case 'days':   endDate.setDate(endDate.getDate() + termValue); break
      case 'weeks':  endDate.setDate(endDate.getDate() + termValue * 7); break
      case 'years':  endDate.setFullYear(endDate.getFullYear() + termValue); break
      default:       endDate.setMonth(endDate.getMonth() + termValue)
    }

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        borrowerId: body.borrowerId,
        loanOfficerId: session.user.id,
        principalAmount: body.principalAmount,
        interestRate: body.interestRate,
        termMonths: termValue,
        termUnit,
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
      termValue,
      startDate,
      termUnit
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

    // Run fraud detection check in the background
    try {
      const fraudResult = await runFraudCheck({
        borrowerId: body.borrowerId,
        loanId: loan.id,
        amount: parseFloat(body.principalAmount),
      })
      if (fraudResult.isSuspicious) {
        return NextResponse.json({
          ...loan,
          fraudAlert: {
            riskScore: fraudResult.riskScore,
            flags: fraudResult.flags,
            message: 'Fraud check flagged this loan application for review',
          },
        })
      }
    } catch (e) {
      console.error('Fraud check failed (non-blocking):', e)
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Create loan error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export const GET = withRateLimit(getHandler, RATE_LIMITS.READ)
export const POST = withRateLimit(postHandler, RATE_LIMITS.WRITE)
