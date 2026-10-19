/**
 * Monetary & Reach Calculation Utilities (Minor Units / Integer Arithmetic)
 * Prevents floating point inaccuracy when processing payments and fees.
 */

export type SupportedCurrency = 'INR' | 'USD';

export interface FeeBreakdown {
  amountMinor: number; // e.g. 50000 paise (₹500.00) or 5000 cents ($50.00)
  platformFeeMinor: number; // 5% operations & escrow custody
  netMediaMinor: number; // 95% allocated directly to ad distribution
  estimatedImpressions: number;
  estimatedUniqueReach: number;
  currency: SupportedCurrency;
}

export const CPM_BENCHMARK_USD = 37.0; // $37 per 1,000 impressions
export const CPM_BENCHMARK_INR = 30.0; // ₹30 per 1,000 impressions
export const PLATFORM_FEE_RATE = 0.05; // 5% operations & escrow custodial fee
export const FREQUENCY_FACTOR = 1.35; // average exposures per unique citizen

export function calculateFeeBreakdown(
  amountMinor: number,
  currency: SupportedCurrency = 'USD'
): FeeBreakdown {
  const safeAmount = Math.max(0, Math.round(amountMinor));
  const platformFeeMinor = Math.round(safeAmount * PLATFORM_FEE_RATE);
  const netMediaMinor = safeAmount - platformFeeMinor;

  const benchmark = currency === 'INR' ? CPM_BENCHMARK_INR : CPM_BENCHMARK_USD;
  const netMediaUnits = netMediaMinor / 100.0;
  const estimatedImpressions = Math.round((netMediaUnits / benchmark) * 1000);
  const estimatedUniqueReach = Math.round(estimatedImpressions / FREQUENCY_FACTOR);

  return {
    amountMinor: safeAmount,
    platformFeeMinor,
    netMediaMinor,
    estimatedImpressions,
    estimatedUniqueReach,
    currency,
  };
}
