import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { generateAgingReport } from '@/lib/reports/reportGenerator'
import { exportAgingToExcel } from '@/lib/reports/excelExport'

/**
 * GET /api/reports/aging
 * Generate aging report
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const exportFormat = searchParams.get('export') // 'excel' or null

      const report = await generateAgingReport()

      // If export format requested, return file
      if (exportFormat === 'excel') {
        const excelBlob = exportAgingToExcel(report)
        const buffer = await excelBlob.arrayBuffer()

        return new NextResponse(buffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Aging_Report.xlsx"`,
          },
        })
      }

      return NextResponse.json(report)
    } catch (error) {
      console.error('Aging report error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate aging report',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.REPORTS_VIEW],
  false
)
