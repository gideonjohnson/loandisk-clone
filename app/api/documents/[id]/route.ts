import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { deleteFile } from '@/lib/upload/fileUpload'

/**
 * GET /api/documents/:id
 * Get a specific document
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              borrower: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          generatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ document })
    } catch (error) {
      console.error('Fetch document error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_VIEW],
  false
)

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
export const DELETE = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { id } = context.params

      const document = await prisma.document.findUnique({
        where: { id },
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Delete file from storage
      try {
        await deleteFile(document.fileUrl)
      } catch (error) {
        console.error('Failed to delete file from storage:', error)
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await prisma.document.delete({
        where: { id },
      })

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: session.user.id!,
          action: 'DELETE_DOCUMENT',
          entityType: 'Document',
          entityId: id,
          details: JSON.stringify({
            fileName: document.fileName,
            type: document.type,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
      })
    } catch (error) {
      console.error('Delete document error:', error)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }
  },
  [Permission.DOCUMENT_DELETE],
  false
)
