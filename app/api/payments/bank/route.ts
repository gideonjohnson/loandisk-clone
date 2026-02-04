import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  recordBankTransfer,
  verifyBankTransfer,
  rejectBankTransfer,
  getPendingBankTransfers,
  getBankConfig
} from '@/lib/payments/bank'

// Get bank details for transfers
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const config = await getBankConfig()
    const pendingTransfers = await getPendingBankTransfers()

    return NextResponse.json({
      bankDetails: config,
      pendingTransfers
    })
  } catch (error) {
    console.error('Bank API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Record a new bank transfer
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
    const { action, ...data } = body

    // Handle verify/reject actions
    if (action === 'verify') {
      if (!data.transactionId) {
        return NextResponse.json(
          { error: 'Transaction ID is required' },
          { status: 400 }
        )
      }

      const result = await verifyBankTransfer(
        data.transactionId,
        session.user.id,
        data.bankReceiptNumber
      )

      if (result.success) {
        return NextResponse.json(result)
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      if (!data.transactionId || !data.reason) {
        return NextResponse.json(
          { error: 'Transaction ID and reason are required' },
          { status: 400 }
        )
      }

      const result = await rejectBankTransfer(
        data.transactionId,
        session.user.id,
        data.reason
      )

      if (result.success) {
        return NextResponse.json(result)
      }

      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Record new transfer
    const { bankName, accountNumber, accountName, amount, reference, loanId, borrowerId, notes } = data

    if (!bankName || !accountNumber || !accountName || !amount) {
      return NextResponse.json(
        { error: 'Bank name, account number, account name, and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    const result = await recordBankTransfer({
      bankName,
      accountNumber,
      accountName,
      amount,
      reference: reference || '',
      loanId,
      borrowerId,
      notes
    })

    if (result.success) {
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  } catch (error) {
    console.error('Bank API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
