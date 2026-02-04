import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rateLimit'

function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

/**
 * POST /api/auth/check-2fa
 * Check credentials and whether user has 2FA enabled
 */
async function handler(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent')

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check IP blacklist
    if (ipAddress) {
      const blacklisted = await prisma.iPRule.findFirst({
        where: {
          ipAddress,
          type: 'BLACKLIST',
          active: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      })
      if (blacklisted) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        active: true,
        twoFactorEnabled: true,
      },
    })

    if (!user || !user.password || !user.active) {
      // Record failed login if we can identify the user
      if (user) {
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress,
            userAgent,
            status: 'FAILED',
            failureReason: !user.active ? 'Account inactive' : 'Invalid password',
          },
        }).catch(() => {})
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          status: 'FAILED',
          failureReason: 'Invalid password',
        },
      }).catch(() => {})

      // Check for failed login spike (more than 5 in 15 min) and create security alert
      const recentFailures = await prisma.loginHistory.count({
        where: {
          userId: user.id,
          status: 'FAILED',
          createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
        },
      })
      if (recentFailures >= 5) {
        await prisma.securityAlert.create({
          data: {
            userId: user.id,
            type: 'FAILED_LOGIN_SPIKE',
            title: 'Multiple Failed Login Attempts',
            message: `${recentFailures} failed login attempts in the last 15 minutes from IP ${ipAddress || 'unknown'}.`,
            severity: 'HIGH',
            metadata: JSON.stringify({ ipAddress, recentFailures }),
          },
        }).catch(() => {})
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user's last login for security info
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastLogin: true },
    })

    // Check for device and whether it's new/trusted
    let isNewDevice = false
    let deviceId: string | null = null
    let isTrustedDevice = false

    if (userAgent) {
      const crypto = await import('crypto')
      const fingerprint = crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 32)

      const existingDevice = await prisma.userDevice.findUnique({
        where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fingerprint } },
      })

      if (existingDevice) {
        deviceId = existingDevice.id
        isTrustedDevice = existingDevice.isTrusted
        isNewDevice = false
      } else {
        // This will be a new device
        isNewDevice = true
      }
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Verify 2FA is properly set up
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: { userId: user.id },
        select: { verifiedAt: true },
      })

      if (twoFactorAuth?.verifiedAt) {
        return NextResponse.json({
          requires2FA: true,
          userId: user.id,
          lastLogin: userDetails?.lastLogin,
          isNewDevice,
          deviceId,
          isTrustedDevice,
        })
      }
    }

    // Record successful login
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    }).catch(() => {})

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch(() => {})

    // Check for new device and create alert
    let newDeviceId: string | null = deviceId
    if (userAgent) {
      const crypto = await import('crypto')
      const fingerprint = crypto.createHash('sha256').update(userAgent).digest('hex').substring(0, 32)
      const existingDevice = await prisma.userDevice.findUnique({
        where: { userId_deviceFingerprint: { userId: user.id, deviceFingerprint: fingerprint } },
      })

      if (!existingDevice) {
        // New device - register and alert
        const createdDevice = await prisma.userDevice.create({
          data: {
            userId: user.id,
            deviceFingerprint: fingerprint,
            lastIpAddress: ipAddress,
            deviceName: userAgent.substring(0, 100),
          },
        }).catch(() => null)

        if (createdDevice) {
          newDeviceId = createdDevice.id
        }

        // Only alert if user has logged in before (not first time)
        const loginCount = await prisma.loginHistory.count({ where: { userId: user.id, status: 'SUCCESS' } })
        if (loginCount > 1) {
          await prisma.securityAlert.create({
            data: {
              userId: user.id,
              type: 'NEW_DEVICE',
              title: 'New Device Login',
              message: `A new device logged into your account from IP ${ipAddress || 'unknown'}.`,
              severity: 'MEDIUM',
              metadata: JSON.stringify({ ipAddress, userAgent: userAgent.substring(0, 200) }),
            },
          }).catch(() => {})
        }
      } else {
        // Known device - update last seen
        await prisma.userDevice.update({
          where: { id: existingDevice.id },
          data: { lastSeenAt: new Date(), lastIpAddress: ipAddress },
        }).catch(() => {})
        newDeviceId = existingDevice.id
      }
    }

    // No 2FA required
    return NextResponse.json({
      requires2FA: false,
      lastLogin: userDetails?.lastLogin,
      isNewDevice,
      deviceId: newDeviceId,
      isTrustedDevice,
    })
  } catch (error) {
    console.error('Check 2FA error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handler, RATE_LIMITS.AUTH)
