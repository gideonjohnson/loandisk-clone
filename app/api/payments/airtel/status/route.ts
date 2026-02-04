import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAirtelPaymentStatus } from '@/lib/payments/airtel'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { transactionId } = body

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const result = await checkAirtelPaymentStatus(transactionId)

    return NextResponse.json({
      success: result.success,
      transactionId: result.transactionId,
      status: result.status,
      message: result.message,
      error: result.error
    })
  } catch (error) {
    console.error('Airtel status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
