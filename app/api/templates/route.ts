import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDefaultTemplates, TEMPLATE_PLACEHOLDERS } from '@/lib/documents/templateService'

// GET /api/templates - List all templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get templates from SystemSetting
    const templateSettings = await prisma.systemSetting.findMany({
      where: { category: 'document_template' },
      orderBy: { createdAt: 'asc' },
    })

    // If no templates exist, return default ones
    if (templateSettings.length === 0) {
      const defaults = getDefaultTemplates()
      return NextResponse.json({
        templates: defaults.map((t, i) => ({
          id: `default-${i}`,
          ...t,
          createdAt: new Date(),
        })),
        placeholders: TEMPLATE_PLACEHOLDERS,
      })
    }

    const templates = templateSettings.map((s) => ({
      id: s.id,
      ...JSON.parse(s.value),
      createdAt: s.createdAt,
    }))

    return NextResponse.json({
      templates,
      placeholders: TEMPLATE_PLACEHOLDERS,
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST /api/templates - Create new template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, content } = body

    if (!name || !type || !content) {
      return NextResponse.json({ error: 'Name, type, and content are required' }, { status: 400 })
    }

    const template = await prisma.systemSetting.create({
      data: {
        category: 'document_template',
        key: `template_${Date.now()}`,
        value: JSON.stringify({ name, type, content, isDefault: false }),
        label: name,
        description: `Document template: ${type}`,
      },
    })

    return NextResponse.json({
      id: template.id,
      name,
      type,
      content,
      isDefault: false,
      createdAt: template.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
