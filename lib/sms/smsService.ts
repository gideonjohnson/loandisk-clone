/**
 * SMS Service
 * Handles sending SMS notifications via Twilio or Africa's Talking
 * Configure provider in environment variables
 */

import { prisma } from '@/lib/prisma'
import { getSMSConfigFromDB } from '@/lib/config/notificationConfig'

export type SMSProvider = 'twilio' | 'africastalking' | 'mock'

export interface SMSConfig {
  provider: SMSProvider
  twilio?: {
    accountSid: string
    authToken: string
    fromNumber: string
  }
  africastalking?: {
    apiKey: string
    username: string
    from: string
  }
}

export interface SendSMSParams {
  to: string
  message: string
  borrowerId?: string
  loanId?: string
  type?: string
}

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

// SMS Templates
export const SMS_TEMPLATES = {
  PAYMENT_REMINDER: (borrowerName: string, amount: string, dueDate: string, loanNumber: string) =>
    `Dear ${borrowerName}, your payment of ${amount} for loan #${loanNumber} is due on ${dueDate}. Please ensure timely payment. Thank you.`,

  PAYMENT_OVERDUE: (borrowerName: string, amount: string, daysOverdue: number, loanNumber: string) =>
    `Dear ${borrowerName}, your payment of ${amount} for loan #${loanNumber} is ${daysOverdue} days overdue. Please make payment immediately to avoid penalties.`,

  PAYMENT_RECEIVED: (borrowerName: string, amount: string, balance: string, loanNumber: string) =>
    `Dear ${borrowerName}, we received your payment of ${amount} for loan #${loanNumber}. Remaining balance: ${balance}. Thank you!`,

  LOAN_APPROVED: (borrowerName: string, amount: string, loanNumber: string) =>
    `Congratulations ${borrowerName}! Your loan #${loanNumber} of ${amount} has been approved. Visit our office for disbursement.`,

  LOAN_REJECTED: (borrowerName: string, loanNumber: string) =>
    `Dear ${borrowerName}, we regret to inform you that your loan application #${loanNumber} was not approved. Contact us for more details.`,

  LOAN_DISBURSED: (borrowerName: string, amount: string, loanNumber: string) =>
    `Dear ${borrowerName}, your loan #${loanNumber} of ${amount} has been disbursed. Please check your account. Thank you for choosing us!`,

  PAYMENT_DUE_TODAY: (borrowerName: string, amount: string, loanNumber: string) =>
    `REMINDER: Dear ${borrowerName}, your payment of ${amount} for loan #${loanNumber} is due TODAY. Please make payment to avoid late fees.`,

  PAYMENT_DUE_TOMORROW: (borrowerName: string, amount: string, loanNumber: string) =>
    `REMINDER: Dear ${borrowerName}, your payment of ${amount} for loan #${loanNumber} is due TOMORROW. Please prepare for payment.`,
}

/**
 * Get SMS configuration from database (with env var fallback)
 */
async function getSMSConfig(): Promise<SMSConfig> {
  return getSMSConfigFromDB()
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(
  params: SendSMSParams,
  config: SMSConfig['twilio']
): Promise<SMSResult> {
  if (!config?.accountSid || !config?.authToken) {
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    // @ts-expect-error - twilio is an optional dependency
    const twilio = await import('twilio')
    const client = twilio.default(config.accountSid, config.authToken)

    const message = await client.messages.create({
      body: params.message,
      from: config.fromNumber,
      to: params.to,
    })

    return { success: true, messageId: message.sid }
  } catch (error) {
    console.error('Twilio SMS error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Twilio error'
    }
  }
}

/**
 * Send SMS via Africa's Talking
 */
async function sendViaAfricasTalking(
  params: SendSMSParams,
  config: SMSConfig['africastalking']
): Promise<SMSResult> {
  if (!config?.apiKey || !config?.username) {
    return { success: false, error: "Africa's Talking not configured" }
  }

  try {
    // @ts-expect-error - africastalking is an optional dependency
    const AfricasTalking = (await import('africastalking')).default
    const at = AfricasTalking({
      apiKey: config.apiKey,
      username: config.username,
    })

    const sms = at.SMS
    const result = await sms.send({
      to: [params.to],
      message: params.message,
      from: config.from,
    })

    return {
      success: true,
      messageId: result.SMSMessageData?.Recipients?.[0]?.messageId
    }
  } catch (error) {
    console.error("Africa's Talking SMS error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Africa's Talking error"
    }
  }
}

/**
 * Mock SMS sender for development/testing
 */
async function sendViaMock(params: SendSMSParams): Promise<SMSResult> {
  console.log('=== MOCK SMS ===')
  console.log(`To: ${params.to}`)
  console.log(`Message: ${params.message}`)
  console.log('================')

  return {
    success: true,
    messageId: `mock-${Date.now()}`
  }
}

/**
 * Send SMS using configured provider
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSResult> {
  const config = await getSMSConfig()
  let result: SMSResult

  switch (config.provider) {
    case 'twilio':
      result = await sendViaTwilio(params, config.twilio)
      break
    case 'africastalking':
      result = await sendViaAfricasTalking(params, config.africastalking)
      break
    case 'mock':
    default:
      result = await sendViaMock(params)
  }

  // Log SMS to database
  await logSMS(params, result)

  return result
}

/**
 * Send SMS using an explicit config (used by test endpoints)
 */
export async function sendSMSWithConfig(params: SendSMSParams, config: SMSConfig): Promise<SMSResult> {
  let result: SMSResult

  switch (config.provider) {
    case 'twilio':
      result = await sendViaTwilio(params, config.twilio)
      break
    case 'africastalking':
      result = await sendViaAfricasTalking(params, config.africastalking)
      break
    case 'mock':
    default:
      result = await sendViaMock(params)
  }

  await logSMS(params, result)
  return result
}

/**
 * Log SMS to database for audit trail
 */
async function logSMS(params: SendSMSParams, result: SMSResult) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: 'system',
        action: 'SEND_SMS',
        entityType: params.loanId ? 'Loan' : 'Borrower',
        entityId: params.loanId || params.borrowerId || 'unknown',
        details: JSON.stringify({
          to: params.to,
          type: params.type,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        }),
      },
    })
  } catch (error) {
    console.error('Failed to log SMS:', error)
  }
}

/**
 * Send payment reminder SMS
 */
export async function sendPaymentReminderSMS(
  borrowerPhone: string,
  borrowerName: string,
  amount: number,
  dueDate: Date,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  const formattedAmount = `$${amount.toLocaleString()}`
  const formattedDate = dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.PAYMENT_REMINDER(borrowerName, formattedAmount, formattedDate, loanNumber),
    borrowerId,
    loanId,
    type: 'PAYMENT_REMINDER',
  })
}

/**
 * Send payment overdue SMS
 */
export async function sendPaymentOverdueSMS(
  borrowerPhone: string,
  borrowerName: string,
  amount: number,
  daysOverdue: number,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  const formattedAmount = `$${amount.toLocaleString()}`

  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.PAYMENT_OVERDUE(borrowerName, formattedAmount, daysOverdue, loanNumber),
    borrowerId,
    loanId,
    type: 'PAYMENT_OVERDUE',
  })
}

/**
 * Send payment received SMS
 */
export async function sendPaymentReceivedSMS(
  borrowerPhone: string,
  borrowerName: string,
  amount: number,
  balance: number,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  const formattedAmount = `$${amount.toLocaleString()}`
  const formattedBalance = `$${balance.toLocaleString()}`

  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.PAYMENT_RECEIVED(borrowerName, formattedAmount, formattedBalance, loanNumber),
    borrowerId,
    loanId,
    type: 'PAYMENT_RECEIVED',
  })
}

/**
 * Send loan approved SMS
 */
export async function sendLoanApprovedSMS(
  borrowerPhone: string,
  borrowerName: string,
  amount: number,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  const formattedAmount = `$${amount.toLocaleString()}`

  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.LOAN_APPROVED(borrowerName, formattedAmount, loanNumber),
    borrowerId,
    loanId,
    type: 'LOAN_APPROVED',
  })
}

/**
 * Send loan rejected SMS
 */
export async function sendLoanRejectedSMS(
  borrowerPhone: string,
  borrowerName: string,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.LOAN_REJECTED(borrowerName, loanNumber),
    borrowerId,
    loanId,
    type: 'LOAN_REJECTED',
  })
}

/**
 * Send loan disbursed SMS
 */
export async function sendLoanDisbursedSMS(
  borrowerPhone: string,
  borrowerName: string,
  amount: number,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<SMSResult> {
  const formattedAmount = `$${amount.toLocaleString()}`

  return sendSMS({
    to: borrowerPhone,
    message: SMS_TEMPLATES.LOAN_DISBURSED(borrowerName, formattedAmount, loanNumber),
    borrowerId,
    loanId,
    type: 'LOAN_DISBURSED',
  })
}

/**
 * Get SMS logs for a borrower or loan
 */
export async function getSMSLogs(
  entityType: 'Borrower' | 'Loan',
  entityId: string,
  limit: number = 20
) {
  return prisma.activityLog.findMany({
    where: {
      action: 'SEND_SMS',
      entityType: entityType === 'Borrower' ? 'Borrower' : 'Loan',
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
