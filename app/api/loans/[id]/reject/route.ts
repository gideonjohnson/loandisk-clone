import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendLoanRejectedNotification } from '@/lib/notifications/notificationService'
import { sendLoanRejectedSMS } from '@/lib/sms/smsService'
import { sendLoanRejectedEmail } from '@/lib/email/emailService'

/**
 * POST /api/loans/:id/reject
 * Reject a loan application
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { reason, comments } = body

      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          borrower: true,
          loanOfficer: true,
        },
      })

      if (!loan) {
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        )
      }

      // Check if loan can be rejected
      if (loan.status === 'REJECTED') {
        return NextResponse.json(
          { error: 'Loan is already rejected' },
          { status: 400 }
        )
      }

      if (loan.status === 'ACTIVE' || loan.status === 'PAID') {
        return NextResponse.json(
          { error: 'Cannot reject an active or paid loan', currentStatus: loan.status },
          { status: 400 }
        )
      }

      // Create rejection record
      const rejection = await prisma.loanApproval.create({
        data: {
          loanId: id,
          approvedBy: session.user.id!,
          approvalLevel: 0,
          status: 'REJECTED',
          comments: comments || reason,
          approvedAt: new Date(),
        },
      })

      // Update loan status to REJECTED
      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
        },
        include: {
          borrower: true,
          loanOfficer: true,
          approvals: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'REJECT_LOAN',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            reason,
            comments,
          }),
        },
      })

      const borrowerName = `${updatedLoan.borrower.firstName} ${updatedLoan.borrower.lastName}`

      // In-app notification
      await sendLoanRejectedNotification(
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
        reason
      )

      // SMS notification (if borrower has phone)
      if (updatedLoan.borrower.phone) {
        await sendLoanRejectedSMS(
          updatedLoan.borrower.phone,
          borrowerName,
          updatedLoan.loanNumber,
          updatedLoan.id,
          updatedLoan.borrower.id
        )
      }

      // Email notification (if borrower has email)
      if (updatedLoan.borrower.email) {
        await sendLoanRejectedEmail(
          updatedLoan.borrower.email,
          borrowerName,
          updatedLoan.loanNumber,
          reason,
          updatedLoan.id,
          updatedLoan.borrower.id
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Loan rejected successfully',
        loan: updatedLoan,
        rejection,
      })
    } catch (error) {
      console.error('Loan rejection error:', error)
      return NextResponse.json(
        { error: 'Failed to reject loan', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_REJECT],
  false
)
