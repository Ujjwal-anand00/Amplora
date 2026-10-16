import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft } from '../../types/draft';
import { CampaignCategory } from '../../types/campaign';
import { Button } from '../ui/Button';
import { AiDraftModal } from './AiDraftModal';
import { AiDraftSuggestion } from '../../services/aiAssistance';

const CATEGORIES: CampaignCategory[] = [
  'Environment',
  'Health',
  'Science',
  'Education',
  'Public Policy',
  'Economic Policy',
  'Community',
  'Arts & Culture',
  'Business',
  'Other',
];

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80',
  'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
];

interface Step1BasicsProps {
  draft: CampaignDraft;
  onChange: (fields: Partial<CampaignDraft>) => void;
  errors?: Record<string, string>;
}

export function Step1Basics({ draft, onChange, errors = {} }: Step1BasicsProps) {
  const [showAiModal, setShowAiModal] = useState(false);

  const handleTitleChange = (text: string) => {
    // Max 60 characters
    const trimmed = text.slice(0, 60);
    onChange({
      title: trimmed,
      // If adHeadline was untouched or identical, update it too
      adHeadline: !draft.adHeadline || draft.adHeadline === draft.title ? trimmed : draft.adHeadline,
    });
  };

  const handleApplyAiSuggestion = (suggestion: AiDraftSuggestion) => {
    onChange({
      title: suggestion.title,
      category: suggestion.category,
      summary: suggestion.summary,
      whatIsItAbout: suggestion.whatIsItAbout,
      whoToReach: suggestion.whoToReach,
      whyItMatters: suggestion.whyItMatters,
      evidenceSummary: suggestion.evidenceSummary,
      adHeadline: suggestion.title,
      adDescription: suggestion.summary,
      targetLocations: suggestion.targetLocations,
      audienceInterests: suggestion.audienceInterests,
    });
  };

  const remainingChars = 60 - (draft.title?.length || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* AI Assistance Action Card */}
      <View style={styles.aiHelperCard}>
        <View style={styles.aiHelperLeft}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiHelperTitle}>Need help structuring your campaign?</Text>
            <Text style={styles.aiHelperSub}>Generate an outline based on your topic. You can edit every field.</Text>
          </View>
        </View>
        <Button
          title="AI Assistant"
          variant="secondary"
          size="sm"
          onPress={() => setShowAiModal(true)}
        />
      </View>

      {/* 1. Campaign Title */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Campaign Title *</Text>
          <Text style={[styles.counter, remainingChars < 10 && styles.counterWarning]}>
            {draft.title?.length || 0}/60
          </Text>
        </View>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="e.g. Audit Hospital Outpatient Facility Surcharges"
          placeholderTextColor={colors.textTertiary}
          value={draft.title}
          onChangeText={handleTitleChange}
          maxLength={60}
        />
        <Text style={styles.helperText}>
          Keep it direct and factual. This title will also serve as your default advertising headline.
        </Text>
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      {/* 2. Category Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Advocacy Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {CATEGORIES.map(cat => {
            const isSelected = draft.category === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onChange({ category: cat })}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
      </View>

      {/* 3. Creator / Organization Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Creator or Organization Name *</Text>
        <TextInput
          style={[styles.input, errors.creatorName && styles.inputError]}
          placeholder="e.g. Healthcare Affordability Alliance"
          placeholderTextColor={colors.textTertiary}
          value={draft.creatorName}
          onChangeText={text => onChange({ creatorName: text })}
        />
        <Text style={styles.helperText}>
          The public name credited as the sponsor of this amplification campaign.
        </Text>
        {errors.creatorName && <Text style={styles.errorText}>{errors.creatorName}</Text>}
      </View>

      {/* 4. Short Summary */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Short Summary *</Text>
        <TextInput
          style={[styles.textArea, errors.summary && styles.inputError]}
          placeholder="Summarize the core message that community ad funds will amplify..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          value={draft.summary}
          onChangeText={text => onChange({ summary: text, adDescription: !draft.adDescription ? text : draft.adDescription })}
        />
        <Text style={styles.helperText}>
          A 1-2 sentence overview visible in feed previews and campaign cards.
        </Text>
        {errors.summary && <Text style={styles.errorText}>{errors.summary}</Text>}
      </View>

      {/* 5. What the Campaign is About */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>What is the campaign about?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Explain the background circumstances, current policy, or community challenge..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          value={draft.whatIsItAbout}
          onChangeText={text => onChange({ whatIsItAbout: text })}
        />
      </View>

      {/* 6. Who to Reach */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Who should this message reach?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Patients, district voters, municipal decision-makers..."
          placeholderTextColor={colors.textTertiary}
          value={draft.whoToReach}
          onChangeText={text => onChange({ whoToReach: text })}
        />
      </View>

      {/* 7. Why it Matters */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Why does this message matter?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Why is it urgent for this information to be placed before the targeted audience?"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={2}
          value={draft.whyItMatters}
          onChangeText={text => onChange({ whyItMatters: text })}
        />
      </View>

      {/* 8. Evidence Summary */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>What evidence or public records support it?</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. State audit reports, government registry deeds, EPA water data..."
          placeholderTextColor={colors.textTertiary}
          value={draft.evidenceSummary}
          onChangeText={text => onChange({ evidenceSummary: text })}
        />
      </View>

      {/* 9. Cover Image Preset Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Campaign Cover Image</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.coverScroll}>
          {PRESET_COVERS.map((url, idx) => {
            const isSelected = draft.coverImage === url;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => onChange({ coverImage: url })}
                style={[styles.coverThumbnailWrap, isSelected && styles.coverThumbnailActive]}
                activeOpacity={0.8}
              >
                <Image source={{ uri: url }} style={styles.coverThumbnail} />
                {isSelected && (
                  <View style={styles.coverCheckBadge}>
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Live Mini Campaign Card Preview */}
      <View style={styles.previewBox}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTag}>LIVE CARD PREVIEW</Text>
          <Text style={styles.previewSub}>How backers discover your campaign</Text>
        </View>

        <View style={styles.miniCard}>
          {draft.coverImage && (
            <Image source={{ uri: draft.coverImage }} style={styles.miniCardImage} />
          )}
          <View style={styles.miniCardBody}>
            <View style={styles.miniCategoryBadge}>
              <Text style={styles.miniCategoryText}>{draft.category}</Text>
            </View>
            <Text style={styles.miniCardTitle} numberOfLines={2}>
              {draft.title || 'Untitled Campaign'}
            </Text>
            <Text style={styles.miniCardCreator}>
              By {draft.creatorName || 'Anonymous Creator'}
            </Text>
            <Text style={styles.miniCardSummary} numberOfLines={2}>
              {draft.summary || 'Describe your campaign message to see the live discovery preview.'}
            </Text>
          </View>
        </View>
      </View>

      {/* AI Draft Modal */}
      <AiDraftModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplySuggestion={handleApplyAiSuggestion}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  aiHelperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  aiHelperTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  aiHelperSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
  counter: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  counterWarning: {
    color: colors.warning,
    fontWeight: '700',
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
    minHeight: 80,
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
    lineHeight: 16,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  // Category chips
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Covers
  coverScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  coverThumbnailWrap: {
    width: 90,
    height: 60,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  coverThumbnailActive: {
    borderColor: colors.primary,
  },
  coverThumbnail: {
    width: '100%',
    height: '100%',
  },
  coverCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Preview Box
  previewBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  previewHeader: {
    marginBottom: spacing.sm,
  },
  previewTag: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  previewSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  miniCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  miniCardImage: {
    width: '100%',
    height: 120,
  },
  miniCardBody: {
    padding: spacing.md,
  },
  miniCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginBottom: 6,
  },
  miniCategoryText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  miniCardTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  miniCardCreator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  miniCardSummary: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    lineHeight: 18,
  },
});
