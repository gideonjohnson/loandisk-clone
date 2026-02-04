import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateBrandingSettings, clearBrandingCache } from '@/lib/config/brandingService'

/**
 * PUT /api/settings/branding
 * Update branding settings (admin only)
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { companyName, logoUrl, primaryColor, secondaryColor, loginTitle, loginSubtitle } = body

    // Validate colors (should be valid hex codes)
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use hex code (e.g., #4169E1)' },
        { status: 400 }
      )
    }
    if (secondaryColor && !hexColorRegex.test(secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use hex code (e.g., #2a4494)' },
        { status: 400 }
      )
    }

    // Update branding settings
    await updateBrandingSettings({
      companyName,
      logoUrl,
      primaryColor,
      secondaryColor,
      loginTitle,
      loginSubtitle,
    })

    // Clear cache to reflect changes immediately
    clearBrandingCache()

    return NextResponse.json({
      success: true,
      message: 'Branding settings updated successfully',
    })
  } catch (error) {
    console.error('Update branding error:', error)
    return NextResponse.json(
      { error: 'Failed to update branding settings' },
      { status: 500 }
    )
  }
}
