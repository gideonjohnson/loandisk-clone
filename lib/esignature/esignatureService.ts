/**
 * E-Signature Service
 * Handles electronic signature integration for loan agreements
 * Supports DocuSign, HelloSign, or internal signature capture
 */

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export type ESignatureProvider = 'docusign' | 'hellosign' | 'internal' | 'mock'

export interface SignatureRequest {
  documentId: string
  loanId: string
  borrowerId: string
  borrowerEmail: string
  borrowerName: string
  documentUrl: string
  documentType: 'LOAN_AGREEMENT' | 'PROMISSORY_NOTE' | 'DISCLOSURE' | 'OTHER'
}

export interface SignatureStatus {
  requestId: string
  status: 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED'
  signedAt?: Date
  signatureUrl?: string
  token?: string
}

export interface ESignatureConfig {
  provider: ESignatureProvider
  docusign?: {
    integrationKey: string
    accountId: string
    userId: string
    privateKey: string
  }
  hellosign?: {
    apiKey: string
  }
}

/**
 * Get e-signature configuration
 */
function getESignatureConfig(): ESignatureConfig {
  const provider = (process.env.ESIGNATURE_PROVIDER || 'internal') as ESignatureProvider

  return {
    provider,
    docusign: {
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || '',
      accountId: process.env.DOCUSIGN_ACCOUNT_ID || '',
      userId: process.env.DOCUSIGN_USER_ID || '',
      privateKey: process.env.DOCUSIGN_PRIVATE_KEY || '',
    },
    hellosign: {
      apiKey: process.env.HELLOSIGN_API_KEY || '',
    },
  }
}

/**
 * Generate unique secure token for signing
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a signature request via DocuSign
 */
async function createDocuSignRequest(request: SignatureRequest): Promise<SignatureStatus> {
  const config = getESignatureConfig()

  if (!config.docusign?.integrationKey) {
    throw new Error('DocuSign not configured')
  }

  // DocuSign API integration would go here
  console.log('DocuSign request would be created here:', request)
  const token = generateSecureToken()

  return {
    requestId: token,
    status: 'SENT',
    token,
  }
}

/**
 * Create a signature request via HelloSign
 */
async function createHelloSignRequest(request: SignatureRequest): Promise<SignatureStatus> {
  const config = getESignatureConfig()

  if (!config.hellosign?.apiKey) {
    throw new Error('HelloSign not configured')
  }

  // HelloSign API integration would go here
  console.log('HelloSign request would be created here:', request)
  const token = generateSecureToken()

  return {
    requestId: token,
    status: 'SENT',
    token,
  }
}

/**
 * Create an internal signature request (email link)
 */
async function createInternalSignatureRequest(request: SignatureRequest): Promise<SignatureStatus> {
  const token = generateSecureToken()
  const signatureUrl = `/sign/${token}`

  return {
    requestId: token,
    status: 'PENDING',
    signatureUrl,
    token,
  }
}

/**
 * Create a mock signature request for development
 */
async function createMockSignatureRequest(request: SignatureRequest): Promise<SignatureStatus> {
  console.log('=== MOCK E-SIGNATURE REQUEST ===')
  console.log(`Document: ${request.documentType}`)
  console.log(`Borrower: ${request.borrowerName} (${request.borrowerEmail})`)
  console.log(`Loan ID: ${request.loanId}`)
  console.log('================================')

  const token = generateSecureToken()

  return {
    requestId: token,
    status: 'PENDING',
    signatureUrl: `/sign/${token}`,
    token,
  }
}

/**
 * Request e-signature for a document
 */
export async function requestSignature(request: SignatureRequest): Promise<SignatureStatus> {
  const config = getESignatureConfig()
  let result: SignatureStatus

  switch (config.provider) {
    case 'docusign':
      result = await createDocuSignRequest(request)
      break
    case 'hellosign':
      result = await createHelloSignRequest(request)
      break
    case 'internal':
      result = await createInternalSignatureRequest(request)
      break
    case 'mock':
    default:
      result = await createMockSignatureRequest(request)
  }

  // Store signature request in database
  await storeSignatureRequest(request, result)

  return result
}

/**
 * Store signature request in database
 */
async function storeSignatureRequest(
  request: SignatureRequest,
  result: SignatureStatus
) {
  // Create expiration date (7 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.signatureRequest.create({
    data: {
      loanId: request.loanId,
      borrowerId: request.borrowerId,
      token: result.token || result.requestId,
      documentType: request.documentType,
      status: result.status,
      expiresAt,
    },
  })
}

/**
 * Verify signing token and get signature request details
 */
export async function verifySigningToken(token: string) {
  const signatureRequest = await prisma.signatureRequest.findUnique({
    where: { token },
    include: {
      loan: {
        include: {
          borrower: true,
        },
      },
      borrower: true,
    },
  })

  if (!signatureRequest) {
    return { valid: false, error: 'Invalid signing link' }
  }

  // Check if expired
  if (new Date() > signatureRequest.expiresAt) {
    return { valid: false, error: 'This signing link has expired' }
  }

  // Check if already signed
  if (signatureRequest.status === 'SIGNED') {
    return { valid: false, error: 'This document has already been signed' }
  }

  // Mark as viewed if first time
  if (signatureRequest.status === 'PENDING' || signatureRequest.status === 'SENT') {
    await prisma.signatureRequest.update({
      where: { id: signatureRequest.id },
      data: {
        status: 'VIEWED',
        viewedAt: new Date(),
      },
    })
  }

  return {
    valid: true,
    data: {
      requestId: signatureRequest.id,
      loanId: signatureRequest.loanId,
      borrowerName: `${signatureRequest.borrower.firstName} ${signatureRequest.borrower.lastName}`,
      borrowerEmail: signatureRequest.borrower.email,
      documentType: signatureRequest.documentType,
      loanNumber: signatureRequest.loan.loanNumber,
      principalAmount: signatureRequest.loan.principalAmount,
      interestRate: signatureRequest.loan.interestRate,
      termMonths: signatureRequest.loan.termMonths,
    },
  }
}

/**
 * Record a signature completion
 */
export async function recordSignature(
  token: string,
  signatureData: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  const signatureRequest = await prisma.signatureRequest.findUnique({
    where: { token },
  })

  if (!signatureRequest) {
    return { success: false, error: 'Invalid signature request' }
  }

  if (signatureRequest.status === 'SIGNED') {
    return { success: false, error: 'Document already signed' }
  }

  if (new Date() > signatureRequest.expiresAt) {
    return { success: false, error: 'Signing link has expired' }
  }

  // Update signature request with signature data
  await prisma.signatureRequest.update({
    where: { id: signatureRequest.id },
    data: {
      status: 'SIGNED',
      signatureData,
      signedAt: new Date(),
      ipAddress,
      userAgent,
    },
  })

  // Log the activity
  await prisma.activityLog.create({
    data: {
      userId: 'system',
      action: 'DOCUMENT_SIGNED',
      entityType: 'Loan',
      entityId: signatureRequest.loanId,
      details: JSON.stringify({
        requestId: signatureRequest.id,
        signedAt: new Date(),
        documentType: signatureRequest.documentType,
      }),
      ipAddress,
      userAgent,
    },
  })

  return { success: true }
}

/**
 * Get signature status by token
 */
export async function getSignatureStatus(token: string): Promise<SignatureStatus | null> {
  const signatureRequest = await prisma.signatureRequest.findUnique({
    where: { token },
  })

  if (!signatureRequest) {
    return null
  }

  return {
    requestId: signatureRequest.id,
    status: signatureRequest.status as SignatureStatus['status'],
    signedAt: signatureRequest.signedAt || undefined,
    signatureUrl: `/sign/${signatureRequest.token}`,
    token: signatureRequest.token,
  }
}

/**
 * Request loan agreement signature
 */
export async function requestLoanAgreementSignature(
  loanId: string,
  borrowerId: string,
  borrowerEmail: string,
  borrowerName: string,
  documentUrl: string
): Promise<SignatureStatus> {
  return requestSignature({
    documentId: `loan-agreement-${loanId}`,
    loanId,
    borrowerId,
    borrowerEmail,
    borrowerName,
    documentUrl,
    documentType: 'LOAN_AGREEMENT',
  })
}

/**
 * Get pending signature requests for a loan
 */
export async function getPendingSignatures(loanId: string) {
  const signatures = await prisma.signatureRequest.findMany({
    where: {
      loanId,
      status: {
        in: ['PENDING', 'SENT', 'VIEWED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return signatures.map(sig => ({
    id: sig.id,
    token: sig.token,
    documentType: sig.documentType,
    status: sig.status,
    signatureUrl: `/sign/${sig.token}`,
    createdAt: sig.createdAt,
    expiresAt: sig.expiresAt,
    viewedAt: sig.viewedAt,
  }))
}

/**
 * Get all signature requests for a loan
 */
export async function getLoanSignatures(loanId: string) {
  const signatures = await prisma.signatureRequest.findMany({
    where: { loanId },
    orderBy: { createdAt: 'desc' },
    include: {
      borrower: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })

  return signatures.map(sig => ({
    id: sig.id,
    token: sig.token,
    documentType: sig.documentType,
    status: sig.status,
    signatureUrl: `/sign/${sig.token}`,
    createdAt: sig.createdAt,
    expiresAt: sig.expiresAt,
    viewedAt: sig.viewedAt,
    signedAt: sig.signedAt,
    borrowerName: `${sig.borrower.firstName} ${sig.borrower.lastName}`,
    borrowerEmail: sig.borrower.email,
  }))
}

/**
 * Verify signature authenticity (basic implementation)
 */
export function verifySignature(signatureData: string): boolean {
  return signatureData.length > 0 && signatureData.includes('data:image')
}
