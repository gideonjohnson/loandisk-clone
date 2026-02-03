import { prisma } from '@/lib/prisma'

interface ParsedUserAgent {
  browser: string
  os: string
  deviceType: string
}

/**
 * Parse a user agent string into browser, OS, and device type
 * Uses simple regex matching without external libraries
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const result: ParsedUserAgent = {
    browser: 'Unknown',
    os: 'Unknown',
    deviceType: 'Desktop',
  }

  if (!ua) return result

  // Detect browser
  if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/)
    result.browser = `Edge ${match ? match[1] : ''}`
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    const match = ua.match(/(?:OPR|Opera)\/([\d.]+)/)
    result.browser = `Opera ${match ? match[1] : ''}`
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/)
    result.browser = `Chrome ${match ? match[1] : ''}`
  } else if (/Firefox\//i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/)
    result.browser = `Firefox ${match ? match[1] : ''}`
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/)
    result.browser = `Safari ${match ? match[1] : ''}`
  } else if (/MSIE|Trident/i.test(ua)) {
    const match = ua.match(/(?:MSIE |rv:)([\d.]+)/)
    result.browser = `IE ${match ? match[1] : ''}`
  }

  // Detect OS
  if (/Windows NT 10/i.test(ua)) {
    result.os = 'Windows 10'
  } else if (/Windows NT 6\.3/i.test(ua)) {
    result.os = 'Windows 8.1'
  } else if (/Windows NT 6\.1/i.test(ua)) {
    result.os = 'Windows 7'
  } else if (/Windows/i.test(ua)) {
    result.os = 'Windows'
  } else if (/Mac OS X ([\d_]+)/i.test(ua)) {
    const match = ua.match(/Mac OS X ([\d_]+)/)
    result.os = `macOS ${match ? match[1].replace(/_/g, '.') : ''}`
  } else if (/Android ([\d.]+)/i.test(ua)) {
    const match = ua.match(/Android ([\d.]+)/)
    result.os = `Android ${match ? match[1] : ''}`
  } else if (/iPhone OS ([\d_]+)/i.test(ua)) {
    const match = ua.match(/iPhone OS ([\d_]+)/)
    result.os = `iOS ${match ? match[1].replace(/_/g, '.') : ''}`
  } else if (/iPad/i.test(ua)) {
    result.os = 'iPadOS'
  } else if (/Linux/i.test(ua)) {
    result.os = 'Linux'
  } else if (/CrOS/i.test(ua)) {
    result.os = 'Chrome OS'
  }

  // Detect device type
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua)) {
    result.deviceType = 'Mobile'
  } else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    result.deviceType = 'Tablet'
  } else {
    result.deviceType = 'Desktop'
  }

  return result
}

/**
 * Record a login attempt in the login history
 */
export async function recordLogin(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED',
  failureReason?: string
) {
  const parsed = userAgent ? parseUserAgent(userAgent) : { browser: null, os: null, deviceType: null }

  return prisma.loginHistory.create({
    data: {
      userId,
      ipAddress,
      userAgent,
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType,
      status,
      failureReason: failureReason || null,
    },
  })
}

/**
 * Get recent login history for a user
 */
export async function getLoginHistory(userId: string, limit = 20) {
  return prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
