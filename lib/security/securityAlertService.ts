import { prisma } from '@/lib/prisma'

/**
 * Create a new security alert for a user
 */
export async function createAlert(
  userId: string,
  type: string,
  title: string,
  message: string,
  severity?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.securityAlert.create({
    data: {
      userId,
      type,
      title,
      message,
      severity: severity || 'MEDIUM',
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

/**
 * Get security alerts for a user
 * Optionally includes already-acknowledged alerts
 */
export async function getAlerts(userId: string, includeAcknowledged = false) {
  const where: Record<string, unknown> = { userId }

  if (!includeAcknowledged) {
    where.acknowledged = false
  }

  return prisma.securityAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Acknowledge a specific security alert
 */
export async function acknowledgeAlert(alertId: string) {
  return prisma.securityAlert.update({
    where: { id: alertId },
    data: {
      acknowledged: true,
      acknowledgedAt: new Date(),
    },
  })
}

/**
 * Get the count of unacknowledged alerts for a user
 */
export async function getUnacknowledgedCount(userId: string): Promise<number> {
  return prisma.securityAlert.count({
    where: {
      userId,
      acknowledged: false,
    },
  })
}
