/**
 * Email Service
 * Handles sending email notifications via SMTP, SendGrid, or other providers
 */

import { prisma } from '@/lib/prisma'

export type EmailProvider = 'smtp' | 'sendgrid' | 'mock'

export interface EmailConfig {
  provider: EmailProvider
  from: string
  fromName: string
  smtp?: {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
  }
  sendgrid?: {
    apiKey: string
  }
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
  borrowerId?: string
  loanId?: string
  type?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Email Templates
 */
export const EMAIL_TEMPLATES = {
  PAYMENT_REMINDER: (data: {
    borrowerName: string
    amount: string
    dueDate: string
    loanNumber: string
    companyName: string
  }) => ({
    subject: `Payment Reminder - Loan #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${data.companyName}</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>This is a friendly reminder that your loan payment is due.</p>
            <p><strong>Loan Number:</strong> ${data.loanNumber}</p>
            <p><strong>Amount Due:</strong> <span class="amount">${data.amount}</span></p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
            <p>Please ensure timely payment to avoid any late fees or penalties.</p>
            <p>If you have already made this payment, please disregard this notice.</p>
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${data.borrowerName}, your payment of ${data.amount} for loan #${data.loanNumber} is due on ${data.dueDate}. Please ensure timely payment.`,
  }),

  PAYMENT_RECEIVED: (data: {
    borrowerName: string
    amount: string
    balance: string
    loanNumber: string
    receiptNumber: string
    paymentDate: string
    companyName: string
  }) => ({
    subject: `Payment Received - Loan #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .amount { font-size: 24px; font-weight: bold; color: #22c55e; }
          .receipt { background: white; padding: 15px; border: 1px solid #ddd; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>Thank you! We have received your payment.</p>
            <div class="receipt">
              <p><strong>Receipt Number:</strong> ${data.receiptNumber}</p>
              <p><strong>Loan Number:</strong> ${data.loanNumber}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">${data.amount}</span></p>
              <p><strong>Payment Date:</strong> ${data.paymentDate}</p>
              <p><strong>Remaining Balance:</strong> ${data.balance}</p>
            </div>
            <p>Thank you for your timely payment!</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${data.borrowerName}, we received your payment of ${data.amount} for loan #${data.loanNumber}. Receipt: ${data.receiptNumber}. Remaining balance: ${data.balance}.`,
  }),

  LOAN_APPROVED: (data: {
    borrowerName: string
    amount: string
    loanNumber: string
    interestRate: string
    termMonths: number
    companyName: string
  }) => ({
    subject: `Congratulations! Your Loan Has Been Approved - #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .highlight { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #22c55e; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Loan Approved!</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>Congratulations! We are pleased to inform you that your loan application has been <strong>approved</strong>.</p>
            <div class="highlight">
              <p><strong>Loan Number:</strong> ${data.loanNumber}</p>
              <p><strong>Approved Amount:</strong> <span class="amount">${data.amount}</span></p>
              <p><strong>Interest Rate:</strong> ${data.interestRate}%</p>
              <p><strong>Term:</strong> ${data.termMonths} months</p>
            </div>
            <p>Please visit our office or contact us to proceed with the disbursement process.</p>
            <p>Thank you for choosing us!</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Congratulations ${data.borrowerName}! Your loan #${data.loanNumber} of ${data.amount} has been approved. Interest rate: ${data.interestRate}%, Term: ${data.termMonths} months.`,
  }),

  LOAN_REJECTED: (data: {
    borrowerName: string
    loanNumber: string
    reason: string
    companyName: string
  }) => ({
    subject: `Loan Application Update - #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6b7280; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .reason { background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Loan Application Update</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>We regret to inform you that your loan application #${data.loanNumber} was not approved at this time.</p>
            <div class="reason">
              <p><strong>Reason:</strong> ${data.reason}</p>
            </div>
            <p>We encourage you to contact us to discuss your options or reapply in the future.</p>
            <p>Thank you for considering us.</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${data.borrowerName}, we regret to inform you that your loan application #${data.loanNumber} was not approved. Reason: ${data.reason}. Please contact us for more information.`,
  }),

  LOAN_DISBURSED: (data: {
    borrowerName: string
    amount: string
    loanNumber: string
    disbursementMethod: string
    firstPaymentDate: string
    companyName: string
  }) => ({
    subject: `Loan Disbursed - #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .amount { font-size: 28px; font-weight: bold; color: #2563eb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Loan Disbursed</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>Your loan has been successfully disbursed!</p>
            <div class="highlight">
              <p><strong>Loan Number:</strong> ${data.loanNumber}</p>
              <p><strong>Amount Disbursed:</strong> <span class="amount">${data.amount}</span></p>
              <p><strong>Disbursement Method:</strong> ${data.disbursementMethod}</p>
              <p><strong>First Payment Due:</strong> ${data.firstPaymentDate}</p>
            </div>
            <p>Please ensure you make timely payments according to your repayment schedule.</p>
            <p>Thank you for choosing us!</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Dear ${data.borrowerName}, your loan #${data.loanNumber} of ${data.amount} has been disbursed via ${data.disbursementMethod}. First payment is due on ${data.firstPaymentDate}.`,
  }),

  PAYMENT_OVERDUE: (data: {
    borrowerName: string
    amount: string
    daysOverdue: number
    loanNumber: string
    penaltyAmount: string
    companyName: string
  }) => ({
    subject: `URGENT: Payment Overdue - Loan #${data.loanNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .warning { background: #fef2f2; padding: 15px; border: 2px solid #ef4444; border-radius: 8px; margin: 15px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #ef4444; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Overdue</h1>
          </div>
          <div class="content">
            <p>Dear ${data.borrowerName},</p>
            <p>This is an urgent notice regarding your overdue payment.</p>
            <div class="warning">
              <p><strong>Loan Number:</strong> ${data.loanNumber}</p>
              <p><strong>Amount Overdue:</strong> <span class="amount">${data.amount}</span></p>
              <p><strong>Days Overdue:</strong> ${data.daysOverdue} days</p>
              <p><strong>Late Penalty:</strong> ${data.penaltyAmount}</p>
            </div>
            <p>Please make payment immediately to avoid further penalties and potential legal action.</p>
            <p>If you are experiencing financial difficulties, please contact us to discuss payment arrangements.</p>
          </div>
          <div class="footer">
            <p>${data.companyName} | Loan Management System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `URGENT: Dear ${data.borrowerName}, your payment of ${data.amount} for loan #${data.loanNumber} is ${data.daysOverdue} days overdue. Late penalty: ${data.penaltyAmount}. Please make payment immediately.`,
  }),
}

/**
 * Get email configuration from environment
 */
function getEmailConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'mock') as EmailProvider

  return {
    provider,
    from: process.env.EMAIL_FROM || 'noreply@example.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Loan Management System',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
  }
}

/**
 * Send email via SMTP (nodemailer)
 */
async function sendViaSMTP(
  params: SendEmailParams,
  config: EmailConfig
): Promise<EmailResult> {
  if (!config.smtp?.host || !config.smtp?.user) {
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    // @ts-ignore - nodemailer is an optional dependency
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('SMTP email error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMTP error'
    }
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  params: SendEmailParams,
  config: EmailConfig
): Promise<EmailResult> {
  if (!config.sendgrid?.apiKey) {
    return { success: false, error: 'SendGrid not configured' }
  }

  try {
    // @ts-ignore - sendgrid is an optional dependency
    const sgMail = (await import('@sendgrid/mail')).default
    sgMail.setApiKey(config.sendgrid.apiKey)

    const [response] = await sgMail.send({
      to: params.to,
      from: {
        email: config.from,
        name: config.fromName,
      },
      subject: params.subject,
      text: params.text || '',
      html: params.html,
    })

    return {
      success: response.statusCode >= 200 && response.statusCode < 300,
      messageId: response.headers['x-message-id'] as string,
    }
  } catch (error) {
    console.error('SendGrid email error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SendGrid error'
    }
  }
}

/**
 * Mock email sender for development/testing
 */
async function sendViaMock(params: SendEmailParams): Promise<EmailResult> {
  console.log('=== MOCK EMAIL ===')
  console.log(`To: ${params.to}`)
  console.log(`Subject: ${params.subject}`)
  console.log(`HTML: ${params.html.substring(0, 200)}...`)
  console.log('==================')

  return {
    success: true,
    messageId: `mock-${Date.now()}`
  }
}

/**
 * Send email using configured provider
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const config = getEmailConfig()
  let result: EmailResult

  switch (config.provider) {
    case 'smtp':
      result = await sendViaSMTP(params, config)
      break
    case 'sendgrid':
      result = await sendViaSendGrid(params, config)
      break
    case 'mock':
    default:
      result = await sendViaMock(params)
  }

  // Log email to database
  await logEmail(params, result)

  return result
}

/**
 * Log email to database for audit trail
 */
async function logEmail(params: SendEmailParams, result: EmailResult) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: 'system',
        action: 'SEND_EMAIL',
        entityType: params.loanId ? 'Loan' : 'Borrower',
        entityId: params.loanId || params.borrowerId || 'unknown',
        details: JSON.stringify({
          to: params.to,
          subject: params.subject,
          type: params.type,
          success: result.success,
          messageId: result.messageId,
          error: result.error,
        }),
      },
    })
  } catch (error) {
    console.error('Failed to log email:', error)
  }
}

/**
 * Helper function to get company name from settings
 */
async function getCompanyName(): Promise<string> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'company_name' },
    })
    return setting?.value || 'Loan Management System'
  } catch {
    return 'Loan Management System'
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(
  borrowerEmail: string,
  borrowerName: string,
  amount: number,
  dueDate: Date,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.PAYMENT_REMINDER({
    borrowerName,
    amount: `$${amount.toLocaleString()}`,
    dueDate: dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    loanNumber,
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'PAYMENT_REMINDER',
  })
}

/**
 * Send payment received email
 */
export async function sendPaymentReceivedEmail(
  borrowerEmail: string,
  borrowerName: string,
  amount: number,
  balance: number,
  loanNumber: string,
  receiptNumber: string,
  paymentDate: Date,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.PAYMENT_RECEIVED({
    borrowerName,
    amount: `$${amount.toLocaleString()}`,
    balance: `$${balance.toLocaleString()}`,
    loanNumber,
    receiptNumber,
    paymentDate: paymentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'PAYMENT_RECEIVED',
  })
}

/**
 * Send loan approved email
 */
export async function sendLoanApprovedEmail(
  borrowerEmail: string,
  borrowerName: string,
  amount: number,
  interestRate: number,
  termMonths: number,
  loanNumber: string,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.LOAN_APPROVED({
    borrowerName,
    amount: `$${amount.toLocaleString()}`,
    interestRate: interestRate.toString(),
    termMonths,
    loanNumber,
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'LOAN_APPROVED',
  })
}

/**
 * Send loan rejected email
 */
export async function sendLoanRejectedEmail(
  borrowerEmail: string,
  borrowerName: string,
  loanNumber: string,
  reason: string,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.LOAN_REJECTED({
    borrowerName,
    loanNumber,
    reason,
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'LOAN_REJECTED',
  })
}

/**
 * Send loan disbursed email
 */
export async function sendLoanDisbursedEmail(
  borrowerEmail: string,
  borrowerName: string,
  amount: number,
  loanNumber: string,
  disbursementMethod: string,
  firstPaymentDate: Date,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.LOAN_DISBURSED({
    borrowerName,
    amount: `$${amount.toLocaleString()}`,
    loanNumber,
    disbursementMethod,
    firstPaymentDate: firstPaymentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'LOAN_DISBURSED',
  })
}

/**
 * Send payment overdue email
 */
export async function sendPaymentOverdueEmail(
  borrowerEmail: string,
  borrowerName: string,
  amount: number,
  daysOverdue: number,
  loanNumber: string,
  penaltyAmount: number,
  loanId: string,
  borrowerId: string
): Promise<EmailResult> {
  const companyName = await getCompanyName()
  const template = EMAIL_TEMPLATES.PAYMENT_OVERDUE({
    borrowerName,
    amount: `$${amount.toLocaleString()}`,
    daysOverdue,
    loanNumber,
    penaltyAmount: `$${penaltyAmount.toLocaleString()}`,
    companyName,
  })

  return sendEmail({
    to: borrowerEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    borrowerId,
    loanId,
    type: 'PAYMENT_OVERDUE',
  })
}
