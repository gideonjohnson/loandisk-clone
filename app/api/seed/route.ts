import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

const ADMIN_ACCOUNTS = [
  { email: 'gideonbosiregj@gmail.com', name: 'Gideon Bosire' },
  { email: 'jnyaox@gmail.com', name: 'J Nyao' },
  { email: 'jobgateri563@gmail.com', name: 'Job Gateri' },
]

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'meek-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://meekfund.ink')

    const results = []

    for (const account of ADMIN_ACCOUNTS) {
      // Check if already exists
      const existing = await prisma.user.findUnique({
        where: { email: account.email },
      })

      if (existing) {
        results.push({
          email: account.email,
          status: 'already_exists',
          role: existing.role,
          emailSent: false,
        })
        continue
      }

      // Generate secure password
      const tempPassword = generateTempPassword(12)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      // Create admin user with permanent access
      const user = await prisma.user.create({
        data: {
          email: account.email,
          name: account.name,
          password: hashedPassword,
          role: 'ADMIN',
          active: true,
          mustChangePassword: false,
        },
      })

      // Send welcome email with credentials
      const emailResult = await sendStaffWelcomeEmail(
        account.email,
        account.name,
        tempPassword,
        'ADMIN',
        baseUrl
      )

      results.push({
        email: user.email,
        name: user.name,
        role: user.role,
        status: 'created',
        emailSent: emailResult.success,
      })
    }

    return NextResponse.json({
      success: true,
      accounts: results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
