import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/documents
 * Get all documents with optional filters
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const loanId = searchParams.get('loanId')
      const type = searchParams.get('type')

      const where: any = {}

      if (loanId) {
        where.loanId = loanId
      }

      if (type) {
        where.type = type
      }

      const documents = await prisma.document.findMany({
        where,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
            },
          },
          generatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        documents,
        count: documents.length,
      })
    } catch (error) {
      console.error('Fetch documents error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_VIEW],
  false
)

/**
 * POST /api/documents
 * Create a new document record
 */
export const POST = createAuthHandler(
  async (request: Request, session) => {
    try {
      const body = await request.json()
      const { loanId, type, fileName, fileUrl } = body

      if (!type || !fileName || !fileUrl) {
        return NextResponse.json(
          { error: 'Type, fileName, and fileUrl are required' },
          { status: 400 }
        )
      }

      // Validate loan exists if loanId provided
      if (loanId) {
        const loan = await prisma.loan.findUnique({
          where: { id: loanId },
        })

        if (!loan) {
          return NextResponse.json(
            { error: 'Loan not found' },
            { status: 404 }
          )
        }
      }

      const document = await prisma.document.create({
        data: {
          loanId: loanId || null,
          type,
          fileName,
          fileUrl,
          generatedBy: session.user.id!,
        },
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
            },
          },
          generatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'UPLOAD_DOCUMENT',
          entityType: 'Document',
          entityId: document.id,
          details: JSON.stringify({
            fileName,
            type,
            loanId,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Document created successfully',
        document,
      })
    } catch (error) {
      console.error('Create document error:', error)
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_UPLOAD],
  false
)
