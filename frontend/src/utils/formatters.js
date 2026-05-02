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

/**
 * Converts a number to words (Indian Rupees)
 */
export function numberToWords(amount) {
  const words = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (amount === 0) return 'Zero';

  function convert(num) {
    if (num < 20) return words[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + words[num % 10] : '');
    if (num < 1000) return words[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convert(num % 10000000) : '');
  }

  const result = convert(Math.floor(amount));
  return result ? result.trim() + ' Rupees Only' : '';
}
