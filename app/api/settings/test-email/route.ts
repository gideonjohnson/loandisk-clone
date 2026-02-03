import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendEmailWithConfig } from '@/lib/email/emailService'
import type { EmailConfig, EmailProvider } from '@/lib/email/emailService'
import { Session } from 'next-auth'

export const POST = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()

      const config: EmailConfig = {
        provider: (body.emailProvider || 'mock') as EmailProvider,
        from: body.emailFrom || 'noreply@example.com',
        fromName: body.emailFromName || 'Meek Microfinance',
        smtp: {
          host: body.smtpHost || '',
          port: parseInt(body.smtpPort || '587', 10),
          secure: body.smtpSecure === true || body.smtpSecure === 'true',
          user: body.smtpUser || '',
          pass: body.smtpPass || '',
        },
        sendgrid: {
          apiKey: body.sendgridApiKey || '',
        },
      }

      const userEmail = session.user?.email
      if (!userEmail) {
        return NextResponse.json(
          { success: false, error: 'No email address found for current user' },
          { status: 400 }
        )
      }

      const result = await sendEmailWithConfig(
        {
          to: userEmail,
          subject: 'Meek Microfinance - Test Email',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Test Email</h2>
              <p>This is a test email from Meek Microfinance.</p>
              <p>If you received this, your email configuration is working correctly.</p>
              <p><strong>Provider:</strong> ${config.provider}</p>
              <p style="color: #666; font-size: 12px;">Sent at ${new Date().toISOString()}</p>
            </div>
          `,
          text: `Test email from Meek Microfinance. Provider: ${config.provider}. Sent at ${new Date().toISOString()}`,
          type: 'TEST_EMAIL',
        },
        config
      )

      return NextResponse.json(result)
    } catch (error) {
      console.error('Test email error:', error)
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to send test email' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)
