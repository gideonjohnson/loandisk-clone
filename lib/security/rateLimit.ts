/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  keyPrefix?: string    // Prefix for the rate limit key
}

// Preset configurations
export const RATE_LIMITS = {
  // Strict limit for auth endpoints
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth' },

  // Standard API limit
  API: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'api' },

  // Relaxed limit for read operations
  READ: { windowMs: 60 * 1000, maxRequests: 200, keyPrefix: 'read' },

  // Strict limit for write operations
  WRITE: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'write' },

  // Very strict for sensitive operations
  SENSITIVE: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'sensitive' },
}

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback - in production, you'd want to ensure this is set
  return 'unknown-client'
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.API
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientId = getClientId(request)
  const key = `${config.keyPrefix || 'default'}:${clientId}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const allowed = entry.count <= config.maxRequests

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit<T, C = unknown>(
  handler: (request: Request, context?: C) => Promise<T>,
  config: RateLimitConfig = RATE_LIMITS.API
) {
  return async (request: Request, context?: C): Promise<T | Response> => {
    const { allowed, remaining, resetTime } = checkRateLimit(request, config)

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const response = await handler(request, context)

    // Add rate limit headers to successful responses
    if (response instanceof Response) {
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', resetTime.toString())
    }

    return response
  }
}

/**
 * Check if IP is blocked (for brute force protection)
 */
const blockedIPs = new Map<string, number>()

export function blockIP(request: Request, durationMs: number = 30 * 60 * 1000) {
  const clientId = getClientId(request)
  blockedIPs.set(clientId, Date.now() + durationMs)
}

export function isIPBlocked(request: Request): boolean {
  const clientId = getClientId(request)
  const blockedUntil = blockedIPs.get(clientId)

  if (!blockedUntil) return false

  if (blockedUntil < Date.now()) {
    blockedIPs.delete(clientId)
    return false
  }

  return true
}

export function unblockIP(request: Request) {
  const clientId = getClientId(request)
  blockedIPs.delete(clientId)
}
