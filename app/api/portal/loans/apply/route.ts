import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { checkLoanEligibility } from '@/lib/credit/creditScoringService'
import { createNotification } from '@/lib/notifications/notificationService'

/**
 * POST /api/portal/loans/apply
 * Submit a new loan application
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, amount, termMonths, purpose } = body

    // Validate required fields
    if (!productId || !amount || !termMonths) {
      return NextResponse.json(
        { error: 'Product, amount, and term are required' },
        { status: 400 }
      )
    }

    // Get borrower
    const borrower = await prisma.borrower.findUnique({
      where: { id: borrowerId },
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    if (!borrower.active) {
      return NextResponse.json(
        { error: 'Your account is not active' },
        { status: 403 }
      )
    }

    if (borrower.blacklisted) {
      return NextResponse.json(
        { error: 'Unable to process application at this time' },
        { status: 403 }
      )
    }

    // Get product
    const product = await prisma.loanProduct.findUnique({
      where: { id: productId },
    })

    if (!product || !product.active) {
      return NextResponse.json(
        { error: 'Loan product not found or not available' },
        { status: 404 }
      )
    }

    // Validate amount within product limits
    if (amount < Number(product.minAmount) || amount > Number(product.maxAmount)) {
      return NextResponse.json(
        {
          error: `Amount must be between KSh ${Number(product.minAmount).toLocaleString()} and KSh ${Number(product.maxAmount).toLocaleString()}`,
        },
        { status: 400 }
      )
    }

    // Validate term within product limits
    if (termMonths < product.minTerm || termMonths > product.maxTerm) {
      return NextResponse.json(
        {
          error: `Term must be between ${product.minTerm} and ${product.maxTerm} months`,
        },
        { status: 400 }
      )
    }

    // Run credit eligibility check
    const eligibilityResult = await checkLoanEligibility(borrowerId, productId, amount)

    if (!eligibilityResult.eligible) {
      return NextResponse.json(
        {
          success: false,
          eligible: false,
          reason: eligibilityResult.reason,
          creditReport: {
            score: eligibilityResult.creditReport.score,
            grade: eligibilityResult.creditReport.grade,
            maxRecommendedLoan: eligibilityResult.creditReport.maxRecommendedLoan,
            recommendations: eligibilityResult.creditReport.recommendations,
          },
        },
        { status: 200 }
      )
    }

    // Generate loan number
    const loanCount = await prisma.loan.count()
    const loanNumber = `LN${String(loanCount + 1).padStart(6, '0')}`

    // Calculate dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + termMonths)

    // Get a loan officer to assign (get first active one)
    const loanOfficer = await prisma.user.findFirst({
      where: {
        active: true,
        role: { in: ['LOAN_OFFICER', 'MANAGER', 'ADMIN'] },
      },
    })

    if (!loanOfficer) {
      return NextResponse.json(
        { error: 'Unable to assign loan officer. Please contact support.' },
        { status: 500 }
      )
    }

    // Calculate interest rate (base + credit adjustment)
    const adjustedInterestRate = Number(product.interestRate) + eligibilityResult.creditReport.interestRateAdjustment

    // Create loan record
    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        borrowerId,
        loanOfficerId: loanOfficer.id,
        principalAmount: amount,
        interestRate: adjustedInterestRate,
        termMonths,
        startDate,
        endDate,
        status: 'PENDING',
        purpose: purpose || null,
        loanProduct: product.name,
        requiredApprovals: 1,
      },
    })

    // Generate loan schedule
    await generateLoanSchedule(loan.id, amount, adjustedInterestRate, termMonths, product.interestType, startDate)

    // Update borrower credit score
    await prisma.borrower.update({
      where: { id: borrowerId },
      data: { creditScore: eligibilityResult.creditReport.score },
    })

    // Send notification to loan officer
    await createNotification({
      userId: loanOfficer.id,
      type: 'SYSTEM',
      category: 'LOAN',
      title: 'New Loan Application',
      message: `New loan application #${loanNumber} from ${borrower.firstName} ${borrower.lastName} for KSh ${amount.toLocaleString()}`,
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: borrowerId,
        action: 'LOAN_APPLICATION_SUBMITTED',
        entityType: 'Loan',
        entityId: loan.id,
        details: JSON.stringify({
          loanNumber,
          amount,
          termMonths,
          productId,
          creditScore: eligibilityResult.creditReport.score,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      eligible: true,
      loan: {
        id: loan.id,
        loanNumber: loan.loanNumber,
        amount,
        termMonths,
        interestRate: adjustedInterestRate,
        status: loan.status,
      },
      creditReport: {
        score: eligibilityResult.creditReport.score,
        grade: eligibilityResult.creditReport.grade,
      },
    })
  } catch (error) {
    console.error('Loan application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Generate loan repayment schedule
 */
async function generateLoanSchedule(
  loanId: string,
  principal: number,
  interestRate: number,
  termMonths: number,
  interestType: string,
  startDate: Date
) {
  const schedules = []
  const monthlyRate = interestRate / 100 / 12

  if (interestType === 'REDUCING_BALANCE') {
    // Reducing balance calculation
    const monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1)

    let remainingPrincipal = principal

    for (let i = 1; i <= termMonths; i++) {
      const interestDue = remainingPrincipal * monthlyRate
      const principalDue = monthlyPayment - interestDue
      remainingPrincipal -= principalDue

      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      schedules.push({
        loanId,
        dueDate,
        principalDue: Math.round(principalDue * 100) / 100,
        interestDue: Math.round(interestDue * 100) / 100,
        totalDue: Math.round(monthlyPayment * 100) / 100,
      })
    }
  } else {
    // Flat rate calculation
    const totalInterest = principal * (interestRate / 100) * (termMonths / 12)
    const totalAmount = principal + totalInterest
    const monthlyPayment = totalAmount / termMonths
    const monthlyPrincipal = principal / termMonths
    const monthlyInterest = totalInterest / termMonths

    for (let i = 1; i <= termMonths; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + i)

      schedules.push({
        loanId,
        dueDate,
        principalDue: Math.round(monthlyPrincipal * 100) / 100,
        interestDue: Math.round(monthlyInterest * 100) / 100,
        totalDue: Math.round(monthlyPayment * 100) / 100,
      })
    }
  }

  // Create all schedules
  await prisma.loanSchedule.createMany({
    data: schedules,
  })
}
