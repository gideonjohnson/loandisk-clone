import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clearNotificationConfigCache } from '@/lib/config/notificationConfig'

// Communication settings keys
const COMMUNICATION_SETTINGS_KEYS = [
  // Email settings
  'email_provider',
  'email_from',
  'email_from_name',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_secure',
  'sendgrid_api_key',
  // SMS settings
  'sms_provider',
  'at_api_key',
  'at_username',
  'at_from',
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_from_number',
]

// Get communication settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const systemSettings = await prisma.systemSetting.findMany({
      where: {
        key: { in: COMMUNICATION_SETTINGS_KEYS }
      }
    })

    const settings: Record<string, string> = {}
    for (const s of systemSettings) {
      settings[s.key] = s.value
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to fetch communication settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update communication settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      if (COMMUNICATION_SETTINGS_KEYS.includes(key)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            category: 'notifications',
            key,
            value: String(value),
            label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: key.includes('pass') || key.includes('token') || key.includes('api_key') || key.includes('secret') ? 'password' : 'text',
          }
        })
      }
    }

    // Clear the notification config cache so new settings take effect
    clearNotificationConfigCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update communication settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
