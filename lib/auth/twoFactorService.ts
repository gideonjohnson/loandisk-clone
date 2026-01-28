/**
 * Two-Factor Authentication Service
 * Handles TOTP-based 2FA using authenticator apps
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const APP_NAME = 'Meek Microfinance'

/**
 * Generate a new TOTP secret for a user
 */
export async function generateTwoFactorSecret(userId: string): Promise<{
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Generate a random secret
  const secret = authenticator.generateSecret()

  // Create the otpauth URL for authenticator apps
  const otpauthUrl = authenticator.keyuri(user.email, APP_NAME, secret)

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

  // Generate backup codes
  const backupCodes = generateBackupCodes()

  // Store the secret (not yet verified)
  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      secret,
      backupCodes: JSON.stringify(backupCodes),
    },
    update: {
      secret,
      backupCodes: JSON.stringify(backupCodes),
      verifiedAt: null,
    },
  })

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  }
}

/**
 * Generate backup codes for account recovery
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

/**
 * Verify a TOTP code and enable 2FA for the user
 */
export async function verifyAndEnable2FA(
  userId: string,
  code: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  })

  if (!twoFactorAuth) {
    return { success: false, error: '2FA setup not initiated' }
  }

  // Verify the code
  const isValid = authenticator.verify({
    token: code,
    secret: twoFactorAuth.secret,
  })

  if (!isValid) {
    return { success: false, error: 'Invalid verification code' }
  }

  // Mark 2FA as verified and enable on user account
  await prisma.$transaction([
    prisma.twoFactorAuth.update({
      where: { userId },
      data: { verifiedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    }),
  ])

  const backupCodes = JSON.parse(twoFactorAuth.backupCodes || '[]')

  return { success: true, backupCodes }
}

/**
 * Verify a TOTP code during login
 */
export async function verifyTwoFactorCode(
  userId: string,
  code: string
): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  })

  if (!twoFactorAuth || !twoFactorAuth.verifiedAt) {
    return false
  }

  // First try TOTP verification
  const isValid = authenticator.verify({
    token: code,
    secret: twoFactorAuth.secret,
  })

  if (isValid) {
    return true
  }

  // Check if it's a backup code
  const backupCodes: string[] = JSON.parse(twoFactorAuth.backupCodes || '[]')
  const normalizedCode = code.toUpperCase().replace(/\s/g, '')
  const codeIndex = backupCodes.findIndex(
    (bc) => bc.replace('-', '') === normalizedCode || bc === normalizedCode
  )

  if (codeIndex !== -1) {
    // Remove the used backup code
    backupCodes.splice(codeIndex, 1)
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: JSON.stringify(backupCodes) },
    })
    return true
  }

  return false
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.twoFactorAuth.delete({
      where: { userId },
    }).catch(() => {}), // Ignore if doesn't exist
    prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    }),
  ])
}

/**
 * Check if 2FA is enabled for a user
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  })

  return user?.twoFactorEnabled ?? false
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  })

  if (!twoFactorAuth?.backupCodes) {
    return 0
  }

  const codes: string[] = JSON.parse(twoFactorAuth.backupCodes)
  return codes.length
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  })

  if (!twoFactorAuth || !twoFactorAuth.verifiedAt) {
    throw new Error('2FA is not enabled')
  }

  const newCodes = generateBackupCodes()

  await prisma.twoFactorAuth.update({
    where: { userId },
    data: { backupCodes: JSON.stringify(newCodes) },
  })

  return newCodes
}
