import { prisma } from '@/lib/prisma'

/**
 * Add an IP rule (whitelist or blacklist)
 */
export async function addIPRule(
  ipAddress: string,
  type: 'WHITELIST' | 'BLACKLIST',
  reason: string,
  createdBy: string,
  expiresAt?: Date
) {
  return prisma.iPRule.create({
    data: {
      ipAddress,
      type,
      reason,
      createdBy,
      expiresAt: expiresAt || null,
      active: true,
    },
  })
}

/**
 * Check IP access against rules
 * Returns 'DENY' if blacklisted and active and not expired
 * Returns 'ALLOW' if whitelisted and active and not expired
 * Returns 'NEUTRAL' if no matching rule
 */
export async function checkIPAccess(ipAddress: string): Promise<'ALLOW' | 'DENY' | 'NEUTRAL'> {
  const rules = await prisma.iPRule.findMany({
    where: {
      ipAddress,
      active: true,
    },
  })

  const now = new Date()

  for (const rule of rules) {
    // Skip expired rules
    if (rule.expiresAt && rule.expiresAt < now) {
      continue
    }

    if (rule.type === 'BLACKLIST') {
      return 'DENY'
    }
  }

  for (const rule of rules) {
    // Skip expired rules
    if (rule.expiresAt && rule.expiresAt < now) {
      continue
    }

    if (rule.type === 'WHITELIST') {
      return 'ALLOW'
    }
  }

  return 'NEUTRAL'
}

/**
 * Get all active IP rules ordered by creation date
 */
export async function getIPRules() {
  return prisma.iPRule.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Deactivate an IP rule (soft delete)
 */
export async function removeIPRule(id: string) {
  return prisma.iPRule.update({
    where: { id },
    data: { active: false },
  })
}
