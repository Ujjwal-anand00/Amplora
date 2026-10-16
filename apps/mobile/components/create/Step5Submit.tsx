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
import { CampaignDraft, DraftStep } from '../../types/draft';
import { calculateUseOfFunds, formatCurrency, formatMetricNumber } from '../../lib/reachCalculator';
import { Button } from '../ui/Button';
import { CampaignPreviewModal } from './CampaignPreviewModal';

interface Step5SubmitProps {
  draft: CampaignDraft;
  onChange: (fields: Partial<CampaignDraft>) => void;
  onNavigateToStep: (step: DraftStep) => void;
  onSubmitForReview: () => void;
  submitting?: boolean;
  errors?: Record<string, string>;
}

export function Step5Submit({
  draft,
  onChange,
  onNavigateToStep,
  onSubmitForReview,
  submitting = false,
  errors = {},
}: Step5SubmitProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [policyExpanded, setPolicyExpanded] = useState(false);

  // Funding goal input
  const handleFundingGoalChange = (text: string) => {
    const numeric = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    onChange({ fundingGoal: numeric });
  };

  const funds = calculateUseOfFunds(draft.fundingGoal || 0);

  // Validation status summary
  const validationItems = [
    {
      step: 1 as DraftStep,
      label: 'Campaign Title',
      valid: Boolean(draft.title && draft.title.trim().length >= 5),
      detail: draft.title || 'Required (at least 5 characters)',
    },
    {
      step: 1 as DraftStep,
      label: 'Category & Creator',
      valid: Boolean(draft.category && draft.creatorName?.trim()),
      detail: `${draft.category} • ${draft.creatorName || 'Missing creator name'}`,
    },
    {
      step: 1 as DraftStep,
      label: 'Short Summary',
      valid: Boolean(draft.summary && draft.summary.trim().length >= 10),
      detail: draft.summary ? `${draft.summary.slice(0, 45)}...` : 'Required',
    },
    {
      step: 2 as DraftStep,
      label: 'Story Content & Lede',
      valid: Boolean(draft.storyIntro && draft.storyIntro.trim().length >= 15),
      detail: draft.storyIntro ? `${draft.storySections.length} sections defined` : 'Missing introduction paragraph',
    },
    {
      step: 3 as DraftStep,
      label: 'Ad Visuals & Headline',
      valid: Boolean(draft.adHeadline && draft.coverImage),
      detail: draft.adHeadline || 'Requires headline and creative image',
    },
    {
      step: 4 as DraftStep,
      label: 'Targeting & Channels',
      valid: Boolean(draft.targetLocations.length > 0 && draft.distributionChannels.length > 0),
      detail: `${draft.targetLocations.length} locations • ${draft.distributionChannels.length} channels`,
    },
    {
      step: 5 as DraftStep,
      label: 'Funding Goal ($)',
      valid: Boolean(draft.fundingGoal && draft.fundingGoal >= 500),
      detail: draft.fundingGoal >= 500 ? formatCurrency(draft.fundingGoal) : 'Minimum goal is $500',
    },
    {
      step: 5 as DraftStep,
      label: 'Policy Certification',
      valid: Boolean(draft.policyAcknowledged),
      detail: draft.policyAcknowledged ? 'Certified' : 'Must acknowledge submission policy below',
    },
  ];

  const allValid = validationItems.every(i => i.valid);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Explicit Funding Goal Field (Required on Step 5) */}
      <View style={styles.fundingGoalCard}>
        <View style={styles.fundingGoalHeader}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <View>
            <Text style={styles.fundingGoalTitle}>Amplification Funding Goal (USD) *</Text>
            <Text style={styles.fundingGoalSub}>
              Enter the target media pool. This goal is set directly by the creator and is never auto-generated.
            </Text>
          </View>
        </View>

        <View style={styles.inputPrefixRow}>
          <Text style={styles.currencyPrefix}>$</Text>
          <TextInput
            style={[styles.fundingInput, errors.fundingGoal && styles.inputError]}
            placeholder="5000"
            keyboardType="number-pad"
            placeholderTextColor={colors.textTertiary}
            value={draft.fundingGoal ? String(draft.fundingGoal) : ''}
            onChangeText={handleFundingGoalChange}
          />
        </View>
        {errors.fundingGoal && <Text style={styles.errorText}>{errors.fundingGoal}</Text>}

        {/* Live Reach Calculator for this goal */}
        <View style={styles.fundsCalculationBox}>
          <View style={styles.calcMetricRow}>
            <View>
              <Text style={styles.calcImpressions}>≈ {formatMetricNumber(funds.impressions)}</Text>
              <Text style={styles.calcLabel}>Estimated Targeted Ad Views</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.calcReach}>≈ {formatMetricNumber(funds.uniqueReach)}</Text>
              <Text style={styles.calcLabel}>Estimated Unique Citizens</Text>
            </View>
          </View>

          <View style={styles.calcDivider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownText}>Direct Advertising Media Spend (95%):</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(funds.netMediaSpend)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownText}>Platform Operations & Escrow Fee (5%):</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(funds.platformFee)}</Text>
          </View>
        </View>
      </View>

      {/* 2. Review Recaps of All 4 Steps */}
      <Text style={styles.sectionHeader}>Campaign Review Summary</Text>

      {/* Recap 1: Basics */}
      <View style={styles.recapCard}>
        <View style={styles.recapTop}>
          <View style={styles.recapTagBadge}>
            <Text style={styles.recapTagText}>STEP 1: BASICS</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateToStep(1)} style={styles.editBtn}>
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editText}>Edit Basics</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.recapTitle}>{draft.title || 'No title entered'}</Text>
        <Text style={styles.recapMeta}>
          {draft.category} • By {draft.creatorName || 'Anonymous'}
        </Text>
        <Text style={styles.recapBody}>{draft.summary || 'No summary entered'}</Text>
      </View>

      {/* Recap 2: Story & Evidence */}
      <View style={styles.recapCard}>
        <View style={styles.recapTop}>
          <View style={styles.recapTagBadge}>
            <Text style={styles.recapTagText}>STEP 2: STORY & EVIDENCE</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateToStep(2)} style={styles.editBtn}>
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editText}>Edit Story</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.recapSubHeading}>
          {draft.storyHeadline || 'No article headline specified'}
        </Text>
        <Text style={styles.recapMeta}>
          {draft.storySections.length} Structured Sections • {draft.sources.length} Primary Sources Attached
        </Text>
        {draft.sources.length > 0 && (
          <View style={styles.sourcesMiniList}>
            {draft.sources.map(s => (
              <Text key={s.id} style={styles.sourceMiniItem} numberOfLines={1}>
                • {s.title} ({s.publisher || 'Verified document'})
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Recap 3: Ad Visuals */}
      <View style={styles.recapCard}>
        <View style={styles.recapTop}>
          <View style={styles.recapTagBadge}>
            <Text style={styles.recapTagText}>STEP 3: AD VISUALS</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateToStep(3)} style={styles.editBtn}>
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editText}>Edit Visuals</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adVisualRecapRow}>
          {draft.coverImage && (
            <Image source={{ uri: draft.coverImage }} style={styles.adRecapThumb} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.recapSubHeading}>{draft.adHeadline || draft.title}</Text>
            <Text style={styles.recapMeta}>CTA Button: "{draft.ctaText}"</Text>
            <Text style={styles.recapMeta}>Description: {draft.adDescription || draft.summary}</Text>
          </View>
        </View>
      </View>

      {/* Recap 4: Reach & Distribution */}
      <View style={styles.recapCard}>
        <View style={styles.recapTop}>
          <View style={styles.recapTagBadge}>
            <Text style={styles.recapTagText}>STEP 4: REACH & AUDIENCE</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateToStep(4)} style={styles.editBtn}>
            <Ionicons name="pencil" size={12} color={colors.primary} />
            <Text style={styles.editText}>Edit Reach</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.recapMeta}>
          Locations: {draft.targetLocations.join(', ')}
        </Text>
        <Text style={styles.recapMeta}>
          Audience Interests: {draft.audienceInterests.join(', ')}
        </Text>
        <Text style={styles.recapMeta}>
          Candidate Channels: {draft.distributionChannels.join(', ')}
        </Text>
        <Text style={styles.recapMeta}>
          Active Period: {draft.durationDays} Days
        </Text>
      </View>

      {/* 3. Refund & Unspent-Funds Policy Summary */}
      <TouchableOpacity
        onPress={() => setPolicyExpanded(!policyExpanded)}
        style={styles.policyAccordionHeader}
        activeOpacity={0.8}
      >
        <View style={styles.policyHeaderLeft}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.policyHeaderTitle}>Refund & Unspent Funds Escrow Policy</Text>
        </View>
        <Ionicons
          name={policyExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {policyExpanded && (
        <View style={styles.policyAccordionBody}>
          <Text style={styles.policyParagraph}>
            • <Text style={{ fontWeight: '700' }}>100% Escrow Protection:</Text> Backer contributions are locked into custodial escrow and are only released to third-party ad networks after claims are certified.
          </Text>
          <Text style={styles.policyParagraph}>
            • <Text style={{ fontWeight: '700' }}>Unspent Funds Return:</Text> If auction bids or distribution terms leave unspent funds upon campaign completion, balances are credited back to contributors according to platform rules.
          </Text>
          <Text style={styles.policyParagraph}>
            • <Text style={{ fontWeight: '700' }}>Full Transparency:</Text> Third-party advertising platform invoices and certified impression delivery logs are published directly to the campaign page.
          </Text>
        </View>
      )}

      {/* 4. Policy Acknowledgement Checkbox */}
      <TouchableOpacity
        onPress={() => onChange({ policyAcknowledged: !draft.policyAcknowledged })}
        style={[styles.checkboxContainer, errors.policy && styles.checkboxError]}
        activeOpacity={0.8}
      >
        <Ionicons
          name={draft.policyAcknowledged ? 'checkbox' : 'square-outline'}
          size={24}
          color={draft.policyAcknowledged ? colors.primary : colors.textTertiary}
        />
        <Text style={styles.checkboxLabel}>
          I confirm that all statements and claims in this campaign are supported by verifiable primary documentation, and I agree to the Universal Trust Standard (UUTS) review protocol. *
        </Text>
      </TouchableOpacity>
      {errors.policy && <Text style={styles.errorText}>{errors.policy}</Text>}

      {/* 5. Pre-Flight Validation Checklist */}
      <View style={styles.validationCard}>
        <Text style={styles.validationHeader}>Pre-Flight Submission Checklist</Text>
        {validationItems.map((item, idx) => (
          <View key={idx} style={styles.validationItem}>
            <Ionicons
              name={item.valid ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={item.valid ? colors.primary : colors.error}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.valItemTitle, !item.valid && styles.valItemTitleError]}>
                {item.label}
              </Text>
              <Text style={styles.valItemDetail} numberOfLines={1}>{item.detail}</Text>
            </View>
            {!item.valid && (
              <TouchableOpacity onPress={() => onNavigateToStep(item.step)} style={styles.fixBtn}>
                <Text style={styles.fixBtnText}>Fix in Step {item.step}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* 6. Primary Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          title="Preview Public Campaign Page"
          variant="secondary"
          size="lg"
          onPress={() => setShowPreviewModal(true)}
          fullWidth
          style={{ marginBottom: spacing.sm }}
        />

        <Button
          title="Submit Campaign for UUTS Review"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!allValid || submitting}
          onPress={onSubmitForReview}
          fullWidth
        />
      </View>

      {/* Full Campaign Preview Modal */}
      <CampaignPreviewModal
        visible={showPreviewModal}
        draft={draft}
        onClose={() => setShowPreviewModal(false)}
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

  // Funding Goal Card
  fundingGoalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  fundingGoalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fundingGoalTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  fundingGoalSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inputPrefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  currencyPrefix: {
    ...typography.headingLarge,
    color: colors.primary,
    marginRight: 6,
  },
  fundingInput: {
    flex: 1,
    ...typography.headingLarge,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // Funds calculation
  fundsCalculationBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  calcMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcImpressions: {
    ...typography.headingMedium,
    color: colors.primary,
  },
  calcReach: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  calcLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  breakdownValue: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },

  // Summaries
  sectionHeader: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  recapCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recapTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recapTagBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  recapTagText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  editText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  recapTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  recapSubHeading: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 2,
  },
  recapMeta: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: 4,
  },
  recapBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sourcesMiniList: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  sourceMiniItem: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
    lineHeight: 16,
  },
  adVisualRecapRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  adRecapThumb: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },

  // Policy Accordion
  policyAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  policyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  policyHeaderTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  policyAccordionBody: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  policyParagraph: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Validation
  validationCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  validationHeader: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  valItemTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  valItemTitleError: {
    color: colors.error,
  },
  valItemDetail: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  fixBtn: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  fixBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },

  // Actions
  actionsContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
});
