/**
 * Notification Config
 * Reads email/SMS configuration from database settings with env var fallback.
 * Caches results for 60 seconds to avoid DB hits on every send.
 */

import { prisma } from '@/lib/prisma'
import type { EmailConfig, EmailProvider } from '@/lib/email/emailService'
import type { SMSConfig, SMSProvider } from '@/lib/sms/smsService'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const CACHE_TTL_MS = 60_000

let emailConfigCache: CacheEntry<EmailConfig> | null = null
let smsConfigCache: CacheEntry<SMSConfig> | null = null

async function getSettingsByCategory(category: string): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { category },
    })
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return map
  } catch {
    return {}
  }
}

export async function getEmailConfigFromDB(): Promise<EmailConfig> {
  if (emailConfigCache && Date.now() < emailConfigCache.expiresAt) {
    return emailConfigCache.data
  }

  const db = await getSettingsByCategory('notifications')

  const config: EmailConfig = {
    provider: (db.email_provider || process.env.EMAIL_PROVIDER || 'mock') as EmailProvider,
    from: db.email_from || process.env.EMAIL_FROM || 'noreply@example.com',
    fromName: db.email_from_name || process.env.EMAIL_FROM_NAME || 'Loan Management System',
    smtp: {
      host: db.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(db.smtp_port || process.env.SMTP_PORT || '587', 10),
      secure: (db.smtp_secure || process.env.SMTP_SECURE) === 'true',
      user: db.smtp_user || process.env.SMTP_USER || '',
      pass: db.smtp_pass || process.env.SMTP_PASS || '',
    },
    sendgrid: {
      apiKey: db.sendgrid_api_key || process.env.SENDGRID_API_KEY || '',
    },
  }

  emailConfigCache = { data: config, expiresAt: Date.now() + CACHE_TTL_MS }
  return config
}

export async function getSMSConfigFromDB(): Promise<SMSConfig> {
  if (smsConfigCache && Date.now() < smsConfigCache.expiresAt) {
    return smsConfigCache.data
  }

  const db = await getSettingsByCategory('notifications')

  const config: SMSConfig = {
    provider: (db.sms_provider || process.env.SMS_PROVIDER || 'mock') as SMSProvider,
    twilio: {
      accountSid: db.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: db.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: db.twilio_from_number || process.env.TWILIO_FROM_NUMBER || '',
    },
    africastalking: {
      apiKey: db.at_api_key || process.env.AT_API_KEY || '',
      username: db.at_username || process.env.AT_USERNAME || '',
      from: db.at_from || process.env.AT_FROM || '',
    },
  }

  smsConfigCache = { data: config, expiresAt: Date.now() + CACHE_TTL_MS }
  return config
}

/** Clear cached configs (e.g. after settings are saved) */
export function clearNotificationConfigCache() {
  emailConfigCache = null
  smsConfigCache = null
}
