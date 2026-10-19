import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { CampaignFundingProgress } from '../../components/campaigns/CampaignFundingProgress';
import { EmptyState } from '../../components/ui/EmptyState';
import { useCreatorDashboardQuery, apiClient } from '../../services/apiClient';
import { formatCurrency } from '../../lib/reachCalculator';
import { useAuth } from '../../services/authContext';

type FilterTab = 'all' | 'drafts' | 'review' | 'funding' | 'promoting' | 'completed' | 'action_required';

export default function CreatorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [feedbackModalCampaign, setFeedbackModalCampaign] = useState<any | null>(null);

  const { data, isLoading, isError, refetch } = useCreatorDashboardQuery(user?.id);

  const overview = data?.overview || {
    totalCreated: 0,
    draftsCount: 0,
    underReviewCount: 0,
    availableForFundingCount: 0,
    promotingCount: 0,
    completedCount: 0,
    requiresActionCount: 0,
  };

  const campaigns = data?.data || [];
  const drafts = data?.drafts || [];

  // Filter campaigns & drafts based on active tab
  const getFilteredItems = () => {
    if (activeTab === 'drafts') {
      return { drafts, campaigns: [] };
    }

    let filteredCampaigns = campaigns;
    let filteredDrafts = drafts;

    if (activeTab === 'review') {
      filteredCampaigns = campaigns.filter((c: any) => c.status === 'SUBMITTED_FOR_REVIEW');
      filteredDrafts = [];
    } else if (activeTab === 'funding') {
      filteredCampaigns = campaigns.filter(
        (c: any) =>
          c.status === 'AVAILABLE_FOR_FUNDING' ||
          c.status === 'APPROVED' ||
          c.status === 'FUNDING_GOAL_REACHED'
      );
      filteredDrafts = [];
    } else if (activeTab === 'promoting') {
      filteredCampaigns = campaigns.filter(
        (c: any) => c.status === 'PROMOTING' || c.status === 'DISTRIBUTION_PREPARATION'
      );
      filteredDrafts = [];
    } else if (activeTab === 'completed') {
      filteredCampaigns = campaigns.filter((c: any) => c.status === 'COMPLETED');
      filteredDrafts = [];
    } else if (activeTab === 'action_required') {
      filteredCampaigns = campaigns.filter(
        (c: any) =>
          c.status === 'CHANGES_REQUESTED' ||
          c.status === 'REJECTED' ||
          c.status === 'CANCELLED' ||
          c.status === 'FAILED'
      );
      filteredDrafts = [];
    }

    return { campaigns: filteredCampaigns, drafts: activeTab === 'all' ? filteredDrafts : [] };
  };

  const { campaigns: filteredCampaigns, drafts: filteredDrafts } = getFilteredItems();
  const totalItemsCount = filteredCampaigns.length + filteredDrafts.length;

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE_FOR_FUNDING':
      case 'APPROVED':
        return { bg: colors.successSurface, text: colors.success, label: 'Available for Funding' };
      case 'FUNDING_GOAL_REACHED':
        return { bg: colors.accentSubtle, text: colors.primaryDark, label: 'Goal Reached' };
      case 'SUBMITTED_FOR_REVIEW':
        return { bg: colors.warningSurface, text: colors.warning, label: 'Under Review' };
      case 'CHANGES_REQUESTED':
        return { bg: colors.errorSurface, text: colors.error, label: 'Changes Requested' };
      case 'PROMOTING':
        return { bg: colors.primarySurface, text: colors.primary, label: 'Currently Promoting' };
      case 'DISTRIBUTION_PREPARATION':
        return { bg: colors.primarySurface, text: colors.primary, label: 'Prep for Distribution' };
      case 'COMPLETED':
        return { bg: colors.surfaceSubtle, text: colors.textSecondary, label: 'Completed' };
      case 'REJECTED':
        return { bg: colors.errorSurface, text: colors.error, label: 'Rejected' };
      case 'CANCELLED':
        return { bg: colors.surfaceSubtle, text: colors.textSecondary, label: 'Cancelled' };
      default:
        return { bg: colors.surfaceSubtle, text: colors.textSecondary, label: status.replace(/_/g, ' ') };
    }
  };

  const handleDeleteDraft = (draftId: string, title: string) => {
    Alert.alert(
      'Delete Draft',
      `Are you sure you want to permanently delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteDraft(draftId);
              refetch();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete draft.');
            }
          },
        },
      ]
    );
  };

  const handleShareCampaign = async (campaign: any) => {
    try {
      await Share.share({
        title: campaign.title,
        message: `Amplify this civic message: "${campaign.title}". Back targeted community advertising now! https://campaign-one-pearl.vercel.app/campaign/${campaign.slug || campaign.id}`,
      });
    } catch {}
  };

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Creator Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Creator Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Manage your message amplification campaigns, review distribution telemetry, and take required actions.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newCampaignButton}
            onPress={() => router.push('/create/manual')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.textInverse} />
            <Text style={styles.newCampaignButtonText}>New Campaign</Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stat Cards Grid */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionHeading}>LIFECYCLE OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, activeTab === 'all' && styles.statBoxActive]}>
              <Text style={styles.statNumber}>{overview.totalCreated}</Text>
              <Text style={styles.statLabel}>Total Created</Text>
            </View>
            <View style={[styles.statBox, activeTab === 'drafts' && styles.statBoxActive]}>
              <Text style={styles.statNumber}>{overview.draftsCount}</Text>
              <Text style={styles.statLabel}>Saved Drafts</Text>
            </View>
            <View style={[styles.statBox, activeTab === 'review' && styles.statBoxActive]}>
              <Text style={[styles.statNumber, { color: colors.warning }]}>{overview.underReviewCount}</Text>
              <Text style={styles.statLabel}>In Review</Text>
            </View>
            <View style={[styles.statBox, activeTab === 'funding' && styles.statBoxActive]}>
              <Text style={[styles.statNumber, { color: colors.success }]}>{overview.availableForFundingCount}</Text>
              <Text style={styles.statLabel}>Funding</Text>
            </View>
            <View style={[styles.statBox, activeTab === 'promoting' && styles.statBoxActive]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{overview.promotingCount}</Text>
              <Text style={styles.statLabel}>Promoting</Text>
            </View>
            <View style={[styles.statBox, activeTab === 'completed' && styles.statBoxActive]}>
              <Text style={styles.statNumber}>{overview.completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            {overview.requiresActionCount > 0 && (
              <View style={[styles.statBox, styles.statBoxAlert, activeTab === 'action_required' && styles.statBoxActive]}>
                <Text style={[styles.statNumber, { color: colors.error }]}>{overview.requiresActionCount}</Text>
                <Text style={[styles.statLabel, { color: colors.error }]}>Needs Action</Text>
              </View>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
              All ({overview.totalCreated})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'drafts' && styles.filterChipActive]}
            onPress={() => setActiveTab('drafts')}
          >
            <Text style={[styles.filterChipText, activeTab === 'drafts' && styles.filterChipTextActive]}>
              Drafts ({overview.draftsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'review' && styles.filterChipActive]}
            onPress={() => setActiveTab('review')}
          >
            <Text style={[styles.filterChipText, activeTab === 'review' && styles.filterChipTextActive]}>
              Under Review ({overview.underReviewCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'funding' && styles.filterChipActive]}
            onPress={() => setActiveTab('funding')}
          >
            <Text style={[styles.filterChipText, activeTab === 'funding' && styles.filterChipTextActive]}>
              Funding ({overview.availableForFundingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'promoting' && styles.filterChipActive]}
            onPress={() => setActiveTab('promoting')}
          >
            <Text style={[styles.filterChipText, activeTab === 'promoting' && styles.filterChipTextActive]}>
              Promoting ({overview.promotingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeTab === 'completed' && styles.filterChipActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.filterChipText, activeTab === 'completed' && styles.filterChipTextActive]}>
              Completed ({overview.completedCount})
            </Text>
          </TouchableOpacity>

          {overview.requiresActionCount > 0 && (
            <TouchableOpacity
              style={[
                styles.filterChip,
                styles.filterChipActionNeeded,
                activeTab === 'action_required' && styles.filterChipActive,
              ]}
              onPress={() => setActiveTab('action_required')}
            >
              <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 3 }} />
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.error },
                  activeTab === 'action_required' && styles.filterChipTextActive,
                ]}
              >
                Action Required ({overview.requiresActionCount})
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Campaign List */}
        <View style={styles.campaignsSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your campaign catalog...</Text>
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={44} color={colors.error} />
              <Text style={styles.errorTitle}>Failed to Load Dashboard</Text>
              <Text style={styles.errorSub}>Could not reach the campaign API service. Check connectivity and try again.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : totalItemsCount === 0 ? (
            <EmptyState
              icon="layers-outline"
              title="No campaigns in this view"
              description="You do not have any campaigns matching the selected status filter."
              actionTitle="Create a Campaign"
              onActionPress={() => router.push('/create/manual')}
            />
          ) : (
            <>
              {/* Drafts List */}
              {filteredDrafts.map((draft: any) => (
                <View key={draft.id} style={styles.campaignCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusBadge, { backgroundColor: colors.surfaceSubtle }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>
                          Draft • Step {draft.currentStep} of 5
                        </Text>
                      </View>
                      <Text style={styles.categoryBadge}>{draft.draftData?.category || 'General'}</Text>
                    </View>
                    <Text style={styles.campaignTitle}>{draft.title || 'Untitled Draft'}</Text>
                    <Text style={styles.campaignSnippet} numberOfLines={2}>
                      {draft.draftData?.summary || 'Draft campaign in progress. Resume editing to complete submission.'}
                    </Text>
                  </View>

                  <View style={styles.draftMetaRow}>
                    <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.cardTimestamp}>
                      Last updated {new Date(draft.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {/* Actions for Drafts */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPrimary]}
                      onPress={() => router.push('/create/manual')}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.textInverse} />
                      <Text style={styles.actionBtnPrimaryText}>Resume Creation</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => handleDeleteDraft(draft.id, draft.title)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                      <Text style={styles.actionBtnDangerText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Published & Moderated Campaigns */}
              {filteredCampaigns.map((camp: any) => {
                const badge = getStatusBadgeStyle(camp.status);
                return (
                  <View key={camp.id} style={styles.campaignCard}>
                    {/* Cover image if available */}
                    {camp.imageUrl && (
                      <Image source={{ uri: camp.imageUrl }} style={styles.cardImage} />
                    )}

                    <View style={styles.cardHeader}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <Text style={styles.categoryBadge}>{camp.category}</Text>
                      </View>

                      <Text style={styles.campaignTitle}>{camp.title}</Text>
                      {camp.tagLine ? (
                        <Text style={styles.campaignSnippet} numberOfLines={2}>
                          {camp.tagLine}
                        </Text>
                      ) : null}
                    </View>

                    {/* Reusable Funding Component for active/completed campaigns */}
                    {camp.status !== 'SUBMITTED_FOR_REVIEW' && camp.status !== 'REJECTED' && (
                      <View style={styles.fundingWrapper}>
                        <CampaignFundingProgress
                          raisedAmount={camp.raisedAmount}
                          targetAmount={camp.targetAmount}
                          backerCount={camp.backerCount}
                          daysLeft={camp.daysLeft}
                          estimatedImpressions={camp.estimatedImpressions}
                          compact={true}
                          showMilestones={false}
                          status={camp.status}
                        />
                      </View>
                    )}

                    {/* Action Needed Callout if changes requested */}
                    {camp.status === 'CHANGES_REQUESTED' && camp.moderationFeedback && (
                      <TouchableOpacity
                        style={styles.changesRequestedCallout}
                        onPress={() => setFeedbackModalCampaign(camp)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.calloutHeader}>
                          <Ionicons name="alert-circle" size={16} color={colors.error} />
                          <Text style={styles.calloutTitle}>Reviewer Feedback Available</Text>
                        </View>
                        <Text style={styles.calloutBody} numberOfLines={2}>
                          "{camp.moderationFeedback.feedback}"
                        </Text>
                        <Text style={styles.calloutAction}>Tap to inspect required modifications →</Text>
                      </TouchableOpacity>
                    )}

                    {/* Action Needed Callout if rejected */}
                    {camp.status === 'REJECTED' && camp.moderationFeedback && (
                      <View style={styles.rejectedCallout}>
                        <Ionicons name="close-circle" size={16} color={colors.error} />
                        <Text style={styles.rejectedText} numberOfLines={2}>
                          Reason: {camp.moderationFeedback.feedback}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons Row tailored to lifecycle state */}
                    <View style={styles.actionRow}>
                      {/* State: AVAILABLE_FOR_FUNDING or FUNDING_GOAL_REACHED */}
                      {(camp.status === 'AVAILABLE_FOR_FUNDING' || camp.status === 'FUNDING_GOAL_REACHED') && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => router.push(`/campaign/${camp.id}`)}
                          >
                            <Ionicons name="eye-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>View Live</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary]}
                            onPress={() => router.push(`/campaign/${camp.id}/analytics`)}
                          >
                            <Ionicons name="bar-chart-outline" size={16} color={colors.textInverse} />
                            <Text style={styles.actionBtnPrimaryText}>Analytics</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnGhost]}
                            onPress={() => handleShareCampaign(camp)}
                          >
                            <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </>
                      )}

                      {/* State: PROMOTING */}
                      {(camp.status === 'PROMOTING' || camp.status === 'DISTRIBUTION_PREPARATION') && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary]}
                            onPress={() => router.push(`/campaign/${camp.id}/analytics`)}
                          >
                            <Ionicons name="pulse" size={16} color={colors.textInverse} />
                            <Text style={styles.actionBtnPrimaryText}>Distribution Telemetry</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => router.push(`/campaign/${camp.id}`)}
                          >
                            <Ionicons name="eye-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>View Public Page</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* State: COMPLETED */}
                      {camp.status === 'COMPLETED' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary]}
                            onPress={() => router.push(`/campaign/${camp.id}/report`)}
                          >
                            <Ionicons name="document-text-outline" size={16} color={colors.textInverse} />
                            <Text style={styles.actionBtnPrimaryText}>Final Report</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => router.push(`/campaign/${camp.id}/analytics`)}
                          >
                            <Ionicons name="bar-chart-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>Analytics</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* State: CHANGES_REQUESTED */}
                      {camp.status === 'CHANGES_REQUESTED' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnPrimary]}
                            onPress={() => setFeedbackModalCampaign(camp)}
                          >
                            <Ionicons name="clipboard-outline" size={16} color={colors.textInverse} />
                            <Text style={styles.actionBtnPrimaryText}>Inspect Feedback</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => router.push('/create/manual')}
                          >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>Edit & Resubmit</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* State: SUBMITTED_FOR_REVIEW */}
                      {camp.status === 'SUBMITTED_FOR_REVIEW' && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnSecondary]}
                            onPress={() => router.push(`/campaign/${camp.id}`)}
                          >
                            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                            <Text style={styles.actionBtnSecondaryText}>View Submission</Text>
                          </TouchableOpacity>

                          <View style={styles.reviewPendingBadge}>
                            <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
                            <Text style={styles.reviewPendingText}>Fact-check in progress</Text>
                          </View>
                        </>
                      )}

                      {/* State: REJECTED */}
                      {camp.status === 'REJECTED' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnSecondary]}
                          onPress={() => setFeedbackModalCampaign(camp)}
                        >
                          <Ionicons name="information-circle-outline" size={16} color={colors.textPrimary} />
                          <Text style={styles.actionBtnSecondaryText}>View Disqualification Notice</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Moderation Feedback Modal */}
      {feedbackModalCampaign && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFeedbackModalCampaign(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Ionicons
                  name={feedbackModalCampaign.status === 'REJECTED' ? 'close-circle' : 'alert-circle'}
                  size={26}
                  color={colors.error}
                />
                <Text style={styles.modalTitle}>
                  {feedbackModalCampaign.status === 'REJECTED' ? 'Verification Rejection Notice' : 'Administrator Changes Requested'}
                </Text>
              </View>

              <Text style={styles.modalCampaignTitle}>{feedbackModalCampaign.title}</Text>

              <View style={styles.feedbackTextBox}>
                <Text style={styles.reviewerLabel}>
                  Review Decision: {feedbackModalCampaign.moderationFeedback?.reviewer || 'Platform Administrator'}
                </Text>
                <Text style={styles.feedbackBody}>
                  {feedbackModalCampaign.moderationFeedback?.feedback || 'No additional remarks provided.'}
                </Text>
              </View>

              <Text style={styles.modalGuidance}>
                {feedbackModalCampaign.status === 'REJECTED'
                  ? 'Campaigns that violate public interest or advertising truth-in-claims standards cannot be published. You may create a new public advocacy submission.'
                  : 'Please update your primary source documentation or claims narrative to satisfy verification criteria, then resubmit for certification.'}
              </Text>

              <View style={styles.modalActions}>
                {feedbackModalCampaign.status === 'CHANGES_REQUESTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary, { flex: 1 }]}
                    onPress={() => {
                      setFeedbackModalCampaign(null);
                      router.push('/create/manual');
                    }}
                  >
                    <Text style={styles.actionBtnPrimaryText}>Edit Campaign</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary, { flex: 1 }]}
                  onPress={() => setFeedbackModalCampaign(null)}
                >
                  <Text style={styles.actionBtnSecondaryText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  topHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerInfo: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  newCampaignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    alignSelf: 'flex-start',
    ...shadows.card,
  },
  newCampaignButtonText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '600',
  },
  overviewSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    ...shadows.card,
  },
  statBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  statBoxAlert: {
    borderColor: colors.errorSurface,
    backgroundColor: colors.errorSurface,
  },
  statNumber: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  filterTabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipActionNeeded: {
    borderColor: colors.error,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.textInverse,
  },
  campaignsSection: {
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.lg,
  },
  errorTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  errorSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  retryButtonText: {
    ...typography.labelMedium,
    color: colors.textInverse,
  },
  campaignCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceSubtle,
  },
  cardHeader: {
    padding: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  statusBadgeText: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  campaignTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  campaignSnippet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  fundingWrapper: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  draftMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardTimestamp: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  changesRequestedCallout: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.errorSurface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  calloutTitle: {
    ...typography.labelSmall,
    color: colors.error,
    fontWeight: '700',
  },
  calloutBody: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  calloutAction: {
    ...typography.labelSmall,
    color: colors.error,
    marginTop: 4,
    fontWeight: '600',
  },
  rejectedCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.errorSurface,
    borderRadius: radii.md,
  },
  rejectedText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    gap: 4,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnPrimaryText: {
    ...typography.labelMedium,
    color: colors.textInverse,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  actionBtnSecondaryText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  actionBtnDanger: {
    backgroundColor: colors.errorSurface,
  },
  actionBtnDangerText: {
    ...typography.labelMedium,
    color: colors.error,
    fontWeight: '600',
  },
  actionBtnGhost: {
    paddingHorizontal: spacing.sm,
  },
  reviewPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  reviewPendingText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.cardHover,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalCampaignTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  feedbackTextBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reviewerLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  feedbackBody: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  modalGuidance: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
