import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { CampaignCard } from '../../components/campaigns/CampaignCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { api } from '../../services/api';
import { Campaign, PlatformMetrics } from '../../types/campaign';

export default function HomeScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [fetchedCampaigns, fetchedMetrics] = await Promise.all([
        api.getCampaigns({ sort: 'trending' }),
        api.getMetrics(),
      ]);
      setCampaigns(fetchedCampaigns);
      setMetrics(fetchedMetrics);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh} padded={true}>
      {/* 1. Compact Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.brandTitleRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="megaphone" size={16} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.brandName}>CAMPAIGNS</Text>
            <Text style={styles.brandSub}>Amplification Platform</Text>
          </View>
        </View>
        <View style={styles.networkStatusPill}>
          <View style={styles.activeDot} />
          <Text style={styles.networkStatusText}>Verified Network</Text>
        </View>
      </View>

      {/* 2. Editorial Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroAccentPill}>
          <Text style={styles.heroAccentText}>DIRECT DISTRIBUTION</Text>
        </View>
        <Text style={styles.heroTitle}>Deliver messages beyond your feed.</Text>
        <Text style={styles.heroBody}>
          Direct donations often fund overhead. Campaign amplification specifically pays for
          targeted ad distribution to put critical causes and truth in front of minds outside the echo chamber.
        </Text>

        {/* Reach Benchmark Card */}
        <View style={styles.reachBenchmarkCard}>
          <View style={styles.reachEquationRow}>
            <View style={styles.dollarBox}>
              <Text style={styles.dollarText}>$1</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            <View style={styles.reachNumberBox}>
              <Text style={styles.reachNumber}>≈ 27 People</Text>
              <Text style={styles.reachSub}>reached outside existing networks</Text>
            </View>
          </View>
        </View>

        {/* Primary Actions */}
        <View style={styles.heroActionsRow}>
          <Button
            title="Explore Campaigns"
            onPress={() => router.push('/(tabs)/explore')}
            variant="primary"
            style={styles.heroButton}
            icon={<Ionicons name="compass-outline" size={18} color={colors.textInverse} />}
          />
          <Button
            title="Start Campaign"
            onPress={() => router.push('/(tabs)/create')}
            variant="secondary"
            style={styles.heroButton}
            icon={<Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />}
          />
        </View>
      </View>

      {/* 3. How Amplification Works (3 Clear Steps) */}
      <View style={styles.explainerCard}>
        <Text style={styles.explainerHeader}>How Message Amplification Works</Text>
        <View style={styles.stepsList}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Fact-Checked Message</Text>
              <Text style={styles.stepDesc}>
                Advocates write a message, vetted against Universal Trust Standards (UUTS).
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Community Funds Reach</Text>
              <Text style={styles.stepDesc}>
                Micro-pledges pool together solely to pay advertising placement costs.
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Direct Cross-Network Ads</Text>
              <Text style={styles.stepDesc}>
                Targeted ads run across search, news feeds, and social corridors.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Live Platform Transparency Metrics */}
      {metrics ? (
        <View style={styles.metricsSummaryRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {metrics.totalReachFunded >= 1000000
                ? `${(metrics.totalReachFunded / 1000000).toFixed(1)}M`
                : `${Math.round(metrics.totalReachFunded / 1000)}k`}
            </Text>
            <Text style={styles.metricLabel}>Reach Funded</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              ${(metrics.totalRaised / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.metricLabel}>Amplified</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.avgTrustScore}</Text>
            <Text style={styles.metricLabel}>Avg UUTS Trust</Text>
          </View>
        </View>
      ) : null}

      {/* 5. Featured Campaigns Section */}
      <SectionHeader
        title="Featured Campaigns"
        subtitle="Vetted public interest campaigns actively seeking amplification"
        actionText="View all"
        onActionPress={() => router.push('/(tabs)/explore')}
      />

      {loading && !refreshing ? (
        <LoadingState message="Connecting to amplification network..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        campaigns.slice(0, 3).map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onPress={() => router.push(`/campaign/${campaign.id}`)}
          />
        ))
      )}

      {/* Secondary Call to Action footer */}
      <View style={styles.calloutCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
        <Text style={styles.calloutTitle}>Universal Trust Standard (UUTS)</Text>
        <Text style={styles.calloutText}>
          Every dollar is held until claims meet fact-checking and communications integrity thresholds.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/explore')}
          style={styles.calloutLink}
        >
          <Text style={styles.calloutLinkText}>Learn more about UUTS grading →</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...typography.labelLarge,
    letterSpacing: 1.5,
    color: colors.primary,
    fontWeight: '800',
  },
  brandSub: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  networkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  networkStatusText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  heroAccentPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  heroAccentText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  heroTitle: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },

  // Reach Equation
  reachBenchmarkCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  reachEquationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dollarBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  dollarText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '800',
  },
  reachNumberBox: {
    flex: 1,
  },
  reachNumber: {
    ...typography.headingSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  reachSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },

  // Hero Actions
  heroActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroButton: {
    flex: 1,
  },

  // Explainer Card
  explainerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  explainerHeader: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stepsList: {
    gap: spacing.xs,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },

  // Metrics Row
  metricsSummaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    ...typography.metricMedium,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },

  // Callout Card
  calloutCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  calloutTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  calloutText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  calloutLink: {
    paddingVertical: spacing.xxs,
  },
  calloutLinkText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },
});
