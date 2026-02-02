import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'

/**
 * GET /api/loan-products
 * Get all loan products
 */
export const GET = createAuthHandler(
  async (request: Request) => {
    try {
      const { searchParams } = new URL(request.url)
      const activeOnly = searchParams.get('active') === 'true'

      const products = await prisma.loanProduct.findMany({
        where: activeOnly ? { active: true } : {},
        orderBy: { name: 'asc' },
      })

      return NextResponse.json(products)
    } catch (error) {
      console.error('Get loan products error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch loan products' },
        { status: 500 }
      )
    }
  },
  [],
  false
)

/**
 * POST /api/loan-products
 * Create a new loan product
 */
export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()
      const {
        name,
        code,
        description,
        minAmount,
        maxAmount,
        minTerm,
        maxTerm,
        interestRate,
        interestType,
        repaymentFrequency,
        gracePeriodDays,
        lateFeeType,
        lateFeeAmount,
        processingFeeType,
        processingFeeAmount,
        requiresCollateral,
        requiresGuarantor,
        minCreditScore,
      } = body

      if (!name || !code || !minAmount || !maxAmount || !minTerm || !maxTerm || !interestRate) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const product = await prisma.loanProduct.create({
        data: {
          name,
          code: code.toUpperCase(),
          description,
          minAmount,
          maxAmount,
          minTerm,
          maxTerm,
          interestRate,
          interestType: interestType || 'FLAT',
          repaymentFrequency: repaymentFrequency || 'MONTHLY',
          gracePeriodDays: gracePeriodDays || 0,
          lateFeeType,
          lateFeeAmount,
          processingFeeType,
          processingFeeAmount,
          requiresCollateral: requiresCollateral || false,
          requiresGuarantor: requiresGuarantor || false,
          minCreditScore,
        },
      })

      return NextResponse.json({ product }, { status: 201 })
    } catch (error: unknown) {
      console.error('Create loan product error:', error)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A product with this name or code already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create loan product' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)
