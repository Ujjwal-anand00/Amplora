import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft } from '../../types/draft';
import { calculateUseOfFunds, formatCurrency, formatMetricNumber } from '../../lib/reachCalculator';

interface CampaignPreviewModalProps {
  visible: boolean;
  draft: CampaignDraft;
  onClose: () => void;
}

export function CampaignPreviewModal({ visible, draft, onClose }: CampaignPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const funds = calculateUseOfFunds(draft.fundingGoal || 5000);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.previewBadge}>
            <Ionicons name="eye-outline" size={14} color={colors.primary} />
            <Text style={styles.previewBadgeText}>PUBLIC CAMPAIGN PREVIEW</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Cover Image */}
          {draft.coverImage ? (
            <Image source={{ uri: draft.coverImage }} style={styles.coverImage} />
          ) : null}

          {/* Header Info */}
          <View style={styles.headerInfo}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{draft.category}</Text>
              </View>
              <Text style={styles.durationTag}>{draft.durationDays} Days Active</Text>
            </View>

            <Text style={styles.title}>{draft.title || 'Untitled Campaign'}</Text>
            <Text style={styles.summary}>{draft.summary || 'No summary provided.'}</Text>

            <View style={styles.creatorRow}>
              <View style={styles.creatorAvatar}>
                <Ionicons name="person" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.creatorName}>{draft.creatorName || 'Anonymous Creator'}</Text>
                <Text style={styles.creatorLabel}>Verified Campaign Creator</Text>
              </View>
            </View>
          </View>

          {/* Amplification Goal Card */}
          <View style={styles.reachBanner}>
            <Text style={styles.reachBannerTitle}>AMPLIFICATION FUNDING GOAL</Text>
            <Text style={styles.reachAmount}>{formatCurrency(draft.fundingGoal || 5000)}</Text>
            <Text style={styles.reachDesc}>
              Pools community funding to deliver ≈ {formatMetricNumber(funds.impressions)} verified impressions to {draft.targetLocations.join(', ')}.
            </Text>

            <View style={styles.allocationRow}>
              <View style={styles.allocItem}>
                <Text style={styles.allocVal}>{formatCurrency(funds.netMediaSpend)}</Text>
                <Text style={styles.allocLbl}>Media Buy (95%)</Text>
              </View>
              <View style={styles.allocDivider} />
              <View style={styles.allocItem}>
                <Text style={styles.allocVal}>{formatCurrency(funds.platformFee)}</Text>
                <Text style={styles.allocLbl}>Platform Fee (5%)</Text>
              </View>
              <View style={styles.allocDivider} />
              <View style={styles.allocItem}>
                <Text style={styles.allocVal}>≈ {formatMetricNumber(funds.uniqueReach)}</Text>
                <Text style={styles.allocLbl}>Citizens Reached</Text>
              </View>
            </View>
          </View>

          {/* Article Story Sections */}
          <View style={styles.storyContainer}>
            <Text style={styles.storySectionTitle}>The Full Story</Text>
            {draft.storyHeadline ? <Text style={styles.storyHeadline}>{draft.storyHeadline}</Text> : null}
            {draft.storyIntro ? <Text style={styles.storyIntro}>{draft.storyIntro}</Text> : null}

            {draft.storySections.map((sec, idx) => (
              <View key={sec.id} style={styles.sectionBlock}>
                <Text style={styles.sectionHeading}>
                  {idx + 1}. {sec.title}
                </Text>
                <Text style={styles.sectionBody}>{sec.body}</Text>
                {sec.imageUrl ? (
                  <View style={styles.secImageWrap}>
                    <Image source={{ uri: sec.imageUrl }} style={styles.secImage} />
                    {sec.imageCaption ? <Text style={styles.secCaption}>{sec.imageCaption}</Text> : null}
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {/* Supporting Sources */}
          {draft.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.storySectionTitle}>Primary Sources & Records ({draft.sources.length})</Text>
              {draft.sources.map(src => (
                <View key={src.id} style={styles.sourceCard}>
                  <Text style={styles.srcTitle}>{src.title}</Text>
                  {src.publisher ? <Text style={styles.srcPublisher}>{src.publisher}</Text> : null}
                  {src.relevance ? <Text style={styles.srcRelevance}>{src.relevance}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {/* Target Audience & Proposed Channels */}
          <View style={styles.audienceContainer}>
            <Text style={styles.storySectionTitle}>Targeting & Proposed Channels</Text>
            <View style={styles.targetingItem}>
              <Text style={styles.targetingLabel}>Target Locations:</Text>
              <Text style={styles.targetingVal}>{draft.targetLocations.join(', ')}</Text>
            </View>
            <View style={styles.targetingItem}>
              <Text style={styles.targetingLabel}>Audience Interests:</Text>
              <Text style={styles.targetingVal}>{draft.audienceInterests.join(', ')}</Text>
            </View>
            <View style={styles.targetingItem}>
              <Text style={styles.targetingLabel}>Proposed Distribution Channels:</Text>
              <Text style={styles.targetingVal}>{draft.distributionChannels.join(', ')}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  previewBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.massive,
  },
  coverImage: {
    width: '100%',
    height: 220,
  },
  headerInfo: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  durationTag: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  title: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summary: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  creatorLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },

  // Reach Banner
  reachBanner: {
    backgroundColor: colors.surfaceSubtle,
    margin: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reachBannerTitle: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  reachAmount: {
    ...typography.displayLarge,
    color: colors.primary,
    marginVertical: 4,
  },
  reachDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  allocItem: {
    flex: 1,
    alignItems: 'center',
  },
  allocVal: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  allocLbl: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
  },
  allocDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
  },

  // Story
  storyContainer: {
    padding: spacing.md,
  },
  storySectionTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  storyHeadline: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  storyIntro: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  secImageWrap: {
    marginTop: spacing.xs,
  },
  secImage: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
  },
  secCaption: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },

  // Sources
  sourcesContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sourceCard: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 6,
  },
  srcTitle: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  srcPublisher: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
  },
  srcRelevance: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Targeting
  audienceContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  targetingItem: {
    marginBottom: spacing.xs,
  },
  targetingLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  targetingVal: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
