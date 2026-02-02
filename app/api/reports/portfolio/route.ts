import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { generatePortfolioReport } from '@/lib/reports/reportGenerator'
import { exportPortfolioToExcel } from '@/lib/reports/excelExport'

/**
 * GET /api/reports/portfolio
 * Generate portfolio report
 */
export const GET = createAuthHandler(
  async (request: Request, _session) => {
    try {
      const { searchParams } = new URL(request.url)
      const branchId = searchParams.get('branchId') || undefined
      const exportFormat = searchParams.get('export') // 'excel' or null

      const report = await generatePortfolioReport(branchId)

      // If export format requested, return file
      if (exportFormat === 'excel') {
        const excelBlob = exportPortfolioToExcel(report)
        const buffer = await excelBlob.arrayBuffer()

        return new NextResponse(buffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Portfolio_Report.xlsx"`,
          },
        })
      }

      return NextResponse.json(report)
    } catch (error) {
      console.error('Portfolio report error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate portfolio report',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.REPORTS_VIEW],
  false
)
