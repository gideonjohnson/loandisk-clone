import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateSTKPush } from '@/lib/payments/mpesa'

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
    const { phoneNumber, amount, accountReference, transactionDesc, loanId, borrowerId } = body

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

    const result = await initiateSTKPush({
      phoneNumber,
      amount,
      accountReference: accountReference || 'Loan Payment',
      transactionDesc: transactionDesc || 'Loan repayment',
      loanId,
      borrowerId
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        checkoutRequestId: result.checkoutRequestID,
        merchantRequestId: result.merchantRequestID,
        customerMessage: result.customerMessage,
        message: 'STK Push sent successfully. Please check your phone to complete the payment.'
      })
    }

    return NextResponse.json(
      { success: false, error: result.error || 'Failed to initiate M-Pesa payment' },
      { status: 400 }
    )
  } catch (error) {
    console.error('M-Pesa STK Push API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
