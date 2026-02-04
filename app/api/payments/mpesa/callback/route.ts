import { NextResponse } from 'next/server'
import { processSTKCallback, processC2BConfirmation } from '@/lib/payments/mpesa'

// M-Pesa STK Push callback
export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('M-Pesa callback received:', JSON.stringify(body, null, 2))

    // Handle STK Push callback
    if (body.Body?.stkCallback) {
      const result = await processSTKCallback(body)

      if (result.success) {
        console.log('STK callback processed successfully')
      } else {
        console.error('STK callback processing failed')
      }

      // Always return success to M-Pesa
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Handle C2B confirmation
    if (body.TransID && body.MSISDN) {
      const result = await processC2BConfirmation(body)

      if (result.success) {
        console.log('C2B confirmation processed successfully')
      } else {
        console.error('C2B confirmation processing failed')
      }

      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    // Unknown callback format
    console.warn('Unknown M-Pesa callback format:', body)
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (error) {
    console.error('M-Pesa callback error:', error)
    // Always return success to avoid retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}

// M-Pesa C2B validation (optional)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const transactionType = searchParams.get('TransactionType')

  // Validation endpoint - return success to accept all payments
  console.log('M-Pesa validation request:', transactionType)

  return NextResponse.json({
    ResultCode: '0',
    ResultDesc: 'Accepted'
  })
}
