import { NextResponse } from 'next/server'
import { processAirtelCallback } from '@/lib/payments/airtel'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('Airtel callback received:', JSON.stringify(body, null, 2))

    const result = await processAirtelCallback(body)

    if (result.success) {
      console.log('Airtel callback processed successfully')
    } else {
      console.error('Airtel callback processing failed')
    }

    // Always return success to Airtel
    return NextResponse.json({
      status: {
        code: '200',
        message: 'Success',
        success: true
      }
    })
  } catch (error) {
    console.error('Airtel callback error:', error)
    // Always return success to avoid retries
    return NextResponse.json({
      status: {
        code: '200',
        message: 'Success',
        success: true
      }
    })
  }
}
