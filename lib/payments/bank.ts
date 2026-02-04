/**
 * Bank Transfer Service
 * Handles manual bank transfer tracking and verification
 */

import { prisma } from '@/lib/prisma'

export interface BankTransferRequest {
  bankName: string
  accountNumber: string
  accountName: string
  amount: number
  reference: string
  loanId?: string
  borrowerId?: string
  notes?: string
}

export interface BankTransferResponse {
  success: boolean
  transactionId?: string
  reference?: string
  message?: string
  error?: string
}

export interface BankConfig {
  bankName: string
  accountNumber: string
  accountName: string
  branchCode?: string
  swiftCode?: string
}

/**
 * Get bank configuration from database
 */
export async function getBankConfig(): Promise<BankConfig | null> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'bank_name',
            'bank_account_number',
            'bank_account_name',
            'bank_branch_code',
            'bank_swift_code'
          ]
        }
      }
    })

    const config: Record<string, string> = {}
    settings.forEach(s => {
      config[s.key] = s.value
    })

    if (!config.bank_name || !config.bank_account_number) {
      return null
    }

    return {
      bankName: config.bank_name,
      accountNumber: config.bank_account_number,
      accountName: config.bank_account_name || '',
      branchCode: config.bank_branch_code,
      swiftCode: config.bank_swift_code
    }
  } catch (error) {
    console.error('Error getting bank config:', error)
    return null
  }
}

/**
 * Generate unique bank reference
 */
function generateBankReference(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `BNK${timestamp}${random}`.toUpperCase()
}

/**
 * Record a pending bank transfer (user will transfer manually)
 */
export async function recordBankTransfer(request: BankTransferRequest): Promise<BankTransferResponse> {
  try {
    const reference = request.reference || generateBankReference()

    // Create pending transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        provider: 'BANK',
        transactionType: 'BANK_TRANSFER',
        bankReference: reference,
        amount: request.amount,
        accountReference: `${request.bankName} - ${request.accountNumber}`,
        status: 'PENDING',
        loanId: request.loanId,
        borrowerId: request.borrowerId,
        resultDesc: request.notes || `Bank transfer from ${request.accountName}`
      }
    })

    return {
      success: true,
      transactionId: transaction.id,
      reference,
      message: 'Bank transfer recorded. Please complete the transfer and it will be verified.'
    }
  } catch (error) {
    console.error('Bank transfer recording error:', error)
    return { success: false, error: 'Failed to record bank transfer' }
  }
}

/**
 * Verify a bank transfer (admin action)
 */
export async function verifyBankTransfer(
  transactionId: string,
  verifiedBy: string,
  bankReceiptNumber?: string
): Promise<BankTransferResponse> {
  try {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return { success: false, error: 'Transaction not found' }
    }

    if (transaction.status === 'COMPLETED') {
      return { success: false, error: 'Transaction already verified' }
    }

    // Update transaction status
    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        bankReference: bankReceiptNumber || transaction.bankReference,
        transactionDate: new Date(),
        resultCode: 'VERIFIED',
        resultDesc: `Verified by ${verifiedBy}`
      }
    })

    // If linked to a loan, create payment record
    if (transaction.loanId) {
      await prisma.payment.create({
        data: {
          loanId: transaction.loanId,
          amount: transaction.amount,
          paymentDate: new Date(),
          paymentMethod: 'BANK_TRANSFER',
          receiptNumber: bankReceiptNumber || transaction.bankReference || transactionId,
          notes: `Bank transfer verified by ${verifiedBy}`,
          status: 'COMPLETED',
          transactionId: transaction.id,
          receivedBy: verifiedBy,
          principalAmount: transaction.amount,
          interestAmount: 0
        }
      })
    }

    return {
      success: true,
      transactionId,
      message: 'Bank transfer verified successfully'
    }
  } catch (error) {
    console.error('Bank transfer verification error:', error)
    return { success: false, error: 'Failed to verify bank transfer' }
  }
}

/**
 * Reject a bank transfer (admin action)
 */
export async function rejectBankTransfer(
  transactionId: string,
  rejectedBy: string,
  reason: string
): Promise<BankTransferResponse> {
  try {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return { success: false, error: 'Transaction not found' }
    }

    if (transaction.status !== 'PENDING') {
      return { success: false, error: 'Can only reject pending transactions' }
    }

    await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        resultCode: 'REJECTED',
        resultDesc: `Rejected by ${rejectedBy}: ${reason}`
      }
    })

    return {
      success: true,
      transactionId,
      message: 'Bank transfer rejected'
    }
  } catch (error) {
    console.error('Bank transfer rejection error:', error)
    return { success: false, error: 'Failed to reject bank transfer' }
  }
}

/**
 * Get pending bank transfers
 */
export async function getPendingBankTransfers() {
  try {
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        provider: 'BANK',
        status: 'PENDING'
      },
      include: {
        loan: {
          include: {
            borrower: true
          }
        },
        borrower: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return transactions
  } catch (error) {
    console.error('Error fetching pending bank transfers:', error)
    return []
  }
}

/**
 * Get bank transfer by reference
 */
export async function getBankTransferByReference(reference: string) {
  try {
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        provider: 'BANK',
        bankReference: reference
      },
      include: {
        loan: true,
        borrower: true
      }
    })

    return transaction
  } catch (error) {
    console.error('Error fetching bank transfer:', error)
    return null
  }
}
