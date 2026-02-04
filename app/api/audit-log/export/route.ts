import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import jsPDF from 'jspdf'

/**
 * GET /api/audit-log/export
 * Export audit logs as CSV or PDF
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') || 'csv'
      const action = searchParams.get('action')
      const userId = searchParams.get('userId')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      // Build filters
      const where: Record<string, unknown> = {}
      if (action) where.action = action
      if (userId) where.userId = userId
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
        if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate + 'T23:59:59')
      }

      const logs = await prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000, // Limit export to 1000 records
      })

      if (format === 'pdf') {
        const doc = new jsPDF()
        let y = 20

        // Title
        doc.setFontSize(16)
        doc.text('Audit Log Report', 14, y)
        y += 10

        // Date range
        doc.setFontSize(10)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y)
        y += 6
        if (startDate || endDate) {
          doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'Present'}`, 14, y)
          y += 6
        }
        doc.text(`Total Records: ${logs.length}`, 14, y)
        y += 12

        // Table header
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Date/Time', 14, y)
        doc.text('User', 50, y)
        doc.text('Action', 90, y)
        doc.text('Entity', 130, y)
        doc.text('IP Address', 165, y)
        y += 6

        // Table rows
        doc.setFont('helvetica', 'normal')
        for (const log of logs) {
          if (y > 280) {
            doc.addPage()
            y = 20
          }

          const date = new Date(log.createdAt).toLocaleString()
          doc.text(date.substring(0, 20), 14, y)
          doc.text((log.user.name || '').substring(0, 20), 50, y)
          doc.text((log.action || '').substring(0, 20), 90, y)
          doc.text((log.entityType || '-').substring(0, 15), 130, y)
          doc.text((log.ipAddress || '-').substring(0, 15), 165, y)
          y += 5
        }

        const pdfBuffer = doc.output('arraybuffer')

        return new Response(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.pdf"`,
          },
        })
      }

      // CSV format
      const csvHeader = 'Timestamp,User,Email,Role,Action,Entity Type,Entity ID,Details,IP Address\n'
      const csvRows = logs.map((log) => {
        const details = log.details?.replace(/"/g, '""') || ''
        return [
          new Date(log.createdAt).toISOString(),
          log.user.name,
          log.user.email,
          log.user.role,
          log.action,
          log.entityType || '',
          log.entityId || '',
          `"${details}"`,
          log.ipAddress || '',
        ].join(',')
      })

      const csvContent = csvHeader + csvRows.join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    } catch (error) {
      console.error('Export audit logs error:', error)
      return NextResponse.json(
        { error: 'Failed to export audit logs' },
        { status: 500 }
      )
    }
  },
  [Permission.AUDIT_LOG_VIEW]
)
