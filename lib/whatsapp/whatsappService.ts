/**
 * WhatsApp Business API Integration
 * Supports Twilio WhatsApp and Meta WhatsApp Business API
 */

export type WhatsAppProvider = 'twilio' | 'meta' | 'mock'

interface WhatsAppConfig {
  provider: WhatsAppProvider
  twilio?: {
    accountSid: string
    authToken: string
    fromNumber: string
  }
  meta?: {
    accessToken: string
    phoneNumberId: string
  }
}

interface WhatsAppMessage {
  to: string
  message: string
  templateName?: string
  templateParams?: string[]
}

interface WhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

// Message Templates
export const WHATSAPP_TEMPLATES = {
  PAYMENT_REMINDER: (name: string, amount: string, dueDate: string, loanNumber: string) =>
    `Hello ${name}, this is a reminder that your payment of ${amount} for loan ${loanNumber} is due on ${dueDate}. Please ensure timely payment to avoid late fees. Thank you!`,

  PAYMENT_RECEIVED: (name: string, amount: string, loanNumber: string, balance: string) =>
    `Hello ${name}, we have received your payment of ${amount} for loan ${loanNumber}. Your remaining balance is ${balance}. Thank you for your payment!`,

  LOAN_APPROVED: (name: string, amount: string, loanNumber: string) =>
    `Congratulations ${name}! Your loan application ${loanNumber} for ${amount} has been approved. Please visit our office or log into the customer portal for disbursement details.`,

  LOAN_DISBURSED: (name: string, amount: string, loanNumber: string) =>
    `Hello ${name}, your loan ${loanNumber} of ${amount} has been disbursed. Please check your account. Thank you for choosing Meek Microfinance!`,

  PAYMENT_OVERDUE: (name: string, amount: string, daysOverdue: string, loanNumber: string) =>
    `Hello ${name}, your payment of ${amount} for loan ${loanNumber} is ${daysOverdue} days overdue. Please make payment immediately to avoid additional penalties. Contact us if you need assistance.`,

  OTP: (otp: string) =>
    `Your Meek verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,

  WELCOME: (name: string) =>
    `Welcome to Meek Microfinance, ${name}! Your account has been created. Access the customer portal at any time to manage your loans. Reply HELP for assistance.`,
}

/**
 * Get WhatsApp configuration
 */
function getWhatsAppConfig(): WhatsAppConfig {
  const provider = (process.env.WHATSAPP_PROVIDER || 'mock') as WhatsAppProvider

  return {
    provider,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.WHATSAPP_PHONE_NUMBER || '',
    },
    meta: {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    },
  }
}

/**
 * Format phone number for WhatsApp
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '')

  // Ensure it starts with country code
  if (!cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '1' + cleaned // Default to US
  }

  return cleaned
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendViaTwilio(config: WhatsAppConfig, message: WhatsAppMessage): Promise<WhatsAppResult> {
  if (!config.twilio?.accountSid || !config.twilio?.authToken) {
    throw new Error('Twilio WhatsApp not configured')
  }

  const toNumber = `whatsapp:+${formatPhoneNumber(message.to)}`
  const fromNumber = `whatsapp:${config.twilio.fromNumber}`

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: message.message,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.message || 'Failed to send WhatsApp message',
    }
  }

  return {
    success: true,
    messageId: data.sid,
  }
}

/**
 * Send WhatsApp message via Meta Business API
 */
async function sendViaMeta(config: WhatsAppConfig, message: WhatsAppMessage): Promise<WhatsAppResult> {
  if (!config.meta?.accessToken || !config.meta?.phoneNumberId) {
    throw new Error('Meta WhatsApp not configured')
  }

  const toNumber = formatPhoneNumber(message.to)

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: toNumber,
    type: 'text',
    text: { body: message.message },
  }

  // Use template if specified
  if (message.templateName) {
    payload.type = 'template'
    payload.template = {
      name: message.templateName,
      language: { code: 'en' },
      components: message.templateParams?.map(param => ({
        type: 'body',
        parameters: [{ type: 'text', text: param }],
      })),
    }
    delete payload.text
  }

  const response = await fetch(
    `https://graph.facebook.com/v17.0/${config.meta.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.meta.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.error?.message || 'Failed to send WhatsApp message',
    }
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
  }
}

/**
 * Mock WhatsApp sender for development
 */
async function sendViaMock(message: WhatsAppMessage): Promise<WhatsAppResult> {
  console.log('=== MOCK WHATSAPP MESSAGE ===')
  console.log(`To: ${message.to}`)
  console.log(`Message: ${message.message}`)
  console.log('=============================')

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  }
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResult> {
  const config = getWhatsAppConfig()

  switch (config.provider) {
    case 'twilio':
      return sendViaTwilio(config, message)
    case 'meta':
      return sendViaMeta(config, message)
    case 'mock':
    default:
      return sendViaMock(message)
  }
}

// ==================== Convenience Functions ====================

export async function sendPaymentReminderWhatsApp(
  phone: string,
  borrowerName: string,
  amount: string,
  dueDate: string,
  loanNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.PAYMENT_REMINDER(borrowerName, amount, dueDate, loanNumber),
  })
}

export async function sendPaymentReceivedWhatsApp(
  phone: string,
  borrowerName: string,
  amount: string,
  loanNumber: string,
  balance: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.PAYMENT_RECEIVED(borrowerName, amount, loanNumber, balance),
  })
}

export async function sendLoanApprovedWhatsApp(
  phone: string,
  borrowerName: string,
  amount: string,
  loanNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.LOAN_APPROVED(borrowerName, amount, loanNumber),
  })
}

export async function sendLoanDisbursedWhatsApp(
  phone: string,
  borrowerName: string,
  amount: string,
  loanNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.LOAN_DISBURSED(borrowerName, amount, loanNumber),
  })
}

export async function sendPaymentOverdueWhatsApp(
  phone: string,
  borrowerName: string,
  amount: string,
  daysOverdue: string,
  loanNumber: string
): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.PAYMENT_OVERDUE(borrowerName, amount, daysOverdue, loanNumber),
  })
}

export async function sendOTPWhatsApp(phone: string, otp: string): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.OTP(otp),
  })
}

export async function sendWelcomeWhatsApp(phone: string, name: string): Promise<WhatsAppResult> {
  return sendWhatsAppMessage({
    to: phone,
    message: WHATSAPP_TEMPLATES.WELCOME(name),
  })
}
