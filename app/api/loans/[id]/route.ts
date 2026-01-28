import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        loanOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        schedules: {
          orderBy: { dueDate: 'asc' }
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            receivedByUser: {
              select: {
                name: true,
              }
            }
          }
        },
        collaterals: true,
      }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Get loan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const loan = await prisma.loan.update({
      where: { id },
      data: {
        status: body.status,
        notes: body.notes,
        approvalDate: body.approvalDate ? new Date(body.approvalDate) : undefined,
        disbursementDate: body.disbursementDate ? new Date(body.disbursementDate) : undefined,
      }
    })

    return NextResponse.json(loan)
  } catch (error) {
    console.error('Update loan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.loan.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete loan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
