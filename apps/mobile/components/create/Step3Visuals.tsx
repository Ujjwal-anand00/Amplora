import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft, DraftAdAsset } from '../../types/draft';
import { Button } from '../ui/Button';

const CTA_OPTIONS = [
  'Amplify This Message',
  'Read The Full Story',
  'Support Distribution',
  'Learn The Facts',
  'Demand Public Action',
];

const SAMPLE_AD_IMAGES = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80',
];

interface Step3VisualsProps {
  draft: CampaignDraft;
  onChange: (fields: Partial<CampaignDraft>) => void;
  errors?: Record<string, string>;
}

export function Step3Visuals({ draft, onChange, errors = {} }: Step3VisualsProps) {
  const [previewTab, setPreviewTab] = useState<'social_feed' | 'compact_banner'>('social_feed');
  const [pickingImage, setPickingImage] = useState(false);

  // Use title / summary shortcuts
  const handleUseTitle = () => {
    onChange({ adHeadline: draft.title });
  };

  const handleUseSummary = () => {
    onChange({ adDescription: draft.summary });
  };

  // Image Picker
  const handlePickImage = async () => {
    try {
      setPickingImage(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Media library permission is required to select photos from your device. You can also pick from sample creative presets below.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newAsset: DraftAdAsset = {
          id: `asset-${Date.now()}`,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileName: asset.fileName || 'custom-ad-image.jpg',
        };

        onChange({
          coverImage: asset.uri,
          adVisualAssets: [newAsset, ...draft.adVisualAssets],
        });
      }
    } catch (err) {
      console.warn('[ImagePicker] error:', err);
      Alert.alert('Error', 'Unable to pick image. Please try a preset below.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleSelectPresetImage = (url: string) => {
    onChange({ coverImage: url });
  };

  const activeAdImage = draft.coverImage || SAMPLE_AD_IMAGES[0];
  const activeAdHeadline = draft.adHeadline || draft.title || 'Support Community Amplification';
  const activeAdDescription = draft.adDescription || draft.summary || 'Help fund verified public awareness distribution.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Advertising Headline */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Advertising Headline *</Text>
          <TouchableOpacity onPress={handleUseTitle} style={styles.shortcutBtn}>
            <Text style={styles.shortcutText}>Copy from Title</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, errors.adHeadline && styles.inputError]}
          placeholder="e.g. Save Mile Marker 14 Trailhead Access"
          placeholderTextColor={colors.textTertiary}
          value={draft.adHeadline}
          onChangeText={text => onChange({ adHeadline: text })}
          maxLength={70}
        />
        <Text style={styles.helperText}>
          Displayed prominently across sponsored ad cards and newsfeed placements.
        </Text>
        {errors.adHeadline && <Text style={styles.errorText}>{errors.adHeadline}</Text>}
      </View>

      {/* 2. Advertising Description */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Advertising Description *</Text>
          <TouchableOpacity onPress={handleUseSummary} style={styles.shortcutBtn}>
            <Text style={styles.shortcutText}>Copy from Summary</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.textArea, errors.adDescription && styles.inputError]}
          placeholder="Concise message prompting viewers to click and read the verified story..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          value={draft.adDescription}
          onChangeText={text => onChange({ adDescription: text })}
          maxLength={160}
        />
        <Text style={styles.helperText}>
          {draft.adDescription?.length || 0}/160 characters. Recommended under 140 for feed readability.
        </Text>
        {errors.adDescription && <Text style={styles.errorText}>{errors.adDescription}</Text>}
      </View>

      {/* 3. Call-to-Action Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Call to Action (CTA) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {CTA_OPTIONS.map(cta => {
            const isSelected = draft.ctaText === cta;
            return (
              <TouchableOpacity
                key={cta}
                onPress={() => onChange({ ctaText: cta })}
                style={[styles.ctaChip, isSelected && styles.ctaChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.ctaChipText, isSelected && styles.ctaChipTextActive]}>
                  {cta}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Creative Visual Image Assets */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Primary Ad Creative Image *</Text>
          <TouchableOpacity onPress={handlePickImage} disabled={pickingImage} style={styles.uploadBtn}>
            <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Visual Display */}
        <View style={styles.activeImageWrapper}>
          <Image source={{ uri: activeAdImage }} style={styles.activeImage} />
          <View style={styles.activeImageOverlay}>
            <Text style={styles.activeImageBadge}>CURRENT SELECTION</Text>
          </View>
        </View>

        {/* Preset Thumbnails */}
        <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Or select from certified high-res presets:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {SAMPLE_AD_IMAGES.map((url, idx) => {
            const isSelected = draft.coverImage === url;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelectPresetImage(url)}
                style={[styles.presetThumbWrap, isSelected && styles.presetThumbActive]}
                activeOpacity={0.8}
              >
                <Image source={{ uri: url }} style={styles.presetThumb} />
                {isSelected && (
                  <View style={styles.presetCheck}>
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Dual Live Ad Previews */}
      <View style={styles.previewContainer}>
        <View style={styles.previewHeaderRow}>
          <View>
            <Text style={styles.previewTitle}>PROPOSED AD PLACEMENT PREVIEWS</Text>
            <Text style={styles.previewSubtitle}>Illustrative mock placements across candidate channels</Text>
          </View>
        </View>

        {/* Tab switch between Social Feed and Compact Banner */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            onPress={() => setPreviewTab('social_feed')}
            style={[styles.tabButton, previewTab === 'social_feed' && styles.tabButtonActive]}
          >
            <Ionicons
              name="newspaper-outline"
              size={14}
              color={previewTab === 'social_feed' ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.tabText, previewTab === 'social_feed' && styles.tabTextActive]}>
              Social Feed Card
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPreviewTab('compact_banner')}
            style={[styles.tabButton, previewTab === 'compact_banner' && styles.tabButtonActive]}
          >
            <Ionicons
              name="tablet-portrait-outline"
              size={14}
              color={previewTab === 'compact_banner' ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.tabText, previewTab === 'compact_banner' && styles.tabTextActive]}>
              Sponsored Banner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview Variant 1: Social Feed Card */}
        {previewTab === 'social_feed' ? (
          <View style={styles.socialFeedCard}>
            {/* Sponsor header */}
            <View style={styles.feedHeader}>
              <View style={styles.feedAvatar}>
                <Ionicons name="megaphone" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedCreator}>{draft.creatorName || 'Campaign Creator'}</Text>
                <Text style={styles.feedSponsored}>Sponsored Community Amplification • UUTS Certified</Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={16} color={colors.textTertiary} />
            </View>

            {/* Ad text */}
            <Text style={styles.feedDescription}>{activeAdDescription}</Text>

            {/* Image */}
            <Image source={{ uri: activeAdImage }} style={styles.feedImage} />

            {/* Footer Bar */}
            <View style={styles.feedFooter}>
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={styles.feedDomain}>COMMUNITYAMPLIFY.ORG</Text>
                <Text style={styles.feedHeadline} numberOfLines={1}>
                  {activeAdHeadline}
                </Text>
              </View>
              <View style={styles.feedCtaButton}>
                <Text style={styles.feedCtaText}>{draft.ctaText}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Preview Variant 2: Compact Banner */
          <View style={styles.compactBannerCard}>
            <Image source={{ uri: activeAdImage }} style={styles.bannerThumb} />
            <View style={styles.bannerContent}>
              <View style={styles.bannerBadge}>
                <Text style={styles.bannerBadgeText}>SPONSORED CIVIC BRIEFING</Text>
              </View>
              <Text style={styles.bannerHeadline} numberOfLines={2}>
                {activeAdHeadline}
              </Text>
              <Text style={styles.bannerCreator}>By {draft.creatorName || 'Community Creator'}</Text>
            </View>
            <View style={styles.bannerCta}>
              <Text style={styles.bannerCtaText}>{draft.ctaText}</Text>
            </View>
          </View>
        )}
      </View>

      {/* 6. Creative Quality Checklist */}
      <View style={styles.checklistCard}>
        <View style={styles.checklistHeader}>
          <Ionicons name="checkbox-outline" size={18} color={colors.primary} />
          <Text style={styles.checklistTitle}>Creative Quality Checklist</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons name="checkmark-circle" size={16} color={draft.adHeadline ? colors.primary : colors.textTertiary} />
          <Text style={styles.checklistText}>Readable headline under 70 characters</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons name="checkmark-circle" size={16} color={activeAdImage ? colors.primary : colors.textTertiary} />
          <Text style={styles.checklistText}>High-resolution photo relevant to the public claims</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons name="checkmark-circle" size={16} color={draft.ctaText ? colors.primary : colors.textTertiary} />
          <Text style={styles.checklistText}>Clear action-oriented call to action</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.checklistText}>Commercial image rights & public domain verification considered</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.massive,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  shortcutBtn: {
    paddingVertical: 2,
  },
  shortcutText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  uploadBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // CTA Chips
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  ctaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.xs,
  },
  ctaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ctaChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  ctaChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Active Image
  activeImageWrapper: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activeImage: {
    width: '100%',
    height: '100%',
  },
  activeImageOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(23, 77, 58, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  activeImageBadge: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  presetScroll: {
    flexDirection: 'row',
    marginTop: 6,
  },
  presetThumbWrap: {
    width: 80,
    height: 54,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  presetThumbActive: {
    borderColor: colors.primary,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  presetCheck: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dual Previews
  previewContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewHeaderRow: {
    marginBottom: spacing.sm,
  },
  previewTitle: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  previewSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  tabButtonActive: {
    backgroundColor: colors.primarySurface,
  },
  tabText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Social Feed Card
  socialFeedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCreator: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  feedSponsored: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
  },
  feedDescription: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  feedImage: {
    width: '100%',
    height: 180,
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  feedDomain: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  feedHeadline: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  feedCtaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  feedCtaText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 11,
  },

  // Compact Banner
  compactBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  bannerThumb: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },
  bannerContent: {
    flex: 1,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginBottom: 2,
  },
  bannerBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 8,
    fontWeight: '700',
  },
  bannerHeadline: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  bannerCreator: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  bannerCta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.xs,
  },
  bannerCtaText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },

  // Checklist
  checklistCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  checklistTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  checklistText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
});
