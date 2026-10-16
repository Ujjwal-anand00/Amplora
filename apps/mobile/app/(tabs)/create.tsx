import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { SAMPLE_DRAFTS } from '../../services/mockData';
import { CampaignDraft } from '../../types/campaign';

export default function CreateScreen() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<CampaignDraft[]>(SAMPLE_DRAFTS);
  const [isRecording, setIsRecording] = useState(false);

  const handleVoiceOption = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      Alert.alert(
        'Voice Memo Recorded',
        'Your voice outline has been converted into draft structure: "Clean Water Accountability". Continuing in manual editor.',
        [
          {
            text: 'Open Draft',
            onPress: () => router.push('/create/manual'),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }, 1200);
  };

  const handleResumeDraft = (draft: CampaignDraft) => {
    router.push({
      pathname: '/create/manual',
      params: { draftId: draft.id, title: draft.title },
    });
  };

  return (
    <ScreenContainer padded={true}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Start an Amplification Campaign</Text>
        <Text style={styles.subtitle}>
          Mobilize community funds to place fact-checked messages directly in front of targeted audiences.
        </Text>
      </View>

      {/* Creation Mode Options */}
      <View style={styles.optionsContainer}>
        {/* Option 1: Manual Creation */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/create/manual')}
          style={styles.optionCard}
        >
          <View style={styles.optionIconWrapper}>
            <Ionicons name="create-outline" size={26} color={colors.primary} />
          </View>
          <View style={styles.optionContent}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>Create manually</Text>
              <View style={styles.badgeRecommended}>
                <Text style={styles.badgeText}>RECOMMENDED</Text>
              </View>
            </View>
            <Text style={styles.optionDescription}>
              Craft your narrative step-by-step: define target audiences, select ad distribution channels, and calculate reach.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Option 2: Voice Creation (Prototype with Fallback) */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleVoiceOption}
          style={[styles.optionCard, styles.voiceOptionCard]}
        >
          <View style={[styles.optionIconWrapper, styles.voiceIconWrapper]}>
            <Ionicons
              name={isRecording ? 'radio' : 'mic-outline'}
              size={26}
              color={isRecording ? colors.error : colors.primary}
            />
          </View>
          <View style={styles.optionContent}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>Create with your voice</Text>
              <View style={styles.badgePrototype}>
                <Text style={styles.badgePrototypeText}>AI VOICE OUTLINE</Text>
              </View>
            </View>
            <Text style={styles.optionDescription}>
              {isRecording
                ? 'Listening and structuring narrative...'
                : 'Speak freely for 60 seconds. Our assistant drafts headline, claims, and audience criteria with manual verification fallback.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Saved Drafts Section */}
      <SectionHeader
        title="Saved Drafts"
        subtitle="Resume your unfinished campaign drafts"
      />

      {drafts.length > 0 ? (
        drafts.map(draft => (
          <TouchableOpacity
            key={draft.id}
            onPress={() => handleResumeDraft(draft)}
            activeOpacity={0.8}
            style={styles.draftCard}
          >
            <View style={styles.draftIconBox}>
              <Ionicons
                name={draft.mode === 'voice' ? 'mic' : 'document-text'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.draftInfo}>
              <Text style={styles.draftTitle} numberOfLines={1}>
                {draft.title}
              </Text>
              <Text style={styles.draftMeta}>
                {draft.category} • Target ${draft.targetAmount.toLocaleString()} • Saved {draft.savedAt}
              </Text>
            </View>
            <Button
              title="Resume"
              onPress={() => handleResumeDraft(draft)}
              variant="secondary"
              size="sm"
            />
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.noDraftsBox}>
          <Text style={styles.noDraftsText}>No saved drafts yet.</Text>
        </View>
      )}

      {/* Trust & Review Protocol Notice */}
      <View style={styles.trustNotice}>
        <View style={styles.trustIconCircle}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        </View>
        <View style={styles.trustNoticeTextContainer}>
          <Text style={styles.trustNoticeTitle}>Universal Trust Standard (UUTS)</Text>
          <Text style={styles.trustNoticeBody}>
            All campaigns undergo fact-checking and communications integrity review.
            Contributions are locked into escrow until claims are certified for public ad placement.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displayLarge,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  voiceOptionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  optionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  voiceIconWrapper: {
    backgroundColor: colors.accentSubtle,
  },
  optionContent: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  optionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  badgeRecommended: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
  },
  badgePrototype: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  badgePrototypeText: {
    ...typography.labelSmall,
    color: colors.accentDark,
    fontSize: 9,
    fontWeight: '700',
  },
  optionDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Drafts
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  draftIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftInfo: {
    flex: 1,
  },
  draftTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  draftMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  noDraftsBox: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  noDraftsText: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },

  // Trust Notice
  trustNotice: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  trustIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustNoticeTextContainer: {
    flex: 1,
  },
  trustNoticeTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  trustNoticeBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
