/**
 * Pads product codes to 10 digits with leading zeros if numeric and length < 10.
 * In Excel/CSV, leading zeros are often dropped (e.g. 0700120968 becomes 700120968).
 * This ensures exact matching between _li, _tr, and Productividad.
 */
export function normalizeProductCode(code: string | number): string {
  if (code === undefined || code === null) return '';
  const trimmed = String(code).trim();
  if (/^\d+$/.test(trimmed) && trimmed.length < 10) {
    return trimmed.padStart(10, '0');
  }
  return trimmed;
}

/**
 * Normalizes 9-digit order numbers.
 */
export function normalizeOrderNumber(orderNum: string | number): string {
  if (!orderNum) return '';
  const digits = String(orderNum).replace(/\D/g, '');
  return digits.slice(-9).padStart(9, '0');
}
