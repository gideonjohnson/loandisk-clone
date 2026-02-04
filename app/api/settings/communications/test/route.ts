import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmailWithConfig, EmailConfig } from '@/lib/email/emailService'
import { sendSMSWithConfig, SMSConfig } from '@/lib/sms/smsService'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, recipient, settings } = body

    if (!type || !recipient || !settings) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'email') {
      const emailConfig: EmailConfig = {
        provider: (settings.email_provider || 'mock') as EmailConfig['provider'],
        from: settings.email_from || 'noreply@example.com',
        fromName: settings.email_from_name || 'Loan Management System',
        smtp: {
          host: settings.smtp_host || '',
          port: parseInt(settings.smtp_port || '587', 10),
          secure: settings.smtp_secure === 'true',
          user: settings.smtp_user || '',
          pass: settings.smtp_pass || '',
        },
        sendgrid: {
          apiKey: settings.sendgrid_api_key || '',
        },
      }

      const result = await sendEmailWithConfig(
        {
          to: recipient,
          subject: 'Test Email from Meek Loan Management',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4169E1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px; }
                .success { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Test Email</h1>
                </div>
                <div class="content">
                  <div class="success">
                    <strong>Configuration Test Successful!</strong>
                  </div>
                  <p>This is a test email from your Meek Loan Management System.</p>
                  <p>If you received this email, your email configuration is working correctly.</p>
                  <p><strong>Provider:</strong> ${settings.email_provider || 'mock'}</p>
                  <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: 'This is a test email from Meek Loan Management System. If you received this email, your configuration is working correctly.',
          type: 'TEST',
        },
        emailConfig
      )

      if (result.success) {
        return NextResponse.json({ success: true, messageId: result.messageId })
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
    } else if (type === 'sms') {
      const smsConfig: SMSConfig = {
        provider: (settings.sms_provider || 'mock') as SMSConfig['provider'],
        twilio: {
          accountSid: settings.twilio_account_sid || '',
          authToken: settings.twilio_auth_token || '',
          fromNumber: settings.twilio_from_number || '',
        },
        africastalking: {
          apiKey: settings.at_api_key || '',
          username: settings.at_username || '',
          from: settings.at_from || '',
        },
      }

      const result = await sendSMSWithConfig(
        {
          to: recipient,
          message: `Test SMS from Meek Loan Management. If you received this message, your SMS configuration is working correctly. Sent at ${new Date().toLocaleTimeString()}.`,
          type: 'TEST',
        },
        smsConfig
      )

      if (result.success) {
        return NextResponse.json({ success: true, messageId: result.messageId })
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Test communication failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 })
  }
}
