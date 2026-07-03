/**
 * Pure margin math. All prices/costs are handled as decimal strings at the
 * boundaries (Shopify's Money format) and floating point internally, rounded
 * to 2 places on the way out.
 */

/** Gross margin as a fraction, e.g. 0.35 for 35%. Null when not computable. */
export function marginFraction(
  price: number,
  cost: number | null,
): number | null {
  if (cost === null || !isFinite(price) || price <= 0) return null;
  return (price - cost) / price;
}

/** Gross margin as a percentage rounded to 1 decimal, e.g. 35.0. */
export function marginPercent(
  price: number,
  cost: number | null,
): number | null {
  const fraction = marginFraction(price, cost);
  if (fraction === null) return null;
  return Math.round(fraction * 1000) / 10;
}

/**
 * The price needed to achieve a target gross margin for a given unit cost.
 * price = cost / (1 - margin). Returns null for margins >= 100%.
 */
export function priceForTargetMargin(
  cost: number,
  targetMarginPercent: number,
): number | null {
  if (targetMarginPercent >= 100 || cost < 0) return null;
  const fraction = targetMarginPercent / 100;
  return roundMoney(cost / (1 - fraction));
}

/** Markup-on-cost variant, in case the merchant thinks in markup instead. */
export function priceForMarkup(cost: number, markupPercent: number): number {
  return roundMoney(cost * (1 + markupPercent / 100));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parse a Shopify Money decimal string; null for missing/invalid input. */
export function parseMoney(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return isFinite(parsed) ? parsed : null;
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}
