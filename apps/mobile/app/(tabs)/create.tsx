import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { useDraftStore } from '../../services/draftStore';
import { CampaignDraft } from '../../types/draft';
import { VoiceAssistedModal } from '../../components/create/VoiceAssistedModal';

export default function CreateScreen() {
  const router = useRouter();
  const store = useDraftStore();
  const allDrafts = store.getDrafts();

  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Separate active drafts from submitted campaigns
  const activeDrafts = allDrafts.filter(d => d.status === 'draft');
  const submittedCampaigns = allDrafts.filter(d => d.status === 'submitted_for_review');

  const handleCreateManually = () => {
    const newDraft = store.startOrResumeDraft(undefined, 'manual');
    router.push({
      pathname: '/create/manual',
      params: { draftId: newDraft.id },
    });
  };

  const handleResumeDraft = (draft: CampaignDraft) => {
    store.startOrResumeDraft(draft.id);
    router.push({
      pathname: '/create/manual',
      params: { draftId: draft.id },
    });
  };

  const handleDeleteDraft = (draft: CampaignDraft) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to permanently delete "${draft.title || 'Untitled Draft'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await store.deleteDraft(draft.id);
          },
        },
      ]
    );
  };

  const handleVoiceDraftCreated = (draft: CampaignDraft) => {
    store.setActiveDraft(draft);
    router.push({
      pathname: '/create/manual',
      params: { draftId: draft.id, mode: 'voice' },
    });
  };

  const formatDraftDate = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <ScreenContainer padded={true}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start an Amplora Campaign</Text>
          <Text style={styles.subtitle}>
            Mobilize community advertising pools to place fact-checked civic messages directly in front of targeted citizens.
          </Text>
        </View>

        {/* Creation Mode Options */}
        <View style={styles.optionsContainer}>
          {/* Option 1: Manual Creation */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleCreateManually}
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
                Follow our 5-step editorial workflow: define basics, structure evidence, select ad placements, plan reach, and set goals.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Option 2: Voice Creation */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setShowVoiceModal(true)}
            style={[styles.optionCard, styles.voiceOptionCard]}
          >
            <View style={[styles.optionIconWrapper, styles.voiceIconWrapper]}>
              <Ionicons name="mic-outline" size={26} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Create with your voice</Text>
                <View style={styles.badgePrototype}>
                  <Text style={styles.badgePrototypeText}>SPEECH-TO-DRAFT</Text>
                </View>
              </View>
              <Text style={styles.optionDescription}>
                Speak your idea for 60 seconds. Our assistant structures claims and audience criteria into an editable 5-step draft.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Saved In-Progress Drafts Section */}
        <SectionHeader
          title={`Saved Drafts (${activeDrafts.length})`}
          subtitle="Resume editing or modify unfinished campaigns"
        />

        {activeDrafts.length > 0 ? (
          activeDrafts.map(draft => (
            <View key={draft.id} style={styles.draftCard}>
              <TouchableOpacity
                onPress={() => handleResumeDraft(draft)}
                style={styles.draftClickableArea}
                activeOpacity={0.7}
              >
                <View style={styles.draftIconBox}>
                  <Ionicons
                    name={draft.mode === 'voice' ? 'mic' : 'document-text'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.draftInfo}>
                  <Text style={styles.draftTitle} numberOfLines={1}>
                    {draft.title || 'Untitled Draft'}
                  </Text>
                  <Text style={styles.draftMeta}>
                    Step {draft.currentStep} of 5 • {draft.category} • Updated {formatDraftDate(draft.updatedAt)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.draftActionsRow}>
                <Button
                  title="Resume"
                  onPress={() => handleResumeDraft(draft)}
                  variant="secondary"
                  size="sm"
                />
                <TouchableOpacity
                  onPress={() => handleDeleteDraft(draft)}
                  style={styles.deleteDraftButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noDraftsBox}>
            <Ionicons name="document-text-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.noDraftsTitle}>No in-progress drafts</Text>
            <Text style={styles.noDraftsText}>Start a new manual or voice campaign above.</Text>
          </View>
        )}

        {/* Submitted Campaigns Area */}
        {submittedCampaigns.length > 0 && (
          <View style={styles.submittedSection}>
            <SectionHeader
              title={`Submitted Campaigns (${submittedCampaigns.length})`}
              subtitle="Campaigns currently under fact-checking and UUTS verification"
            />
            {submittedCampaigns.map(sub => (
              <View key={sub.id} style={styles.submittedCard}>
                <View style={styles.submittedTop}>
                  <View style={styles.submittedBadge}>
                    <Ionicons name="time" size={12} color={colors.primary} />
                    <Text style={styles.submittedBadgeText}>AWAITING REVIEW</Text>
                  </View>
                  <Text style={styles.submittedDate}>
                    {formatDraftDate(sub.submissionTimestamp)}
                  </Text>
                </View>

                <Text style={styles.submittedTitle}>{sub.title}</Text>
                <Text style={styles.submittedSub}>
                  Goal: ${sub.fundingGoal?.toLocaleString()} • {sub.category} • {sub.targetLocations.join(', ')}
                </Text>
                <Text style={styles.submittedNotice}>
                  Claims and sources are currently being audited by certified fact-checkers. Unspent escrow protected.
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Universal Trust Standard Notice */}
        <View style={styles.trustNotice}>
          <View style={styles.trustIconCircle}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          </View>
          <View style={styles.trustNoticeTextContainer}>
            <Text style={styles.trustNoticeTitle}>Universal Trust Standard (UUTS)</Text>
            <Text style={styles.trustNoticeBody}>
              All campaigns undergo objective verification. Contributions are deposited into third-party escrow and only released for certified advertising distribution.
            </Text>
          </View>
        </View>

        {/* Voice Assisted Modal */}
        <VoiceAssistedModal
          visible={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onDraftCreated={handleVoiceDraftCreated}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.massive,
  },
  header: {
    paddingTop: spacing.xs,
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  draftClickableArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  draftIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
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
    fontWeight: '700',
  },
  draftMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  draftActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  deleteDraftButton: {
    padding: 8,
  },
  noDraftsBox: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  noDraftsTitle: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  noDraftsText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Submitted Campaigns
  submittedSection: {
    marginTop: spacing.lg,
  },
  submittedCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  submittedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  submittedBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  submittedDate: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  submittedTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  submittedSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  submittedNotice: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
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
    width: 40,
    height: 40,
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
