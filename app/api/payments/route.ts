import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit, RATE_LIMITS } from '@/lib/security/rateLimit'

async function getHandler() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          include: {
            borrower: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        receivedByUser: {
          select: {
            name: true,
          }
        }
      }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function postHandler(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Generate receipt number
    const receiptNumber = 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase()

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        loanId: body.loanId,
        amount: body.amount,
        paymentDate: new Date(body.paymentDate),
        receivedBy: session.user.id,
        paymentMethod: body.paymentMethod,
        receiptNumber,
        notes: body.notes,
        principalAmount: body.principalAmount,
        interestAmount: body.interestAmount,
        feesAmount: body.feesAmount || 0,
        status: 'COMPLETED',
      }
    })

    // Update loan schedule
    if (body.scheduleId) {
      await prisma.loanSchedule.update({
        where: { id: body.scheduleId },
        data: {
          principalPaid: { increment: body.principalAmount },
          interestPaid: { increment: body.interestAmount },
          feesPaid: { increment: body.feesAmount || 0 },
          totalPaid: { increment: body.amount },
          isPaid: body.isPaid || false,
          paidDate: body.isPaid ? new Date() : null,
        }
      })
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withRateLimit(getHandler, RATE_LIMITS.READ)
export const POST = withRateLimit(postHandler, RATE_LIMITS.SENSITIVE)
