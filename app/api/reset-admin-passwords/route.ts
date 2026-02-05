import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/reset-admin-passwords?key=meek-seed-2026
 * Reset passwords for all admin users
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'meek-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminPasswords: Record<string, string> = {
    'gideonbosiregj@gmail.com': 'Meek@Admin1',
    'jnyaox@gmail.com': 'Meek@Admin2',
    'jobgateri563@gmail.com': 'Meek@Admin3',
  }

  const results: string[] = []

  for (const [email, password] of Object.entries(adminPasswords)) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const updated = await prisma.user.updateMany({
        where: { email },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
        },
      })

      if (updated.count > 0) {
        results.push(`OK: ${email} -> ${password}`)
      } else {
        results.push(`SKIP: ${email} (user not found)`)
      }
    } catch (e) {
      results.push(`ERROR: ${email} - ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return NextResponse.json({ success: true, results })
}
