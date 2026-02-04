import { NextResponse } from 'next/server'
import { getBrandingConfig } from '@/lib/config/brandingService'

/**
 * GET /api/public/branding
 * Returns branding configuration for the login page
 * No authentication required - this is a public endpoint
 */
export async function GET() {
  try {
    const branding = await getBrandingConfig()

    return NextResponse.json(branding, {
      headers: {
        // Cache for 5 minutes on the client
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Failed to fetch branding:', error)
    // Return defaults on error
    return NextResponse.json({
      companyName: 'Meek Microfinance',
      logoUrl: null,
      primaryColor: '#4169E1',
      secondaryColor: '#2a4494',
      loginTitle: 'Welcome Back',
      loginSubtitle: 'Sign in to Meek Loan Management',
    })
  }
}
