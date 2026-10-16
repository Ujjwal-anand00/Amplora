import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, touchTargets } from '../../theme';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { CampaignImage } from '../../components/ui/CampaignImage';
import { Avatar } from '../../components/ui/Avatar';
import { campaignStore, useCampaignStore } from '../../services/campaignStore';
import {
  calculateProgressPercentage,
  calculateRemainingAmount,
  calculateUseOfFunds,
  formatCurrency,
  formatMetricNumber,
  DEFAULT_REACH_CONFIG,
} from '../../lib/reachCalculator';
import { SupportingSource } from '../../types/campaign';

const PLEDGE_PRESETS = [10, 25, 50, 100];

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useCampaignStore();

  const campaign = store.getCampaignById(id || '');
  const isSaved = campaign ? store.isCampaignSaved(campaign.id) : false;

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    useOfFunds: true,
    audience: false,
    review: false,
  });

  // User feedback state
  const [feedbackAnswer, setFeedbackAnswer] = useState<'No' | 'Somewhat' | 'Yes' | null>(null);

  // Backing modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPledge, setSelectedPledge] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [backerName, setBackerName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [backingInProgress, setBackingInProgress] = useState<boolean>(false);

  if (!campaign) {
    return (
      <View style={styles.notFoundContainer}>
        <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.notFoundTitle}>Campaign not found</Text>
        <Text style={styles.notFoundSub}>This campaign may have expired or been removed from the demo catalog.</Text>
        <Button
          title="Back to Explore"
          onPress={() => router.back()}
          variant="primary"
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleShare = async () => {
    try {
      const message = `Check out this amplification campaign: "${campaign.title}". Help fund wider message distribution beyond existing echo chambers! https://campaign-one-pearl.vercel.app/campaign/${campaign.slug}`;
      await Share.share({
        title: campaign.title,
        message,
        url: `https://campaign-one-pearl.vercel.app/campaign/${campaign.slug}`,
      });
    } catch (err: any) {
      console.warn('Share error:', err);
    }
  };

  const handleBookmark = () => {
    const nowSaved = store.toggleBookmark(campaign.id);
    Alert.alert(
      nowSaved ? 'Campaign Saved' : 'Removed from Saved',
      nowSaved
        ? `"${campaign.title}" was added to your bookmarks.`
        : `"${campaign.title}" was removed from your bookmarks.`
    );
  };

  const handleOpenSource = async (source: SupportingSource) => {
    try {
      const supported = await Linking.canOpenURL(source.url);
      if (supported) {
        await Linking.openURL(source.url);
      } else {
        Alert.alert(
          'Source Record Preview',
          `Publisher: ${source.publisher} (${source.publishDate})\n\nTitle: ${source.title}\n\nSummary: ${source.summary}\n\nURL: ${source.url}`,
          [{ text: 'Close' }]
        );
      }
    } catch {
      Alert.alert(
        'Source Record Details',
        `Publisher: ${source.publisher}\n\n${source.summary}\n\nDocument Reference: ${source.url}`
      );
    }
  };

  const effectivePledge = customAmount ? parseFloat(customAmount) || 0 : selectedPledge;
  const pledgeCalculation = calculateUseOfFunds(effectivePledge);
  const percentage = calculateProgressPercentage(campaign.raisedAmount, campaign.targetAmount);
  const remainingFunding = calculateRemainingAmount(campaign.raisedAmount, campaign.targetAmount);
  const fundingBreakdown = calculateUseOfFunds(campaign.targetAmount);

  const handleBackCampaign = () => {
    if (effectivePledge < 1) {
      Alert.alert('Invalid Pledge', 'Minimum contribution amount is $1.00.');
      return;
    }

    setBackingInProgress(true);
    setTimeout(() => {
      store.addContribution(campaign.id, effectivePledge);
      setBackingInProgress(false);
      setModalVisible(false);
      Alert.alert(
        'Amplification Contribution Confirmed!',
        `Thank you! Your ${formatCurrency(effectivePledge)} pledge has been allocated to targeted ad spend, funding an estimated ${formatMetricNumber(pledgeCalculation.impressions)} impressions outside the creator's network.`,
        [{ text: 'Done' }]
      );
    }, 700);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Campaign Detail',
          headerTitleStyle: { ...typography.headingSmall, color: colors.textPrimary },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                onPress={handleBookmark}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.headerActionBtn}
                accessibilityLabel="Save campaign"
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isSaved ? colors.primary : colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShare}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.headerActionBtn}
                accessibilityLabel="Share campaign"
              >
                <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* 1. Cover Image with Caption */}
          <View style={styles.coverImageContainer}>
            <CampaignImage
              source={campaign.coverImage}
              category={campaign.category}
              style={styles.coverImage}
              borderRadius={0}
            />
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{campaign.category}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{campaign.status.replace('_', ' ')}</Text>
            </View>
          </View>
          {campaign.coverImageCaption && (
            <Text style={styles.coverCaption}>{campaign.coverImageCaption}</Text>
          )}

          {/* 2. Main Title and Creator Info */}
          <View style={styles.articleHeader}>
            <Text style={styles.title}>{campaign.title}</Text>
            <Text style={styles.tagLine}>{campaign.tagLine}</Text>

            {/* Creator Card */}
            <View style={styles.creatorCard}>
              <Avatar
                name={campaign.creator.name}
                source={campaign.creator.avatarUrl}
                size={44}
              />
              <View style={styles.creatorMeta}>
                <View style={styles.creatorNameRow}>
                  <Text style={styles.creatorName}>{campaign.creator.name}</Text>
                  {campaign.creator.isVerified && (
                    <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.creatorRole}>{campaign.creator.role}</Text>
                <Text style={styles.creatorLocation}>
                  {campaign.creator.type} • {campaign.creator.location}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Campaign Funding Summary Card */}
          <View style={styles.fundingSummaryCard}>
            <View style={styles.fundingTopRow}>
              <Text style={styles.fundingLabel}>AMPLIFICATION BUDGET</Text>
              <Text style={styles.demoTag}>Demo Estimates</Text>
            </View>

            <View style={styles.fundingMetricsRow}>
              <View>
                <Text style={styles.raisedAmount}>{formatCurrency(campaign.raisedAmount)}</Text>
                <Text style={styles.goalSub}>
                  pledged of {formatCurrency(campaign.targetAmount)} goal ({formatCurrency(remainingFunding)} needed)
                </Text>
              </View>
              <View style={styles.percentBox}>
                <Text style={styles.percentNumber}>{percentage}%</Text>
                <Text style={styles.timeSub}>{campaign.daysLeft} days left</Text>
              </View>
            </View>

            <ProgressBar
              progress={percentage}
              height={8}
              trackColor={colors.surfaceSubtle}
              fillColor={colors.primary}
              style={{ marginVertical: spacing.sm }}
            />

            {/* Estimated Reach at Goal */}
            <View style={styles.estimatedReachBanner}>
              <Ionicons name="megaphone" size={18} color={colors.primary} />
              <View style={styles.estimatedReachTextContainer}>
                <Text style={styles.estimatedReachHeading}>
                  ≈ {formatMetricNumber(fundingBreakdown.impressions)} Estimated Ad Impressions
                </Text>
                <Text style={styles.estimatedReachSub}>
                  At target funding, puts this message in front of ~{formatMetricNumber(fundingBreakdown.uniqueReach)} unique targeted citizens.
                </Text>
              </View>
            </View>

            <Button
              title="Back this Campaign"
              onPress={() => setModalVisible(true)}
              variant="primary"
              size="md"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </View>

          {/* 4. Editorial Story Article */}
          <View style={styles.storySection}>
            <Text style={styles.storyHeader}>The Campaign Story</Text>
            <Text style={styles.storyOverview}>{campaign.story.overview}</Text>

            {campaign.story.sections.map(section => (
              <View key={section.id} style={styles.storyBlock}>
                <Text style={styles.storySectionTitle}>{section.title}</Text>
                {section.paragraphs.map((p, idx) => (
                  <Text key={idx} style={styles.storyParagraph}>
                    {p}
                  </Text>
                ))}

                {/* Optional Stat Callout */}
                {section.statCallout && (
                  <View style={styles.statCalloutCard}>
                    <Text style={styles.statCalloutValue}>{section.statCallout.value}</Text>
                    <Text style={styles.statCalloutLabel}>{section.statCallout.label}</Text>
                    <Text style={styles.statCalloutContext}>{section.statCallout.context}</Text>
                  </View>
                )}

                {/* Optional Quote */}
                {section.quote && (
                  <View style={styles.quoteCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primaryLight} style={{ marginBottom: 4 }} />
                    <Text style={styles.quoteText}>"{section.quote.text}"</Text>
                    <Text style={styles.quoteAuthor}>— {section.quote.author}, {section.quote.title}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* 5. Supporting Sources Section */}
          <View style={styles.sourcesSection}>
            <View style={styles.sourcesHeaderRow}>
              <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
              <Text style={styles.sourcesHeaderTitle}>Supporting Documentation & Sources</Text>
            </View>
            <Text style={styles.sourcesDisclaimer}>
              Illustrative source records provided by the campaign creator. Tap to open or inspect document references.
            </Text>

            {campaign.sources.map(src => (
              <View key={src.id} style={styles.sourceCard}>
                <View style={styles.sourceMetaRow}>
                  <Text style={styles.sourcePublisher}>{src.publisher}</Text>
                  <Text style={styles.sourceDate}>{src.publishDate}</Text>
                </View>
                <Text style={styles.sourceTitle}>{src.title}</Text>
                <Text style={styles.sourceSummary}>{src.summary}</Text>
                <TouchableOpacity
                  onPress={() => handleOpenSource(src)}
                  style={styles.openSourceBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openSourceBtnText}>Open Source Document</Text>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 6. Expandable Accordion: Use of Funds */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              onPress={() => toggleSection('useOfFunds')}
              style={styles.accordionHeader}
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                <Text style={styles.accordionTitle}>Use of Funds & Escrow Policy</Text>
              </View>
              <Ionicons
                name={expandedSections.useOfFunds ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.useOfFunds && (
              <View style={styles.accordionContent}>
                <Text style={styles.accordionParagraph}>
                  Contributions pay strictly for advertising media distribution, not direct financial donations to the creator or organization.
                </Text>

                <View style={styles.breakdownTable}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Direct Media Ad Spend (95%)</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(fundingBreakdown.netMediaSpend)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Operations & Payment Processing (5%)</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(fundingBreakdown.platformFee)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.accordionNote}>
                  *Demo Policy: Funds remain held in escrow until ad creatives clear regulatory review. If ad distribution cannot proceed due to policy non-compliance, backers are refunded in full.
                </Text>
              </View>
            )}
          </View>

          {/* 7. Expandable Accordion: Audience & Distribution */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              onPress={() => toggleSection('audience')}
              style={styles.accordionHeader}
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="locate-outline" size={20} color={colors.primary} />
                <Text style={styles.accordionTitle}>Audience Targeting & Ad Channels</Text>
              </View>
              <Ionicons
                name={expandedSections.audience ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.audience && (
              <View style={styles.accordionContent}>
                <Text style={styles.metaSubLabel}>TARGET LOCATIONS</Text>
                <View style={styles.chipsRow}>
                  {campaign.targetAudience.locations.map((loc, i) => (
                    <View key={i} style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{loc}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.metaSubLabel, { marginTop: spacing.sm }]}>DISTRIBUTION CHANNELS</Text>
                <View style={styles.chipsRow}>
                  {campaign.adChannels.map((ch, i) => (
                    <View key={i} style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{ch}</Text>
                    </View>
                  ))}
                </View>

                <Text style={[styles.metaSubLabel, { marginTop: spacing.sm }]}>DEMOGRAPHICS & PROFILE</Text>
                <Text style={styles.accordionParagraph}>
                  {campaign.targetAudience.demographics} • Interests: {campaign.targetAudience.interests.join(', ')}
                </Text>

                <Text style={styles.accordionNote}>
                  *Distribution parameters may be refined during publisher review to maximize cost-effective reach. Reach figures are estimates and not guaranteed.
                </Text>
              </View>
            )}
          </View>

          {/* 8. Expandable Accordion: Review & Trust Standards */}
          <View style={styles.accordionCard}>
            <TouchableOpacity
              onPress={() => toggleSection('review')}
              style={styles.accordionHeader}
              activeOpacity={0.7}
            >
              <View style={styles.accordionTitleRow}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.accordionTitle}>Review Process & Disclosures</Text>
              </View>
              <Ionicons
                name={expandedSections.review ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSections.review && (
              <View style={styles.accordionContent}>
                <Text style={styles.accordionParagraph}>
                  Every campaign submitted to the platform undergoes checks to ensure claims have verifiable public sources, contain no hate speech, and adhere to commercial advertising guidelines.
                </Text>
                <Text style={styles.accordionNote}>
                  Advertising regulations mandate that all promoted posts clearly disclose the sponsoring community coalition and funding purpose.
                </Text>
              </View>
            )}
          </View>

          {/* 9. Feedback Component */}
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackQuestion}>
              Did this campaign's visuals and evidence encourage you to read more?
            </Text>
            <View style={styles.feedbackButtonsRow}>
              {(['No', 'Somewhat', 'Yes'] as const).map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setFeedbackAnswer(opt)}
                  style={[
                    styles.feedbackBtn,
                    feedbackAnswer === opt && styles.feedbackBtnActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.feedbackBtnText,
                      feedbackAnswer === opt && styles.feedbackBtnTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {feedbackAnswer && (
              <Text style={styles.feedbackAck}>
                Thank you for your feedback! (Recorded in demo state)
              </Text>
            )}
          </View>
        </ScrollView>

        {/* 10. Persistent Bottom Contribution Action Bar */}
        <View style={styles.persistentBottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarReach}>
              ≈ {impressionsPerDollar} views / $1.00
            </Text>
            <Text style={styles.bottomBarSub}>Help amplify this message</Text>
          </View>
          <Button
            title="Back this Campaign"
            onPress={() => setModalVisible(true)}
            variant="primary"
            size="md"
            style={styles.bottomBarBtn}
          />
        </View>

        {/* Backing Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Fund Message Amplification</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Select an amount to purchase targeted promotional impressions outside existing echo chambers.
              </Text>

              {/* Preset buttons */}
              <View style={styles.presetRow}>
                {PLEDGE_PRESETS.map(amt => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      setSelectedPledge(amt);
                      setCustomAmount('');
                    }}
                    style={[
                      styles.presetButton,
                      selectedPledge === amt && !customAmount && styles.presetButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetButtonText,
                        selectedPledge === amt && !customAmount && styles.presetButtonTextActive,
                      ]}
                    >
                      ${amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Amount */}
              <View style={styles.customAmountBox}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  value={customAmount}
                  onChangeText={val => setCustomAmount(val.replace(/[^0-9]/g, ''))}
                  placeholder="Custom amount"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.customInput}
                />
              </View>

              {/* Live Reach Preview */}
              <View style={styles.reachPreviewCard}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
                <View style={styles.reachPreviewTextContainer}>
                  <Text style={styles.reachPreviewHeading}>
                    Your {formatCurrency(effectivePledge)} pledge funds ≈{' '}
                    <Text style={{ fontWeight: '800' }}>
                      {formatMetricNumber(pledgeCalculation.impressions)} estimated impressions
                    </Text>
                  </Text>
                  <Text style={styles.reachPreviewDisclaimer}>
                    ({formatCurrency(pledgeCalculation.netMediaSpend)} net media spend + {formatCurrency(pledgeCalculation.platformFee)} fee)
                  </Text>
                </View>
              </View>

              {/* Backer Name */}
              <TextInput
                value={backerName}
                onChangeText={setBackerName}
                placeholder="Your name or organization (optional)"
                placeholderTextColor={colors.textTertiary}
                style={styles.nameInput}
              />

              {/* Anonymous Checkbox */}
              <TouchableOpacity
                onPress={() => setIsAnonymous(!isAnonymous)}
                style={styles.anonToggleRow}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isAnonymous ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.anonText}>Fund anonymously (hide name on public backer roster)</Text>
              </TouchableOpacity>

              <Button
                title={`Pledge ${formatCurrency(effectivePledge)} for Amplification`}
                onPress={handleBackCampaign}
                loading={backingInProgress}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const impressionsPerDollar = Math.round((1 / DEFAULT_REACH_CONFIG.assumedCPM) * 1000);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  notFoundTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  notFoundSub: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  headerActionBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  coverImageContainer: {
    width: '100%',
    height: 230,
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  coverCaption: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    fontStyle: 'italic',
  },
  articleHeader: {
    padding: spacing.md,
  },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    lineHeight: 34,
    marginBottom: spacing.xs,
  },
  tagLine: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },

  // Creator Card
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  creatorMeta: {
    flex: 1,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  creatorRole: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  creatorLocation: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },

  // Funding Summary Card
  fundingSummaryCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  fundingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  fundingLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  demoTag: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  fundingMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  raisedAmount: {
    ...typography.metricLarge,
    color: colors.textPrimary,
  },
  goalSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  percentBox: {
    alignItems: 'flex-end',
  },
  percentNumber: {
    ...typography.headingMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  timeSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  estimatedReachBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  estimatedReachTextContainer: {
    flex: 1,
  },
  estimatedReachHeading: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  estimatedReachSub: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Story Article
  storySection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  storyHeader: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  storyOverview: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  storyBlock: {
    marginBottom: spacing.md,
  },
  storySectionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  storyParagraph: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  statCalloutCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginVertical: spacing.sm,
  },
  statCalloutValue: {
    ...typography.metricLarge,
    color: colors.primary,
  },
  statCalloutLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  statCalloutContext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  quoteCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  quoteText: {
    ...typography.bodyMedium,
    color: colors.primaryDark,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    ...typography.labelSmall,
    color: colors.primary,
    marginTop: spacing.xs,
  },

  // Sources Section
  sourcesSection: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sourcesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  sourcesHeaderTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  sourcesDisclaimer: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  sourceCard: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  sourceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sourcePublisher: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  sourceDate: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
  },
  sourceTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: 4,
  },
  sourceSummary: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  openSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openSourceBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },

  // Accordion
  accordionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 52,
  },
  accordionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  accordionTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  accordionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  accordionParagraph: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  breakdownTable: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  breakdownValue: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  accordionNote: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 10,
    fontStyle: 'italic',
    lineHeight: 14,
    marginTop: 4,
  },
  metaSubLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  metaPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metaPillText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },

  // Feedback Component
  feedbackCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  feedbackQuestion: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  feedbackButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  feedbackBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 36,
    justifyContent: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  feedbackBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  feedbackBtnTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  feedbackAck: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  // Persistent Bottom Action Bar
  persistentBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.modal,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarReach: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  bottomBarSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  bottomBarBtn: {
    minWidth: 180,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 35, 31, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  modalSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.minTouchTarget,
  },
  presetButtonActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  presetButtonText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  presetButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  customAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    marginBottom: spacing.md,
    minHeight: touchTargets.minTouchTarget,
  },
  dollarSign: {
    ...typography.headingSmall,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  customInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  reachPreviewCard: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  reachPreviewTextContainer: {
    flex: 1,
  },
  reachPreviewHeading: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  reachPreviewDisclaimer: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 2,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    minHeight: touchTargets.minTouchTarget,
  },
  anonToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  anonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
});
