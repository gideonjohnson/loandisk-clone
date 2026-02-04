import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { querySTKStatus } from '@/lib/payments/mpesa'

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
    const { checkoutRequestId } = body

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'Checkout request ID is required' },
        { status: 400 }
      )
    }

    const result = await querySTKStatus(checkoutRequestId)

    return NextResponse.json({
      success: result.success,
      resultCode: result.resultCode,
      resultDesc: result.resultDesc,
      mpesaReceiptNumber: result.mpesaReceiptNumber,
      error: result.error
    })
  } catch (error) {
    console.error('M-Pesa query API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
