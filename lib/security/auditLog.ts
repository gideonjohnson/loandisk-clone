/**
 * Enhanced Audit Logging Service
 * Tracks all security-relevant actions
 */

import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_LOCKED'
  | 'USER_UNLOCKED'
  | 'LOAN_CREATED'
  | 'LOAN_APPROVED'
  | 'LOAN_REJECTED'
  | 'LOAN_DISBURSED'
  | 'LOAN_CLOSED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REVERSED'
  | 'BORROWER_CREATED'
  | 'BORROWER_UPDATED'
  | 'BORROWER_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_DELETED'
  | 'SIGNATURE_REQUESTED'
  | 'DOCUMENT_SIGNED'
  | 'SETTINGS_CHANGED'
  | 'DATA_EXPORT'
  | 'BULK_OPERATION'
  | 'API_ACCESS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  severity?: AuditSeverity
}

/**
 * Get severity level for an action
 */
function getActionSeverity(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = [
    'LOGIN_FAILED',
    'PASSWORD_CHANGE',
    'USER_DELETED',
    'LOAN_DISBURSED',
    'PAYMENT_REVERSED',
    'DATA_EXPORT',
    'RATE_LIMIT_EXCEEDED',
    'SUSPICIOUS_ACTIVITY',
  ]

  const highActions: AuditAction[] = [
    'USER_CREATED',
    'USER_LOCKED',
    'LOAN_APPROVED',
    'LOAN_REJECTED',
    'SETTINGS_CHANGED',
    'BULK_OPERATION',
  ]

  const mediumActions: AuditAction[] = [
    'LOGIN_SUCCESS',
    'LOGOUT',
    'LOAN_CREATED',
    'PAYMENT_RECEIVED',
    'BORROWER_CREATED',
    'BORROWER_UPDATED',
    'DOCUMENT_UPLOADED',
    'DOCUMENT_SIGNED',
  ]

  if (criticalActions.includes(action)) return 'CRITICAL'
  if (highActions.includes(action)) return 'HIGH'
  if (mediumActions.includes(action)) return 'MEDIUM'
  return 'LOW'
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const severity = entry.severity || getActionSeverity(entry.action)

    await prisma.activityLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType || 'System',
        entityId: entry.entityId || '',
        details: JSON.stringify({
          ...entry.details,
          severity,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: new Date().toISOString(),
        }),
      },
    })

    // Log critical events to console for monitoring
    if (severity === 'CRITICAL') {
      console.warn(`[AUDIT CRITICAL] ${entry.action}`, {
        userId: entry.userId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ip: entry.ipAddress,
      })
    }
  } catch (error) {
    // Don't let audit logging failures break the application
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(request: Request): {
  ipAddress: string
  userAgent: string
} {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { ipAddress, userAgent }
}

/**
 * Log a login attempt
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  userId: string | null,
  request: Request
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request)

  await createAuditLog({
    userId: userId || 'anonymous',
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    entityType: 'User',
    entityId: userId || email,
    details: { email, success },
    ipAddress,
    userAgent,
  })
}

/**
 * Log a financial transaction
 */
export async function logFinancialTransaction(
  userId: string,
  action: 'PAYMENT_RECEIVED' | 'PAYMENT_REVERSED' | 'LOAN_DISBURSED',
  entityId: string,
  amount: number,
  request: Request
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request)

  await createAuditLog({
    userId,
    action,
    entityType: action === 'LOAN_DISBURSED' ? 'Loan' : 'Payment',
    entityId,
    details: { amount },
    ipAddress,
    userAgent,
    severity: 'CRITICAL',
  })
}

/**
 * Log a data export
 */
export async function logDataExport(
  userId: string,
  exportType: string,
  recordCount: number,
  request: Request
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request)

  await createAuditLog({
    userId,
    action: 'DATA_EXPORT',
    entityType: 'Export',
    details: { exportType, recordCount },
    ipAddress,
    userAgent,
    severity: 'CRITICAL',
  })
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string,
  description: string,
  request: Request
): Promise<void> {
  const { ipAddress, userAgent } = getRequestMetadata(request)

  await createAuditLog({
    userId,
    action: 'SUSPICIOUS_ACTIVITY',
    entityType: 'Security',
    details: { description },
    ipAddress,
    userAgent,
    severity: 'CRITICAL',
  })
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(options: {
  userId?: string
  action?: AuditAction
  entityType?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
  severity?: AuditSeverity
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}

  if (options.userId) where.userId = options.userId
  if (options.action) where.action = options.action
  if (options.entityType) where.entityType = options.entityType
  if (options.entityId) where.entityId = options.entityId

  if (options.startDate || options.endDate) {
    where.createdAt = {}
    if (options.startDate) (where.createdAt as Record<string, unknown>).gte = options.startDate
    if (options.endDate) (where.createdAt as Record<string, unknown>).lte = options.endDate
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 100,
    skip: options.offset || 0,
  })

  // Filter by severity if specified (severity is in details JSON)
  if (options.severity) {
    return logs.filter(log => {
      const details = JSON.parse(log.details || '{}')
      return details.severity === options.severity
    })
  }

  return logs
}
