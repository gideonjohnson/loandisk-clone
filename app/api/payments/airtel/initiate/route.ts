import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateAirtelPayment } from '@/lib/payments/airtel'

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
    const { phoneNumber, amount, reference, loanId, borrowerId } = body

    // Validate inputs
    if (!phoneNumber || !amount) {
      return NextResponse.json(
        { error: 'Phone number and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const result = await initiateAirtelPayment({
      phoneNumber,
      amount,
      reference: reference || '',
      loanId,
      borrowerId
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        message: result.message || 'Payment request sent. Please check your phone to complete.'
      })
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to initiate Airtel payment' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Airtel payment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
