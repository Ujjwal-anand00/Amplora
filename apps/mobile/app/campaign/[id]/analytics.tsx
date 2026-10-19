import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../../theme';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { useCampaignAnalyticsQuery } from '../../../services/apiClient';
import { formatCurrency, formatMetricNumber } from '../../../lib/reachCalculator';

export default function CampaignAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const { data: analytics, isLoading, isError, refetch } = useCampaignAnalyticsQuery(id || '');

  const toggleMetric = (key: string) => {
    setExpandedMetric(prev => (prev === key ? null : key));
  };

  const handleShare = async () => {
    if (!analytics?.campaign) return;
    try {
      await Share.share({
        title: `${analytics.campaign.title} — Analytics`,
        message: `Amplora Campaign Performance for "${analytics.campaign.title}". Funded Media Budget: $${(
          analytics.fundingMetrics.netAdvertisingBudget / 100
        ).toLocaleString('en-US')}.`,
      });

    } catch {}
  };

  if (isLoading) {
    return (
      <ScreenContainer padded={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading campaign telemetry & analytics...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !analytics) {
    return (
      <ScreenContainer padded={true}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Analytics Unavailable</Text>
          <Text style={styles.errorSub}>
            Unable to fetch performance telemetry for this campaign. Ensure you have authorized creator access.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const { campaign, fundingMetrics, distributionMetrics, metricDefinitions } = analytics;
  const isPromotingOrDone = campaign.status === 'PROMOTING' || campaign.status === 'COMPLETED';

  // Budget Allocation Breakdown Percentages
  const grossRaised = Math.max(1, fundingMetrics.raisedAmount);
  const platformFeePct = Math.round((fundingMetrics.platformFees / grossRaised) * 100);
  const adBudgetPct = 100 - platformFeePct;
  const spendPct = fundingMetrics.netAdvertisingBudget > 0
    ? Math.round((fundingMetrics.advertisingSpend / fundingMetrics.netAdvertisingBudget) * 100)
    : 0;

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Campaign Header Card */}
        <View style={styles.campaignHeader}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>{campaign.status.replace(/_/g, ' ')}</Text>
          </View>

          <Text style={styles.campaignTitle}>{campaign.title}</Text>
          <Text style={styles.categoryText}>
            {campaign.category} • Trust Score: {campaign.trustScore}/100 ({campaign.trustCategory})
          </Text>

          <View style={styles.headerActionRow}>
            <TouchableOpacity style={styles.shareHeaderBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={16} color={colors.primary} />
              <Text style={styles.shareHeaderText}>Share Telemetry</Text>
            </TouchableOpacity>

            {campaign.status === 'COMPLETED' && (
              <TouchableOpacity
                style={styles.reportHeaderBtn}
                onPress={() => router.push(`/campaign/${campaign.id}/report`)}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.textInverse} />
                <Text style={styles.reportHeaderText}>View Final Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Financial Accounting & Budget Allocation Card */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>FUNDING & AD MEDIA ACCOUNTING</Text>
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Contributions</Text>
              <Text style={styles.metricValue}>{formatCurrency(fundingMetrics.raisedAmount, 'USD')}</Text>
              <Text style={styles.metricMeta}>Goal: {formatCurrency(fundingMetrics.targetAmount, 'USD')}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Platform & Escrow (5%)</Text>
              <Text style={[styles.metricValue, { color: colors.textSecondary }]}>
                {formatCurrency(fundingMetrics.platformFees, 'USD')}
              </Text>
              <Text style={styles.metricMeta}>Custody & Verification</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Net Ad Budget (95%)</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {formatCurrency(fundingMetrics.netAdvertisingBudget, 'USD')}
              </Text>
              <Text style={styles.metricMeta}>Direct media spend pool</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Actual Ad Spend</Text>
              <Text style={[styles.metricValue, { color: isPromotingOrDone ? colors.success : colors.textTertiary }]}>
                {isPromotingOrDone ? formatCurrency(fundingMetrics.advertisingSpend, 'USD') : '$0 (Awaiting launch)'}
              </Text>
              <Text style={styles.metricMeta}>
                Unspent: {formatCurrency(fundingMetrics.unspentBudget, 'USD')}
              </Text>
            </View>
          </View>


          {/* Visual Budget Allocation Bar */}
          <View style={styles.visualBarCard}>
            <Text style={styles.visualBarTitle}>Budget Deployment Allocation</Text>
            <View style={styles.stackedBar}>
              <View style={[styles.stackedSegment, { flex: 5, backgroundColor: colors.surfaceSubtle }]}>
                <Text style={styles.stackedSegmentText}>5% Fee</Text>
              </View>
              <View
                style={[
                  styles.stackedSegment,
                  {
                    flex: spendPct > 0 ? (spendPct * 95) / 100 : 1,
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.stackedSegmentText, { color: colors.textInverse }]}>
                  {spendPct > 0 ? `${spendPct}% Spent` : 'Media Pool'}
                </Text>
              </View>
              {spendPct < 100 && (
                <View
                  style={[
                    styles.stackedSegment,
                    {
                      flex: Math.max(1, ((100 - spendPct) * 95) / 100),
                      backgroundColor: colors.accentSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.stackedSegmentText, { color: colors.primaryDark }]}>
                    {100 - spendPct}% Remaining
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.visualBarNote}>
              Platform funds distribution only. Advertising launches after review and funding milestones certify.
            </Text>
          </View>
        </View>

        {/* Distribution Performance & Telemetry */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>MESSAGE DISTRIBUTION PERFORMANCE</Text>
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Delivered Impressions</Text>
              <Text style={styles.metricValue}>
                {distributionMetrics.actualImpressions !== null
                  ? formatMetricNumber(distributionMetrics.actualImpressions)
                  : 'Pending'}
              </Text>
              <Text style={styles.metricMeta}>
                Est: {formatMetricNumber(distributionMetrics.estimatedImpressions)} views
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Measured Reach</Text>
              <Text style={styles.metricValue}>
                {distributionMetrics.measuredReach !== null
                  ? formatMetricNumber(distributionMetrics.measuredReach)
                  : 'Pending'}
              </Text>
              <Text style={styles.metricMeta}>
                Est: {formatMetricNumber(distributionMetrics.estimatedReach)} unique
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Civic Action Clicks</Text>
              <Text style={styles.metricValue}>
                {distributionMetrics.clicks !== null ? distributionMetrics.clicks.toLocaleString() : 'Pending'}
              </Text>
              <Text style={styles.metricMeta}>Taps to read full sources</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Click-Through Rate (CTR)</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {distributionMetrics.clickThroughRate !== null
                  ? `${distributionMetrics.clickThroughRate}%`
                  : 'N/A'}
              </Text>
              <Text style={styles.metricMeta}>Audience engagement ratio</Text>
            </View>
          </View>

          {/* Demonstration Telemetry Notice */}
          <View style={styles.telemetryNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.telemetryNoticeText}>
              Demonstration Telemetry: In live campaigns, ad servers publish verified impression receipts directly from Google & Meta APIs.
            </Text>
          </View>
        </View>

        {/* Expandable Metric Definitions Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>METRIC DEFINITIONS & GLOSSARY</Text>
          </View>

          <View style={styles.definitionsList}>
            {Object.entries(metricDefinitions).map(([key, description]) => {
              const isExpanded = expandedMetric === key;
              const title = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase());

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.definitionItem}
                  onPress={() => toggleMetric(key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.definitionHeader}>
                    <Text style={styles.definitionTitle}>{title}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textTertiary}
                    />
                  </View>
                  {isExpanded && <Text style={styles.definitionBody}>{description as string}</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  errorSub: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryBtnText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  campaignHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusPillText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  campaignTitle: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubtle,
    gap: 4,
  },
  shareHeaderText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  reportHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    gap: 4,
  },
  reportHeaderText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  metricLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  metricMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  visualBarCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  visualBarTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stackedBar: {
    height: 24,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  stackedSegment: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stackedSegmentText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  visualBarNote: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  telemetryNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  telemetryNoticeText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  definitionsList: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  definitionItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  definitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  definitionTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  definitionBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
