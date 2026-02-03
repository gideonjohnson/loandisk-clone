import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { parseUserAgent } from './loginHistoryService'

/**
 * Generate a device fingerprint from user agent and optional extra data
 * Uses SHA-256 hash for consistent fingerprinting
 */
export function generateDeviceFingerprint(userAgent: string, extra?: string): string {
  const input = extra ? `${userAgent}|${extra}` : userAgent
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Register or update a device for a user
 * If the device already exists (same userId + fingerprint), update lastSeenAt and lastIpAddress
 * If the device is new, create a new record
 */
export async function registerDevice(
  userId: string,
  fingerprint: string,
  ipAddress: string | null,
  userAgent: string | null
) {
  const parsed = userAgent ? parseUserAgent(userAgent) : { browser: null, os: null, deviceType: null }

  return prisma.userDevice.upsert({
    where: {
      userId_deviceFingerprint: {
        userId,
        deviceFingerprint: fingerprint,
      },
    },
    update: {
      lastSeenAt: new Date(),
      lastIpAddress: ipAddress,
      browser: parsed.browser,
      os: parsed.os,
    },
    create: {
      userId,
      deviceFingerprint: fingerprint,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      os: parsed.os,
      lastIpAddress: ipAddress,
    },
  })
}

/**
 * Check if a device fingerprint is known for a user
 */
export async function isKnownDevice(userId: string, fingerprint: string): Promise<boolean> {
  const device = await prisma.userDevice.findUnique({
    where: {
      userId_deviceFingerprint: {
        userId,
        deviceFingerprint: fingerprint,
      },
    },
  })
  return !!device
}

/**
 * Mark a device as trusted
 */
export async function trustDevice(deviceId: string) {
  return prisma.userDevice.update({
    where: { id: deviceId },
    data: { isTrusted: true },
  })
}

/**
 * Remove a device record
 */
export async function removeDevice(deviceId: string) {
  return prisma.userDevice.delete({
    where: { id: deviceId },
  })
}

/**
 * Get all devices for a user
 */
export async function getDevices(userId: string) {
  return prisma.userDevice.findMany({
    where: { userId },
    orderBy: { lastSeenAt: 'desc' },
  })
}
