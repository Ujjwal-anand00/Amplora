import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, radii } from '../../theme';
import {
  useReviewDossierQuery,
  useSubmitReviewDecisionMutation,
} from '../../services/apiClient';
import { useAuth } from '../../services/authContext';
import { Ionicons } from '@expo/vector-icons';

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { data: dossier, isLoading, error, refetch } = useReviewDossierQuery(id as string);
  const decisionMutation = useSubmitReviewDecisionMutation();

  // Collapsible state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    story: true,
    creatives: true,
    sources: true,
    targeting: false,
    budget: true,
    audit: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Decision Modal State
  const [modalType, setModalType] = useState<'CHANGES' | 'REJECT' | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const campaign = dossier?.campaign;
  const isCreatorSelf = Boolean(campaign?.creatorId && user?.id && campaign.creatorId === user.id);

  const handleApprove = () => {
    if (isCreatorSelf) {
      Alert.alert(
        'Self-Review Prohibited',
        'Platform security rules prohibit creators from reviewing or approving their own submissions.'
      );
      return;
    }

    Alert.alert(
      'Confirm Campaign Approval',
      `Are you sure you want to approve "${campaign?.title}"? This certifies its factual claims under the Universal Trust Standard. The campaign will move to APPROVED status.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Campaign',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await decisionMutation.mutateAsync({
                campaignId: campaign.id,
                decision: 'APPROVED',
                feedback: 'Universal Trust Standard certification granted. All supporting sources and creative pre-flight verified.',
              });
              Alert.alert('Approved', 'Campaign has been certified and approved.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert('Decision Failed', err.message || 'Could not approve campaign.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmModalDecision = async () => {
    if (!feedbackInput || feedbackInput.trim().length < 5) {
      Alert.alert('Feedback Required', 'Please provide a detailed explanation of at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const decision = modalType === 'CHANGES' ? 'CHANGES_REQUESTED' : 'REJECTED';
      await decisionMutation.mutateAsync({
        campaignId: campaign.id,
        decision,
        feedback: feedbackInput.trim(),
      });
      setModalType(null);
      setFeedbackInput('');
      Alert.alert(
        decision === 'CHANGES_REQUESTED' ? 'Changes Requested' : 'Campaign Rejected',
        `Decision recorded. The creator has been notified with the feedback.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Decision Failed', err.message || 'Could not record decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authLoading && (!isAuthenticated || !isAdmin)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.unauthContainer}>
          <View style={styles.unauthIconCircle}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={styles.unauthTitle}>Administrator Access Required</Text>
          <Text style={styles.unauthSubtitle}>
            The Campaign Review Console is restricted exclusively to authenticated administrators. Please log in with your administrator account to inspect this submission.
          </Text>
          <TouchableOpacity
            style={styles.unauthPrimaryBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.unauthPrimaryBtnText}>Log In as Administrator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.unauthSecondaryBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.unauthSecondaryBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Compiling review dossier...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dossier) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load review dossier.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{campaign.category}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{campaign.status.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <Text style={styles.title}>{campaign.title}</Text>
          <Text style={styles.creatorSubtitle}>
            Submitted by <Text style={styles.boldText}>{dossier.creator.name}</Text> •{' '}
            {dossier.creator.type || 'Citizen Advocate'}
          </Text>
        </View>

        {/* Self-Review Warning */}
        {isCreatorSelf ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>⚠️ Self-Approval Forbidden</Text>
            <Text style={styles.warningBody}>
              You are signed in as the creator of this campaign. Administrator security policy strictly
              forbids self-approving campaigns. Another authorized administrator must review this submission.
            </Text>
          </View>
        ) : null}

        {/* 1. Story & Narrative Section */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('story')}
          >
            <Text style={styles.sectionTitle}>1. Story & Claims Summary</Text>
            <Text style={styles.expandIcon}>{expandedSections.story ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.story ? (
            <View style={styles.sectionBody}>
              <Text style={styles.bodyLabel}>Campaign Summary</Text>
              <Text style={styles.bodyText}>{campaign.summary}</Text>

              {campaign.storySections && campaign.storySections.length > 0 ? (
                campaign.storySections.map((sec: any, index: number) => (
                  <View key={index} style={styles.storyBlock}>
                    <Text style={styles.storyHeading}>{sec.heading}</Text>
                    <Text style={styles.storyContent}>{sec.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNotice}>No extra narrative sections submitted.</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* 2. Ad Creatives Preview & Pre-Flight */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('creatives')}
          >
            <Text style={styles.sectionTitle}>2. Ad Creatives & Visual Pre-Flight</Text>
            <Text style={styles.expandIcon}>{expandedSections.creatives ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.creatives ? (
            <View style={styles.sectionBody}>
              {/* Creative Visual Preview */}
              <View style={styles.creativePreviewBox}>
                {campaign.imageUrl ? (
                  <Image source={{ uri: campaign.imageUrl }} style={styles.creativeImage} />
                ) : (
                  <View style={styles.noImageBox}>
                    <Text style={styles.noImageText}>Missing Cover Asset</Text>
                  </View>
                )}
                <View style={styles.creativeContent}>
                  <Text style={styles.adHeadline}>{campaign.adHeadline || campaign.title}</Text>
                  <Text style={styles.adDescription}>
                    {campaign.adDescription || campaign.summary}
                  </Text>
                  <View style={styles.ctaPreviewBtn}>
                    <Text style={styles.ctaPreviewText}>{campaign.ctaText || 'Amplify Facts'}</Text>
                  </View>
                </View>
              </View>

              {/* Validation Warnings */}
              {dossier.creativeValidation?.warnings?.length > 0 ? (
                <View style={styles.warningList}>
                  {dossier.creativeValidation.warnings.map((w: string, i: number) => (
                    <Text key={i} style={styles.warningItem}>
                      ⚠️ {w}
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={styles.successCheck}>
                  <Text style={styles.successCheckText}>✓ Creative assets satisfy pre-flight specs</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* 3. Supporting Evidence & SSRF Validation */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('sources')}
          >
            <Text style={styles.sectionTitle}>3. Supporting Evidence & URLs ({dossier.sourceValidations.length})</Text>
            <Text style={styles.expandIcon}>{expandedSections.sources ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.sources ? (
            <View style={styles.sectionBody}>
              {dossier.sourceValidations.length === 0 ? (
                <View style={styles.missingSourceAlert}>
                  <Text style={styles.missingSourceText}>
                    ⚠️ Zero supporting sources provided. Campaigns require credible verifiable citations.
                  </Text>
                </View>
              ) : (
                dossier.sourceValidations.map((src: any, i: number) => {
                  const isValid = src.validation?.isValidUrl && src.validation?.isSsrfSafe;
                  return (
                    <View key={i} style={styles.sourceCard}>
                      <View style={styles.sourceHeader}>
                        <Text style={styles.sourceTitle}>{src.title}</Text>
                        <View
                          style={[
                            styles.badgePill,
                            { backgroundColor: isValid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePillText,
                              { color: isValid ? colors.success : colors.error },
                            ]}
                          >
                            {isValid ? 'SSRF Safe' : 'Security Flag'}
                          </Text>
                        </View>
                      </View>

                      {src.publisher ? (
                        <Text style={styles.sourcePublisher}>Publisher: {src.publisher}</Text>
                      ) : null}

                      <Text style={styles.sourceUrl} numberOfLines={1}>
                        {src.url}
                      </Text>

                      <Text style={styles.sourceRelevance}>
                        <Text style={styles.boldText}>Relevance: </Text>
                        {src.relevance || 'Corroborating public record.'}
                      </Text>

                      {src.validation?.warnings?.length > 0 ? (
                        <View style={styles.sourceWarnings}>
                          {src.validation.warnings.map((sw: string, idx: number) => (
                            <Text key={idx} style={styles.sourceWarningText}>
                              • {sw}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          ) : null}
        </View>

        {/* 4. Targeting Settings */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('targeting')}
          >
            <Text style={styles.sectionTitle}>4. Audience & Geographic Targeting</Text>
            <Text style={styles.expandIcon}>{expandedSections.targeting ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.targeting ? (
            <View style={styles.sectionBody}>
              <Text style={styles.bodyLabel}>Target Locations</Text>
              <Text style={styles.bodyText}>
                {campaign.targetLocations?.join(', ') || 'All Regions'}
              </Text>

              <Text style={styles.bodyLabel}>Audience Interests</Text>
              <Text style={styles.bodyText}>
                {campaign.audienceInterests?.join(', ') || 'Civic Accountability'}
              </Text>

              <Text style={styles.bodyLabel}>Distribution Networks</Text>
              <Text style={styles.bodyText}>
                {campaign.distributionChannels?.join(', ') || 'Meta & Google Civic Ads'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 5. Budget & Delivery Assumptions */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('budget')}
          >
            <Text style={styles.sectionTitle}>5. Budget & Impression Assumptions</Text>
            <Text style={styles.expandIcon}>{expandedSections.budget ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.budget ? (
            <View style={styles.sectionBody}>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Target Amplification Pool:</Text>
                <Text style={styles.budgetValue}>
                  ${(dossier.budgetAssumptions.targetAmount / 100).toLocaleString('en-US')}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Platform Operations Fee (5%):</Text>
                <Text style={styles.budgetValue}>
                  ${(dossier.budgetAssumptions.platformFee / 100).toLocaleString('en-US')}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Net Media Ad Buy (95%):</Text>
                <Text style={[styles.budgetValue, { color: colors.success }]}>
                  ${(dossier.budgetAssumptions.netMediaAllocation / 100).toLocaleString('en-US')}
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Estimated Impressions:</Text>
                <Text style={styles.budgetValue}>
                  {dossier.budgetAssumptions.estimatedImpressions.toLocaleString('en-US')} (~$37 CPM)
                </Text>
              </View>

            </View>
          ) : null}
        </View>

        {/* 6. Policy Acknowledgements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>6. Policy Acknowledgements</Text>
          <View style={styles.policyRow}>
            <Text style={styles.policyCheck}>✓</Text>
            <Text style={styles.policyText}>Community amplification only — no direct personal solicitation.</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyCheck}>✓</Text>
            <Text style={styles.policyText}>Factual truthfulness affirmed under penalty of platform disqualification.</Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={styles.policyCheck}>✓</Text>
            <Text style={styles.policyText}>Platform escrow and distribution gate compliance agreed.</Text>
          </View>
        </View>

        {/* 7. Audit History */}
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('audit')}
          >
            <Text style={styles.sectionTitle}>7. Decision Audit Trail ({dossier.activities?.length || 0})</Text>
            <Text style={styles.expandIcon}>{expandedSections.audit ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {expandedSections.audit ? (
            <View style={styles.sectionBody}>
              {dossier.activities && dossier.activities.length > 0 ? (
                dossier.activities.map((act: any, i: number) => (
                  <View key={i} style={styles.auditItem}>
                    <Text style={styles.auditEvent}>{act.eventType}</Text>
                    <Text style={styles.auditTime}>
                      {new Date(act.createdAt).toLocaleString()} • Actor: {act.actorId || 'System'}
                    </Text>
                    {act.metadata?.feedback ? (
                      <Text style={styles.auditNotes}>Notes: {act.metadata.feedback}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNotice}>Initial submission. No prior review cycles.</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Bottom Review Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn, (isCreatorSelf || isSubmitting) && styles.disabledBtn]}
            onPress={handleApprove}
            disabled={isCreatorSelf || isSubmitting}
          >
            <Text style={styles.approveBtnText}>Approve Campaign</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.requestChangesBtn, (isCreatorSelf || isSubmitting) && styles.disabledBtn]}
              onPress={() => {
                setFeedbackInput('');
                setModalType('CHANGES');
              }}
              disabled={isCreatorSelf || isSubmitting}
            >
              <Text style={styles.requestChangesBtnText}>Request Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn, (isCreatorSelf || isSubmitting) && styles.disabledBtn]}
              onPress={() => {
                setFeedbackInput('');
                setModalType('REJECT');
              }}
              disabled={isCreatorSelf || isSubmitting}
            >
              <Text style={styles.rejectBtnText}>Reject Campaign</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Decision Input Modal */}
      <Modal visible={modalType !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'CHANGES' ? 'Request Editorial Revisions' : 'Reject Campaign Submission'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalType === 'CHANGES'
                ? 'Detail the specific sources, claims, or creative assets the creator must revise before approval.'
                : 'State the clear reason for rejection. This will be recorded in the audit trail.'}
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Enter comprehensive feedback..."
              placeholderTextColor={colors.textSecondary}
              value={feedbackInput}
              onChangeText={setFeedbackInput}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalType(null)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  modalType === 'CHANGES' ? styles.requestChangesBtn : styles.rejectBtn,
                  isSubmitting && styles.disabledBtn,
                ]}
                onPress={handleConfirmModalDecision}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {modalType === 'CHANGES' ? 'Submit Feedback' : 'Confirm Rejection'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  categoryText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  statusText: {
    ...typography.labelSmall,
    color: '#38bdf8',
    fontWeight: '700',
  },
  title: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  creatorSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  warningTitle: {
    ...typography.bodyMedium,
    color: colors.error,
    fontWeight: '700',
    marginBottom: 4,
  },
  warningBody: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  expandIcon: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sectionBody: {
    marginTop: spacing.md,
  },
  bodyLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  bodyText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  storyBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  storyHeading: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  storyContent: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  creativePreviewBox: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  creativeImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
  },
  noImageBox: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  noImageText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  creativeContent: {
    padding: spacing.md,
  },
  adHeadline: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  adDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  ctaPreviewBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  ctaPreviewText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  warningList: {
    backgroundColor: colors.warningSurface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 4,
  },
  warningItem: {
    ...typography.bodySmall,
    color: colors.warning,
  },
  successCheck: {
    backgroundColor: colors.successSurface,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  successCheckText: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  missingSourceAlert: {
    backgroundColor: colors.errorSurface,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  missingSourceText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  sourceCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sourceTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.xs,
  },
  badgePill: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sourcePublisher: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sourceUrl: {
    ...typography.bodySmall,
    color: colors.primary,
    marginVertical: 2,
  },
  sourceRelevance: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginTop: 2,
  },
  sourceWarnings: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sourceWarningText: {
    ...typography.bodySmall,
    color: colors.warning,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  budgetLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  budgetValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  policyCheck: {
    color: colors.success,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  auditItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  auditEvent: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  auditTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  auditNotes: {
    ...typography.bodySmall,
    color: colors.warning,
    marginTop: 2,
  },
  actionContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: colors.success,
  },
  approveBtnText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestChangesBtn: {
    flex: 1,
    backgroundColor: colors.warning,
  },
  requestChangesBtnText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.error,
  },
  rejectBtnText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  modalCancelText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
  },
  modalSubmitText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.bodyMedium,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryBtnText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  emptyNotice: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  unauthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  unauthIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  unauthTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unauthSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  unauthPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unauthPrimaryBtnText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '600',
  },
  unauthSecondaryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  unauthSecondaryBtnText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
});
