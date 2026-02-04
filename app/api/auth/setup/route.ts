import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

/**
 * GET /api/auth/setup
 * Check if initial setup is needed (no users exist)
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count()

    return NextResponse.json({
      setupRequired: userCount === 0,
      userCount,
    })
  } catch (error) {
    console.error('Setup status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/setup
 * Create the first admin account (only works if no users exist)
 */
export async function POST(request: Request) {
  try {
    // Check if setup is still allowed
    const userCount = await prisma.user.count()

    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Setup has already been completed. Please use the login page.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, companyName } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'ADMIN',
        active: true,
        mustChangePassword: false,
      },
    })

    // Create default branding settings if company name provided
    if (companyName) {
      const brandingSettings = [
        { category: 'branding', key: 'branding_company_name', value: companyName, label: 'Company Name', isPublic: true },
        { category: 'branding', key: 'branding_logo_url', value: '', label: 'Logo URL', isPublic: true },
        { category: 'branding', key: 'branding_primary_color', value: '#4169E1', label: 'Primary Color', isPublic: true },
        { category: 'branding', key: 'branding_secondary_color', value: '#2a4494', label: 'Secondary Color', isPublic: true },
        { category: 'branding', key: 'branding_login_title', value: 'Welcome Back', label: 'Login Title', isPublic: true },
        { category: 'branding', key: 'branding_login_subtitle', value: `Sign in to ${companyName}`, label: 'Login Subtitle', isPublic: true },
      ]

      for (const setting of brandingSettings) {
        await prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: {
            category: setting.category,
            key: setting.key,
            value: setting.value,
            label: setting.label,
            isPublic: setting.isPublic,
            type: 'text',
          },
        })
      }
    }

    // Log the setup completion
    await prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: 'SYSTEM_SETUP_COMPLETED',
        entityType: 'User',
        entityId: admin.id,
        details: JSON.stringify({
          adminEmail: admin.email,
          companyName: companyName || 'Not specified',
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully. You can now sign in.',
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('Setup error:', error)

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to complete setup. Please try again.' },
      { status: 500 }
    )
  }
}
