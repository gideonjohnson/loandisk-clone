/**
 * Branding Service
 * Fetches and caches branding configuration from SystemSetting
 */

import { prisma } from '@/lib/prisma'

export interface BrandingConfig {
  companyName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  loginTitle: string
  loginSubtitle: string
}

const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'Meek Microfinance',
  logoUrl: null,
  primaryColor: '#4169E1',
  secondaryColor: '#2a4494',
  loginTitle: 'Welcome Back',
  loginSubtitle: 'Sign in to Meek Loan Management',
}

// Simple in-memory cache
let brandingCache: BrandingConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Map database setting keys to BrandingConfig properties
 */
const BRANDING_KEY_MAP: Record<string, keyof BrandingConfig> = {
  'branding_company_name': 'companyName',
  'branding_logo_url': 'logoUrl',
  'branding_primary_color': 'primaryColor',
  'branding_secondary_color': 'secondaryColor',
  'branding_login_title': 'loginTitle',
  'branding_login_subtitle': 'loginSubtitle',
}

/**
 * Fetch branding configuration from database
 * Returns cached value if available and not expired
 */
export async function getBrandingConfig(): Promise<BrandingConfig> {
  // Check cache
  if (brandingCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return brandingCache
  }

  try {
    // Fetch all branding settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        category: 'branding',
        isPublic: true,
      },
      select: {
        key: true,
        value: true,
      },
    })

    // Start with defaults
    const config: BrandingConfig = { ...DEFAULT_BRANDING }

    // Override with database values
    for (const setting of settings) {
      const configKey = BRANDING_KEY_MAP[setting.key]
      if (configKey) {
        if (configKey === 'logoUrl') {
          // Handle empty string as null for logoUrl
          config.logoUrl = setting.value?.trim() || null
        } else if (configKey === 'companyName' && setting.value?.trim()) {
          config.companyName = setting.value
        } else if (configKey === 'primaryColor' && setting.value?.trim()) {
          config.primaryColor = setting.value
        } else if (configKey === 'secondaryColor' && setting.value?.trim()) {
          config.secondaryColor = setting.value
        } else if (configKey === 'loginTitle' && setting.value?.trim()) {
          config.loginTitle = setting.value
        } else if (configKey === 'loginSubtitle' && setting.value?.trim()) {
          config.loginSubtitle = setting.value
        }
      }
    }

    // Update cache
    brandingCache = config
    cacheTimestamp = Date.now()

    return config
  } catch (error) {
    console.error('Failed to fetch branding config:', error)
    // Return defaults on error
    return DEFAULT_BRANDING
  }
}

/**
 * Clear the branding cache
 * Call this when branding settings are updated
 */
export function clearBrandingCache(): void {
  brandingCache = null
  cacheTimestamp = 0
}

/**
 * Get default branding configuration
 */
export function getDefaultBranding(): BrandingConfig {
  return { ...DEFAULT_BRANDING }
}

/**
 * Update branding settings in database
 */
export async function updateBrandingSettings(settings: Partial<BrandingConfig>): Promise<void> {
  const reverseKeyMap: Record<keyof BrandingConfig, string> = {
    companyName: 'branding_company_name',
    logoUrl: 'branding_logo_url',
    primaryColor: 'branding_primary_color',
    secondaryColor: 'branding_secondary_color',
    loginTitle: 'branding_login_title',
    loginSubtitle: 'branding_login_subtitle',
  }

  const labelMap: Record<keyof BrandingConfig, string> = {
    companyName: 'Company Name',
    logoUrl: 'Logo URL',
    primaryColor: 'Primary Color',
    secondaryColor: 'Secondary Color',
    loginTitle: 'Login Title',
    loginSubtitle: 'Login Subtitle',
  }

  for (const [configKey, value] of Object.entries(settings)) {
    const dbKey = reverseKeyMap[configKey as keyof BrandingConfig]
    if (dbKey) {
      await prisma.systemSetting.upsert({
        where: { key: dbKey },
        update: { value: value ?? '' },
        create: {
          category: 'branding',
          key: dbKey,
          value: value ?? '',
          label: labelMap[configKey as keyof BrandingConfig],
          isPublic: true,
          type: 'text',
        },
      })
    }
  }

  // Clear cache after update
  clearBrandingCache()
}
