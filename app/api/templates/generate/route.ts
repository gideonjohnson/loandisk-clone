import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateDocument,
  getPlaceholderData,
  replacePlaceholders,
  getDefaultTemplates,
} from '@/lib/documents/templateService'

// POST /api/templates/generate - Generate document from template
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, loanId, format = 'docx' } = body

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 })
    }

    // Get template
    let templateContent: string
    let templateName: string

    if (templateId?.startsWith('default-')) {
      // Use default template
      const index = parseInt(templateId.replace('default-', ''))
      const defaults = getDefaultTemplates()
      if (index >= 0 && index < defaults.length) {
        templateContent = defaults[index].content
        templateName = defaults[index].name
      } else {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
    } else if (templateId) {
      // Get custom template
      const templateSetting = await prisma.systemSetting.findUnique({
        where: { id: templateId },
      })
      if (!templateSetting) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      const parsed = JSON.parse(templateSetting.value)
      templateContent = parsed.content
      templateName = parsed.name
    } else {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
    }

    // Get placeholder data
    const data = await getPlaceholderData(loanId)

    if (format === 'docx') {
      // Generate DOCX
      const buffer = await generateDocument(templateContent, data)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${templateName.replace(/\s+/g, '_')}_${data['{{loan_number}}']}.docx"`,
        },
      })
    } else if (format === 'preview') {
      // Return filled text for preview
      const filledContent = replacePlaceholders(templateContent, data)
      return NextResponse.json({ content: filledContent, data })
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate document' },
      { status: 500 }
    )
  }
}
