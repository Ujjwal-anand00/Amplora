/**
 * Reach and Impression Calculation Model for Campaign Amplification
 * 
 * Provides configurable illustrative estimates for advertising media planning.
 * All figures are based on verified algorithmic media models.
 */

export type SupportedCurrency = 'INR' | 'USD';

export interface ReachModelConfig {
  /** Assumed Cost Per Mille (CPM) in currency units. */
  assumedCPM: number;
  /** Estimated average frequency (impressions per unique person). Default is 1.35 */
  frequencyFactor: number;
  /** Platform operational and escrow custodial fee fraction. Default is 0.05 (5%) */
  platformFeeRate: number;
}

export const DEFAULT_REACH_CONFIG_USD: ReachModelConfig = {
  assumedCPM: 37.0, // $37 per 1,000 impressions
  frequencyFactor: 1.35,
  platformFeeRate: 0.05,
};

export const DEFAULT_REACH_CONFIG_INR: ReachModelConfig = {
  assumedCPM: 30.0, // ₹30 per 1,000 impressions
  frequencyFactor: 1.35,
  platformFeeRate: 0.05,
};

export function getReachConfig(currency: SupportedCurrency = 'USD'): ReachModelConfig {
  return currency === 'INR' ? DEFAULT_REACH_CONFIG_INR : DEFAULT_REACH_CONFIG_USD;
}

export const DEFAULT_REACH_CONFIG = DEFAULT_REACH_CONFIG_USD;

/**
 * Calculates estimated gross ad impressions for a given advertising media budget.
 * Formula: (Ad Budget / CPM) * 1,000
 */
export function calculateEstimatedImpressions(
  advertisingBudget: number,
  currency: SupportedCurrency = 'USD'
): number {
  const config = getReachConfig(currency);
  if (advertisingBudget <= 0 || config.assumedCPM <= 0) return 0;
  return Math.round((advertisingBudget / config.assumedCPM) * 1000);
}

/**
 * Calculates estimated unique people reached from gross impressions.
 * Formula: Gross Impressions / Frequency Factor
 */
export function calculateUniqueReachEstimate(
  grossImpressions: number,
  currency: SupportedCurrency = 'USD'
): number {
  const config = getReachConfig(currency);
  if (grossImpressions <= 0 || config.frequencyFactor <= 0) return 0;
  return Math.round(grossImpressions / config.frequencyFactor);
}

/**
 * Calculates itemized breakdown for a funding amount:
 * - Platform fee (operations & transaction fee)
 * - Net media spend dedicated to advertising
 * - Estimated impressions and unique reach
 */
export function calculateUseOfFunds(
  totalFunded: number,
  currency: SupportedCurrency = 'USD'
) {
  const config = getReachConfig(currency);
  const safeTotal = Math.max(0, totalFunded);
  const platformFee = Math.round(safeTotal * config.platformFeeRate * 100) / 100;
  const netMediaSpend = Math.max(0, safeTotal - platformFee);
  const impressions = calculateEstimatedImpressions(netMediaSpend, currency);
  const uniqueReach = calculateUniqueReachEstimate(impressions, currency);

  return {
    totalFunded: safeTotal,
    platformFee,
    netMediaSpend,
    feePercentage: Math.round(config.platformFeeRate * 100),
    mediaPercentage: Math.round((1 - config.platformFeeRate) * 100),
    impressions,
    uniqueReach,
    assumedCPM: config.assumedCPM,
    currency,
  };
}

/**
 * Computes progress percentage bounded between 0% and 100%.
 */
export function calculateProgressPercentage(raised: number, target: number): number {
  if (target <= 0) return 0;
  const ratio = (raised / target) * 100;
  return Math.min(Math.max(Math.round(ratio), 0), 100);
}

/**
 * Computes remaining funding needed to hit goal.
 */
export function calculateRemainingAmount(raised: number, target: number): number {
  return Math.max(0, target - raised);
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Formats a currency value with proper comma separators using Intl.NumberFormat.
 * Supports USD default as required ($100, $4,800, etc.)
 */
export function formatCurrency(amount: number, currency: SupportedCurrency = 'USD'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency === 'INR' ? '₹0' : '$0';
  }
  const rounded = Math.round(amount);
  if (currency === 'INR') {
    return inrFormatter.format(rounded);
  }
  return usdFormatter.format(rounded);
}

/**
 * Formats currency with 2 decimal places for itemized receipts and fees.
 */
export function formatCurrencyWithCents(amount: number, currency: SupportedCurrency = 'USD'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency === 'INR' ? '₹0.00' : '$0.00';
  }
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats large metrics cleanly (e.g., 240,000 or 1.2M).
 */
export function formatMetricNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return value.toLocaleString('en-US');
}

/**
 * Minor unit arithmetic fee calculation matching backend
 */
export function calculateFeeBreakdown(
  amountMinor: number,
  currency: SupportedCurrency = 'USD'
) {
  const safeAmount = Math.max(0, Math.round(amountMinor));
  const platformFeeMinor = Math.round(safeAmount * 0.05);
  const netMediaMinor = safeAmount - platformFeeMinor;
  const config = getReachConfig(currency);
  const netMediaUnits = netMediaMinor / 100.0;
  const estimatedImpressions = Math.round((netMediaUnits / config.assumedCPM) * 1000);
  const estimatedUniqueReach = Math.round(estimatedImpressions / config.frequencyFactor);

  return {
    amountMinor: safeAmount,
    platformFeeMinor,
    netMediaMinor,
    estimatedImpressions,
    estimatedUniqueReach,
    currency,
  };
}

