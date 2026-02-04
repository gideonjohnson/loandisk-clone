import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/portal/documents
 * List all documents for the authenticated borrower's loans
 */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const borrowerId = cookieStore.get('portal_borrower_id')?.value

    if (!borrowerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all loans for this borrower
    const loans = await prisma.loan.findMany({
      where: { borrowerId },
      select: { id: true, loanNumber: true },
    })

    if (loans.length === 0) {
      return NextResponse.json({ documents: [], loans: [] })
    }

    const loanIds = loans.map(l => l.id)
    const loanMap = Object.fromEntries(loans.map(l => [l.id, l.loanNumber]))

    // Get all documents for those loans
    const documents = await prisma.document.findMany({
      where: {
        loanId: { in: loanIds },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      loanId: doc.loanId,
      loanNumber: doc.loanId ? loanMap[doc.loanId] || null : null,
      type: doc.type,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      createdAt: doc.createdAt.toISOString(),
    }))

    return NextResponse.json({
      documents: formattedDocuments,
      loans: loans.map(l => ({ id: l.id, loanNumber: l.loanNumber })),
    })
  } catch (error) {
    console.error('Portal documents API error:', error)
    return NextResponse.json(
      { error: 'Failed to load documents' },
      { status: 500 }
    )
  }
}
