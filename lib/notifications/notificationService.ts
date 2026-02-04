/**
 * Notification Service
 * Handles creation and management of in-app notifications
 */

import { prisma } from '@/lib/prisma'
import { notificationBroadcaster, createNotificationPayload } from './notificationBroadcaster'

export type NotificationType =
  | 'LOAN_APPROVED'
  | 'LOAN_REJECTED'
  | 'LOAN_DISBURSED'
  | 'PAYMENT_DUE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'SYSTEM'

export type NotificationCategory =
  | 'LOAN'
  | 'PAYMENT'
  | 'SYSTEM'
  | 'ALERT'

interface CreateNotificationPayload {
  userId: string
  type: NotificationType
  category: NotificationCategory
  title: string
  message: string
}

interface LoanInfo {
  id: string
  loanNumber: string
  principalAmount: number | string
}

interface BorrowerInfo {
  id: string
  firstName: string
  lastName: string
}

interface UserInfo {
  id: string
  name: string
}

/**
 * Create a notification record in the database and broadcast to connected clients
 */
export async function createNotification(payload: CreateNotificationPayload) {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      category: payload.category,
      title: payload.title,
      message: payload.message,
      status: 'UNREAD',
      createdAt: new Date(),
    },
  })

  // Broadcast to connected clients
  notificationBroadcaster.broadcastToUser(
    payload.userId,
    createNotificationPayload({
      id: notification.id,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    })
  )

  return notification
}

/**
 * Send loan approved notification to borrower and loan officer
 */
export async function sendLoanApprovedNotification(
  loan: LoanInfo,
  borrower: BorrowerInfo,
  loanOfficer: UserInfo
) {
  const notifications = []

  // Notification for loan officer
  notifications.push(
    createNotification({
      userId: loanOfficer.id,
      type: 'LOAN_APPROVED',
      category: 'LOAN',
      title: 'Loan Approved',
      message: `Loan #${loan.loanNumber} for ${borrower.firstName} ${borrower.lastName} has been approved. Amount: KSh ${Number(loan.principalAmount).toLocaleString()}`,
    })
  )

  return Promise.all(notifications)
}

/**
 * Send loan rejected notification to borrower and loan officer
 */
export async function sendLoanRejectedNotification(
  loan: LoanInfo,
  borrower: BorrowerInfo,
  loanOfficer: UserInfo,
  reason: string
) {
  const notifications = []

  // Notification for loan officer
  notifications.push(
    createNotification({
      userId: loanOfficer.id,
      type: 'LOAN_REJECTED',
      category: 'LOAN',
      title: 'Loan Rejected',
      message: `Loan #${loan.loanNumber} for ${borrower.firstName} ${borrower.lastName} has been rejected. Reason: ${reason}`,
    })
  )

  return Promise.all(notifications)
}

/**
 * Send loan disbursed notification to borrower and loan officer
 */
export async function sendLoanDisbursedNotification(
  loan: LoanInfo,
  borrower: BorrowerInfo,
  loanOfficer: UserInfo,
  amount: number | string
) {
  const notifications = []

  // Notification for loan officer
  notifications.push(
    createNotification({
      userId: loanOfficer.id,
      type: 'LOAN_DISBURSED',
      category: 'LOAN',
      title: 'Loan Disbursed',
      message: `Loan #${loan.loanNumber} has been disbursed. Amount: KSh ${Number(amount).toLocaleString()} to ${borrower.firstName} ${borrower.lastName}`,
    })
  )

  return Promise.all(notifications)
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  includeRead: boolean = true
) {
  const where: { userId: string; status?: string } = { userId }

  if (!includeRead) {
    where.status = 'UNREAD'
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      status: 'UNREAD',
    },
  })
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status: 'READ',
      sentAt: new Date(),
    },
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      status: 'UNREAD',
    },
    data: {
      status: 'READ',
      sentAt: new Date(),
    },
  })
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({
    where: { id: notificationId },
  })
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  return prisma.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
      status: 'READ',
    },
  })
}
