/**
 * Payment Reminder Service
 * Handles automated payment reminders via SMS and Email
 */

import { prisma } from '@/lib/prisma'
import { sendPaymentReminderSMS, sendPaymentOverdueSMS } from '@/lib/sms/smsService'
import { sendPaymentReminderEmail, sendPaymentOverdueEmail } from '@/lib/email/emailService'

export interface ReminderResult {
  totalReminders: number
  sentSMS: number
  sentEmail: number
  errors: string[]
}

export interface PaymentWithDetails {
  id: string
  amount: number
  dueDate: Date
  loan: {
    id: string
    loanNumber: string
    borrower: {
      id: string
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
    }
  }
}

/**
 * Get upcoming payments due within specified days
 */
export async function getUpcomingPayments(daysAhead: number): Promise<PaymentWithDetails[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const payments = await prisma.loanSchedule.findMany({
    where: {
      dueDate: {
        gte: today,
        lte: futureDate,
      },
      isPaid: false,
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  })

  return payments.map(p => ({
    id: p.id,
    amount: Number(p.totalDue) - Number(p.totalPaid),
    dueDate: p.dueDate,
    loan: {
      id: p.loan.id,
      loanNumber: p.loan.loanNumber,
      borrower: {
        id: p.loan.borrower.id,
        firstName: p.loan.borrower.firstName,
        lastName: p.loan.borrower.lastName,
        email: p.loan.borrower.email,
        phone: p.loan.borrower.phone,
      },
    },
  }))
}

/**
 * Get overdue payments
 */
export async function getOverduePayments(): Promise<PaymentWithDetails[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const payments = await prisma.loanSchedule.findMany({
    where: {
      dueDate: {
        lt: today,
      },
      isPaid: false,
    },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  })

  return payments.map(p => ({
    id: p.id,
    amount: Number(p.totalDue) - Number(p.totalPaid),
    dueDate: p.dueDate,
    loan: {
      id: p.loan.id,
      loanNumber: p.loan.loanNumber,
      borrower: {
        id: p.loan.borrower.id,
        firstName: p.loan.borrower.firstName,
        lastName: p.loan.borrower.lastName,
        email: p.loan.borrower.email,
        phone: p.loan.borrower.phone,
      },
    },
  }))
}

/**
 * Send payment reminders for upcoming payments
 */
export async function sendPaymentReminders(daysAhead: number = 3): Promise<ReminderResult> {
  const result: ReminderResult = {
    totalReminders: 0,
    sentSMS: 0,
    sentEmail: 0,
    errors: [],
  }

  try {
    const upcomingPayments = await getUpcomingPayments(daysAhead)
    result.totalReminders = upcomingPayments.length

    for (const payment of upcomingPayments) {
      const { borrower } = payment.loan
      const borrowerName = `${borrower.firstName} ${borrower.lastName}`
      const amount = payment.amount

      // Send SMS reminder
      if (borrower.phone) {
        try {
          await sendPaymentReminderSMS(
            borrower.phone,
            borrowerName,
            amount,
            payment.dueDate,
            payment.loan.loanNumber,
            payment.loan.id,
            borrower.id
          )
          result.sentSMS++
        } catch (error) {
          result.errors.push(`SMS failed for ${borrowerName}: ${error}`)
        }
      }

      // Send Email reminder
      if (borrower.email) {
        try {
          await sendPaymentReminderEmail(
            borrower.email,
            borrowerName,
            amount,
            payment.dueDate,
            payment.loan.loanNumber,
            payment.loan.id,
            borrower.id
          )
          result.sentEmail++
        } catch (error) {
          result.errors.push(`Email failed for ${borrowerName}: ${error}`)
        }
      }

      // Log the reminder
      await prisma.activityLog.create({
        data: {
          userId: 'system',
          action: 'PAYMENT_REMINDER_SENT',
          entityType: 'Loan',
          entityId: payment.loan.id,
          details: JSON.stringify({
            paymentId: payment.id,
            amount,
            dueDate: payment.dueDate.toISOString(),
            smsStatus: borrower.phone ? 'sent' : 'no_phone',
            emailStatus: borrower.email ? 'sent' : 'no_email',
          }),
        },
      })
    }
  } catch (error) {
    result.errors.push(`General error: ${error}`)
  }

  return result
}

/**
 * Send overdue payment notices
 */
export async function sendOverdueNotices(): Promise<ReminderResult> {
  const result: ReminderResult = {
    totalReminders: 0,
    sentSMS: 0,
    sentEmail: 0,
    errors: [],
  }

  try {
    const overduePayments = await getOverduePayments()
    result.totalReminders = overduePayments.length

    for (const payment of overduePayments) {
      const { borrower } = payment.loan
      const borrowerName = `${borrower.firstName} ${borrower.lastName}`
      const amount = payment.amount.toFixed(2)

      // Calculate days overdue
      const today = new Date()
      const dueDate = new Date(payment.dueDate)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      // Send SMS notice
      if (borrower.phone) {
        try {
          await sendPaymentOverdueSMS(
            borrower.phone,
            borrowerName,
            parseFloat(amount),
            daysOverdue,
            payment.loan.loanNumber,
            payment.loan.id,
            borrower.id
          )
          result.sentSMS++
        } catch (error) {
          result.errors.push(`SMS failed for ${borrowerName}: ${error}`)
        }
      }

      // Send Email notice
      if (borrower.email) {
        try {
          await sendPaymentOverdueEmail(
            borrower.email,
            borrowerName,
            parseFloat(amount),
            daysOverdue,
            payment.loan.loanNumber,
            payment.loan.id,
            borrower.id
          )
          result.sentEmail++
        } catch (error) {
          result.errors.push(`Email failed for ${borrowerName}: ${error}`)
        }
      }

      // Log the notice
      await prisma.activityLog.create({
        data: {
          userId: 'system',
          action: 'OVERDUE_NOTICE_SENT',
          entityType: 'Loan',
          entityId: payment.loan.id,
          details: JSON.stringify({
            paymentId: payment.id,
            amount,
            daysOverdue,
            smsStatus: borrower.phone ? 'sent' : 'no_phone',
            emailStatus: borrower.email ? 'sent' : 'no_email',
          }),
        },
      })
    }
  } catch (error) {
    result.errors.push(`General error: ${error}`)
  }

  return result
}

/**
 * Run all scheduled reminders
 * This should be called by a cron job (e.g., daily at 8 AM)
 */
export async function runScheduledReminders(): Promise<{
  upcoming: ReminderResult
  overdue: ReminderResult
}> {
  console.log('=== Running Scheduled Payment Reminders ===')
  console.log(`Time: ${new Date().toISOString()}`)

  // Send reminders for payments due in next 3 days
  const upcomingResult = await sendPaymentReminders(3)
  console.log(`Upcoming reminders: ${upcomingResult.totalReminders}`)

  // Send notices for overdue payments
  const overdueResult = await sendOverdueNotices()
  console.log(`Overdue notices: ${overdueResult.totalReminders}`)

  console.log('=== Reminder Job Complete ===')

  return {
    upcoming: upcomingResult,
    overdue: overdueResult,
  }
}

/**
 * Get reminder statistics for dashboard
 */
export async function getReminderStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Count reminders sent this month
  const reminderLogs = await prisma.activityLog.count({
    where: {
      action: {
        in: ['PAYMENT_REMINDER_SENT', 'OVERDUE_NOTICE_SENT'],
      },
      createdAt: {
        gte: startOfMonth,
      },
    },
  })

  // Get upcoming payments
  const upcomingCount = await prisma.loanSchedule.count({
    where: {
      dueDate: {
        gte: today,
        lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      status: {
        in: ['PENDING', 'PARTIALLY_PAID'],
      },
    },
  })

  // Get overdue payments
  const overdueCount = await prisma.loanSchedule.count({
    where: {
      dueDate: {
        lt: today,
      },
      status: {
        in: ['PENDING', 'PARTIALLY_PAID'],
      },
    },
  })

  return {
    remindersSentThisMonth: reminderLogs,
    upcomingPayments: upcomingCount,
    overduePayments: overdueCount,
  }
}
