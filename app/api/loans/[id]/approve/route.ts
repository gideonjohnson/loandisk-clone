import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendLoanApprovedNotification } from '@/lib/notifications/notificationService'
import { sendLoanApprovedSMS } from '@/lib/sms/smsService'
import { sendLoanApprovedEmail } from '@/lib/email/emailService'

/**
 * POST /api/loans/:id/approve
 * Approve a loan application
 */
export const POST = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params
      const body = await request.json()
      const { comments, approvalLevel } = body

      // Get the loan
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          borrower: true,
          loanOfficer: true,
          approvals: true,
        },
      })

      if (!loan) {
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        )
      }

      // Check if loan is in PENDING status
      if (loan.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'Only pending loans can be approved', currentStatus: loan.status },
          { status: 400 }
        )
      }

      // Determine the approval level (default to current + 1)
      const currentApprovalLevel = loan.approvalLevel || 0
      const newApprovalLevel = approvalLevel || currentApprovalLevel + 1

      // Create approval record
      const approval = await prisma.loanApproval.create({
        data: {
          loanId: id,
          approvedBy: session.user.id!,
          approvalLevel: newApprovalLevel,
          status: 'APPROVED',
          comments: comments || null,
          approvedAt: new Date(),
        },
      })

      // Check if all required approvals are met
      const allApprovals = await prisma.loanApproval.findMany({
        where: { loanId: id, status: 'APPROVED' },
      })

      const requiredApprovals = loan.requiredApprovals || 1
      const shouldFullyApprove = allApprovals.length >= requiredApprovals

      // Update loan status
      const updatedLoan = await prisma.loan.update({
        where: { id },
        data: {
          approvalLevel: newApprovalLevel,
          status: shouldFullyApprove ? 'APPROVED' : 'PENDING',
          approvalDate: shouldFullyApprove ? new Date() : null,
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
          action: 'APPROVE_LOAN',
          entityType: 'Loan',
          entityId: id,
          details: JSON.stringify({
            loanNumber: loan.loanNumber,
            approvalLevel: newApprovalLevel,
            fullyApproved: shouldFullyApprove,
            comments,
          }),
        },
      })

      // Send notifications when loan is fully approved
      if (shouldFullyApprove) {
        const borrowerName = `${updatedLoan.borrower.firstName} ${updatedLoan.borrower.lastName}`
        const amount = Number(updatedLoan.principalAmount)

        // In-app notification
        await sendLoanApprovedNotification(
          {
            id: updatedLoan.id,
            loanNumber: updatedLoan.loanNumber,
            principalAmount: amount,
          },
          {
            id: updatedLoan.borrower.id,
            firstName: updatedLoan.borrower.firstName,
            lastName: updatedLoan.borrower.lastName,
          },
          {
            id: updatedLoan.loanOfficer.id,
            name: updatedLoan.loanOfficer.name,
          }
        )

        // SMS notification (if borrower has phone)
        if (updatedLoan.borrower.phone) {
          await sendLoanApprovedSMS(
            updatedLoan.borrower.phone,
            borrowerName,
            amount,
            updatedLoan.loanNumber,
            updatedLoan.id,
            updatedLoan.borrower.id
          )
        }

        // Email notification (if borrower has email)
        if (updatedLoan.borrower.email) {
          await sendLoanApprovedEmail(
            updatedLoan.borrower.email,
            borrowerName,
            amount,
            Number(updatedLoan.interestRate),
            updatedLoan.termMonths,
            updatedLoan.loanNumber,
            updatedLoan.id,
            updatedLoan.borrower.id
          )
        }
      }

      return NextResponse.json({
        success: true,
        message: shouldFullyApprove
          ? 'Loan fully approved and ready for disbursement'
          : `Loan approval recorded (${allApprovals.length}/${requiredApprovals} approvals)`,
        loan: updatedLoan,
        approval,
        fullyApproved: shouldFullyApprove,
        approvalsCount: allApprovals.length,
        requiredApprovals,
      })
    } catch (error) {
      console.error('Loan approval error:', error)
      return NextResponse.json(
        { error: 'Failed to approve loan', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_APPROVE],
  false
)
