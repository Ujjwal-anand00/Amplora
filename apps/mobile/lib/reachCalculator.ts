/**
 * Reach and Impression Calculation Model for Campaign Amplification
 * 
 * Provides configurable illustrative estimates for advertising media planning.
 * IMPORTANT: In accordance with platform standards, all figures are estimates.
 * Actual delivery varies with ad auction dynamics, seasonal inventory, targeting density,
 * and creative click-through rates.
 */

export interface ReachModelConfig {
  /** Assumed Cost Per Mille (CPM) in USD. Default is $37.00 (~$0.037 per impression) */
  assumedCPM: number;
  /** Estimated average frequency (impressions per unique person). Default is 1.35 */
  frequencyFactor: number;
  /** Platform operational and payment processing fee fraction. Default is 0.05 (5%) */
  platformFeeRate: number;
}

export const DEFAULT_REACH_CONFIG: ReachModelConfig = {
  assumedCPM: 37.0, // $37 per 1,000 impressions
  frequencyFactor: 1.35,
  platformFeeRate: 0.05,
};

/**
 * Calculates estimated gross ad impressions for a given advertising media budget.
 * Formula: (Ad Budget / CPM) * 1,000
 */
export function calculateEstimatedImpressions(
  advertisingBudget: number,
  config: ReachModelConfig = DEFAULT_REACH_CONFIG
): number {
  if (advertisingBudget <= 0 || config.assumedCPM <= 0) return 0;
  return Math.round((advertisingBudget / config.assumedCPM) * 1000);
}

/**
 * Calculates estimated unique people reached from gross impressions.
 * Formula: Gross Impressions / Frequency Factor
 */
export function calculateUniqueReachEstimate(
  grossImpressions: number,
  config: ReachModelConfig = DEFAULT_REACH_CONFIG
): number {
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
  config: ReachModelConfig = DEFAULT_REACH_CONFIG
) {
  const safeTotal = Math.max(0, totalFunded);
  const platformFee = Math.round(safeTotal * config.platformFeeRate * 100) / 100;
  const netMediaSpend = Math.max(0, safeTotal - platformFee);
  const impressions = calculateEstimatedImpressions(netMediaSpend, config);
  const uniqueReach = calculateUniqueReachEstimate(impressions, config);

  return {
    totalFunded: safeTotal,
    platformFee,
    netMediaSpend,
    feePercentage: Math.round(config.platformFeeRate * 100),
    mediaPercentage: Math.round((1 - config.platformFeeRate) * 100),
    impressions,
    uniqueReach,
    assumedCPM: config.assumedCPM,
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

/**
 * Formats a currency value with comma separators and no decimals for whole dollars.
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '$0';
  return `$${Math.round(amount).toLocaleString('en-US')}`;
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
