import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { calculateCreditScore } from '@/lib/credit/creditScoringService'

/**
 * GET /api/portal/products
 * List all active loan products (public, no auth required)
 * If user is logged in, includes eligibility info
 */
export async function GET() {
  try {
    // Get all active loan products
    const products = await prisma.loanProduct.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    // Check if user is logged in (optional)
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    let eligibilityInfo = null

    if (borrowerId) {
      try {
        const creditReport = await calculateCreditScore(borrowerId)
        eligibilityInfo = {
          creditScore: creditReport.score,
          creditGrade: creditReport.grade,
          maxRecommendedLoan: creditReport.maxRecommendedLoan,
          riskLevel: creditReport.riskLevel,
        }
      } catch {
        // Ignore credit score errors for new users
      }
    }

    // Format products for response
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      minAmount: Number(product.minAmount),
      maxAmount: Number(product.maxAmount),
      minTerm: product.minTerm,
      maxTerm: product.maxTerm,
      interestRate: Number(product.interestRate),
      interestType: product.interestType,
      repaymentFrequency: product.repaymentFrequency,
      gracePeriodDays: product.gracePeriodDays,
      lateFeeType: product.lateFeeType,
      lateFeeAmount: product.lateFeeAmount ? Number(product.lateFeeAmount) : null,
      processingFeeType: product.processingFeeType,
      processingFeeAmount: product.processingFeeAmount ? Number(product.processingFeeAmount) : null,
      requiresCollateral: product.requiresCollateral,
      requiresGuarantor: product.requiresGuarantor,
      minCreditScore: product.minCreditScore,
    }))

    return NextResponse.json({
      products: formattedProducts,
      eligibility: eligibilityInfo,
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    )
  }
}
