/**
 * Small, deterministic price formatter with zero dependency on Intl.
 *
 * Rules:
 * 1. Formats numbers with comma thousands separators (e.g. 150000 -> "150,000").
 * 2. Uses the Naira symbol (₦) for "NGN".
 * 3. Uses the currency code with a space (e.g. "USD 2,500") for all other currencies.
 * 4. Prepends the optional label (e.g. "from ₦150,000") if provided.
 */
export function formatIntegerWithCommas(value: number): string {
  const isNegative = value < 0;
  const absValue = Math.abs(Math.round(value));
  const formatted = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return isNegative ? `-${formatted}` : formatted;
}

export function formatPrice(price: number, currency = "NGN", label?: string): string {
  const numberStr = formatIntegerWithCommas(price);
  const currencyStr = currency === "NGN" ? `₦${numberStr}` : `${currency} ${numberStr}`;

  if (label && label.trim().length > 0) {
    return `${label.trim()} ${currencyStr}`;
  }

  return currencyStr;
}
