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

    const borrower = await prisma.borrower.findUnique({
      where: { id },
      include: {
        loans: {
          include: {
            loanOfficer: {
              select: { id: true, name: true, email: true }
            },
            payments: {
              orderBy: { paymentDate: 'desc' }
            },
            schedules: {
              orderBy: { dueDate: 'asc' }
            },
            fees: {
              include: { fee: true }
            },
            penalties: true,
            disbursement: true,
          },
          orderBy: { createdAt: 'desc' }
        },
        accounts: {
          include: {
            transactions: {
              orderBy: { transactionDate: 'desc' },
              take: 50
            }
          }
        },
        guarantors: true,
      }
    })

    if (!borrower) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    // Calculate summary stats
    const totalLoans = borrower.loans.length
    const activeLoans = borrower.loans.filter(l => l.status === 'ACTIVE').length
    const totalBorrowed = borrower.loans.reduce((sum, l) => sum + Number(l.principalAmount), 0)
    const totalPaid = borrower.loans.reduce((sum, l) =>
      sum + l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0)

    const totalOutstanding = borrower.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => {
        const loanPaid = l.payments.reduce((pSum, p) => pSum + Number(p.amount), 0)
        const totalDue = l.schedules.reduce((sSum, s) => sSum + Number(s.totalDue), 0)
        return sum + Math.max(0, totalDue - loanPaid)
      }, 0)

    const totalFees = borrower.loans.reduce((sum, l) =>
      sum + l.fees.reduce((fSum, f) => fSum + Number(f.amount), 0), 0)

    const totalPenalties = borrower.loans.reduce((sum, l) =>
      sum + l.penalties.reduce((pSum, p) => pSum + Number(p.amount), 0), 0)

    return NextResponse.json({
      ...borrower,
      summary: {
        totalLoans,
        activeLoans,
        totalBorrowed,
        totalPaid,
        totalOutstanding,
        totalFees,
        totalPenalties,
      }
    })
  } catch (error) {
    console.error('Get borrower error:', error)
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

    const borrower = await prisma.borrower.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        country: body.country,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        idNumber: body.idNumber,
        employmentStatus: body.employmentStatus,
        monthlyIncome: body.monthlyIncome,
        creditScore: body.creditScore,
        active: body.active,
      }
    })

    return NextResponse.json(borrower)
  } catch (error) {
    console.error('Update borrower error:', error)
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

    await prisma.borrower.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete borrower error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
