/**
 * Reusable currency formatting utility for Reliable.
 * Supports multiple currencies based on ISO code.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: 'GH₵',
  NGN: '₦',
  KES: 'KSh',
  USD: '$',
  GBP: '£',
  EUR: '€',
  CAD: 'C$',
  ZAR: 'R',
  AED: 'د.إ',
  INR: '₹',
  AUD: 'A$',
}

/**
 * Format a numeric value as a currency string.
 * @param value - The numeric amount to format
 * @param currencyCode - The ISO currency code (default: GHS)
 * @returns Formatted string, e.g. "GH₵12.50" or "$12.50"
 */
export function formatCurrency(value: number, currencyCode: string = 'GHS'): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode
  // If the symbol is the same as the code, we might want to add a space
  const displaySymbol = symbol === currencyCode ? `${symbol} ` : symbol
  return `${displaySymbol}${value.toFixed(2)}`
}
