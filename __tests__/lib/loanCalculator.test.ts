import { describe, it, expect } from 'vitest'
import { calculateLoan, generateLoanNumber } from '@/lib/utils/loanCalculator'

describe('loanCalculator', () => {
  describe('calculateLoan', () => {
    it('calculates correct monthly payment for standard loan', () => {
      const result = calculateLoan(100000, 12, 12, new Date('2024-01-01'))

      // For 100,000 at 12% annual over 12 months
      // Monthly rate = 1%, monthly payment should be ~8884.88
      expect(result.monthlyPayment).toBeCloseTo(8884.88, 0)
    })

    it('calculates correct total interest', () => {
      const result = calculateLoan(100000, 12, 12, new Date('2024-01-01'))

      // Total payment = monthlyPayment * 12
      // Total interest = total payment - principal
      expect(result.totalInterest).toBeCloseTo(6618.55, 0)
    })

    it('generates correct number of schedule items', () => {
      const result = calculateLoan(100000, 12, 12, new Date('2024-01-01'))

      expect(result.schedule.length).toBe(12)
    })

    it('generates schedule with correct due dates', () => {
      const startDate = new Date('2024-01-01')
      const result = calculateLoan(100000, 12, 12, startDate)

      // First payment due date should be February (1 month after start)
      expect(result.schedule[0].dueDate.getMonth()).toBe(1) // February
      expect(result.schedule[0].dueDate.getFullYear()).toBe(2024)

      // Last payment due date should be January next year
      expect(result.schedule[11].dueDate.getMonth()).toBe(0) // January
      expect(result.schedule[11].dueDate.getFullYear()).toBe(2025)
    })

    it('schedule principal + interest equals total due', () => {
      const result = calculateLoan(100000, 12, 12, new Date('2024-01-01'))

      result.schedule.forEach((item) => {
        expect(item.principalDue + item.interestDue).toBeCloseTo(item.totalDue, 1)
      })
    })

    it('sum of principal payments equals loan amount', () => {
      const principal = 100000
      const result = calculateLoan(principal, 12, 12, new Date('2024-01-01'))

      const totalPrincipalPaid = result.schedule.reduce(
        (sum, item) => sum + item.principalDue,
        0
      )

      expect(totalPrincipalPaid).toBeCloseTo(principal, 0)
    })

    it('handles very low interest rate', () => {
      const principal = 12000
      const result = calculateLoan(principal, 0.01, 12, new Date('2024-01-01'))

      // With very low interest, monthly payment should be close to principal / months
      expect(result.monthlyPayment).toBeCloseTo(1000, 0)
      expect(result.totalInterest).toBeLessThan(10) // Very small interest
    })

    it('handles different term lengths', () => {
      const result24 = calculateLoan(100000, 12, 24, new Date('2024-01-01'))
      const result12 = calculateLoan(100000, 12, 12, new Date('2024-01-01'))

      // Longer term = lower monthly payment but more total interest
      expect(result24.monthlyPayment).toBeLessThan(result12.monthlyPayment)
      expect(result24.totalInterest).toBeGreaterThan(result12.totalInterest)
    })
  })

  describe('generateLoanNumber', () => {
    it('generates unique loan numbers', () => {
      const numbers = new Set<string>()

      for (let i = 0; i < 100; i++) {
        numbers.add(generateLoanNumber())
      }

      // All 100 should be unique
      expect(numbers.size).toBe(100)
    })

    it('generates loan numbers with correct format', () => {
      const loanNumber = generateLoanNumber()

      // Should start with LN-
      expect(loanNumber).toMatch(/^LN-/)

      // Should be uppercase
      expect(loanNumber).toBe(loanNumber.toUpperCase())

      // Should have expected structure (LN-timestamp-random)
      expect(loanNumber.split('-').length).toBe(3)
    })
  })
})
