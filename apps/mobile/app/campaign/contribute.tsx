import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, touchTargets } from '../../theme';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { CampaignImage } from '../../components/ui/CampaignImage';
import { useCampaignStore } from '../../services/campaignStore';
import {
  apiClient,
  useFeePreviewQuery,
  useSimulateCheckoutMutation,
  useFollowCampaignMutation,
} from '../../services/apiClient';
import {
  calculateFeeBreakdown,
  formatCurrency,
  formatMetricNumber,
  calculateProgressPercentage,
  DEFAULT_REACH_CONFIG,
} from '../../lib/reachCalculator';

// Preset options in USD (in integer Dollars; converted to cents minor units for arithmetic)
const USD_PRESETS = [25, 50, 100, 250, 500];

type JourneyStep = 'CONTEXT' | 'AMOUNT' | 'REVIEW' | 'CHECKOUT' | 'CONFIRMATION';

export default function CampaignContributeScreen() {
  const params = useLocalSearchParams<{ campaignId: string; initialAmount?: string }>();
  const router = useRouter();
  const store = useCampaignStore();

  const campaignId = params.campaignId || '';
  const campaign = store.getCampaignById(campaignId);

  // Journey navigation state
  const [currentStep, setCurrentStep] = useState<JourneyStep>('CONTEXT');

  // Contribution state
  const [selectedPreset, setSelectedPreset] = useState<number>(100);
  const [customAmountText, setCustomAmountText] = useState<string>('');
  const [backerName, setBackerName] = useState<string>('Anonymous Citizen');
  const [backerEmail, setBackerEmail] = useState<string>('');
  const [supportNote, setSupportNote] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Active contribution references
  const [pendingReceiptRef, setPendingReceiptRef] = useState<string | null>(null);
  const [pendingContributionData, setPendingContributionData] = useState<any>(null);
  const [confirmedReceipt, setConfirmedReceipt] = useState<any>(null);

  // Simulated checkout state
  const [simulatedOutcome, setSimulatedOutcome] = useState<'SUCCEEDED' | 'PENDING' | 'REJECTED' | 'FAILED' | 'CANCELLED'>('SUCCEEDED');
  const [simulatedProvider, setSimulatedProvider] = useState<string>('simulated_card_pay');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // Follow campaign state
  const [isFollowed, setIsFollowed] = useState<boolean>(false);

  // Accordion state in context view
  const [expandedSection, setExpandedSection] = useState<'story' | 'sources' | 'audience' | 'funds' | null>(null);

  // Amount computation in integer minor units (cents)
  const effectiveDollars = useMemo(() => {
    if (customAmountText && customAmountText.trim().length > 0) {
      const parsed = parseInt(customAmountText, 10);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    return selectedPreset;
  }, [customAmountText, selectedPreset]);

  const effectiveMinorUnits = useMemo(() => effectiveDollars * 100, [effectiveDollars]);

  // Authoritative calculations
  const localFees = useMemo(() => {
    return calculateFeeBreakdown(effectiveMinorUnits, 'USD');
  }, [effectiveMinorUnits]);

  // Server authoritative preview query
  const { data: serverPreview } = useFeePreviewQuery(
    campaign?.id || '',
    effectiveMinorUnits,
    'USD'
  );

  const authoritativeFees = serverPreview?.breakdown || localFees;


  const checkoutMutation = useSimulateCheckoutMutation();
  const followMutation = useFollowCampaignMutation();

  // Campaign eligibility
  const isEligibleForFunding = useMemo(() => {
    if (!campaign) return false;
    const status = (campaign.status as string).toUpperCase();
    return (
      status === 'ACTIVE' ||
      status === 'AVAILABLE_FOR_FUNDING' ||
      status === 'FUNDING_GOAL_REACHED'
    );
  }, [campaign]);

  useEffect(() => {
    if (campaign) {
      apiClient.isCampaignFollowed(campaign.id).then(res => {
        if (res && res.followed) setIsFollowed(true);
      }).catch(() => {});
    }
  }, [campaign?.id]);

  if (!campaign) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorTitle}>Campaign Not Found</Text>
        <Text style={styles.errorSub}>The requested campaign could not be located in catalog.</Text>
        <Button
          title="Return to Discovery"
          onPress={() => router.back()}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.lg }}
        />
      </View>
    );
  }

  const progressPct = calculateProgressPercentage(campaign.raisedAmount, campaign.targetAmount);

  // Step 2 -> 3 Handler: Proceed to Review
  const handleProceedToReview = () => {
    if (effectiveDollars < 5) {
      Alert.alert('Invalid Contribution', 'The minimum contribution amount is $5.');
      return;
    }
    setCurrentStep('REVIEW');
  };

  // Step 3 -> 4 Handler: Initialize Pending Contribution on Backend
  const handleProceedToCheckout = async () => {
    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      const res = await apiClient.createContribution(campaign.id, {
        amount: effectiveMinorUnits,
        currency: 'USD',
        backerName: isAnonymous ? 'Anonymous Contributor' : backerName || 'Community Backer',
        backerEmail: backerEmail || undefined,
        isAnonymous,
        supportNote: supportNote || undefined,
      });


      if (res && res.receiptReference) {
        setPendingReceiptRef(res.receiptReference);
        setPendingContributionData(res.contribution);
        setCurrentStep('CHECKOUT');
      } else {
        throw new Error('Server did not return a valid payment reference.');
      }
    } catch (err: any) {
      const msg = err.message || 'Unable to register pending contribution. Please try again.';
      setCheckoutError(msg);
      Alert.alert('Checkout Initialization Failed', msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Step 4: Execute Deterministic Simulated Checkout
  const handleExecuteSimulatedPayment = async () => {
    if (!pendingReceiptRef) {
      Alert.alert('Error', 'Missing payment reference. Please return to review.');
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      const result = await checkoutMutation.mutateAsync({
        receiptReference: pendingReceiptRef,
        outcome: simulatedOutcome,
        simulatedProvider,
        campaignId: campaign.id,
      });

      if (simulatedOutcome === 'SUCCEEDED') {
        const receiptRes = await apiClient.getReceipt(pendingReceiptRef);
        setConfirmedReceipt(receiptRes.receipt || result.contribution);
        store.addContribution(campaign.id, effectiveDollars);
        setCurrentStep('CONFIRMATION');
      } else if (simulatedOutcome === 'PENDING') {
        Alert.alert(
          'Simulated Escrow Hold: Payment Pending',
          'The simulated payment provider returned a PENDING escrow status. Funds have not yet cleared. In accordance with platform safety rules, funding totals remain unchanged until clearance.',
          [{ text: 'Return to Campaign', onPress: () => router.push(`/campaign/${campaign.id}`) }]
        );
      } else if (simulatedOutcome === 'CANCELLED') {
        Alert.alert(
          'Payment Cancelled',
          'The simulated checkout was cancelled by the user. No funds were debited, and campaign totals remain unchanged.'
        );
      } else {
        const reason =
          simulatedOutcome === 'REJECTED'
            ? 'The simulated test card/account was declined by the issuer risk engine.'
            : 'Simulated payment processing network failure.';
        setCheckoutError(reason);
        Alert.alert('Payment Did Not Succeed', reason);
      }
    } catch (err: any) {
      const msg = err.message || 'Payment simulation failed.';
      setCheckoutError(msg);
      Alert.alert('Payment Error', msg);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleShareCampaign = async () => {
    try {
      const refText = confirmedReceipt?.receiptReference ? ` [Receipt: ${confirmedReceipt.receiptReference}]` : '';
      await Share.share({
        title: campaign.title,
        message: `I backed "${campaign.title}" to amplify important community facts beyond existing echo chambers!${refText} Check it out on Amplora.`,
      });
    } catch {}
  };

  const handleToggleFollow = async () => {
    try {
      const nextAction = isFollowed ? 'unfollow' : 'follow';
      await followMutation.mutateAsync({ campaignId: campaign.id, action: nextAction });
      setIsFollowed(!isFollowed);
      Alert.alert(
        nextAction === 'follow' ? 'Following Campaign' : 'Unfollowed Campaign',
        nextAction === 'follow'
          ? `You are now tracking "${campaign.title}". You will receive updates as funding milestones and ad impressions deliver.`
          : `You have unfollowed "${campaign.title}".`
      );
    } catch {
      setIsFollowed(!isFollowed);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle:
            currentStep === 'CONTEXT'
              ? 'Campaign Context'
              : currentStep === 'AMOUNT'
              ? 'Choose Contribution'
              : currentStep === 'REVIEW'
              ? 'Review Contribution'
              : currentStep === 'CHECKOUT'
              ? 'Simulated Checkout'
              : 'Contribution Confirmed',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { ...typography.headingSmall, color: colors.textPrimary },
        }}
      />

      {/* Journey Stepper Indicator */}
      <View style={styles.stepperContainer}>
        {(['CONTEXT', 'AMOUNT', 'REVIEW', 'CHECKOUT', 'CONFIRMATION'] as JourneyStep[]).map(
          (step, idx) => {
            const stepIndex = ['CONTEXT', 'AMOUNT', 'REVIEW', 'CHECKOUT', 'CONFIRMATION'].indexOf(currentStep);
            const isActive = idx === stepIndex;
            const isCompleted = idx < stepIndex;

            return (
              <View key={step} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepBullet,
                    isActive && styles.stepBulletActive,
                    isCompleted && styles.stepBulletCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                  ) : (
                    <Text
                      style={[
                        styles.stepBulletText,
                        isActive && styles.stepBulletTextActive,
                      ]}
                    >
                      {idx + 1}
                    </Text>
                  )}
                </View>
                {idx < 4 && (
                  <View
                    style={[
                      styles.stepLine,
                      idx < stepIndex && styles.stepLineCompleted,
                    ]}
                  />
                )}
              </View>
            );
          }
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========================================================= */}
        {/* STEP 1: CAMPAIGN CONTEXT                                 */}
        {/* ========================================================= */}
        {currentStep === 'CONTEXT' && (
          <View style={styles.stepBlock}>
            <View style={styles.campaignHeaderCard}>
              <CampaignImage
                source={campaign.coverImage}
                category={campaign.category}
                style={styles.cardImage}
              />
              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{campaign.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isEligibleForFunding ? styles.statusBadgeActive : styles.statusBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isEligibleForFunding
                          ? styles.statusBadgeTextActive
                          : styles.statusBadgeTextInactive,
                      ]}
                    >
                      {campaign.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.creatorByline}>Created by {campaign.creator.name}</Text>

                {/* Progress bar */}
                <View style={styles.progressSection}>
                  <View style={styles.progressNumbersRow}>
                    <Text style={styles.progressRaised}>
                      {formatCurrency(campaign.raisedAmount, 'USD')} raised
                    </Text>
                    <Text style={styles.progressGoal}>
                      of {formatCurrency(campaign.targetAmount, 'USD')} goal
                    </Text>
                  </View>

                  <ProgressBar progress={progressPct} height={8} />
                  <View style={styles.progressMetaRow}>
                    <Text style={styles.progressPercentText}>{progressPct}% funded</Text>
                    <Text style={styles.progressReachText}>
                      Goal unlocks ≈ {formatMetricNumber((campaign as any).estimatedReach || Math.round(((campaign.targetAmount * 0.95) / 30) * 1000))} ad views
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Ineligible Warning */}
            {!isEligibleForFunding && (
              <View style={styles.ineligibleNoticeCard}>
                <Ionicons name="lock-closed" size={24} color={colors.warning} />
                <View style={styles.ineligibleNoticeTextContainer}>
                  <Text style={styles.ineligibleNoticeTitle}>Campaign Not Open for Backing</Text>
                  <Text style={styles.ineligibleNoticeBody}>
                    This campaign is currently in status "{campaign.status}". Only campaigns certified in active funding phases can accept community pool contributions.
                  </Text>
                </View>
              </View>
            )}

            {/* Context Exploratory Accordions */}
            <Text style={styles.sectionHeading}>Campaign Details & Verification</Text>

            {/* Accordion 1: Story */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandedSection(expandedSection === 'story' ? null : 'story')}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="newspaper-outline" size={20} color={colors.primary} />
                <Text style={styles.accordionTitle}>Campaign Story & Claims</Text>
              </View>
              <Ionicons
                name={expandedSection === 'story' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedSection === 'story' && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionText}>{campaign.summary}</Text>
                {((campaign.story?.sections || (campaign as any).storySections || []) as any[]).map((sec: any, idx: number) => (
                  <View key={idx} style={{ marginTop: spacing.sm }}>
                    <Text style={styles.storyHeading}>{sec.heading || sec.title}</Text>
                    <Text style={styles.accordionText}>
                      {sec.content || (sec.paragraphs ? sec.paragraphs.join('\n\n') : '')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Accordion 2: Primary Sources */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandedSection(expandedSection === 'sources' ? null : 'sources')}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
                <Text style={styles.accordionTitle}>
                  Supporting Evidence ({campaign.sources?.length || 0} Sources)
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'sources' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedSection === 'sources' && (
              <View style={styles.accordionBody}>
                {campaign.sources?.map((s, idx) => (
                  <View key={idx} style={styles.sourceItem}>
                    <Text style={styles.sourcePublisher}>{s.publisher}</Text>
                    <Text style={styles.sourceTitle}>{s.title}</Text>
                    <Text style={styles.sourceRelevance}>{(s as any).relevance || s.summary}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Accordion 3: Audience Targeting */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandedSection(expandedSection === 'audience' ? null : 'audience')}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <Text style={styles.accordionTitle}>Target Audience & Distribution</Text>
              </View>
              <Ionicons
                name={expandedSection === 'audience' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedSection === 'audience' && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionLabel}>Who will see the message:</Text>
                <Text style={styles.accordionText}>{campaign.targetAudience?.description}</Text>
                <Text style={[styles.accordionLabel, { marginTop: spacing.sm }]}>Geographic Focus:</Text>
                <Text style={styles.accordionText}>
                  {campaign.targetAudience?.locations?.join(', ') || 'Regional civic corridors'}
                </Text>
              </View>
            )}

            {/* Accordion 4: Use of Funds */}
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandedSection(expandedSection === 'funds' ? null : 'funds')}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="wallet-outline" size={20} color={colors.accent} />
                <Text style={styles.accordionTitle}>Use-of-Funds Custody Policy</Text>
              </View>
              <Ionicons
                name={expandedSection === 'funds' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedSection === 'funds' && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionText}>
                  • 95% of every rupee is deposited directly into advertising escrow for verified ad placement outside creator networks.
                </Text>
                <Text style={[styles.accordionText, { marginTop: spacing.xs }]}>
                  • 5% is allocated to platform custody, verification compliance, and independent reporting audit.
                </Text>
                <Text style={[styles.accordionText, { marginTop: spacing.xs }]}>
                  • Zero funds are disbursed to creators for personal compensation.
                </Text>
              </View>
            )}

            <View style={styles.bottomCtaContainer}>
              <Button
                title={isEligibleForFunding ? 'Continue to Choose Amount' : 'Funding Closed'}
                onPress={() => setCurrentStep('AMOUNT')}
                disabled={!isEligibleForFunding}
                variant="primary"
                size="lg"
                style={styles.fullWidthBtn}
              />
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 2: CHOOSE CONTRIBUTION AMOUNT                        */}
        {/* ========================================================= */}
        {currentStep === 'AMOUNT' && (
          <View style={styles.stepBlock}>
            <Text style={styles.stepTitle}>Select Your Contribution</Text>
            <Text style={styles.stepSubtitle}>
              Your contribution funds digital distribution to deliver verified facts to citizens outside existing social algorithms.
            </Text>

            {/* Presets in USD */}
            <Text style={styles.inputLabel}>Suggested Contributions (USD)</Text>
            <View style={styles.presetGrid}>
              {USD_PRESETS.map(amt => {
                const isSelected = selectedPreset === amt && !customAmountText;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                    onPress={() => {
                      setSelectedPreset(amt);
                      setCustomAmountText('');
                    }}
                  >
                    <Text style={[styles.presetAmountText, isSelected && styles.presetAmountTextActive]}>
                      ${amt.toLocaleString('en-US')}
                    </Text>
                    <Text style={[styles.presetSubText, isSelected && styles.presetSubTextActive]}>
                      ≈ {formatMetricNumber(Math.round(((amt * 0.95) / DEFAULT_REACH_CONFIG.assumedCPM) * 1000))} views
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Amount */}
            <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Or Enter a Custom Amount (USD)</Text>
            <View style={styles.customInputRow}>
              <Text style={styles.currencyPrefix}>$</Text>
              <TextInput
                style={styles.customTextInput}
                placeholder="e.g. 75"
                keyboardType="numeric"
                value={customAmountText}
                onChangeText={val => setCustomAmountText(val.replace(/[^0-9]/g, ''))}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {/* Live Calculation Card */}
            <View style={styles.liveCalculationCard}>
              <View style={styles.calcHeaderRow}>
                <Ionicons name="calculator-outline" size={20} color={colors.primary} />
                <Text style={styles.calcTitle}>Authoritative Reach Breakdown</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Contribution Amount:</Text>
                <Text style={styles.calcValue}>{formatCurrency(effectiveDollars, 'USD')}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Platform Escrow Fee (5%):</Text>
                <Text style={styles.calcValue}>
                  {formatCurrency(authoritativeFees.platformFeeMinor / 100, 'USD')}
                </Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Net Media Allocation (95%):</Text>
                <Text style={[styles.calcValue, { color: colors.primary, fontWeight: '700' }]}>
                  {formatCurrency(authoritativeFees.netMediaMinor / 100, 'USD')}
                </Text>
              </View>


              <View style={styles.calcDivider} />

              <View style={styles.calcHighlightRow}>
                <Ionicons name="eye-outline" size={24} color={colors.primary} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.impressionsHighlight}>
                    ≈ {formatMetricNumber(authoritativeFees.estimatedImpressions)} estimated impressions
                  </Text>
                  <Text style={styles.reachSubtext}>
                    Reaches an estimated {formatMetricNumber(authoritativeFees.estimatedUniqueReach)} unique citizens
                  </Text>
                </View>
              </View>
            </View>

            {/* Mandatory Disclaimers */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.disclaimerText}>
                  • This contribution strictly funds verified civic ad delivery; it is not a direct personal donation to the creator or cause.
                </Text>
                <Text style={[styles.disclaimerText, { marginTop: spacing.xs }]}>
                  • Estimated impressions represent ad exposures calculated against the $37.00 CPM benchmark. Actual impressions depend on real-time ad auction inventory, local competition, and audience performance.
                </Text>
              </View>
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonRow}>
              <Button
                title="Back"
                onPress={() => setCurrentStep('CONTEXT')}
                variant="outline"
                size="md"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Review Breakdown"
                onPress={handleProceedToReview}
                variant="primary"
                size="md"
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 3: REVIEW CONTRIBUTION                               */}
        {/* ========================================================= */}
        {currentStep === 'REVIEW' && (
          <View style={styles.stepBlock}>
            <Text style={styles.stepTitle}>Review Your Contribution</Text>
            <Text style={styles.stepSubtitle}>
              Please verify your payment and message distribution breakdown prior to simulated checkout.
            </Text>

            <View style={styles.reviewSummaryCard}>
              <Text style={styles.reviewCampaignTitle}>{campaign.title}</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contribution Amount</Text>
                <Text style={styles.reviewValue}>{formatCurrency(effectiveDollars, 'USD')}</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Platform Custody & Audit (5%)</Text>
                <Text style={styles.reviewValue}>
                  {formatCurrency(authoritativeFees.platformFeeMinor / 100, 'USD')}
                </Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Payment Processing Fee</Text>
                <Text style={[styles.reviewValue, { color: colors.success }]}>$0.00 (Waived for Demo)</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewTotalLabel}>Total Payment</Text>
                <Text style={styles.reviewTotalValue}>{formatCurrency(effectiveDollars, 'USD')}</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Direct Advertising Budget (95%)</Text>
                <Text style={[styles.reviewValue, { color: colors.primary, fontWeight: '700' }]}>
                  {formatCurrency(authoritativeFees.netMediaMinor / 100, 'USD')}
                </Text>
              </View>


              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Estimated Citizen Impressions</Text>
                <Text style={[styles.reviewValue, { fontWeight: '700' }]}>
                  ≈ {formatMetricNumber(authoritativeFees.estimatedImpressions)} views
                </Text>
              </View>
            </View>

            {/* Backer Attribution Options */}
            <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Backer Attribution</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your name or organization (optional)"
              value={backerName}
              onChangeText={setBackerName}
              placeholderTextColor={colors.textTertiary}
            />

            <TextInput
              style={[styles.textInput, { marginTop: spacing.sm }]}
              placeholder="Email address for receipt (optional)"
              keyboardType="email-address"
              value={backerEmail}
              onChangeText={setBackerEmail}
              placeholderTextColor={colors.textTertiary}
            />

            <TextInput
              style={[styles.textInput, { marginTop: spacing.sm, height: 70 }]}
              placeholder="Support note or civic motivation (max 250 characters)"
              multiline
              maxLength={250}
              value={supportNote}
              onChangeText={setSupportNote}
              placeholderTextColor={colors.textTertiary}
            />

            <TouchableOpacity
              style={styles.anonymousCheckboxRow}
              onPress={() => setIsAnonymous(!isAnonymous)}
            >
              <Ionicons
                name={isAnonymous ? 'checkbox' : 'square-outline'}
                size={22}
                color={isAnonymous ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.checkboxLabel}>Make my contribution anonymous in public backer logs</Text>
            </TouchableOpacity>

            {/* Refund & Cancellation Terms */}
            <View style={styles.policyCard}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.policyHeading}>Escrow & Cancellation Terms</Text>
                <Text style={styles.policyText}>
                  Contributions are held in simulated escrow custody. If a campaign is cancelled or does not pass distribution review, unspent ad allocation is refunded in full. Once digital ad flighting initiates, media allocations are non-refundable.
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <Button
                title="Change Amount"
                onPress={() => setCurrentStep('AMOUNT')}
                variant="outline"
                size="md"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title={isProcessingCheckout ? 'Initializing...' : 'Proceed to Checkout'}
                onPress={handleProceedToCheckout}
                disabled={isProcessingCheckout}
                variant="primary"
                size="md"
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 4: SIMULATED CHECKOUT                                */}
        {/* ========================================================= */}
        {currentStep === 'CHECKOUT' && (
          <View style={styles.stepBlock}>
            <View style={styles.demoBanner}>
              <Ionicons name="flask-outline" size={24} color={colors.accentDark} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.demoBannerTitle}>Deterministic Simulated Checkout</Text>
                <Text style={styles.demoBannerSub}>
                  Demonstration Payment Sandbox. No real money will be charged, and no real credit card or bank details are requested.
                </Text>
              </View>
            </View>

            <View style={styles.checkoutDetailsCard}>
              <Text style={styles.checkoutReferenceLabel}>Registered Contribution Reference:</Text>
              <Text style={styles.checkoutReferenceValue}>{pendingReceiptRef || 'PENDING-REGISTRATION'}</Text>
              <Text style={styles.checkoutAmountText}>
                Total Charge: {formatCurrency(effectiveDollars, 'USD')}
              </Text>

            </View>

            <Text style={styles.inputLabel}>Select Deterministic Test Outcome</Text>
            <Text style={styles.stepSubtitle}>
              Test how the application and backend state machine react to different payment gateway results:
            </Text>

            {/* Deterministic Outcome Selectors */}
            <View style={styles.outcomeOptions}>
              <TouchableOpacity
                style={[
                  styles.outcomeButton,
                  simulatedOutcome === 'SUCCEEDED' && styles.outcomeButtonSuccess,
                ]}
                onPress={() => setSimulatedOutcome('SUCCEEDED')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={simulatedOutcome === 'SUCCEEDED' ? colors.success : colors.textSecondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.outcomeTitle}>Successful Payment</Text>
                  <Text style={styles.outcomeSub}>
                    Simulates instant escrow clearance. Increases campaign funding and backer count.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeButton,
                  simulatedOutcome === 'PENDING' && styles.outcomeButtonPending,
                ]}
                onPress={() => setSimulatedOutcome('PENDING')}
              >
                <Ionicons
                  name="time"
                  size={20}
                  color={simulatedOutcome === 'PENDING' ? colors.warning : colors.textSecondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.outcomeTitle}>Pending Escrow Verification</Text>
                  <Text style={styles.outcomeSub}>
                    Simulates async clearance hold. Campaign funding does NOT increase while pending.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeButton,
                  simulatedOutcome === 'REJECTED' && styles.outcomeButtonError,
                ]}
                onPress={() => setSimulatedOutcome('REJECTED')}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={simulatedOutcome === 'REJECTED' ? colors.error : colors.textSecondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.outcomeTitle}>Rejected by Issuer</Text>
                  <Text style={styles.outcomeSub}>
                    Simulates bank refusal / insufficient test balance. Funding is not counted.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeButton,
                  simulatedOutcome === 'FAILED' && styles.outcomeButtonError,
                ]}
                onPress={() => setSimulatedOutcome('FAILED')}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={simulatedOutcome === 'FAILED' ? colors.error : colors.textSecondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.outcomeTitle}>Gateway Network Failure</Text>
                  <Text style={styles.outcomeSub}>
                    Simulates dropped connection. Prompts safe retry.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomeButton,
                  simulatedOutcome === 'CANCELLED' && styles.outcomeButtonWarning,
                ]}
                onPress={() => setSimulatedOutcome('CANCELLED')}
              >
                <Ionicons
                  name="ban"
                  size={20}
                  color={simulatedOutcome === 'CANCELLED' ? colors.textSecondary : colors.textSecondary}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.outcomeTitle}>Cancelled by User</Text>
                  <Text style={styles.outcomeSub}>
                    Simulates customer aborting payment dialog.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Test Payment Provider Selector */}
            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Simulated Provider Adapter</Text>
            <View style={styles.providerRow}>
              {[
                { id: 'simulated_upi_fastpay', label: 'UPI FastPay' },
                { id: 'simulated_netbanking_axis', label: 'NetBanking' },
                { id: 'simulated_rupay_direct', label: 'RuPay Card' },
              ].map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.providerChip,
                    simulatedProvider === p.id && styles.providerChipActive,
                  ]}
                  onPress={() => setSimulatedProvider(p.id)}
                >
                  <Text
                    style={[
                      styles.providerChipText,
                      simulatedProvider === p.id && styles.providerChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {checkoutError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorBannerText}>{checkoutError}</Text>
              </View>
            )}

            {/* Execute simulation button */}
            <View style={styles.buttonRow}>
              <Button
                title="Back to Review"
                onPress={() => setCurrentStep('REVIEW')}
                disabled={isProcessingCheckout}
                variant="outline"
                size="md"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title={isProcessingCheckout ? 'Simulating...' : `Test ${simulatedOutcome}`}
                onPress={handleExecuteSimulatedPayment}
                disabled={isProcessingCheckout}
                variant={simulatedOutcome === 'SUCCEEDED' ? 'primary' : 'outline'}
                size="md"
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* STEP 5: CONFIRMATION & RECEIPT                           */}
        {/* ========================================================= */}
        {currentStep === 'CONFIRMATION' && (
          <View style={styles.stepBlock}>
            <View style={styles.successCelebrationCard}>
              <View style={styles.successIconBubble}>
                <Ionicons name="checkmark-done-circle" size={54} color={colors.success} />
              </View>
              <Text style={styles.celebrationHeading}>Amplification Confirmed!</Text>
              <Text style={styles.celebrationSub}>
                Your contribution has been successfully pooled into campaign escrow to fund verified advertising distribution.
              </Text>
            </View>

            {/* Persisted Itemized Receipt */}
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                <Text style={styles.receiptTitle}>Official Contribution Receipt</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt Reference:</Text>
                <Text style={styles.receiptRefValue}>
                  {confirmedReceipt?.receiptReference || pendingReceiptRef}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Campaign:</Text>
                <Text style={[styles.receiptVal, { flex: 1, textAlign: 'right' }]}>
                  {campaign.title}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Contribution Amount:</Text>
                <Text style={styles.receiptVal}>{formatCurrency(effectiveDollars, 'USD')}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Platform Custody Fee (5%):</Text>
                <Text style={styles.receiptVal}>
                  {formatCurrency(authoritativeFees.platformFeeMinor / 100, 'USD')}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Net Media Ad Allocation (95%):</Text>
                <Text style={[styles.receiptVal, { color: colors.primary, fontWeight: '700' }]}>
                  {formatCurrency(authoritativeFees.netMediaMinor / 100, 'USD')}
                </Text>
              </View>


              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Estimated Impressions:</Text>
                <Text style={[styles.receiptVal, { fontWeight: '700' }]}>
                  ≈ {formatMetricNumber(authoritativeFees.estimatedImpressions)} views
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment Provider:</Text>
                <Text style={styles.receiptVal}>{simulatedProvider}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptDisclosureBox}>
                <Text style={styles.receiptDisclosureText}>
                  Simulated payment — no real money charged. Generated from persistent escrow ledger for demonstration and evaluation purposes.
                </Text>
              </View>
            </View>

            {/* Campaign Follow & Track Action */}
            <View style={styles.trackCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle}>Track Campaign Milestones</Text>
                <Text style={styles.trackSub}>
                  Follow this campaign to receive activity feed notifications when ad flighting begins and live impression audits publish.
                </Text>
              </View>
              <Button
                title={isFollowed ? 'Following' : 'Follow & Track'}
                onPress={handleToggleFollow}
                variant={isFollowed ? 'outline' : 'primary'}
                size="sm"
                style={{ marginLeft: spacing.sm }}
              />
            </View>

            {/* Actions: Share & Return */}
            <View style={styles.confirmationActions}>
              <Button
                title="Share Campaign"
                onPress={handleShareCampaign}
                variant="outline"
                size="md"
                style={{ marginBottom: spacing.sm }}
              />
              <Button
                title="Return to Campaign"
                onPress={() => router.push(`/campaign/${campaign.id}`)}
                variant="primary"
                size="md"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorSub: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBulletActive: {
    backgroundColor: colors.primary,
  },
  stepBulletCompleted: {
    backgroundColor: colors.success,
  },
  stepBulletText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  stepBulletTextActive: {
    color: colors.textInverse,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  stepBlock: {
    flex: 1,
  },
  stepTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  campaignHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    padding: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginRight: spacing.xs,
  },
  categoryBadgeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  statusBadgeActive: {
    backgroundColor: colors.successSurface,
  },
  statusBadgeInactive: {
    backgroundColor: colors.surfaceSubtle,
  },
  statusBadgeText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  statusBadgeTextActive: {
    color: colors.success,
  },
  statusBadgeTextInactive: {
    color: colors.textSecondary,
  },
  campaignTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  creatorByline: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressSection: {
    marginTop: spacing.xs,
  },
  progressNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressRaised: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  progressGoal: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressPercentText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressReachText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  ineligibleNoticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ineligibleNoticeTextContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  ineligibleNoticeTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: '#8D6E63',
  },
  ineligibleNoticeBody: {
    ...typography.bodySmall,
    color: '#5D4037',
    marginTop: 2,
  },
  sectionHeading: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.xs,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  accordionBody: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderSubtle,
  },
  accordionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  storyHeading: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sourceItem: {
    marginBottom: spacing.sm,
  },
  sourcePublisher: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  sourceTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sourceRelevance: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  accordionLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bottomCtaContainer: {
    marginTop: spacing.lg,
  },
  fullWidthBtn: {
    width: '100%',
  },
  inputLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  presetCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  presetAmountText: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  presetAmountTextActive: {
    color: colors.primary,
  },
  presetSubText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  presetSubTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  currencyPrefix: {
    ...typography.headingSmall,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  customTextInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  liveCalculationCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.md,
    ...shadows.card,
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calcTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  calcLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  calcValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  calcDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  calcHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  impressionsHighlight: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.primary,
  },
  reachSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  reviewSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  reviewCampaignTitle: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  reviewLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  reviewValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  reviewTotalLabel: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewTotalValue: {
    ...typography.headingSmall,
    fontWeight: '800',
    color: colors.primary,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  anonymousCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  policyCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  policyHeading: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  policyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  demoBannerTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: '#2E7D32',
  },
  demoBannerSub: {
    ...typography.bodySmall,
    color: '#388E3C',
    marginTop: 2,
  },
  checkoutDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  checkoutReferenceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  checkoutReferenceValue: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginVertical: 2,
  },
  checkoutAmountText: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  outcomeOptions: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  outcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  outcomeButtonSuccess: {
    borderColor: colors.success,
    backgroundColor: '#F1F8E9',
  },
  outcomeButtonPending: {
    borderColor: colors.warning,
    backgroundColor: '#FFFDE7',
  },
  outcomeButtonError: {
    borderColor: colors.error,
    backgroundColor: '#FFEBEE',
  },
  outcomeButtonWarning: {
    borderColor: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
  },
  outcomeTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  outcomeSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  providerChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
  },
  providerChipActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  providerChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  providerChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: {
    ...typography.bodySmall,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  successCelebrationCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
    marginBottom: spacing.md,
  },
  successIconBubble: {
    marginBottom: spacing.sm,
  },
  celebrationHeading: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  celebrationSub: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  receiptTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  receiptRefValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  receiptVal: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  receiptDisclosureBox: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.xs,
  },
  receiptDisclosureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  trackTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  trackSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmationActions: {
    marginTop: spacing.sm,
  },
});
