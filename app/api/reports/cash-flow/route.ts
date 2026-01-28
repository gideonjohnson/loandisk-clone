import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { generateCashFlowReport } from '@/lib/reports/reportGenerator'
import { exportCashFlowToExcel } from '@/lib/reports/excelExport'
import { subMonths, startOfMonth, endOfMonth } from 'date-fns'

/**
 * GET /api/reports/cash-flow
 * Generate cash flow report
 */
export const GET = createAuthHandler(
  async (request: Request, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const startDateParam = searchParams.get('startDate')
      const endDateParam = searchParams.get('endDate')
      const branchId = searchParams.get('branchId') || undefined
      const exportFormat = searchParams.get('export') // 'excel' or null

      // Default to last 6 months if no dates provided
      const endDate = endDateParam ? new Date(endDateParam) : endOfMonth(new Date())
      const startDate = startDateParam
        ? new Date(startDateParam)
        : startOfMonth(subMonths(endDate, 5))

      const report = await generateCashFlowReport(startDate, endDate, branchId)

      // If export format requested, return file
      if (exportFormat === 'excel') {
        const excelBlob = exportCashFlowToExcel(report)
        const buffer = await excelBlob.arrayBuffer()

        return new NextResponse(buffer, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Cash_Flow_Report.xlsx"`,
          },
        })
      }

      return NextResponse.json(report)
    } catch (error) {
      console.error('Cash flow report error:', error)
      return NextResponse.json(
        {
          error: 'Failed to generate cash flow report',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.REPORTS_VIEW],
  false
)
