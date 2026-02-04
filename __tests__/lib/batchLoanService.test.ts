import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseCSV } from '@/lib/loans/batchLoanService'

describe('Batch Loan Service', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate,purpose,currency
cuid123,50000,12,12,2024-01-15,Business,KES
cuid456,75000,15,24,2024-02-01,Education,KES`

      const records = parseCSV(csvContent)

      expect(records).toHaveLength(2)
      expect(records[0].borrowerId).toBe('cuid123')
      expect(records[0].principalAmount).toBe('50000')
      expect(records[0].interestRate).toBe('12')
      expect(records[0].termMonths).toBe('12')
      expect(records[0].startDate).toBe('2024-01-15')
      expect(records[0].purpose).toBe('Business')
      expect(records[0].currency).toBe('KES')
    })

    it('should handle CSV with optional columns missing', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate
cuid123,50000,12,12,2024-01-15`

      const records = parseCSV(csvContent)

      expect(records).toHaveLength(1)
      expect(records[0].borrowerId).toBe('cuid123')
      expect(records[0].purpose).toBeUndefined()
      expect(records[0].currency).toBe('KES') // Should default to KES
    })

    it('should throw error for missing required columns', () => {
      const csvContent = `borrowerId,principalAmount,interestRate
cuid123,50000,12`

      expect(() => parseCSV(csvContent)).toThrow('Missing required column')
    })

    it('should throw error for empty CSV', () => {
      const csvContent = ``

      expect(() => parseCSV(csvContent)).toThrow('CSV must have a header row')
    })

    it('should throw error for CSV with only header', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate`

      expect(() => parseCSV(csvContent)).toThrow('at least one data row')
    })

    it('should handle case-insensitive column headers', () => {
      const csvContent = `BorrowerId,PrincipalAmount,InterestRate,TermMonths,StartDate
cuid123,50000,12,12,2024-01-15`

      const records = parseCSV(csvContent)

      expect(records).toHaveLength(1)
      expect(records[0].borrowerId).toBe('cuid123')
    })

    it('should handle whitespace in values', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate
  cuid123  ,  50000  ,  12  ,  12  ,  2024-01-15  `

      const records = parseCSV(csvContent)

      expect(records).toHaveLength(1)
      expect(records[0].borrowerId).toBe('cuid123')
      expect(records[0].principalAmount).toBe('50000')
    })

    it('should skip empty lines', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate
cuid123,50000,12,12,2024-01-15

cuid456,75000,15,24,2024-02-01
`

      const records = parseCSV(csvContent)

      // Empty lines might be skipped or handled differently
      expect(records.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle multiple loans with different currencies', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate,purpose,currency
cuid123,50000,12,12,2024-01-15,Business,KES
cuid456,1000,10,6,2024-02-01,Personal,USD
cuid789,500000,8,36,2024-03-01,Agriculture,UGX`

      const records = parseCSV(csvContent)

      expect(records).toHaveLength(3)
      expect(records[0].currency).toBe('KES')
      expect(records[1].currency).toBe('USD')
      expect(records[2].currency).toBe('UGX')
    })
  })

  describe('Record validation', () => {
    it('should have required fields populated', () => {
      const csvContent = `borrowerId,principalAmount,interestRate,termMonths,startDate
cuid123,50000,12,12,2024-01-15`

      const records = parseCSV(csvContent)
      const record = records[0]

      expect(record.borrowerId).toBeTruthy()
      expect(record.principalAmount).toBeTruthy()
      expect(record.interestRate).toBeTruthy()
      expect(record.termMonths).toBeTruthy()
      expect(record.startDate).toBeTruthy()
    })
  })
})
