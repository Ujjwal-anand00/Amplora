import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { Campaign } from '../../types/campaign';
import { ProgressBar } from '../ui/ProgressBar';

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
  const percentage = Math.min(
    Math.round((campaign.raisedAmount / (campaign.targetAmount || 1)) * 100),
    100
  );

  const formattedRaised = `$${campaign.raisedAmount.toLocaleString()}`;
  const formattedTarget = `$${campaign.targetAmount.toLocaleString()}`;
  const formattedReach = (campaign.estimatedReach || Math.round(campaign.targetAmount * 27)).toLocaleString();

  // UUTS badge color
  const trustColor =
    campaign.trustScore >= 90
      ? colors.primary
      : campaign.trustScore >= 80
      ? colors.success
      : colors.warning;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, style]}
      accessibilityRole="button"
      accessibilityLabel={`Campaign: ${campaign.title}`}
    >
      {/* Campaign Photography */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: campaign.imageUrl }} style={styles.image} />
        
        {/* Category Pill */}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{campaign.category}</Text>
        </View>

        {/* UUTS Trust Score Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={13} color={trustColor} style={styles.shieldIcon} />
          <Text style={[styles.trustText, { color: trustColor }]}>
            {campaign.trustScore} UUTS
          </Text>
        </View>
      </View>

      {/* Content Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>
        <Text style={styles.tagLine} numberOfLines={2}>
          {campaign.tagLine}
        </Text>

        {/* Reach Equation Pill */}
        <View style={styles.reachPill}>
          <Ionicons name="megaphone-outline" size={14} color={colors.primary} />
          <Text style={styles.reachText}>
            ≈ {formattedReach} people reached outside echo chamber
          </Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <ProgressBar
            progress={percentage}
            height={6}
            trackColor={colors.surfaceSubtle}
            fillColor={colors.primary}
          />
          <View style={styles.metricsRow}>
            <Text style={styles.raisedAmount}>
              {formattedRaised}{' '}
              <Text style={styles.targetAmount}>of {formattedTarget}</Text>
            </Text>
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>

        {/* Card Footer: Backers & Days Left */}
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.footerText}>{campaign.backerCount} backers</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.footerText}>
              {campaign.daysLeft > 0 ? `${campaign.daysLeft} days left` : 'Fully Amplified'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  imageContainer: {
    position: 'relative',
    height: 170,
    backgroundColor: colors.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryText: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  trustBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  shieldIcon: {
    marginRight: 4,
  },
  trustText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  tagLine: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  reachPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  reachText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  progressSection: {
    marginBottom: spacing.sm,
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
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
