import { prisma } from '@/lib/prisma'

/**
 * Initiate KYC verification for a borrower.
 * Creates a new KYCVerification record with status NOT_STARTED.
 */
export async function initiateKYC(borrowerId: string) {
  // Verify the borrower exists
  const borrower = await prisma.borrower.findUnique({
    where: { id: borrowerId },
  })

  if (!borrower) {
    throw new Error('Borrower not found')
  }

  // Check if there is already an active (non-rejected) KYC verification
  const existing = await prisma.kYCVerification.findFirst({
    where: {
      borrowerId,
      status: { notIn: ['REJECTED'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    throw new Error(`A KYC verification already exists with status: ${existing.status}`)
  }

  const verification = await prisma.kYCVerification.create({
    data: {
      borrowerId,
      status: 'NOT_STARTED',
    },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  return verification
}

/**
 * Submit KYC documents for a verification.
 * Updates the verification with document info and sets status to PENDING.
 */
export async function submitKYCDocuments(
  verificationId: string,
  data: {
    documentType: string
    documentNumber: string
    idFrontUrl: string
    idBackUrl?: string
    selfieUrl?: string
    proofOfAddress?: string
  }
) {
  const verification = await prisma.kYCVerification.findUnique({
    where: { id: verificationId },
  })

  if (!verification) {
    throw new Error('KYC verification not found')
  }

  if (verification.status !== 'NOT_STARTED' && verification.status !== 'REJECTED') {
    throw new Error(`Cannot submit documents for verification with status: ${verification.status}`)
  }

  const updated = await prisma.kYCVerification.update({
    where: { id: verificationId },
    data: {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      idFrontUrl: data.idFrontUrl,
      idBackUrl: data.idBackUrl || null,
      selfieUrl: data.selfieUrl || null,
      proofOfAddress: data.proofOfAddress || null,
      status: 'PENDING',
      submittedAt: new Date(),
    },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  return updated
}

/**
 * Review a KYC verification (approve or reject).
 * If VERIFIED, also updates the Borrower record.
 */
export async function reviewKYC(
  verificationId: string,
  reviewerId: string,
  decision: 'VERIFIED' | 'REJECTED',
  notes?: string,
  rejectionReason?: string
) {
  const verification = await prisma.kYCVerification.findUnique({
    where: { id: verificationId },
  })

  if (!verification) {
    throw new Error('KYC verification not found')
  }

  if (verification.status !== 'PENDING' && verification.status !== 'UNDER_REVIEW') {
    throw new Error(`Cannot review verification with status: ${verification.status}`)
  }

  const updated = await prisma.kYCVerification.update({
    where: { id: verificationId },
    data: {
      status: decision,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      reviewNotes: notes || null,
      rejectionReason: decision === 'REJECTED' ? (rejectionReason || null) : null,
    },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // If verified, update the borrower's KYC status
  if (decision === 'VERIFIED') {
    await prisma.borrower.update({
      where: { id: verification.borrowerId },
      data: {
        kycVerified: true,
        kycVerifiedAt: new Date(),
      },
    })
  }

  return updated
}

/**
 * Get the latest KYC verification status for a borrower.
 */
export async function getKYCStatus(borrowerId: string) {
  const verification = await prisma.kYCVerification.findFirst({
    where: { borrowerId },
    orderBy: { createdAt: 'desc' },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          kycVerified: true,
          kycVerifiedAt: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return verification
}

/**
 * Get pending KYC reviews, optionally filtered by status.
 * Defaults to PENDING if no status is provided.
 */
export async function getPendingKYCReviews(status?: string) {
  const filterStatus = status || 'PENDING'

  const verifications = await prisma.kYCVerification.findMany({
    where: { status: filterStatus },
    orderBy: { submittedAt: 'asc' },
    include: {
      borrower: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  return verifications
}
