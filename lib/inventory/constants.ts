/**
 * Threshold for low-stock alerts as a percentage of total purchased kg.
 * e.g. 0.10 means alert when available stock drops below 10% of total input.
 */
export const LOW_STOCK_THRESHOLD = 0.10

/**
 * Determine whether a concentrate is considered low on stock.
 * @param availableKg  Current available kilograms
 * @param totalKgIn    Total kilograms ever purchased (input)
 */
export function isLowStock(availableKg: number, totalKgIn: number): boolean {
  return totalKgIn > 0 && availableKg / totalKgIn < LOW_STOCK_THRESHOLD
}

/**
 * Calculate remaining stock percentage.
 * @param availableKg  Current available kilograms
 * @param totalKgIn    Total kilograms ever purchased (input)
 * @returns Percentage string rounded to nearest integer (e.g. "8%")
 */
export function stockPercentage(
  availableKg: number,
  totalKgIn: number
): string {
  if (totalKgIn <= 0) return '0%'
  return `${Math.round((availableKg / totalKgIn) * 100)}%`
}
