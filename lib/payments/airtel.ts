/**
 * Airtel Money Integration Service
 * Supports Airtel Money payments for Kenya, Uganda, Tanzania, etc.
 */

import { prisma } from '@/lib/prisma'

export interface AirtelConfig {
  clientId: string
  clientSecret: string
  merchantPin: string
  callbackUrl: string
  environment: 'sandbox' | 'production'
  country: string // KE, UG, TZ, etc.
}

export interface AirtelPaymentRequest {
  phoneNumber: string
  amount: number
  reference: string
  loanId?: string
  borrowerId?: string
}

export interface AirtelPaymentResponse {
  success: boolean
  transactionId?: string
  status?: string
  message?: string
  error?: string
}

export interface AirtelCallbackData {
  transaction: {
    id: string
    message: string
    status_code: string
    airtel_money_id: string
  }
}

/**
 * Get Airtel Money configuration from database or environment
 */
export async function getAirtelConfig(): Promise<AirtelConfig | null> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'airtel_client_id',
            'airtel_client_secret',
            'airtel_merchant_pin',
            'airtel_callback_url',
            'airtel_environment',
            'airtel_country'
          ]
        }
      }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => {
      config[s.key] = s.value
    })

    // Fall back to environment variables
    const clientId = config.airtel_client_id || process.env.AIRTEL_CLIENT_ID
    const clientSecret = config.airtel_client_secret || process.env.AIRTEL_CLIENT_SECRET
    const merchantPin = config.airtel_merchant_pin || process.env.AIRTEL_MERCHANT_PIN
    const callbackUrl = config.airtel_callback_url || process.env.AIRTEL_CALLBACK_URL
    const environment = (config.airtel_environment || process.env.AIRTEL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'
    const country = config.airtel_country || process.env.AIRTEL_COUNTRY || 'KE'

    if (!clientId || !clientSecret) {
      return null
    }

    return {
      clientId,
      clientSecret,
      merchantPin: merchantPin || '',
      callbackUrl: callbackUrl || '',
      environment,
      country
    }
  } catch (error) {
    console.error('Error getting Airtel config:', error)
    return null
  }
}

/**
 * Get Airtel Money API base URL based on environment
 */
function getBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://openapi.airtel.africa'
    : 'https://openapiuat.airtel.africa'
}

/**
 * Get OAuth access token from Airtel Money
 */
async function getAccessToken(config: AirtelConfig): Promise<string | null> {
  try {
    const baseUrl = getBaseUrl(config.environment)

    const response = await fetch(`${baseUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'client_credentials'
      })
    })

    if (!response.ok) {
      console.error('Airtel OAuth error:', await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Error getting Airtel access token:', error)
    return null
  }
}

/**
 * Format phone number for Airtel (remove country code prefix)
 */
function formatPhoneNumber(phone: string, country: string): string {
  let cleaned = phone.replace(/[\s\-\+]/g, '')

  // Country code mappings
  const countryCodes: Record<string, string> = {
    KE: '254',
    UG: '256',
    TZ: '255',
    RW: '250',
    ZM: '260',
    MW: '265',
    NG: '234',
    GH: '233',
    CD: '243'
  }

  const countryCode = countryCodes[country] || '254'

  // Remove country code if present
  if (cleaned.startsWith(countryCode)) {
    cleaned = cleaned.substring(countryCode.length)
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  return cleaned
}

/**
 * Generate unique reference ID
 */
function generateReference(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `AIR${timestamp}${random}`.toUpperCase()
}

/**
 * Initiate Airtel Money payment (USSD Push)
 */
export async function initiateAirtelPayment(request: AirtelPaymentRequest): Promise<AirtelPaymentResponse> {
  try {
    const config = await getAirtelConfig()

    if (!config) {
      return { success: false, error: 'Airtel Money not configured' }
    }

    const accessToken = await getAccessToken(config)

    if (!accessToken) {
      return { success: false, error: 'Failed to get Airtel access token' }
    }

    const baseUrl = getBaseUrl(config.environment)
    const phoneNumber = formatPhoneNumber(request.phoneNumber, config.country)
    const reference = request.reference || generateReference()

    const payload = {
      reference,
      subscriber: {
        country: config.country,
        currency: config.country === 'KE' ? 'KES' : config.country === 'UG' ? 'UGX' : 'TZS',
        msisdn: phoneNumber
      },
      transaction: {
        amount: request.amount,
        country: config.country,
        currency: config.country === 'KE' ? 'KES' : config.country === 'UG' ? 'UGX' : 'TZS',
        id: reference
      }
    }

    const response = await fetch(`${baseUrl}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Country': config.country,
        'X-Currency': payload.subscriber.currency
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (data.status?.success === true || data.status?.code === '200') {
      // Store pending transaction
      await prisma.paymentTransaction.create({
        data: {
          provider: 'AIRTEL',
          transactionType: 'USSD_PUSH',
          airtelTransactionId: data.data?.transaction?.id || reference,
          phoneNumber: `${payload.subscriber.currency.substring(0, 3) === 'KES' ? '254' : ''}${phoneNumber}`,
          amount: request.amount,
          accountReference: reference,
          status: 'PENDING',
          loanId: request.loanId,
          borrowerId: request.borrowerId
        }
      })

      return {
        success: true,
        transactionId: data.data?.transaction?.id || reference,
        status: data.status?.message,
        message: 'Payment request sent to customer phone'
      }
    }

    return {
      success: false,
      status: data.status?.code,
      message: data.status?.message,
      error: data.status?.message || 'Failed to initiate Airtel payment'
    }
  } catch (error) {
    console.error('Airtel payment error:', error)
    return { success: false, error: 'Failed to initiate Airtel payment' }
  }
}

/**
 * Check Airtel payment status
 */
export async function checkAirtelPaymentStatus(transactionId: string): Promise<AirtelPaymentResponse> {
  try {
    const config = await getAirtelConfig()

    if (!config) {
      return { success: false, error: 'Airtel Money not configured' }
    }

    const accessToken = await getAccessToken(config)

    if (!accessToken) {
      return { success: false, error: 'Failed to get Airtel access token' }
    }

    const baseUrl = getBaseUrl(config.environment)

    const response = await fetch(`${baseUrl}/standard/v1/payments/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Country': config.country,
        'X-Currency': config.country === 'KE' ? 'KES' : config.country === 'UG' ? 'UGX' : 'TZS'
      }
    })

    const data = await response.json()

    if (data.status?.success === true) {
      const txStatus = data.data?.transaction?.status

      // Update transaction in database
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { airtelTransactionId: transactionId }
      })

      if (transaction) {
        const newStatus = txStatus === 'TS' ? 'COMPLETED' : txStatus === 'TF' ? 'FAILED' : 'PENDING'

        await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus,
            resultCode: txStatus,
            resultDesc: data.status?.message
          }
        })

        // If completed and linked to loan, create payment record
        if (newStatus === 'COMPLETED' && transaction.loanId) {
          await prisma.payment.create({
            data: {
              loanId: transaction.loanId,
              amount: transaction.amount,
              paymentDate: new Date(),
              paymentMethod: 'AIRTEL_MONEY',
              receiptNumber: data.data?.transaction?.airtel_money_id || transactionId,
              notes: `Airtel Money payment from ${transaction.phoneNumber}`,
              status: 'COMPLETED',
              transactionId: transaction.id,
              receivedBy: 'system',
              principalAmount: transaction.amount,
              interestAmount: 0
            }
          })
        }
      }

      return {
        success: txStatus === 'TS',
        transactionId: data.data?.transaction?.airtel_money_id,
        status: txStatus,
        message: data.status?.message
      }
    }

    return {
      success: false,
      error: data.status?.message || 'Failed to check payment status'
    }
  } catch (error) {
    console.error('Airtel status check error:', error)
    return { success: false, error: 'Failed to check Airtel payment status' }
  }
}

/**
 * Process Airtel Money callback
 */
export async function processAirtelCallback(data: AirtelCallbackData): Promise<{ success: boolean; payment?: any }> {
  try {
    const { transaction } = data

    if (!transaction) {
      return { success: false }
    }

    // Find the pending transaction
    const paymentTx = await prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { airtelTransactionId: transaction.id },
          { accountReference: transaction.id }
        ]
      }
    })

    if (!paymentTx) {
      console.error('Transaction not found for Airtel ID:', transaction.id)
      return { success: false }
    }

    const isSuccess = transaction.status_code === 'TS'

    // Update transaction status
    await prisma.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: {
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        airtelTransactionId: transaction.airtel_money_id || transaction.id,
        resultCode: transaction.status_code,
        resultDesc: transaction.message,
        transactionDate: new Date()
      }
    })

    if (isSuccess && paymentTx.loanId) {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          loanId: paymentTx.loanId,
          amount: paymentTx.amount,
          paymentDate: new Date(),
          paymentMethod: 'AIRTEL_MONEY',
          receiptNumber: transaction.airtel_money_id || transaction.id,
          notes: `Airtel Money payment from ${paymentTx.phoneNumber}`,
          status: 'COMPLETED',
          transactionId: paymentTx.id,
          receivedBy: 'system',
          principalAmount: paymentTx.amount,
          interestAmount: 0
        }
      })

      return { success: true, payment }
    }

    return { success: isSuccess }
  } catch (error) {
    console.error('Airtel callback processing error:', error)
    return { success: false }
  }
}
