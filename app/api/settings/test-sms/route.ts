import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { sendSMSWithConfig } from '@/lib/sms/smsService'
import type { SMSConfig, SMSProvider } from '@/lib/sms/smsService'

export const POST = createAuthHandler(
  async (request: Request) => {
    try {
      const body = await request.json()

      const testNumber = body.testPhoneNumber
      if (!testNumber) {
        return NextResponse.json(
          { success: false, error: 'Please provide a test phone number' },
          { status: 400 }
        )
      }

      const config: SMSConfig = {
        provider: (body.smsProvider || 'mock') as SMSProvider,
        twilio: {
          accountSid: body.twilioAccountSid || '',
          authToken: body.twilioAuthToken || '',
          fromNumber: body.twilioFromNumber || '',
        },
        africastalking: {
          apiKey: body.atApiKey || '',
          username: body.atUsername || '',
          from: body.atFrom || '',
        },
      }

      const result = await sendSMSWithConfig(
        {
          to: testNumber,
          message: `Meek Microfinance test SMS. Provider: ${config.provider}. Sent at ${new Date().toISOString()}`,
          type: 'TEST_SMS',
        },
        config
      )

      return NextResponse.json(result)
    } catch (error) {
      console.error('Test SMS error:', error)
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to send test SMS' },
        { status: 500 }
      )
    }
  },
  [Permission.SETTINGS_MANAGE]
)
