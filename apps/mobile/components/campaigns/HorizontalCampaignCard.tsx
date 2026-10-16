import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { Campaign } from '../../types/campaign';
import { ProgressBar } from '../ui/ProgressBar';
import { CampaignImage } from '../ui/CampaignImage';
import {
  calculateProgressPercentage,
  formatCurrency,
} from '../../lib/reachCalculator';

interface HorizontalCampaignCardProps {
  campaign: Campaign;
  onPress: () => void;
  style?: ViewStyle;
}

export const HorizontalCampaignCard: React.FC<HorizontalCampaignCardProps> = ({
  campaign,
  onPress,
  style,
}) => {
  const percentage = calculateProgressPercentage(campaign.raisedAmount, campaign.targetAmount);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.imageContainer}>
        <CampaignImage
          source={campaign.coverImage}
          category={campaign.category}
          style={styles.image}
          borderRadius={0}
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{campaign.category}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.creatorName} numberOfLines={1}>
          {campaign.creator.name}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {campaign.title}
        </Text>

        <View style={styles.progressSection}>
          <ProgressBar
            progress={percentage}
            height={5}
            trackColor={colors.surfaceSubtle}
            fillColor={colors.primary}
          />
          <View style={styles.metricsRow}>
            <Text style={styles.raisedAmount}>
              {formatCurrency(campaign.raisedAmount)}
            </Text>
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadows.card,
  },
  imageContainer: {
    height: 130,
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
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  categoryText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  body: {
    padding: spacing.sm,
  },
  creatorName: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  title: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: spacing.sm,
    height: 36,
  },
  progressSection: {
    marginTop: spacing.xxs,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  raisedAmount: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  percentageText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
});
