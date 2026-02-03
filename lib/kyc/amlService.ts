import { prisma } from '@/lib/prisma'

export interface AMLResult {
  clear: boolean
  flags: string[]
}

/**
 * Run internal AML checks for a borrower.
 * Checks for blacklisting, duplicate IDs, duplicate phone/email,
 * and name matches against blacklisted borrowers.
 */
export async function runAMLCheck(borrowerId: string): Promise<AMLResult> {
  const borrower = await prisma.borrower.findUnique({
    where: { id: borrowerId },
  })

  if (!borrower) {
    throw new Error('Borrower not found')
  }

  const flags: string[] = []

  // 1. Check if borrower is blacklisted
  if (borrower.blacklisted) {
    flags.push('BLACKLISTED')
  }

  // 2. Check for duplicate idNumber across other borrowers
  if (borrower.idNumber) {
    const duplicateId = await prisma.borrower.findFirst({
      where: {
        idNumber: borrower.idNumber,
        id: { not: borrowerId },
      },
    })
    if (duplicateId) {
      flags.push('DUPLICATE_ID')
    }
  }

  // 3. Check for duplicate phone across other borrowers
  if (borrower.phone) {
    const duplicatePhone = await prisma.borrower.findFirst({
      where: {
        phone: borrower.phone,
        id: { not: borrowerId },
      },
    })
    if (duplicatePhone) {
      flags.push('DUPLICATE_PHONE')
    }
  }

  // 4. Check for duplicate email across other borrowers (if email is not null)
  if (borrower.email) {
    const duplicateEmail = await prisma.borrower.findFirst({
      where: {
        email: borrower.email,
        id: { not: borrowerId },
      },
    })
    if (duplicateEmail) {
      flags.push('DUPLICATE_EMAIL')
    }
  }

  // 5. Check if name matches any blacklisted borrower names (case-insensitive contains)
  const blacklistedBorrowers = await prisma.borrower.findMany({
    where: {
      blacklisted: true,
      id: { not: borrowerId },
    },
    select: {
      firstName: true,
      lastName: true,
    },
  })

  const borrowerFirstName = borrower.firstName.toLowerCase()
  const borrowerLastName = borrower.lastName.toLowerCase()

  for (const blacklisted of blacklistedBorrowers) {
    const blFirstName = blacklisted.firstName.toLowerCase()
    const blLastName = blacklisted.lastName.toLowerCase()

    if (
      (borrowerFirstName.includes(blFirstName) || blFirstName.includes(borrowerFirstName)) &&
      (borrowerLastName.includes(blLastName) || blLastName.includes(borrowerLastName))
    ) {
      flags.push('NAME_MATCH_BLACKLISTED')
      break
    }
  }

  return {
    clear: flags.length === 0,
    flags,
  }
}

/**
 * Update the AML check status on a KYC verification record.
 */
export async function updateAMLStatus(
  verificationId: string,
  result: AMLResult
) {
  const verification = await prisma.kYCVerification.findUnique({
    where: { id: verificationId },
  })

  if (!verification) {
    throw new Error('KYC verification not found')
  }

  const updated = await prisma.kYCVerification.update({
    where: { id: verificationId },
    data: {
      amlCheckStatus: result.clear ? 'CLEAR' : 'FLAGGED',
      amlCheckDate: new Date(),
      amlFlags: result.flags.length > 0 ? JSON.stringify(result.flags) : null,
    },
  })

  return updated
}
