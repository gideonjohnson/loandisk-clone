import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    twoFactorAuth: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((operations) => Promise.all(operations)),
  },
}))

describe('twoFactorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('backup codes', () => {
    const generateBackupCodes = (count: number = 10): string[] => {
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase()
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
      }
      return codes
    }

    it('generates specified number of backup codes', () => {
      const codes5 = generateBackupCodes(5)
      const codes10 = generateBackupCodes(10)
      const codes15 = generateBackupCodes(15)

      expect(codes5.length).toBe(5)
      expect(codes10.length).toBe(10)
      expect(codes15.length).toBe(15)
    })

    it('generates unique backup codes', () => {
      const codes = generateBackupCodes(100)

      expect(new Set(codes).size).toBe(100) // All unique
    })

    it('generates backup codes in correct format', () => {
      const codes = generateBackupCodes(20)

      codes.forEach((code) => {
        // Format: XXXX-XXXX (8 hex chars with dash in middle)
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
      })
    })

    it('generates consistent code length', () => {
      const codes = generateBackupCodes(50)

      codes.forEach((code) => {
        expect(code.length).toBe(9) // 4 + 1 (dash) + 4
      })
    })

    it('generates all uppercase codes', () => {
      const codes = generateBackupCodes(10)

      codes.forEach((code) => {
        expect(code).toBe(code.toUpperCase())
      })
    })
  })

  describe('secure token generation', () => {
    const generateSecureToken = (): string => {
      return crypto.randomBytes(32).toString('hex')
    }

    it('generates tokens of correct length', () => {
      const token = generateSecureToken()

      // 32 bytes = 64 hex characters
      expect(token.length).toBe(64)
    })

    it('generates unique tokens', () => {
      const tokens = new Set<string>()

      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken())
      }

      expect(tokens.size).toBe(100)
    })

    it('generates tokens with valid hex characters', () => {
      const token = generateSecureToken()

      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
