/**
 * Reusable currency formatting utility for Reliable.
 * All prices are displayed in Ghana cedis (GH₵).
 * Do not change numeric values — only the display symbol.
 */

const CURRENCY_SYMBOL = 'GH₵'

/**
 * Format a numeric value as a currency string with GH₵ symbol.
 * @param value - The numeric amount to format
 * @returns Formatted string, e.g. "GH₵12.50"
 */
export function formatCurrency(value: number): string {
  return `${CURRENCY_SYMBOL}${value.toFixed(2)}`
}
