import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifySignature } from '@/lib/esignature/esignatureService'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    signatureRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('esignatureService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifySignature', () => {
    it('returns true for valid base64 image data', () => {
      const validSignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...'

      expect(verifySignature(validSignature)).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(verifySignature('')).toBe(false)
    })

    it('returns false for non-image data', () => {
      expect(verifySignature('some random text')).toBe(false)
      expect(verifySignature('data:text/plain;base64,SGVsbG8=')).toBe(false)
    })

    it('returns true for different image formats', () => {
      expect(verifySignature('data:image/png;base64,abc')).toBe(true)
      expect(verifySignature('data:image/jpeg;base64,xyz')).toBe(true)
      expect(verifySignature('data:image/svg+xml;base64,123')).toBe(true)
    })
  })
})
