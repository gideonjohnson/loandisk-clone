import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * Create a new user session with a random token
 */
export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  expiresInMs = 24 * 60 * 60 * 1000
) {
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + expiresInMs)

  return prisma.userSession.create({
    data: {
      userId,
      sessionToken,
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt,
    },
  })
}

/**
 * Get all active sessions for a user
 * Active means isActive=true and not yet expired
 */
export async function getActiveSessions(userId: string) {
  return prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, reason?: string) {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason || null,
    },
  })
}

/**
 * Revoke all active sessions for a user, optionally keeping one
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  const where: Record<string, unknown> = {
    userId,
    isActive: true,
  }

  if (exceptSessionId) {
    where.id = { not: exceptSessionId }
  }

  return prisma.userSession.updateMany({
    where,
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: 'Bulk session revocation',
    },
  })
}

/**
 * Clean up expired and inactive sessions
 */
export async function cleanupExpiredSessions() {
  return prisma.userSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      isActive: false,
    },
  })
}
