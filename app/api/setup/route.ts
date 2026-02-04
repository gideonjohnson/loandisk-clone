import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/setup?key=meek-seed-2026
 * Run schema sync and add missing columns if needed
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'meek-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results: string[] = []

    // Add mustChangePassword column if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT false
      `)
      results.push('Added mustChangePassword column')
    } catch (e) {
      results.push(`mustChangePassword: ${e instanceof Error ? e.message : 'skipped'}`)
    }

    // Add profileImage column if missing
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImage" TEXT
      `)
      results.push('Added profileImage column')
    } catch (e) {
      results.push(`profileImage: ${e instanceof Error ? e.message : 'skipped'}`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
