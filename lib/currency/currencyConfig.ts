/**
 * Currency Configuration
 * Defines supported currencies and formatting options
 */

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
  locale: string
  decimalPlaces: number
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    locale: 'en-KE',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimalPlaces: 2,
  },
  UGX: {
    code: 'UGX',
    symbol: 'USh',
    name: 'Ugandan Shilling',
    locale: 'en-UG',
    decimalPlaces: 0,
  },
  TZS: {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    locale: 'sw-TZ',
    decimalPlaces: 0,
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    locale: 'en-NG',
    decimalPlaces: 2,
  },
  GHS: {
    code: 'GHS',
    symbol: 'GH₵',
    name: 'Ghanaian Cedi',
    locale: 'en-GH',
    decimalPlaces: 2,
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    locale: 'en-ZA',
    decimalPlaces: 2,
  },
  RWF: {
    code: 'RWF',
    symbol: 'FRw',
    name: 'Rwandan Franc',
    locale: 'rw-RW',
    decimalPlaces: 0,
  },
  ETB: {
    code: 'ETB',
    symbol: 'Br',
    name: 'Ethiopian Birr',
    locale: 'am-ET',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimalPlaces: 2,
  },
}

export const DEFAULT_CURRENCY = 'KES'

export function getCurrencyConfig(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES[DEFAULT_CURRENCY]
}

export function getCurrencySymbol(code: string): string {
  return getCurrencyConfig(code).symbol
}

export function getCurrencyOptions(): Array<{ value: string; label: string }> {
  return Object.values(SUPPORTED_CURRENCIES).map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }))
}

/**
 * Format amount with currency
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY
): string {
  const config = getCurrencyConfig(currencyCode)

  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    }).format(amount)
  } catch {
    // Fallback for unsupported locales
    return `${config.symbol} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces,
    })}`
  }
}

/**
 * Parse currency amount from string
 */
export function parseCurrencyAmount(value: string): number {
  // Remove currency symbols and formatting
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}
