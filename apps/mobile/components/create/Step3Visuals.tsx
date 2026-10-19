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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft, DraftAdAsset } from '../../types/draft';
import { Button } from '../ui/Button';
import { GeminiButton } from '../ai/GeminiButton';
import { GeminiAssistModal } from '../ai/GeminiAssistModal';
import { apiClient } from '../../services/apiClient';

const CTA_OPTIONS = [
  'Amplify This Message',
  'Read The Full Story',
  'Support Distribution',
  'Learn The Facts',
  'Demand Public Action',
];

const VISUAL_STYLES = [
  'Editorial Documentary',
  'High-Impact Civic',
  'Photojournalistic',
  'Modern Minimalist',
  'Clean Diagram/Blueprint',
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
  const [showAiModal, setShowAiModal] = useState(false);

  // AI Campaign Thumbnail Studio State
  const [selectedStyle, setSelectedStyle] = useState('Editorial Documentary');
  const [promptInstructions, setPromptInstructions] = useState('');
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailStatus, setThumbnailStatus] = useState<string>('');
  const [generatedThumbnail, setGeneratedThumbnail] = useState<{
    imageUrl: string;
    visualPrompt: string;
    source: 'imagen' | 'editorial_asset';
    styleApplied: string;
    metadata?: any;
    disclosure?: string;
  } | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

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

  // AI Thumbnail Generation
  const handleGenerateAiThumbnail = async () => {
    if (!draft.title && !draft.summary) {
      Alert.alert(
        'Missing Campaign Info',
        'Please enter a campaign title or topic in Step 1 before generating an AI thumbnail.'
      );
      return;
    }

    try {
      setIsGeneratingThumbnail(true);
      setThumbnailStatus('Synthesizing visual direction with AI...');

      const res = await apiClient.generateAiThumbnail({
        title: draft.title || 'Civic Community Campaign',
        summary: draft.summary || '',
        category: draft.category || 'General',
        visualStyle: selectedStyle,
        promptInstructions: promptInstructions.trim() || undefined,
        audience: draft.whoToReach || undefined,
        objective: draft.whyItMatters || draft.whatIsItAbout || undefined,
      });

      if (res.success && res.data) {
        setGeneratedThumbnail(res.data);
      } else {
        Alert.alert('Notice', 'Unable to generate thumbnail right now. You can upload an image or pick a preset.');
      }
    } catch (err: any) {
      console.warn('[AI Thumbnail] error:', err);
      Alert.alert(
        'AI Generation Notice',
        err?.message || 'Unable to generate thumbnail right now. You can upload an image or choose from presets.'
      );
    } finally {
      setIsGeneratingThumbnail(false);
      setThumbnailStatus('');
    }
  };

  const handleAcceptThumbnail = () => {
    if (!generatedThumbnail) return;
    const newAsset: DraftAdAsset = {
      id: `ai-thumb-${Date.now()}`,
      uri: generatedThumbnail.imageUrl,
      fileName: `ai-thumbnail-${draft.id || 'draft'}.jpg`,
    };
    onChange({
      coverImage: generatedThumbnail.imageUrl,
      adVisualAssets: [newAsset, ...draft.adVisualAssets.filter(a => a.uri !== generatedThumbnail.imageUrl)],
    });
    Alert.alert('Thumbnail Accepted', 'The AI thumbnail has been applied to your campaign draft.');
  };

  const handleRemoveThumbnail = () => {
    setGeneratedThumbnail(null);
    onChange({ coverImage: undefined });
  };

  const activeAdImage = draft.coverImage || SAMPLE_AD_IMAGES[0];
  const activeAdHeadline = draft.adHeadline || draft.title || 'Support Community Amplification';
  const activeAdDescription = draft.adDescription || draft.summary || 'Help fund verified public awareness distribution.';

  const handleApplyAiSuggestion = (suggestion: any) => {
    onChange({
      adHeadline: suggestion.adHeadlines?.[0] || draft.adHeadline,
      adDescription: suggestion.adDescriptions?.[0] || draft.adDescription,
      ctaText: suggestion.ctaVariations?.[0] || draft.ctaText,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Gemini AI Ad Copy Card */}
      <View style={styles.aiHelperCard}>
        <View style={styles.aiHelperContent}>
          <View style={styles.aiHelperIconBox}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View style={styles.aiHelperTextContainer}>
            <Text style={styles.aiHelperTitle}>Generate Ad Creative with AI</Text>
            <Text style={styles.aiHelperSub}>
              Produce punchy headlines, meta descriptions, action CTAs, and descriptive prompts for civic imagery.
            </Text>
          </View>
        </View>
        <GeminiButton
          label="Generate ad copy with AI"
          variant="primary"
          size="md"
          style={styles.aiHelperButton}
          onPress={() => setShowAiModal(true)}
        />
      </View>

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

      {/* 4. AI Campaign Thumbnail Studio */}
      <View style={styles.thumbnailStudioCard}>
        <View style={styles.thumbnailStudioHeader}>
          <View style={styles.studioIconBadge}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.studioTitleRow}>
              <Text style={styles.thumbnailStudioTitle}>Generate Thumbnail with AI</Text>
              <View style={styles.modelTag}>
                <Text style={styles.modelTagText}>Gemini + Imagen</Text>
              </View>
            </View>
            <Text style={styles.thumbnailStudioSubtitle}>
              Synthesize a 16:9 advertising thumbnail tailored to your campaign title, topic, and visual direction.
            </Text>
          </View>
        </View>

        {/* Visual Style Selection */}
        <Text style={styles.subLabel}>Visual Style Direction:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stylePillsScroll}>
          {VISUAL_STYLES.map(style => {
            const isSelected = selectedStyle === style;
            return (
              <TouchableOpacity
                key={style}
                onPress={() => setSelectedStyle(style)}
                style={[styles.stylePill, isSelected && styles.stylePillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.stylePillText, isSelected && styles.stylePillTextActive]}>
                  {style}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Optional Custom Visual Instructions */}
        <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>
          Additional Visual Instructions (Optional):
        </Text>
        <TextInput
          style={styles.instructionInput}
          placeholder="e.g. Natural morning lighting, community gathering, clean focus..."
          placeholderTextColor={colors.textTertiary}
          value={promptInstructions}
          onChangeText={setPromptInstructions}
          maxLength={120}
        />

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateAiBtn, isGeneratingThumbnail && styles.generateAiBtnDisabled]}
          onPress={handleGenerateAiThumbnail}
          disabled={isGeneratingThumbnail}
          activeOpacity={0.8}
        >
          {isGeneratingThumbnail ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator size="small" color={colors.textInverse} />
              <Text style={styles.generateAiBtnText}>
                {thumbnailStatus || 'Synthesizing with AI...'}
              </Text>
            </View>
          ) : (
            <View style={styles.generatingRow}>
              <Ionicons name="sparkles" size={18} color={colors.textInverse} />
              <Text style={styles.generateAiBtnText}>Generate Thumbnail with AI</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Generated Preview Card */}
        {generatedThumbnail && (
          <View style={styles.generatedPreviewBox}>
            <View style={styles.generatedPreviewHeader}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.generatedPreviewTitle}>AI Generated Thumbnail Preview</Text>
              </View>
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceBadgeText}>
                  {generatedThumbnail.source === 'imagen' ? 'Imagen 3.0' : 'Gemini Directed'}
                </Text>
              </View>
            </View>

            <View style={styles.previewImageContainer}>
              <Image source={{ uri: generatedThumbnail.imageUrl }} style={styles.previewImage} />
              <View style={styles.ratioBadge}>
                <Text style={styles.ratioBadgeText}>16:9 HD</Text>
              </View>
            </View>

            {/* Expandable Visual Prompt Disclosure */}
            <TouchableOpacity
              onPress={() => setShowPromptDetails(!showPromptDetails)}
              style={styles.promptDisclosureToggle}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPromptDetails ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.promptDisclosureText}>
                {showPromptDetails ? 'Hide Synthesized Visual Prompt' : 'View Synthesized Visual Prompt'}
              </Text>
            </TouchableOpacity>

            {showPromptDetails && (
              <View style={styles.promptDetailsBox}>
                <Text style={styles.promptDetailsContent}>{generatedThumbnail.visualPrompt}</Text>
                <Text style={styles.promptDisclosureNote}>
                  {generatedThumbnail.disclosure ||
                    'Visual prompt synthesized via Gemini AI and matched for high-contrast mobile advertising.'}
                </Text>
              </View>
            )}

            {/* Action Buttons: Accept / Regenerate / Upload Instead / Remove */}
            <View style={styles.thumbnailActionRow}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptThumbnail}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />
                <Text style={styles.acceptButtonText}>Accept Thumbnail</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleGenerateAiThumbnail}
                disabled={isGeneratingThumbnail}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.regenerateButtonText}>Regenerate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActionRow}>
              <TouchableOpacity
                style={styles.altActionButton}
                onPress={handlePickImage}
                disabled={pickingImage}
              >
                <Ionicons name="cloud-upload-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.altActionText}>Upload Photo Instead</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.altActionButton} onPress={handleRemoveThumbnail}>
                <Ionicons name="trash-outline" size={14} color={colors.error} />
                <Text style={[styles.altActionText, { color: colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 5. Creative Visual Image Assets & Active Selection */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Active Campaign Thumbnail *</Text>
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
        <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Or pick from verified high-res presets:</Text>
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

      {/* 6. Dual Live Ad Previews */}
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

      {/* 7. Creative Quality Checklist */}
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

      {/* Google Gemini AI Modal */}
      <GeminiAssistModal
        visible={showAiModal}
        stage={3}
        currentData={draft}
        onClose={() => setShowAiModal(false)}
        onApply={handleApplyAiSuggestion}
      />
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
  aiHelperCard: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primarySubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  aiHelperContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  aiHelperIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
  },
  aiHelperTextContainer: {
    flex: 1,
  },
  aiHelperTitle: {
    ...typography.labelLarge,
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
  aiHelperSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  aiHelperButton: {
    width: '100%',
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

  // AI Thumbnail Studio
  thumbnailStudioCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primarySubtle || '#BFDBFE',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumbnailStudioHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  studioIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  studioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  thumbnailStudioTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  modelTag: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primarySubtle || '#BFDBFE',
  },
  modelTagText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  thumbnailStudioSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  stylePillsScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  stylePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.xs,
  },
  stylePillActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  stylePillText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  stylePillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  instructionInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  generateAiBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateAiBtnDisabled: {
    opacity: 0.7,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  generateAiBtnText: {
    ...typography.labelMedium,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },

  // Generated Preview Box
  generatedPreviewBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  generatedPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generatedPreviewTitle: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  sourceBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sourceBadgeText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  previewImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  ratioBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  ratioBadgeText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
  },
  promptDisclosureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  promptDisclosureText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  promptDetailsBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.xs + 2,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  promptDetailsContent: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  promptDisclosureNote: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  thumbnailActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs + 4,
    borderRadius: radii.md,
  },
  acceptButtonText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 12,
  },
  regenerateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.xs + 4,
    borderRadius: radii.md,
  },
  regenerateButtonText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  altActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  altActionText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
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
    backgroundColor: 'rgba(37, 99, 235, 0.90)',
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
