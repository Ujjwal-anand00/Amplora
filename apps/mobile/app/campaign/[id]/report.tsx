import React from 'react';
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
import { useCampaignReportQuery } from '../../../services/apiClient';
import { formatCurrency, formatMetricNumber } from '../../../lib/reachCalculator';

export default function CampaignReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: report, isLoading, isError, refetch } = useCampaignReportQuery(id || '');

  const handleShare = async () => {
    if (!report) return;
    try {
      await Share.share({
        title: `Final Distribution Report: ${report.title}`,
        message: `Certified Distribution Report for "${report.title}". Delivered Impressions: ${formatMetricNumber(
          report.verifiedDelivery.actualImpressions || 0
        )} across public interest newsfeeds. https://campaign-one-pearl.vercel.app/campaign/${id}`,
      });
    } catch {}
  };

  if (isLoading) {
    return (
      <ScreenContainer padded={true}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating final distribution audit report...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !report) {
    return (
      <ScreenContainer padded={true}>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Report Not Ready</Text>
          <Text style={styles.errorSub}>
            The final distribution report is published upon campaign completion and post-delivery reconciliation.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const { verifiedDelivery, estimatedMetrics, financialAccounting, updates } = report;

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Report Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.certifiedBadge}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={styles.certifiedText}>AUDITED DISTRIBUTION REPORT</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{report.status}</Text>
            </View>
          </View>

          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportSubtitle}>{report.tagLine}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Reporting Period: {report.reportingPeriod}</Text>
          </View>

          {/* Demonstration Notice */}
          <View style={styles.demoBanner}>
            <Ionicons name="information-circle" size={16} color={colors.primary} />
            <Text style={styles.demoBannerText}>{report.demonstrationNotice}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={colors.textInverse} />
            <Text style={styles.shareBtnText}>Share Audit Report</Text>
          </TouchableOpacity>
        </View>

        {/* Executive Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>EXECUTIVE DISTRIBUTION OUTCOME</Text>
          <Text style={styles.outcomeSummary}>{report.summaryOutcome}</Text>
        </View>

        {/* Section 1: Verified Delivery Metrics */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.success} />
            <Text style={styles.sectionHeading}>1. VERIFIED DELIVERY TELEMETRY</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {verifiedDelivery.actualImpressions !== null
                  ? formatMetricNumber(verifiedDelivery.actualImpressions)
                  : 'Pending'}
              </Text>
              <Text style={styles.statLabel}>Verified Ad Views</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {verifiedDelivery.measuredReach !== null
                  ? formatMetricNumber(verifiedDelivery.measuredReach)
                  : 'Pending'}
              </Text>
              <Text style={styles.statLabel}>Measured Unique Reach</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {verifiedDelivery.clicks !== null ? verifiedDelivery.clicks.toLocaleString() : 'Pending'}
              </Text>
              <Text style={styles.statLabel}>Civic Action Clicks</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {verifiedDelivery.clickThroughRate !== null ? `${verifiedDelivery.clickThroughRate}%` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Click-Through Rate</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Estimated vs Measured Comparison */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="git-compare-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionHeading}>2. ESTIMATED VS. MEASURED PERFORMANCE</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableCell, styles.tableCellLabel]}>Metric</Text>
              <Text style={[styles.tableCell, styles.tableCellValue]}>Pre-Launch Estimate</Text>
              <Text style={[styles.tableCell, styles.tableCellValue]}>Actual Measured</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLabel]}>Impressions</Text>
              <Text style={[styles.tableCell, styles.tableCellValue]}>
                {formatMetricNumber(estimatedMetrics.estimatedImpressions)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellValue, { fontWeight: '700', color: colors.primary }]}>
                {verifiedDelivery.actualImpressions !== null ? formatMetricNumber(verifiedDelivery.actualImpressions) : '—'}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLabel]}>Unique Reach</Text>
              <Text style={[styles.tableCell, styles.tableCellValue]}>
                {formatMetricNumber(estimatedMetrics.estimatedReach)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellValue, { fontWeight: '700', color: colors.primary }]}>
                {verifiedDelivery.measuredReach !== null ? formatMetricNumber(verifiedDelivery.measuredReach) : '—'}
              </Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLabel]}>Media Spend</Text>
              <Text style={[styles.tableCell, styles.tableCellValue]}>
                {formatCurrency(financialAccounting.advertisingBudgetAllocated, 'INR')}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellValue, { fontWeight: '700', color: colors.success }]}>
                {formatCurrency(verifiedDelivery.advertisingSpend, 'INR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Financial & Escrow Reconciliation */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionHeading}>3. FINANCIAL & ESCROW ACCOUNTING</Text>
          </View>

          <View style={styles.financeBreakdown}>
            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Total Citizen Contributions</Text>
              <Text style={styles.financeValue}>{formatCurrency(financialAccounting.totalRaised, 'INR')}</Text>
            </View>

            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Platform Escrow & Trust Verification (5%)</Text>
              <Text style={styles.financeValue}>- {formatCurrency(financialAccounting.platformFees, 'INR')}</Text>
            </View>

            <View style={[styles.financeRow, styles.financeDivider]}>
              <Text style={styles.financeLabelBold}>Allocated Advertising Media Pool (95%)</Text>
              <Text style={styles.financeValueBold}>
                {formatCurrency(financialAccounting.advertisingBudgetAllocated, 'INR')}
              </Text>
            </View>

            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Actual Ad Network Spend</Text>
              <Text style={[styles.financeValue, { color: colors.primary }]}>
                {formatCurrency(financialAccounting.advertisingSpend, 'INR')}
              </Text>
            </View>

            <View style={styles.financeRow}>
              <Text style={styles.financeLabel}>Unspent Reserve</Text>
              <Text style={styles.financeValue}>{formatCurrency(financialAccounting.unspentBudget, 'INR')}</Text>
            </View>

            <View style={styles.policyBox}>
              <Text style={styles.policyText}>Policy Status: {financialAccounting.unspentPolicyStatus}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Updates Timeline */}
        {updates && updates.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>CAMPAIGN DELIVERY TIMELINE</Text>
            {updates.map((upd: any) => (
              <View key={upd.id} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{upd.title}</Text>
                  <Text style={styles.timelineBody}>{upd.content}</Text>
                  <Text style={styles.timelineMeta}>
                    {new Date(upd.postedAt).toLocaleDateString()} • {formatMetricNumber(upd.impressions)} views
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  heroCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 4,
  },
  certifiedText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 10,
  },
  statusBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  reportTitle: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  reportSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  demoBannerText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  shareBtnText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  outcomeSummary: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableCell: {
    flex: 1,
  },
  tableCellLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tableCellValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  financeBreakdown: {
    gap: spacing.sm,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financeDivider: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  financeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  financeValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  financeLabelBold: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  financeValueBold: {
    ...typography.headingSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  policyBox: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.sm,
    padding: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    fontSize: 11,
  },
  timelineItem: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  timelineBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  timelineMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
