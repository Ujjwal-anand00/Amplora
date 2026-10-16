import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { Campaign } from '../../types/campaign';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import { CampaignImage } from '../ui/CampaignImage';
import {
  calculateProgressPercentage,
  calculateEstimatedImpressions,
  formatCurrency,
  formatMetricNumber,
} from '../../lib/reachCalculator';

interface FeaturedCampaignCardProps {
  campaign: Campaign;
  onPress: () => void;
  style?: ViewStyle;
}

export const FeaturedCampaignCard: React.FC<FeaturedCampaignCardProps> = ({
  campaign,
  onPress,
  style,
}) => {
  const percentage = calculateProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
  const formattedRaised = formatCurrency(campaign.raisedAmount);
  const formattedTarget = formatCurrency(campaign.targetAmount);
  const estimatedImpressions = calculateEstimatedImpressions(campaign.targetAmount);

  return (
    <View style={[styles.container, style]}>
      {/* Featured Header Label */}
      <View style={styles.featuredLabelRow}>
        <View style={styles.featuredBadge}>
          <Ionicons name="sparkles" size={13} color={colors.accentDark} />
          <Text style={styles.featuredBadgeText}>FEATURED AMPLIFICATION</Text>
        </View>
        <Text style={styles.demoPill}>Demo Selection</Text>
      </View>

      {/* Prominent Cover Image */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.imageWrapper}>
        <CampaignImage
          source={campaign.coverImage}
          category={campaign.category}
          style={styles.image}
          borderRadius={radii.lg}
        />
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{campaign.category}</Text>
        </View>
      </TouchableOpacity>

      {/* Campaign Details */}
      <View style={styles.body}>
        <View style={styles.creatorRow}>
          <Text style={styles.creatorName}>{campaign.creator.name}</Text>
          <Text style={styles.creatorType}>• {campaign.creator.type}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          <Text style={styles.title}>{campaign.title}</Text>
        </TouchableOpacity>

        <Text style={styles.summary} numberOfLines={3}>
          {campaign.summary}
        </Text>

        {/* Estimated Reach Illustration */}
        <View style={styles.reachIllustrationBox}>
          <View style={styles.reachIconBox}>
            <Ionicons name="megaphone" size={16} color={colors.primary} />
          </View>
          <View style={styles.reachTextBox}>
            <Text style={styles.reachTitle}>
              ≈ {formatMetricNumber(estimatedImpressions)} Estimated Ad Impressions
            </Text>
            <Text style={styles.reachDisclaimer}>
              Targeting: {campaign.targetAudience.description}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressBox}>
          <ProgressBar
            progress={percentage}
            height={8}
            trackColor={colors.surfaceSubtle}
            fillColor={colors.primary}
          />
          <View style={styles.metricsRow}>
            <View>
              <Text style={styles.raisedNumber}>
                {formattedRaised}{' '}
                <Text style={styles.targetNumber}>of {formattedTarget} goal</Text>
              </Text>
              <Text style={styles.backersSub}>{campaign.backerCount} citizens backing</Text>
            </View>
            <View style={styles.percentageBox}>
              <Text style={styles.percentageText}>{percentage}%</Text>
              <Text style={styles.daysText}>{campaign.daysLeft} days remaining</Text>
            </View>
          </View>
        </View>

        {/* Primary View / Back Action */}
        <Button
          title="View Campaign & Story"
          onPress={onPress}
          variant="primary"
          size="md"
          fullWidth
          iconRight={<Ionicons name="arrow-forward" size={16} color={colors.textInverse} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  featuredLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 4,
  },
  featuredBadgeText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  demoPill: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  imageWrapper: {
    height: 200,
    width: '100%',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  body: {
    paddingTop: spacing.xs,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  creatorName: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  creatorType: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    lineHeight: 28,
  },
  summary: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  reachIllustrationBox: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  reachIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachTextBox: {
    flex: 1,
  },
  reachTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  reachDisclaimer: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 2,
  },
  progressBox: {
    marginBottom: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  raisedNumber: {
    ...typography.metricMedium,
    color: colors.textPrimary,
  },
  targetNumber: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  backersSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  percentageBox: {
    alignItems: 'flex-end',
  },
  percentageText: {
    ...typography.headingSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  daysText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
