import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/portal/auth/logout
 * Clear session cookies and log the borrower out
 */
export async function POST() {
  try {
    const cookieStore = await cookies()

    cookieStore.set('portal_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    cookieStore.set('portal_borrower_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
