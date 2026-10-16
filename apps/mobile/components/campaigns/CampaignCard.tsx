import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, touchTargets } from '../../theme';
import { Campaign } from '../../types/campaign';
import { ProgressBar } from '../ui/ProgressBar';
import { CampaignImage } from '../ui/CampaignImage';
import {
  calculateProgressPercentage,
  calculateEstimatedImpressions,
  formatCurrency,
  formatMetricNumber,
} from '../../lib/reachCalculator';
import { campaignStore } from '../../services/campaignStore';

interface CampaignCardProps {
  campaign: Campaign;
  onPress: () => void;
  style?: ViewStyle;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onPress,
  style,
}) => {
  const percentage = calculateProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
  const formattedRaised = formatCurrency(campaign.raisedAmount);
  const formattedTarget = formatCurrency(campaign.targetAmount);
  const estimatedImpressions = calculateEstimatedImpressions(campaign.targetAmount);
  const isSaved = campaignStore.isCampaignSaved(campaign.id);

  const handleBookmarkPress = (e: any) => {
    e?.stopPropagation?.();
    campaignStore.toggleBookmark(campaign.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`View campaign: ${campaign.title}`}
    >
      {/* 1. Cover Image with resilient fallback */}
      <View style={styles.imageWrapper}>
        <CampaignImage
          source={campaign.coverImage}
          category={campaign.category}
          style={styles.image}
          borderRadius={0}
        />

        {/* Category Pill */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{campaign.category}</Text>
        </View>

        {/* Bookmark Action */}
        <TouchableOpacity
          onPress={handleBookmarkPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.bookmarkBtn}
          accessibilityLabel={isSaved ? 'Remove from saved' : 'Save campaign'}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isSaved ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Content Body */}
      <View style={styles.body}>
        {/* Creator Info */}
        <View style={styles.creatorRow}>
          <Text style={styles.creatorName} numberOfLines={1}>
            By {campaign.creator.name}
          </Text>
          <Text style={styles.creatorType}>• {campaign.creator.type}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>

        {/* Editorial Summary */}
        <Text style={styles.summary} numberOfLines={2}>
          {campaign.summary}
        </Text>

        {/* Estimated Reach Pill */}
        <View style={styles.reachPill}>
          <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
          <Text style={styles.reachText}>
            ≈ {formatMetricNumber(estimatedImpressions)} estimated ad impressions at goal
          </Text>
        </View>

        {/* Progress Bar & Funding Numbers */}
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={percentage}
            height={6}
            trackColor={colors.surfaceSubtle}
            fillColor={colors.primary}
          />
          <View style={styles.metricsRow}>
            <Text style={styles.raisedAmount}>
              {formattedRaised}{' '}
              <Text style={styles.targetAmount}>of {formattedTarget} goal</Text>
            </Text>
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>

        {/* Footer Meta: Backers & Days Left + View Button */}
        <View style={styles.footerRow}>
          <View style={styles.metaGroup}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{campaign.backerCount} backers</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {campaign.daysLeft > 0 ? `${campaign.daysLeft}d left` : 'Fully Amplified'}
              </Text>
            </View>
          </View>

          <View style={styles.actionPrompt}>
            <Text style={styles.actionPromptText}>View campaign</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  imageWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
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
  bookmarkBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  body: {
    padding: spacing.md,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  creatorName: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  creatorType: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
    lineHeight: 22,
  },
  summary: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  reachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    gap: 6,
  },
  reachText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
    flex: 1,
  },
  progressContainer: {
    marginBottom: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  raisedAmount: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  targetAmount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  percentageText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: spacing.xxs,
  },
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionPromptText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
});
