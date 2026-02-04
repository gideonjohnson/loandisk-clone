import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { sendStaffWelcomeEmail } from '@/lib/email/emailService'

/**
 * Generate a secure random password
 */
function generateTempPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'
  const numbers = '23456789'
  const special = '!@#$%&*'
  const allChars = uppercase + lowercase + numbers + special

  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * GET /api/users
 * Get all users
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const role = searchParams.get('role')
      const active = searchParams.get('active')

      const users = await prisma.user.findMany({
        where: {
          ...(role ? { role } : {}),
          ...(active !== null ? { active: active === 'true' } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          phoneNumber: true,
          lastLogin: true,
          twoFactorEnabled: true,
          mustChangePassword: true,
          active: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      })

      return NextResponse.json(users)
    } catch (error) {
      console.error('Get users error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
  },
  [Permission.USER_VIEW]
)

/**
 * POST /api/users
 * Create a new user - password is auto-generated and emailed
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const { email, name, role, branchId, phoneNumber } = body

      if (!email || !name) {
        return NextResponse.json(
          { error: 'Email and name are required' },
          { status: 400 }
        )
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        )
      }

      // Generate secure temporary password
      const tempPassword = generateTempPassword(12)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Create user with mustChangePassword flag
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: role || 'LOAN_OFFICER',
          branchId: branchId || null,
          phoneNumber: phoneNumber || null,
          mustChangePassword: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchId: true,
          phoneNumber: true,
          active: true,
          createdAt: true,
        },
      })

      // Get base URL for login link
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      // Send welcome email with credentials
      const emailResult = await sendStaffWelcomeEmail(
        email,
        name,
        tempPassword,
        role || 'LOAN_OFFICER',
        baseUrl
      )

      return NextResponse.json({
        user,
        emailSent: emailResult.success,
        message: emailResult.success
          ? 'User created. Login credentials sent to their email.'
          : 'User created but email could not be sent. Please share credentials manually.'
      }, { status: 201 })
    } catch (error) {
      console.error('Create user error:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }
  },
  [Permission.USER_CREATE]
)
