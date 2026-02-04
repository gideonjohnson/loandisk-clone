import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencyConfig,
  getCurrencySymbol,
  getCurrencyOptions,
  formatCurrencyAmount,
  parseCurrencyAmount,
} from '@/lib/currency/currencyConfig'

describe('Currency Configuration', () => {
  describe('SUPPORTED_CURRENCIES', () => {
    it('should have KES as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES.KES).toBeDefined()
      expect(SUPPORTED_CURRENCIES.KES.code).toBe('KES')
      expect(SUPPORTED_CURRENCIES.KES.symbol).toBe('KSh')
    })

    it('should have USD as a supported currency', () => {
      expect(SUPPORTED_CURRENCIES.USD).toBeDefined()
      expect(SUPPORTED_CURRENCIES.USD.code).toBe('USD')
      expect(SUPPORTED_CURRENCIES.USD.symbol).toBe('$')
    })

    it('should have all expected African currencies', () => {
      const africanCurrencies = ['KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR', 'RWF', 'ETB']
      for (const code of africanCurrencies) {
        expect(SUPPORTED_CURRENCIES[code]).toBeDefined()
      }
    })

    it('should have proper decimal places for each currency', () => {
      // Currencies with 2 decimal places
      expect(SUPPORTED_CURRENCIES.KES.decimalPlaces).toBe(2)
      expect(SUPPORTED_CURRENCIES.USD.decimalPlaces).toBe(2)
      expect(SUPPORTED_CURRENCIES.EUR.decimalPlaces).toBe(2)

      // Currencies with 0 decimal places
      expect(SUPPORTED_CURRENCIES.UGX.decimalPlaces).toBe(0)
      expect(SUPPORTED_CURRENCIES.TZS.decimalPlaces).toBe(0)
      expect(SUPPORTED_CURRENCIES.RWF.decimalPlaces).toBe(0)
    })
  })

  describe('DEFAULT_CURRENCY', () => {
    it('should be KES', () => {
      expect(DEFAULT_CURRENCY).toBe('KES')
    })
  })

  describe('getCurrencyConfig', () => {
    it('should return correct config for valid currency', () => {
      const config = getCurrencyConfig('USD')
      expect(config.code).toBe('USD')
      expect(config.symbol).toBe('$')
      expect(config.name).toBe('US Dollar')
    })

    it('should return default currency config for invalid currency', () => {
      const config = getCurrencyConfig('INVALID')
      expect(config.code).toBe('KES')
    })
  })

  describe('getCurrencySymbol', () => {
    it('should return correct symbol for KES', () => {
      expect(getCurrencySymbol('KES')).toBe('KSh')
    })

    it('should return correct symbol for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
    })

    it('should return correct symbol for NGN', () => {
      expect(getCurrencySymbol('NGN')).toBe('₦')
    })

    it('should return default symbol for invalid currency', () => {
      expect(getCurrencySymbol('INVALID')).toBe('KSh')
    })
  })

  describe('getCurrencyOptions', () => {
    it('should return array of options', () => {
      const options = getCurrencyOptions()
      expect(Array.isArray(options)).toBe(true)
      expect(options.length).toBeGreaterThan(0)
    })

    it('should have value and label properties', () => {
      const options = getCurrencyOptions()
      for (const option of options) {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      }
    })

    it('should include currency code and name in label', () => {
      const options = getCurrencyOptions()
      const kesOption = options.find((o) => o.value === 'KES')
      expect(kesOption).toBeDefined()
      expect(kesOption?.label).toContain('KES')
      expect(kesOption?.label).toContain('Kenyan Shilling')
    })
  })

  describe('formatCurrencyAmount', () => {
    it('should format KES amounts correctly', () => {
      const formatted = formatCurrencyAmount(1000, 'KES')
      expect(formatted).toMatch(/1[,.]?000/)
    })

    it('should format USD amounts correctly', () => {
      const formatted = formatCurrencyAmount(1234.56, 'USD')
      expect(formatted).toMatch(/\$/)
      expect(formatted).toMatch(/1[,.]?234/)
    })

    it('should use default currency when not specified', () => {
      const formatted = formatCurrencyAmount(5000)
      expect(formatted).toMatch(/5[,.]?000/)
    })

    it('should handle zero amounts', () => {
      const formatted = formatCurrencyAmount(0, 'KES')
      expect(formatted).toMatch(/0/)
    })

    it('should handle negative amounts', () => {
      const formatted = formatCurrencyAmount(-100, 'USD')
      expect(formatted).toMatch(/-/)
    })

    it('should respect decimal places for currencies without decimals', () => {
      const formatted = formatCurrencyAmount(1000.99, 'UGX')
      // UGX has 0 decimal places, should round
      expect(formatted).not.toMatch(/\.99/)
    })
  })

  describe('parseCurrencyAmount', () => {
    it('should parse simple numbers', () => {
      expect(parseCurrencyAmount('1000')).toBe(1000)
    })

    it('should parse numbers with commas', () => {
      expect(parseCurrencyAmount('1,000')).toBe(1000)
    })

    it('should parse numbers with decimals', () => {
      expect(parseCurrencyAmount('1234.56')).toBe(1234.56)
    })

    it('should parse numbers with currency symbols', () => {
      expect(parseCurrencyAmount('$1,234.56')).toBe(1234.56)
      expect(parseCurrencyAmount('KSh 1,000')).toBe(1000)
    })

    it('should return 0 for empty string', () => {
      expect(parseCurrencyAmount('')).toBe(0)
    })

    it('should return 0 for non-numeric strings', () => {
      expect(parseCurrencyAmount('abc')).toBe(0)
    })

    it('should handle negative numbers', () => {
      expect(parseCurrencyAmount('-500')).toBe(-500)
    })
  })
})
