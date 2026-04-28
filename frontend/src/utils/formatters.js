/**
 * Formats a number as a currency string.
 * @param {number} value The number to format
 * @param {string} currency The currency code (default: USD)
 * @param {string} locale The locale code (default: en-US)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'INR', locale = 'en-IN') {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value));
}
