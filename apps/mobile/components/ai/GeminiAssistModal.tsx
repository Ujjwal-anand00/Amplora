import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { apiClient } from '../../services/apiClient';

export type GeminiStage = 1 | 2 | 3 | 4 | 5;

export interface GeminiAssistModalProps {
  visible: boolean;
  stage: GeminiStage;
  currentData: any;
  onClose: () => void;
  onApply: (generatedData: any) => void;
}

export const GeminiAssistModal: React.FC<GeminiAssistModalProps> = ({
  visible,
  stage,
  currentData,
  onClose,
  onApply,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up any pending in-flight request when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible && abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    onClose();
  };

  const getStageTitle = () => {
    switch (stage) {
      case 1:
        return 'Stage 1: Basics & Core Message';
      case 2:
        return 'Stage 2: Story, Narrative & Evidence';
      case 3:
        return 'Stage 3: Ad Copy & Visual Prompts';
      case 4:
        return 'Stage 4: Reach & Distribution Plan';
      case 5:
        return 'Stage 5: Pre-Submission Audit';
    }
  };

  const getStagePromptPlaceholder = () => {
    switch (stage) {
      case 1:
        return 'e.g. Exposing hidden airline passenger fees, Clean water in Cascade Valley...';
      case 2:
        return 'e.g. Key local impact, hospital acquisition context, or specific civic harm...';
      case 3:
        return 'e.g. High-urgency consumer protection tone, focus on digital search ad formats...';
      case 4:
        return 'e.g. Target parents in suburban districts, focus on local digital news...';
      case 5:
        return 'Optional: Add specific review instructions or questions for Gemini audit...';
    }
  };

  const handleGenerate = async () => {
    if (loading) return;

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setErrorMsg(null);

    try {
      let res: any;
      const options = { signal: controller.signal };

      if (stage === 1) {
        const topic = promptInput.trim() || currentData?.title || currentData?.summary || 'Civic Awareness';
        res = await apiClient.generateAiBasics(
          {
            topic,
            category: currentData?.category,
            existingTitle: currentData?.title,
          },
          options
        );
      } else if (stage === 2) {
        res = await apiClient.generateAiStory(
          {
            title: currentData?.title || 'Community Campaign',
            summary: currentData?.summary || 'Public interest campaign',
            category: currentData?.category || 'Public Policy',
            userSources: currentData?.sources || [],
            contextNotes: promptInput.trim() || undefined,
          },
          options
        );
      } else if (stage === 3) {
        res = await apiClient.generateAiVisuals(
          {
            title: currentData?.title || 'Community Campaign',
            summary: currentData?.summary || 'Public interest campaign',
            category: currentData?.category || 'Public Policy',
            adHeadline: promptInput.trim() || undefined,
          },
          options
        );
      } else if (stage === 4) {
        res = await apiClient.generateAiReach(
          {
            title: currentData?.title || 'Community Campaign',
            category: currentData?.category || 'Public Policy',
            fundingGoalINR: currentData?.fundingGoal || 50000,
            targetLocations: currentData?.targetLocations || [],
          },
          options
        );
      } else if (stage === 5) {
        res = await apiClient.reviewAiCampaign(
          {
            title: currentData?.title || '',
            summary: currentData?.summary || '',
            narrative: currentData?.narrative || '',
            category: currentData?.category || 'Public Policy',
            sources: currentData?.sources || [],
            targetAmount: currentData?.fundingGoal,
          },
          options
        );
      }

      if (res?.success && res?.data) {
        setResult(res.data);
      } else {
        setErrorMsg(res?.error || 'Could not complete generation. Please retry.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('canceled')) {
        setErrorMsg('Generation was canceled. You can edit your guidance and try again.');
      } else {
        setErrorMsg(err?.message || 'Gemini service encountered an error. Please try again.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!result) return;

    // Check if user already has non-empty content in relevant fields
    const hasExistingContent =
      (stage === 1 && (currentData?.title || currentData?.summary)) ||
      (stage === 2 && currentData?.narrative) ||
      (stage === 3 && currentData?.creativeHeadline) ||
      (stage === 4 && currentData?.targetAudience);

    if (hasExistingContent) {
      Alert.alert(
        'Replace Existing Content?',
        'Applying AI recommendations will update existing text in this step. Would you like to proceed?',
        [
          { text: 'Keep My Content', style: 'cancel' },
          {
            text: 'Apply & Update',
            style: 'default',
            onPress: () => {
              onApply(result);
              setResult(null);
              onClose();
            },
          },
        ]
      );
    } else {
      onApply(result);
      setResult(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Google Gemini AI</Text>
                <Text style={styles.subtitle}>{getStageTitle()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Responsible AI Transparency Disclosure */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.disclaimerText}>
                AI-assisted drafting: All generated claims and targeting recommendations must be independently
                reviewed. You retain full editorial control before campaign submission.
              </Text>
            </View>

            {/* Error / Quota Box */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Prompt Input */}
            <Text style={styles.inputLabel}>
              {stage === 5
                ? 'Run pre-submission editorial & factual consistency audit:'
                : 'Focus Topic, Key Point, or Guidance (Optional):'}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder={getStagePromptPlaceholder()}
              placeholderTextColor={colors.textTertiary}
              value={promptInput}
              onChangeText={setPromptInput}
              multiline={stage === 2 || stage === 5}
              numberOfLines={stage === 2 || stage === 5 ? 3 : 2}
            />

            {/* Action Bar */}
            <View style={styles.generateRow}>
              <TouchableOpacity
                style={[styles.generateBtn, loading && styles.btnDisabled]}
                onPress={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.generateBtnText}>
                      {result ? 'Regenerate Suggestions' : stage === 5 ? 'Audit Campaign with AI' : 'Generate with AI'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Result Preview Container */}
            {result ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI-GENERATED SUGGESTION</Text>
                  </View>
                  <Text style={styles.modelUsedText}>{result.modelUsed || 'Gemini 2.5 Flash'}</Text>
                </View>

                {/* Stage-Specific Result Rendering */}
                {stage === 1 && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Suggested Title:</Text>
                    <Text style={styles.fieldValue}>{result.title}</Text>

                    <Text style={styles.fieldLabel}>Summary:</Text>
                    <Text style={styles.fieldValue}>{result.summary}</Text>

                    <Text style={styles.fieldLabel}>Key Message:</Text>
                    <Text style={styles.fieldValue}>{result.keyMessage}</Text>

                    <Text style={styles.fieldLabel}>Civic Objective:</Text>
                    <Text style={styles.fieldValue}>{result.publicInterestObjective}</Text>
                  </View>
                )}

                {stage === 2 && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Problem Statement & Narrative:</Text>
                    <Text style={styles.fieldValue}>{result.narrative}</Text>

                    <Text style={styles.fieldLabel}>Proposed Advocacy Solution:</Text>
                    <Text style={styles.fieldValue}>{result.proposedSolution}</Text>

                    {result.evidenceSummaries?.length > 0 && (
                      <>
                        <Text style={styles.fieldLabel}>Source Evidence Summaries:</Text>
                        {result.evidenceSummaries.map((s: any, idx: number) => (
                          <View key={idx} style={styles.evidenceItem}>
                            <Text style={styles.evidenceTitle}>• {s.sourceTitle}</Text>
                            <Text style={styles.evidenceFact}>{s.verifiedFact}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {stage === 3 && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Recommended Ad Headlines:</Text>
                    {result.adHeadlines?.map((h: string, idx: number) => (
                      <Text key={idx} style={styles.bulletItem}>
                        {idx + 1}. {h}
                      </Text>
                    ))}

                    <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Creative Concepts:</Text>
                    {result.creativeConcepts?.map((c: string, idx: number) => (
                      <Text key={idx} style={styles.bulletItem}>
                        • {c}
                      </Text>
                    ))}

                    <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Suggested Image Prompt:</Text>
                    <Text style={styles.promptBox}>{result.imagePrompts?.[0]}</Text>
                  </View>
                )}

                {stage === 4 && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.fieldLabel}>Target Audience Segments:</Text>
                    {result.audienceSegments?.map((seg: any, idx: number) => (
                      <View key={idx} style={styles.segmentCard}>
                        <Text style={styles.segmentName}>{seg.segmentName}</Text>
                        <Text style={styles.segmentDemo}>{seg.demographics}</Text>
                        <Text style={styles.segmentRationale}>{seg.targetingRationale}</Text>
                      </View>
                    ))}

                    <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>Distribution Channels:</Text>
                    {result.distributionChannels?.map((ch: string, idx: number) => (
                      <Text key={idx} style={styles.bulletItem}>
                        • {ch}
                      </Text>
                    ))}

                    {result.budgetRecommendations && (
                      <View style={styles.budgetBox}>
                        <Text style={styles.budgetTitle}>CPM Cost Assumptions:</Text>
                        <Text style={styles.budgetText}>
                          Assumed CPM: ${result.budgetRecommendations.assumedCPM} (~$0.037 per ad view)
                        </Text>
                        <Text style={styles.budgetText}>
                          Est. Impressions:{' '}
                          {result.budgetRecommendations.estimatedImpressions?.toLocaleString('en-US')} views
                        </Text>

                        <Text style={styles.costNote}>
                          {result.budgetRecommendations.costAssumptionNote}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {stage === 5 && (
                  <View style={styles.fieldSection}>
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Readiness Score:</Text>
                      <View style={styles.scorePill}>
                        <Text style={styles.scoreValue}>{result.overallReadinessScore} / 100</Text>
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>Clarity Assessment:</Text>
                    <Text style={styles.fieldValue}>{result.clarityAssessment}</Text>

                    <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>
                      Pre-Submission Checklist:
                    </Text>
                    {result.preSubmissionChecklist?.map((chk: any, idx: number) => (
                      <View key={idx} style={styles.checkItem}>
                        <Ionicons
                          name={chk.passed ? 'checkmark-circle' : 'alert-circle'}
                          size={16}
                          color={chk.passed ? colors.success : colors.warning}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            !chk.passed && { color: colors.warning },
                          ]}
                        >
                          {chk.item}
                        </Text>
                      </View>
                    ))}

                    {result.flaggedClaims?.length > 0 && (
                      <View style={styles.flagsBox}>
                        <Text style={styles.flagsTitle}>Claims Requiring Citations:</Text>
                        {result.flaggedClaims.map((f: any, idx: number) => (
                          <View key={idx} style={{ marginTop: 4 }}>
                            <Text style={styles.flagClaim}>"{f.claimText}"</Text>
                            <Text style={styles.flagRec}>Action: {f.recommendation}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Apply / Reject Controls */}
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={handleAccept}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                    <Text
                      style={styles.acceptBtnText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {stage === 5 ? 'Acknowledge Audit' : 'Apply to Campaign Form'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => setResult(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rejectBtnText} numberOfLines={1}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  closeButton: {
    padding: 6,
  },
  body: {
    padding: spacing.md,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  generateRow: {
    marginBottom: spacing.md,
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  generateBtnText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resultContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiBadgeText: {
    ...typography.labelSmall,
    fontSize: 9,
    color: colors.primary,
    fontWeight: '800',
  },
  modelUsedText: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textTertiary,
  },
  fieldSection: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  fieldValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bulletItem: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  promptBox: {
    ...typography.bodySmall,
    fontStyle: 'italic',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 4,
  },
  evidenceItem: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  evidenceTitle: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: colors.primary,
  },
  evidenceFact: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  segmentCard: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segmentName: {
    ...typography.labelMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  segmentDemo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  segmentRationale: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  budgetBox: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  budgetTitle: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  budgetText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  costNote: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  scoreLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scorePill: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scoreValue: {
    ...typography.headingSmall,
    fontSize: 14,
    color: colors.primary,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  checkItemText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  flagsBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  flagsTitle: {
    ...typography.labelSmall,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  flagClaim: {
    ...typography.bodySmall,
    color: '#92400E',
    fontStyle: 'italic',
  },
  flagRec: {
    ...typography.bodySmall,
    color: '#B45309',
    fontSize: 11,
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  acceptBtn: {
    flex: 1.8,
    backgroundColor: colors.primary,
  },
  acceptBtnText: {
    ...typography.labelMedium,
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rejectBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
