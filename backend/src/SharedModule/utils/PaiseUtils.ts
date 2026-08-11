/**
 * PaiseUtils — centralised monetary arithmetic.
 *
 * Money is always stored and transported as integers (paise = ₹ × 100).
 * Division by 100 for display happens only in the frontend formatPaise utility.
 * These helpers operate purely on integers.
 */

/** Returns the percentage change from previous to current (rounded to 1 dp). */
export function calcPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Returns gross margin % rounded to 1 dp. */
export function calcMarginPct(profit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round((profit / revenue) * 1000) / 10;
}

/** Safely sums an array of paise values. Returns 0 if array is empty. */
export function sumPaise(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
