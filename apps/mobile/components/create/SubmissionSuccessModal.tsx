import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft } from '../../types/draft';
import { Button } from '../ui/Button';

interface SubmissionSuccessModalProps {
  visible: boolean;
  draft: CampaignDraft;
  onDone: () => void;
  onExplore: () => void;
}

export function SubmissionSuccessModal({
  visible,
  draft,
  onDone,
  onExplore,
}: SubmissionSuccessModalProps) {
  const insets = useSafeAreaInsets();
  const submittedDate = draft.submissionTimestamp
    ? new Date(draft.submissionTimestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Just now';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDone}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Success Banner */}
          <View style={styles.successHeader}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done" size={32} color={colors.textInverse} />
            </View>
            <Text style={styles.successTitle}>Campaign Submitted for Review</Text>
            <Text style={styles.successRef}>Reference ID: {draft.id.toUpperCase()}</Text>
            <Text style={styles.submittedTime}>Submitted on {submittedDate}</Text>
          </View>

          {/* Campaign Brief */}
          <View style={styles.campaignSummaryCard}>
            <Text style={styles.campaignTitle}>{draft.title}</Text>
            <Text style={styles.campaignCreator}>Sponsor: {draft.creatorName}</Text>
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={styles.statusBadgeText}>STATUS: AWAITING UUTS CERTIFICATION</Text>
            </View>
          </View>

          {/* 6-Stage Timeline */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineHeader}>Review & Distribution Lifecycle</Text>
            <Text style={styles.timelineSub}>
              Expected verification pipeline. Dates and approval decisions depend on source certification.
            </Text>

            {/* Stage 1 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeCompleted]}>
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleCompleted}>1. Campaign Submitted</Text>
                <Text style={styles.stageDesc}>Initial structured claims and source documents received.</Text>
                <Text style={styles.stageTimestamp}>{submittedDate}</Text>
              </View>
            </View>
            <View style={styles.timelineBar} />

            {/* Stage 2 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeActive]}>
                <Ionicons name="search" size={12} color={colors.primary} />
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleActive}>2. Content & Primary Source Review</Text>
                <Text style={styles.stageDesc}>Independent fact-checkers verify deed registries, government datasets, and public evidence.</Text>
                <Text style={styles.stageEta}>Estimated turnaround: 24-48 business hours</Text>
              </View>
            </View>
            <View style={styles.timelineBar} />

            {/* Stage 3 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeUpcoming]}>
                <Text style={styles.nodeUpcomingText}>3</Text>
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleUpcoming}>3. Certification or Requested Changes</Text>
                <Text style={styles.stageDesc}>Editorial clearance granted once all claims are certified, or revisions requested.</Text>
              </View>
            </View>
            <View style={styles.timelineBar} />

            {/* Stage 4 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeUpcoming]}>
                <Text style={styles.nodeUpcomingText}>4</Text>
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleUpcoming}>4. Community Funding Launch</Text>
                <Text style={styles.stageDesc}>Published to Explore feed. Citizens pool micro-contributions toward ad distribution.</Text>
              </View>
            </View>
            <View style={styles.timelineBar} />

            {/* Stage 5 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeUpcoming]}>
                <Text style={styles.nodeUpcomingText}>5</Text>
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleUpcoming}>5. Advertising Creative & Channel Setup</Text>
                <Text style={styles.stageDesc}>Placements locked with partner distribution networks and escrow funded.</Text>
              </View>
            </View>
            <View style={styles.timelineBar} />

            {/* Stage 6 */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeUpcoming]}>
                <Text style={styles.nodeUpcomingText}>6</Text>
              </View>
              <View style={styles.timelineTextCol}>
                <Text style={styles.stageTitleUpcoming}>6. Targeted Promotion Live</Text>
                <Text style={styles.stageDesc}>Live verified ads appear in front of target citizens with transparent receipts.</Text>
              </View>
            </View>
          </View>

          {/* Important Rules & Disclaimers */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerHeader}>Platform Integrity Commitments:</Text>
            <Text style={styles.disclaimerBullet}>• Submission does not guarantee editorial approval.</Text>
            <Text style={styles.disclaimerBullet}>• Reaching the funding goal does not automatically launch advertising until final pre-flight checks are passed.</Text>
            <Text style={styles.disclaimerBullet}>• 100% of unspent media funds are protected under platform escrow rules.</Text>
            <Text style={styles.disclaimerBullet}>• You cannot edit claims while under active review to ensure verification integrity.</Text>
          </View>

          {/* Bottom Actions */}
          <View style={styles.actionsBox}>
            <Button
              title="View in My Campaigns"
              variant="primary"
              size="lg"
              onPress={onDone}
              fullWidth
            />
            <Button
              title="Explore Active Campaigns"
              variant="secondary"
              size="md"
              onPress={onExplore}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.massive,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successRef: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  submittedTime: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },

  campaignSummaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  campaignTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  campaignCreator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },

  // Timeline
  timelineCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  timelineHeader: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  timelineSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: colors.primary,
  },
  nodeActive: {
    backgroundColor: colors.primarySurface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  nodeUpcoming: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  nodeUpcomingText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  timelineTextCol: {
    flex: 1,
  },
  stageTitleCompleted: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stageTitleActive: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  stageTitleUpcoming: {
    ...typography.labelMedium,
    color: colors.textTertiary,
  },
  stageDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  stageTimestamp: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
  },
  stageEta: {
    ...typography.labelSmall,
    color: colors.accentDark,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  timelineBar: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderSubtle,
    marginLeft: 11,
    marginVertical: 2,
  },

  // Disclaimers
  disclaimerBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  disclaimerHeader: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 6,
  },
  disclaimerBullet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },

  // Actions
  actionsBox: {
    marginTop: spacing.xs,
  },
});
