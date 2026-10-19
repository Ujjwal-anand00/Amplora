import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { formatCurrency, formatMetricNumber } from '../../lib/reachCalculator';

interface CampaignFundingProgressProps {
  raisedAmount: number; // in minor units (paise/cents)
  targetAmount: number; // in minor units
  currency?: 'INR' | 'USD';
  backerCount?: number;
  daysLeft?: number;
  estimatedImpressions?: number;
  compact?: boolean;
  showMilestones?: boolean;
  status?: string;
}

export const CampaignFundingProgress: React.FC<CampaignFundingProgressProps> = ({
  raisedAmount,
  targetAmount,
  currency = 'USD',
  backerCount = 0,

  daysLeft = 30,
  estimatedImpressions,
  compact = false,
  showMilestones = true,
  status,
}) => {
  // Safe unit normalization (supports both minor units and legacy major units)
  const normalizedRaised = raisedAmount > 0 && raisedAmount < 100000 ? raisedAmount * 100 : raisedAmount;
  const normalizedTarget = targetAmount > 0 && targetAmount < 100000 ? targetAmount * 100 : targetAmount;
  const safeTarget = Math.max(1, normalizedTarget);
  const rawPercentage = Math.round((normalizedRaised / safeTarget) * 100);
  const visualPercentage = Math.min(100, Math.max(0, rawPercentage));
  const isOverfunded = rawPercentage > 100;
  const isGoalReached = rawPercentage >= 100;
  const remainingMinor = Math.max(0, safeTarget - normalizedRaised);

  // Compute impressions if not passed explicitly: 95% media budget with CPM benchmark (₹30 for INR, $37 for USD)
  const netMedia = Math.round(normalizedRaised * 0.95);
  const cpm = currency === 'INR' ? 30 : 37;
  const impressions = estimatedImpressions || Math.round((netMedia / 100 / cpm) * 1000);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Top Header: Raised & Percentage */}
      <View style={styles.headerRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.raisedLabel}>FUNDS RAISED</Text>
          <View style={styles.amountValueRow}>
            <Text style={styles.raisedAmount}>
              {formatCurrency(raisedAmount, currency)}
            </Text>
            <Text style={styles.targetAmount}>
              of {formatCurrency(targetAmount, currency)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.percentageBadge,
            isOverfunded
              ? styles.overfundedBadge
              : isGoalReached
              ? styles.goalReachedBadge
              : styles.standardBadge,
          ]}
        >
          {isOverfunded && (
            <Ionicons name="sparkles" size={12} color={colors.primary} style={{ marginRight: 3 }} />
          )}
          <Text
            style={[
              styles.percentageText,
              (isOverfunded || isGoalReached) && styles.goalPercentageText,
            ]}
          >
            {rawPercentage}%
          </Text>
        </View>
      </View>

      {/* Visual Progress Bar with Milestone Markers */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${visualPercentage}%` },
            isOverfunded && styles.progressBarOverfunded,
          ]}
        />
        {/* Milestone Pips (25%, 50%, 75%) */}
        {showMilestones && !compact && (
          <View style={styles.pipsOverlay} pointerEvents="none">
            <View style={[styles.pip, { left: '25%' }]} />
            <View style={[styles.pip, { left: '50%' }]} />
            <View style={[styles.pip, { left: '75%' }]} />
          </View>
        )}
      </View>

      {/* Secondary Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metricText}>
            <Text style={styles.metricHighlight}>{backerCount.toLocaleString()}</Text> backers
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
          <Text style={styles.metricText}>
            <Text style={styles.metricHighlight}>{formatMetricNumber(impressions)}</Text> est. views
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metricText}>
            {daysLeft > 0 ? (
              <>
                <Text style={styles.metricHighlight}>{daysLeft}</Text> days left
              </>
            ) : (
              <Text style={[styles.metricHighlight, { color: colors.success }]}>Goal reached</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Disclaimers & Amplification Notice */}
      {!compact && (
        <View style={styles.disclaimerBox}>
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            Funds community advertising placements. Advertising launches once certified after campaign funding phase completes.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  compactContainer: {
    padding: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  amountBlock: {
    flex: 1,
  },
  raisedLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  amountValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  raisedAmount: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  targetAmount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  standardBadge: {
    backgroundColor: colors.surfaceSubtle,
  },
  goalReachedBadge: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  overfundedBadge: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  percentageText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  goalPercentageText: {
    color: colors.primaryDark,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.full,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  progressBarOverfunded: {
    backgroundColor: colors.accentDark,
  },
  pipsOverlay: {
    ...StyleSheet.absoluteFill,
  },
  pip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  metricHighlight: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.xs + 2,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  disclaimerIcon: {
    marginTop: 1,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
