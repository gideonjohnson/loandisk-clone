import { NextResponse } from 'next/server'
import { runScheduledReminders, getReminderStats } from '@/lib/reminders/paymentReminderService'

/**
 * POST /api/reminders/run
 * Manually trigger payment reminders
 * Can be called by cron job or admin
 */
export async function POST(request: Request) {
  try {
    // Verify API key for cron job authentication
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_API_KEY

    // If API key is configured, require it
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const results = await runScheduledReminders()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    console.error('Run reminders error:', error)
    return NextResponse.json(
      {
        error: 'Failed to run reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reminders/run
 * Get reminder statistics
 */
export async function GET(_request: Request) {
  try {
    const stats = await getReminderStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Get reminder stats error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get reminder stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
