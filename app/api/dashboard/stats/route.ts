import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [totalLoans, activeLoans, totalBorrowers, disbursedData, collectedData] = await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.borrower.count({ where: { active: true } }),
      prisma.loan.aggregate({
        _sum: { principalAmount: true },
        where: { status: { in: ['ACTIVE', 'PAID'] } }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      })
    ])

    const totalDisbursed = Number(disbursedData._sum.principalAmount || 0)
    const totalCollected = Number(collectedData._sum.amount || 0)
    const portfolioAtRisk = totalDisbursed > 0 ? ((totalDisbursed - totalCollected) / totalDisbursed) * 100 : 0

    return NextResponse.json({
      totalLoans,
      activeLoans,
      totalBorrowers,
      totalDisbursed,
      totalCollected,
      portfolioAtRisk,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
