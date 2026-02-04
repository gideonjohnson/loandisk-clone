/**
 * M-Pesa Integration Service (Safaricom Daraja API)
 * Supports STK Push (Lipa Na M-Pesa) and C2B payments
 */

import { prisma } from '@/lib/prisma'

export interface MpesaConfig {
  consumerKey: string
  consumerSecret: string
  passKey: string
  shortCode: string
  callbackUrl: string
  environment: 'sandbox' | 'production'
}

export interface STKPushRequest {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
  loanId?: string
  borrowerId?: string
}

export interface STKPushResponse {
  success: boolean
  checkoutRequestID?: string
  merchantRequestID?: string
  responseCode?: string
  responseDescription?: string
  customerMessage?: string
  error?: string
}

export interface STKQueryResponse {
  success: boolean
  resultCode?: string
  resultDesc?: string
  mpesaReceiptNumber?: string
  transactionDate?: string
  phoneNumber?: string
  amount?: number
  error?: string
}

export interface C2BCallbackData {
  TransactionType: string
  TransID: string
  TransTime: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string
  InvoiceNumber: string
  OrgAccountBalance: string
  ThirdPartyTransID: string
  MSISDN: string
  FirstName: string
  MiddleName: string
  LastName: string
}

/**
 * Get M-Pesa configuration from database or environment
 */
export async function getMpesaConfig(): Promise<MpesaConfig | null> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'mpesa_consumer_key',
            'mpesa_consumer_secret',
            'mpesa_pass_key',
            'mpesa_short_code',
            'mpesa_callback_url',
            'mpesa_environment'
          ]
        }
      }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => {
      config[s.key] = s.value
    })

    // Fall back to environment variables
    const consumerKey = config.mpesa_consumer_key || process.env.MPESA_CONSUMER_KEY
    const consumerSecret = config.mpesa_consumer_secret || process.env.MPESA_CONSUMER_SECRET
    const passKey = config.mpesa_pass_key || process.env.MPESA_PASS_KEY
    const shortCode = config.mpesa_short_code || process.env.MPESA_SHORT_CODE
    const callbackUrl = config.mpesa_callback_url || process.env.MPESA_CALLBACK_URL
    const environment = (config.mpesa_environment || process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'

    if (!consumerKey || !consumerSecret || !passKey || !shortCode) {
      return null
    }

    return {
      consumerKey,
      consumerSecret,
      passKey,
      shortCode,
      callbackUrl: callbackUrl || '',
      environment
    }
  } catch (error) {
    console.error('Error getting M-Pesa config:', error)
    return null
  }
}

/**
 * Get M-Pesa API base URL based on environment
 */
function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
}

/**
 * Get OAuth access token from M-Pesa
 */
async function getAccessToken(config: MpesaConfig): Promise<string | null> {
  try {
    const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')
    const baseUrl = getBaseUrl(config.environment)

    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    })

    if (!response.ok) {
      console.error('M-Pesa OAuth error:', await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error)
    return null
  }
}

/**
 * Generate password for STK Push
 */
function generatePassword(shortCode: string, passKey: string, timestamp: string): string {
  return Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64')
}

/**
 * Format phone number for M-Pesa (254XXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-\+]/g, '')

  // Handle different formats
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1)
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1)
  }

  return cleaned
}

/**
 * Generate timestamp in format YYYYMMDDHHmmss
 */
function generateTimestamp(): string {
  const now = new Date()
  return now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
}

/**
 * Initiate STK Push (Lipa Na M-Pesa)
 */
export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  try {
    const config = await getMpesaConfig()

    if (!config) {
      return { success: false, error: 'M-Pesa not configured' }
    }

    const accessToken = await getAccessToken(config)

    if (!accessToken) {
      return { success: false, error: 'Failed to get M-Pesa access token' }
    }

    const timestamp = generateTimestamp()
    const password = generatePassword(config.shortCode, config.passKey, timestamp)
    const phoneNumber = formatPhoneNumber(request.phoneNumber)
    const baseUrl = getBaseUrl(config.environment)

    const payload = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(request.amount),
      PartyA: phoneNumber,
      PartyB: config.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: config.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc
    }

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (data.ResponseCode === '0') {
      // Store pending transaction
      await prisma.paymentTransaction.create({
        data: {
          provider: 'MPESA',
          transactionType: 'STK_PUSH',
          checkoutRequestId: data.CheckoutRequestID,
          merchantRequestId: data.MerchantRequestID,
          phoneNumber,
          amount: request.amount,
          accountReference: request.accountReference,
          status: 'PENDING',
          loanId: request.loanId,
          borrowerId: request.borrowerId
        }
      })

      return {
        success: true,
        checkoutRequestID: data.CheckoutRequestID,
        merchantRequestID: data.MerchantRequestID,
        responseCode: data.ResponseCode,
        responseDescription: data.ResponseDescription,
        customerMessage: data.CustomerMessage
      }
    }

    return {
      success: false,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      error: data.errorMessage || data.ResponseDescription
    }
  } catch (error) {
    console.error('STK Push error:', error)
    return { success: false, error: 'Failed to initiate M-Pesa payment' }
  }
}

/**
 * Query STK Push transaction status
 */
export async function querySTKStatus(checkoutRequestId: string): Promise<STKQueryResponse> {
  try {
    const config = await getMpesaConfig()

    if (!config) {
      return { success: false, error: 'M-Pesa not configured' }
    }

    const accessToken = await getAccessToken(config)

    if (!accessToken) {
      return { success: false, error: 'Failed to get M-Pesa access token' }
    }

    const timestamp = generateTimestamp()
    const password = generatePassword(config.shortCode, config.passKey, timestamp)
    const baseUrl = getBaseUrl(config.environment)

    const payload = {
      BusinessShortCode: config.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    }

    const response = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (data.ResultCode === '0') {
      return {
        success: true,
        resultCode: data.ResultCode,
        resultDesc: data.ResultDesc,
        mpesaReceiptNumber: data.MpesaReceiptNumber
      }
    }

    return {
      success: false,
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
      error: data.ResultDesc
    }
  } catch (error) {
    console.error('STK Query error:', error)
    return { success: false, error: 'Failed to query M-Pesa status' }
  }
}

/**
 * Process STK Push callback
 */
export async function processSTKCallback(body: any): Promise<{ success: boolean; payment?: any }> {
  try {
    const { Body } = body

    if (!Body?.stkCallback) {
      return { success: false }
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback

    // Find the pending transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { checkoutRequestId: CheckoutRequestID }
    })

    if (!transaction) {
      console.error('Transaction not found for CheckoutRequestID:', CheckoutRequestID)
      return { success: false }
    }

    if (ResultCode === 0) {
      // Payment successful
      const metadata = CallbackMetadata?.Item || []
      const amount = metadata.find((i: any) => i.Name === 'Amount')?.Value
      const mpesaReceiptNumber = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value
      const transactionDate = metadata.find((i: any) => i.Name === 'TransactionDate')?.Value
      const phoneNumber = metadata.find((i: any) => i.Name === 'PhoneNumber')?.Value

      // Update transaction status
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          mpesaReceiptNumber,
          transactionDate: transactionDate ? new Date(String(transactionDate)) : new Date(),
          resultCode: String(ResultCode),
          resultDesc: ResultDesc
        }
      })

      // If linked to a loan, create payment record
      if (transaction.loanId) {
        const payment = await prisma.payment.create({
          data: {
            loanId: transaction.loanId,
            amount: amount || transaction.amount,
            paymentDate: new Date(),
            paymentMethod: 'MPESA',
            receiptNumber: mpesaReceiptNumber,
            notes: `M-Pesa payment from ${phoneNumber}`,
            status: 'COMPLETED',
            transactionId: transaction.id
          }
        })

        return { success: true, payment }
      }

      return { success: true }
    } else {
      // Payment failed or cancelled
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          resultCode: String(ResultCode),
          resultDesc: ResultDesc
        }
      })

      return { success: false }
    }
  } catch (error) {
    console.error('STK Callback processing error:', error)
    return { success: false }
  }
}

/**
 * Process C2B payment confirmation
 */
export async function processC2BConfirmation(data: C2BCallbackData): Promise<{ success: boolean }> {
  try {
    // Create transaction record
    await prisma.paymentTransaction.create({
      data: {
        provider: 'MPESA',
        transactionType: 'C2B',
        mpesaReceiptNumber: data.TransID,
        phoneNumber: data.MSISDN,
        amount: parseFloat(data.TransAmount),
        accountReference: data.BillRefNumber,
        status: 'COMPLETED',
        transactionDate: new Date(),
        resultDesc: `C2B from ${data.FirstName} ${data.LastName}`
      }
    })

    // Try to match with a loan based on account reference
    const loan = await prisma.loan.findFirst({
      where: { loanNumber: data.BillRefNumber }
    })

    if (loan) {
      await prisma.payment.create({
        data: {
          loanId: loan.id,
          amount: parseFloat(data.TransAmount),
          paymentDate: new Date(),
          paymentMethod: 'MPESA',
          receiptNumber: data.TransID,
          notes: `C2B payment from ${data.FirstName} ${data.LastName} (${data.MSISDN})`,
          status: 'COMPLETED'
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('C2B Confirmation error:', error)
    return { success: false }
  }
}
