import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/settings
 * Get all system settings
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const settings = await prisma.systemSetting.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      })

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
 * Update multiple settings
 */
export const PUT = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const { settings } = body

      if (!Array.isArray(settings)) {
        return NextResponse.json(
          { error: 'Settings must be an array' },
          { status: 400 }
        )
      }

      // Upsert each setting
      const updates = await Promise.all(
        settings.map((setting: any) =>
          prisma.systemSetting.upsert({
            where: { key: setting.key },
            update: { value: setting.value },
            create: {
              key: setting.key,
              value: setting.value,
              label: setting.label || setting.key,
              category: setting.category || 'general',
              description: setting.description,
              type: setting.type || 'text',
            },
          })
        )
      )

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
    } catch (error: any) {
      console.error('Create setting error:', error)
      if (error.code === 'P2002') {
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
