import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { clearNotificationConfigCache } from '@/lib/config/notificationConfig'

// Map from camelCase UI field names to snake_case DB keys
const NOTIFICATION_KEY_MAP: Record<string, string> = {
  emailProvider: 'email_provider',
  emailFrom: 'email_from',
  emailFromName: 'email_from_name',
  smtpHost: 'smtp_host',
  smtpPort: 'smtp_port',
  smtpUser: 'smtp_user',
  smtpPass: 'smtp_pass',
  smtpSecure: 'smtp_secure',
  sendgridApiKey: 'sendgrid_api_key',
  smsProvider: 'sms_provider',
  twilioAccountSid: 'twilio_account_sid',
  twilioAuthToken: 'twilio_auth_token',
  twilioFromNumber: 'twilio_from_number',
  atApiKey: 'at_api_key',
  atUsername: 'at_username',
  atFrom: 'at_from',
  testPhoneNumber: 'test_phone_number',
}

// Reverse map for loading
const DB_KEY_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(NOTIFICATION_KEY_MAP).map(([k, v]) => [v, k])
)

/**
 * GET /api/settings
 * Get all system settings, optionally filtered by category
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const category = searchParams.get('category')

      const settings = await prisma.systemSetting.findMany({
        where: category ? { category } : undefined,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      })

      // If requesting notifications category, return as a flat camelCase object
      // for easy consumption by the notifications settings page
      if (category === 'notifications') {
        const mapped: Record<string, string | boolean> = {}
        for (const s of settings) {
          const camelKey = DB_KEY_TO_CAMEL[s.key]
          if (camelKey) {
            mapped[camelKey] = s.value === 'true' ? true : s.value === 'false' ? false : s.value
          }
        }
        return NextResponse.json(mapped)
      }

      return NextResponse.json(settings)
    } catch (error) {
      console.error('Get settings error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_VIEW]
)

/**
 * PUT /api/settings
 * Update multiple settings — accepts either:
 *   { settings: [{ key, value, ... }] }  (array format)
 *   { category: 'notifications', settings: { emailProvider: 'smtp', ... } }  (object format)
 */
export const PUT = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const { settings, category } = body

      let settingsArray: { key: string; value: string; label?: string; category?: string; type?: string }[]

      if (Array.isArray(settings)) {
        // Already in array format
        settingsArray = settings
      } else if (settings && typeof settings === 'object' && category) {
        // Object format from notifications page — convert to array
        const keyMap = category === 'notifications' ? NOTIFICATION_KEY_MAP : null
        settingsArray = Object.entries(settings)
          .filter(([key]) => !keyMap || keyMap[key]) // only map known keys
          .map(([key, value]) => ({
            key: keyMap ? keyMap[key] : key,
            value: String(value),
            label: key,
            category,
            type: typeof value === 'boolean' ? 'boolean' : 'text',
          }))
      } else {
        return NextResponse.json(
          { error: 'Settings must be an array or an object with a category' },
          { status: 400 }
        )
      }

      const updates = await Promise.all(
        settingsArray.map((setting) =>
          prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: {
              key: setting.key,
              value: setting.value,
              label: setting.label || setting.key,
              category: setting.category || 'general',
              type: setting.type || 'text',
            },
          })
        )
      )

      // Clear notification config cache so services pick up new values
      if (category === 'notifications') {
        clearNotificationConfigCache()
      }

      return NextResponse.json({ success: true, updated: updates.length })
    } catch (error) {
      console.error('Update settings error:', error)
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)

/**
 * POST /api/settings
 * Create a new setting
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const { key, value, label, category, description, type } = body

      if (!key || !value) {
        return NextResponse.json(
          { error: 'Key and value are required' },
          { status: 400 }
        )
      }

      const setting = await prisma.systemSetting.create({
        data: {
          key,
          value,
          label: label || key,
          category: category || 'general',
          description,
          type: type || 'text',
        },
      })

      return NextResponse.json({ setting }, { status: 201 })
    } catch (error: unknown) {
      console.error('Create setting error:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A setting with this key already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create setting' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)
