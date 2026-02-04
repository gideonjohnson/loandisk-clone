import { NextResponse } from "next/server"
import { createAuthHandler } from "@/lib/middleware/withAuth"
import { Permission } from "@/lib/permissions"
import { getBatchJobStatus } from "@/lib/loans/batchLoanService"

/**
 * GET /api/loans/batch/:jobId
 * Get batch job status
 */
export const GET = createAuthHandler(
  async (_request: Request, _session, context) => {
    try {
      const { jobId } = context.params

      const job = await getBatchJobStatus(jobId)

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 })
      }

      return NextResponse.json({
        ...job,
        errors: job.errors ? JSON.parse(job.errors) : [],
      })
    } catch (error) {
      console.error("Get batch job status error:", error)
      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: 500 }
      )
    }
  },
  [Permission.LOAN_VIEW],
  false
)
