import { NextResponse } from 'next/server'
import { Session } from 'next-auth'
import { createAuthHandler } from '@/lib/middleware/withAuth'
import { Permission } from '@/lib/permissions'
import { addIPRule, getIPRules, removeIPRule } from '@/lib/security/ipRuleService'

/**
 * GET /api/security/ip-rules
 * Returns all active IP rules
 * Requires IP_RULES_MANAGE permission
 */
export const GET = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const rules = await getIPRules()

      return NextResponse.json({
        rules,
        total: rules.length,
      })
    } catch (error) {
      console.error('Get IP rules error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch IP rules',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.IP_RULES_MANAGE]
)

/**
 * POST /api/security/ip-rules
 * Creates a new IP rule
 * Body: { ipAddress: string, type: 'WHITELIST' | 'BLACKLIST', reason: string, expiresAt?: string }
 * Requires IP_RULES_MANAGE permission
 */
export const POST = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { ipAddress, type, reason, expiresAt } = body

      if (!ipAddress || !type || !reason) {
        return NextResponse.json(
          { error: 'ipAddress, type, and reason are required' },
          { status: 400 }
        )
      }

      if (type !== 'WHITELIST' && type !== 'BLACKLIST') {
        return NextResponse.json(
          { error: 'type must be WHITELIST or BLACKLIST' },
          { status: 400 }
        )
      }

      const rule = await addIPRule(
        ipAddress,
        type,
        reason,
        session.user.id!,
        expiresAt ? new Date(expiresAt) : undefined
      )

      return NextResponse.json({
        success: true,
        message: 'IP rule created successfully',
        rule,
      })
    } catch (error) {
      console.error('Create IP rule error:', error)
      return NextResponse.json(
        {
          error: 'Failed to create IP rule',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.IP_RULES_MANAGE]
)

/**
 * DELETE /api/security/ip-rules
 * Deactivates an IP rule
 * Body: { ruleId: string }
 * Requires IP_RULES_MANAGE permission
 */
export const DELETE = createAuthHandler(
  async (request: Request, session: Session) => {
    try {
      const body = await request.json()
      const { ruleId } = body

      if (!ruleId) {
        return NextResponse.json(
          { error: 'ruleId is required' },
          { status: 400 }
        )
      }

      await removeIPRule(ruleId)

      return NextResponse.json({
        success: true,
        message: 'IP rule removed successfully',
      })
    } catch (error) {
      console.error('Remove IP rule error:', error)
      return NextResponse.json(
        {
          error: 'Failed to remove IP rule',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  },
  [Permission.IP_RULES_MANAGE]
)
