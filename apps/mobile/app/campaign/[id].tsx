import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, touchTargets } from '../../theme';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { api } from '../../services/api';
import { Campaign } from '../../types/campaign';

const PLEDGE_PRESETS = [10, 25, 50, 100];

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPledge, setSelectedPledge] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [backerName, setBackerName] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [backingInProgress, setBackingInProgress] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      api.getCampaignById(id)
        .then(data => setCampaign(data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading || !campaign) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState message="Loading campaign details..." />
      </View>
    );
  }

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : selectedPledge;
  const estimatedReachFromPledge = Math.round(effectiveAmount * (campaign.reachMultiplier || 27));

  const percentage = Math.min(
    Math.round((campaign.raisedAmount / (campaign.targetAmount || 1)) * 100),
    100
  );

  const handleBackCampaign = async () => {
    if (effectiveAmount < 1) {
      Alert.alert('Invalid Amount', 'Minimum amplification pledge is $1.');
      return;
    }

    setBackingInProgress(true);
    try {
      await api.backCampaign(campaign.id, effectiveAmount, backerName, isAnonymous);
      setModalVisible(false);
      Alert.alert(
        'Amplification Pledged!',
        `Thank you! Your $${effectiveAmount} contribution will put this message in front of an estimated ${estimatedReachFromPledge.toLocaleString()} targeted viewers outside existing echo chambers.`,
        [{ text: 'Great' }]
      );
      // Optimistically update
      setCampaign(prev =>
        prev
          ? {
              ...prev,
              raisedAmount: prev.raisedAmount + effectiveAmount,
              backerCount: prev.backerCount + 1,
            }
          : prev
      );
    } catch {
      Alert.alert('Error', 'Unable to complete pledge at this moment.');
    } finally {
      setBackingInProgress(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Campaign Amplification',
          headerTitleStyle: { ...typography.headingSmall, color: colors.textPrimary },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Hero Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: campaign.imageUrl }} style={styles.image} />
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{campaign.category}</Text>
            </View>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.trustBadgeText}>{campaign.trustScore} UUTS</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.body}>
            <Text style={styles.title}>{campaign.title}</Text>
            <Text style={styles.tagLine}>{campaign.tagLine}</Text>

            {/* Reach Equation Banner */}
            <View style={styles.reachBanner}>
              <View style={styles.reachIconBox}>
                <Ionicons name="megaphone" size={20} color={colors.primary} />
              </View>
              <View style={styles.reachBannerContent}>
                <Text style={styles.reachBannerTitle}>
                  ≈ {((campaign.targetAmount || 1) * 27).toLocaleString()} Projected Reach
                </Text>
                <Text style={styles.reachBannerDesc}>
                  Every $1 funds ~27 targeted impressions across selected ad networks.
                </Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
              <ProgressBar progress={percentage} height={8} />
              <View style={styles.metricsRow}>
                <View>
                  <Text style={styles.raisedAmount}>${campaign.raisedAmount.toLocaleString()}</Text>
                  <Text style={styles.targetLabel}>pledged of ${campaign.targetAmount.toLocaleString()} target</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.percentageText}>{percentage}%</Text>
                  <Text style={styles.backersCount}>{campaign.backerCount} advocates</Text>
                </View>
              </View>
            </View>

            {/* Target Audience & Channels */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Amplification Targeting Strategy</Text>
              <View style={styles.targetingRow}>
                <Ionicons name="locate-outline" size={18} color={colors.primary} />
                <View style={styles.targetingContent}>
                  <Text style={styles.targetingLabel}>Target Audience:</Text>
                  <Text style={styles.targetingValue}>{campaign.targetAudience}</Text>
                </View>
              </View>
              <View style={styles.targetingRow}>
                <Ionicons name="radio-outline" size={18} color={colors.primary} />
                <View style={styles.targetingContent}>
                  <Text style={styles.targetingLabel}>Distribution Corridors:</Text>
                  <View style={styles.channelChips}>
                    {campaign.adChannels?.map((channel, i) => (
                      <View key={i} style={styles.channelChip}>
                        <Text style={styles.channelChipText}>{channel}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Campaign Narrative */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Why This Message Needs Amplification</Text>
              <Text style={styles.narrativeText}>{campaign.narrative}</Text>
            </View>

            {/* Universal Trust Score Fact Check */}
            <View style={styles.trustCard}>
              <View style={styles.trustCardHeader}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <View>
                  <Text style={styles.trustCardTitle}>
                    Universal Trust Score: {campaign.trustScore}/100
                  </Text>
                  <Text style={styles.trustCardSub}>{campaign.trustCategory}</Text>
                </View>
              </View>
              <Text style={styles.trustCardBody}>
                All claims and citations have been cross-checked against verifiable public records.
                Ad spend is dispatched through auditable ad server placements.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Action Footer */}
        <View style={styles.stickyFooter}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerReach}>$1 ≈ 27 People</Text>
            <Text style={styles.footerSub}>Micro-fund distribution</Text>
          </View>
          <Button
            title="Fund Amplification"
            onPress={() => setModalVisible(true)}
            variant="primary"
            size="lg"
            style={styles.backButton}
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
                Select an amount to buy targeted impressions outside the creator's network.
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

              {/* Custom amount */}
              <View style={styles.customAmountBox}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  value={customAmount}
                  onChangeText={val => {
                    setCustomAmount(val.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="Custom amount"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.customInput}
                />
              </View>

              {/* Impact Calculation Preview */}
              <View style={styles.pledgeImpactBox}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
                <Text style={styles.pledgeImpactText}>
                  Your ${effectiveAmount || 0} pledge funds ≈{' '}
                  <Text style={styles.pledgeImpactBold}>
                    {estimatedReachFromPledge.toLocaleString()} targeted viewers
                  </Text>
                </Text>
              </View>

              {/* Optional Name */}
              <TextInput
                value={backerName}
                onChangeText={setBackerName}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.textTertiary}
                style={styles.nameInput}
              />

              {/* Anonymous Toggle */}
              <TouchableOpacity
                onPress={() => setIsAnonymous(!isAnonymous)}
                style={styles.anonRow}
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
                title={`Pledge $${effectiveAmount || 0} Toward Amplification`}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    height: 240,
    position: 'relative',
    backgroundColor: colors.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  trustBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    gap: 4,
  },
  trustBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
  },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagLine: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  reachBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  reachIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachBannerContent: {
    flex: 1,
  },
  reachBannerTitle: {
    ...typography.headingSmall,
    color: colors.primary,
  },
  reachBannerDesc: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  raisedAmount: {
    ...typography.metricLarge,
    color: colors.textPrimary,
  },
  targetLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  percentageText: {
    ...typography.metricMedium,
    color: colors.primary,
  },
  backersCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  targetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  targetingContent: {
    flex: 1,
  },
  targetingLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  targetingValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  channelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  channelChip: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  channelChipText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontSize: 11,
  },
  narrativeText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  trustCard: {
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  trustCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  trustCardTitle: {
    ...typography.headingSmall,
    color: colors.primary,
  },
  trustCardSub: {
    ...typography.bodySmall,
    color: colors.primaryLight,
  },
  trustCardBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Sticky Footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.modal,
  },
  footerInfo: {
    flex: 1,
  },
  footerReach: {
    ...typography.labelLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  footerSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  backButton: {
    minWidth: 180,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
  pledgeImpactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  pledgeImpactText: {
    ...typography.bodySmall,
    color: colors.primary,
    flex: 1,
  },
  pledgeImpactBold: {
    fontWeight: '700',
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
  anonRow: {
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
