/**
 * Password Reset Service
 * Handles password reset token generation, validation, and rate limiting
 */

import { prisma } from '@/lib/prisma'
import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcrypt'

const RESET_TOKEN_EXPIRY_HOURS = 1
const MAX_RESET_REQUESTS_PER_HOUR = 3

/**
 * Generate a secure random reset token
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token using SHA-256 for secure storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Check if user has exceeded rate limit for password reset requests
 * Uses ActivityLog to track requests (3 per hour)
 */
async function isRateLimited(email: string): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const recentRequests = await prisma.activityLog.count({
    where: {
      action: 'PASSWORD_RESET_REQUESTED',
      details: {
        contains: email.toLowerCase(),
      },
      createdAt: { gte: hourAgo },
    },
  })

  return recentRequests >= MAX_RESET_REQUESTS_PER_HOUR
}

/**
 * Log password reset request for rate limiting
 */
async function logResetRequest(userId: string, email: string, ipAddress?: string | null): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      details: JSON.stringify({
        email: email.toLowerCase(),
        timestamp: new Date().toISOString(),
      }),
    },
  })
}

export interface InitiateResetResult {
  success: boolean
  error?: string
  rateLimited?: boolean
}

/**
 * Initiate password reset - generate token and store it
 * Returns the raw token (to be sent in email) or null if user not found/rate limited
 */
export async function initiatePasswordReset(
  email: string,
  ipAddress?: string | null
): Promise<{ token: string | null; result: InitiateResetResult }> {
  const normalizedEmail = email.toLowerCase().trim()

  // Check rate limit first (before revealing if user exists)
  if (await isRateLimited(normalizedEmail)) {
    return {
      token: null,
      result: { success: false, rateLimited: true, error: 'Too many reset requests. Please try again later.' },
    }
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, active: true },
  })

  // Always return success to prevent email enumeration
  // but only actually process if user exists and is active
  if (!user || !user.active) {
    return {
      token: null,
      result: { success: true }, // Don't reveal user doesn't exist
    }
  }

  // Generate token
  const rawToken = generateResetToken()
  const hashedToken = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  // Store hashed token in database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: expiresAt,
    },
  })

  // Log the request for rate limiting
  await logResetRequest(user.id, normalizedEmail, ipAddress)

  return {
    token: rawToken,
    result: { success: true },
  }
}

export interface ResetPasswordResult {
  success: boolean
  error?: string
}

/**
 * Reset password using token
 * Validates token, updates password, clears sessions, creates security alert
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  ipAddress?: string | null
): Promise<ResetPasswordResult> {
  // Validate password complexity
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long' }
  }

  // Hash the provided token to compare with stored hash
  const hashedToken = hashToken(token)

  // Find user with this token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
      active: true,
    },
    select: { id: true, email: true },
  })

  if (!user) {
    return { success: false, error: 'Invalid or expired reset token' }
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  // Update password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
    },
  })

  // Invalidate all existing sessions
  await prisma.userSession.updateMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: 'Password reset',
    },
  })

  // Create security alert
  await prisma.securityAlert.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_CHANGE',
      title: 'Password Changed',
      message: 'Your password was changed via password reset. If you did not make this change, please contact support immediately.',
      severity: 'MEDIUM',
      metadata: JSON.stringify({ ipAddress, method: 'reset_link' }),
    },
  })

  // Log the password change
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      details: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
    },
  })

  return { success: true }
}

/**
 * Validate a reset token without using it
 */
export async function validateResetToken(token: string): Promise<boolean> {
  const hashedToken = hashToken(token)

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
      active: true,
    },
    select: { id: true },
  })

  return !!user
}
