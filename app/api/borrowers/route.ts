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

    const borrowers = await prisma.borrower.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { loans: true }
        }
      }
    })

    return NextResponse.json(borrowers)
  } catch (error) {
    console.error('Get borrowers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const borrower = await prisma.borrower.create({
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
      }
    })

    return NextResponse.json(borrower)
  } catch (error) {
    console.error('Create borrower error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
