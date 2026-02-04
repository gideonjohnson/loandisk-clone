import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  withRateLimit,
  RATE_LIMITS,
  blockIP,
  isIPBlocked,
  unblockIP,
} from '@/lib/security/rateLimit'

// Mock request factory
function createMockRequest(ip: string = '192.168.1.1'): Request {
  return new Request('http://localhost/api/test', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const request = createMockRequest('10.0.0.1')
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'test1' }

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(request, config)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block requests exceeding limit', () => {
      const request = createMockRequest('10.0.0.2')
      const config = { windowMs: 60000, maxRequests: 3, keyPrefix: 'test2' }

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        checkRateLimit(request, config)
      }

      // Next request should be blocked
      const result = checkRateLimit(request, config)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      const request = createMockRequest('10.0.0.3')
      const config = { windowMs: 1000, maxRequests: 2, keyPrefix: 'test3' }

      // Use up the limit
      checkRateLimit(request, config)
      checkRateLimit(request, config)

      const blockedResult = checkRateLimit(request, config)
      expect(blockedResult.allowed).toBe(false)

      // Advance time past the window
      vi.advanceTimersByTime(1500)

      // Should be allowed again
      const result = checkRateLimit(request, config)
      expect(result.allowed).toBe(true)
    })

    it('should track different clients separately', () => {
      const request1 = createMockRequest('10.0.0.4')
      const request2 = createMockRequest('10.0.0.5')
      const config = { windowMs: 60000, maxRequests: 2, keyPrefix: 'test4' }

      // Use up limit for client 1
      checkRateLimit(request1, config)
      checkRateLimit(request1, config)
      const blocked1 = checkRateLimit(request1, config)
      expect(blocked1.allowed).toBe(false)

      // Client 2 should still be allowed
      const result2 = checkRateLimit(request2, config)
      expect(result2.allowed).toBe(true)
    })
  })

  describe('RATE_LIMITS presets', () => {
    it('should have correct AUTH limit settings', () => {
      expect(RATE_LIMITS.AUTH.maxRequests).toBe(5)
      expect(RATE_LIMITS.AUTH.windowMs).toBe(15 * 60 * 1000)
    })

    it('should have correct SENSITIVE limit settings', () => {
      expect(RATE_LIMITS.SENSITIVE.maxRequests).toBe(10)
      expect(RATE_LIMITS.SENSITIVE.windowMs).toBe(60 * 60 * 1000)
    })

    it('should have correct WRITE limit settings', () => {
      expect(RATE_LIMITS.WRITE.maxRequests).toBe(30)
      expect(RATE_LIMITS.WRITE.windowMs).toBe(60 * 1000)
    })
  })

  describe('withRateLimit middleware', () => {
    it('should pass through allowed requests', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'middleware1' }
      const wrappedHandler = withRateLimit(mockHandler, config)

      const request = createMockRequest('10.0.0.6')
      const response = await wrappedHandler(request)

      expect(mockHandler).toHaveBeenCalled()
      expect(response).toBeInstanceOf(Response)
    })

    it('should return 429 when rate limited', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
      const config = { windowMs: 60000, maxRequests: 1, keyPrefix: 'middleware2' }
      const wrappedHandler = withRateLimit(mockHandler, config)

      const request = createMockRequest('10.0.0.7')

      // First request passes
      await wrappedHandler(request)

      // Second request should be rate limited
      const response = await wrappedHandler(request) as Response
      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body.error).toBe('Too many requests')
    })

    it('should include rate limit headers', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
      const config = { windowMs: 60000, maxRequests: 5, keyPrefix: 'middleware3' }
      const wrappedHandler = withRateLimit(mockHandler, config)

      const request = createMockRequest('10.0.0.8')
      const response = await wrappedHandler(request) as Response

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })

  describe('IP blocking', () => {
    it('should block and unblock IPs', () => {
      const request = createMockRequest('10.0.0.9')

      expect(isIPBlocked(request)).toBe(false)

      blockIP(request, 60000)
      expect(isIPBlocked(request)).toBe(true)

      unblockIP(request)
      expect(isIPBlocked(request)).toBe(false)
    })

    it('should auto-unblock after duration expires', () => {
      const request = createMockRequest('10.0.0.10')

      blockIP(request, 1000)
      expect(isIPBlocked(request)).toBe(true)

      vi.advanceTimersByTime(1500)
      expect(isIPBlocked(request)).toBe(false)
    })
  })
})
