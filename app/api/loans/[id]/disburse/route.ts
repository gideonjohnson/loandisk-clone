import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { applyDisbursementFees } from '@/lib/fees/disbursementFeeService'
import { sendLoanDisbursedNotification } from '@/lib/notifications/notificationService'
import { sendLoanDisbursedSMS } from '@/lib/sms/smsService'
import { sendLoanDisbursedEmail } from '@/lib/email/emailService'
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rateLimit'

/**
 * POST /api/loans/:id/disburse
 * Disburse an approved loan
 */
const handler = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const {
        disbursementMethod,
        referenceNumber,
        bankDetails,
        disbursedAt,
        amount,
      } = body

      if (!disbursementMethod) {
        return NextResponse.json(
          { error: 'Disbursement method is required' },
          { status: 400 }
        )
      }

      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          borrower: true,
          loanOfficer: true,
          disbursement: true,
        },
      })

      if (!loan) {
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        )
      }

      // Check if loan is approved
      if (loan.status !== 'APPROVED') {
        return NextResponse.json(
          {
            error: 'Only approved loans can be disbursed',
            currentStatus: loan.status,
          },
          { status: 400 }
        )
      }

      // Check if already disbursed
      if (loan.disbursement) {
        return NextResponse.json(
          { error: 'Loan has already been disbursed' },
          { status: 400 }
        )
      }

      // Validate disbursement method
      const validMethods = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'M_PESA', 'AIRTEL_MONEY', 'CHECK']
      if (!validMethods.includes(disbursementMethod)) {
        return NextResponse.json(
          { error: 'Invalid disbursement method', validMethods },
          { status: 400 }
        )
      }

      const disbursementAmount = amount || loan.principalAmount

      // Create disbursement record
      const disbursement = await prisma.loanDisbursement.create({
        data: {
          loanId: id,
          amount: disbursementAmount,
          disbursedBy: session.user.id!,
          disbursementMethod,
          referenceNumber: referenceNumber || null,
          bankDetails: bankDetails || null,
          disbursedAt: disbursedAt ? new Date(disbursedAt) : new Date(),
        },
      })

      // Update loan status to ACTIVE
      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          disbursementDate: disbursement.disbursedAt,
        },
        include: {
          borrower: true,
          loanOfficer: true,
          disbursement: {
            include: {
              disbursedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          schedules: true,
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'DISBURSE_LOAN',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            amount: disbursementAmount.toString(),
            method: disbursementMethod,
            referenceNumber,
          }),
        },
      })

      // Apply processing fees
      const appliedFees = await applyDisbursementFees(
        id,
        Number(disbursementAmount),
        session.user.id!
      )

      const borrowerName = `${updatedLoan.borrower.firstName} ${updatedLoan.borrower.lastName}`
      const disbursedAmount = Number(disbursementAmount)

      // In-app notification
      await sendLoanDisbursedNotification(
        {
          id: updatedLoan.id,
          loanNumber: updatedLoan.loanNumber,
          principalAmount: Number(updatedLoan.principalAmount),
        },
        {
          id: updatedLoan.borrower.id,
          firstName: updatedLoan.borrower.firstName,
          lastName: updatedLoan.borrower.lastName,
        },
        {
          id: updatedLoan.loanOfficer.id,
          name: updatedLoan.loanOfficer.name,
        },
        disbursementAmount
      )

      // SMS notification (if borrower has phone)
      if (updatedLoan.borrower.phone) {
        await sendLoanDisbursedSMS(
          updatedLoan.borrower.phone,
          borrowerName,
          disbursedAmount,
          updatedLoan.loanNumber,
          updatedLoan.id,
          updatedLoan.borrower.id
        )
      }

      // Email notification (if borrower has email)
      if (updatedLoan.borrower.email) {
        // Get first payment date from schedule
        const firstSchedule = updatedLoan.schedules?.[0]
        const firstPaymentDate = firstSchedule?.dueDate || new Date()

        await sendLoanDisbursedEmail(
          updatedLoan.borrower.email,
          borrowerName,
          disbursedAmount,
          updatedLoan.loanNumber,
          disbursementMethod,
          firstPaymentDate,
          updatedLoan.id,
          updatedLoan.borrower.id
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Loan disbursed successfully',
        loan: updatedLoan,
        disbursement,
        appliedFees,
      })
    } catch (error) {
      console.error('Loan disbursement error:', error)
      return NextResponse.json(
        {
          error: 'Failed to disburse loan',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_DISBURSE],
  false
)

export const POST = withRateLimit(handler, RATE_LIMITS.SENSITIVE)
