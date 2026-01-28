import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import {
  exportBorrowers,
  exportLoans,
  exportPayments,
  exportReport,
} from '@/lib/import-export/importExportService'
import { logDataExport } from '@/lib/security/auditLog'

/**
 * GET /api/export/:type
 * Export data to CSV
 * Types: borrowers, loans, payments, report
 */
export const GET = createAuthHandler(
  async (request: Request, session, context) => {
    try {
      const { type } = context.params
      const { searchParams } = new URL(request.url)

      let csvContent: string
      let filename: string

      switch (type) {
        case 'borrowers': {
          const active = searchParams.get('active')
          csvContent = await exportBorrowers(
            active ? { active: active === 'true' } : undefined
          )
          filename = `borrowers-${Date.now()}.csv`
          break
        }

        case 'loans': {
          const status = searchParams.get('status')
          csvContent = await exportLoans(status ? { status } : undefined)
          filename = `loans-${Date.now()}.csv`
          break
        }

        case 'payments': {
          const startDate = searchParams.get('startDate')
          const endDate = searchParams.get('endDate')
          csvContent = await exportPayments({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          })
          filename = `payments-${Date.now()}.csv`
          break
        }

        case 'report': {
          const reportType = searchParams.get('reportType') || 'portfolio'
          const startDate = searchParams.get('startDate')
          const endDate = searchParams.get('endDate')

          if ((reportType === 'disbursements' || reportType === 'collections') && (!startDate || !endDate)) {
            return NextResponse.json(
              { error: 'Start date and end date are required for this report' },
              { status: 400 }
            )
          }

          csvContent = await exportReport(
            reportType,
            startDate ? new Date(startDate) : new Date(),
            endDate ? new Date(endDate) : new Date()
          )
          filename = `report-${reportType}-${Date.now()}.csv`
          break
        }

        default:
          return NextResponse.json(
            { error: 'Invalid export type' },
            { status: 400 }
          )
      }

      // Log the export
      await logDataExport(
        session.user.id,
        type,
        csvContent.split('\n').length - 1,
        request
      )

      // Return CSV file
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error('Export error:', error)
      return NextResponse.json(
        { error: 'Export failed', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
  ['ADMIN', 'MANAGER']
)
