import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import {
  useActivityNotificationsQuery,
  useMarkActivityReadMutation,
  useMarkAllActivitiesReadMutation,
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../../services/apiClient';

type FilterType = 'all' | 'unread' | 'milestones' | 'pledges' | 'system';

export default function ActivityCenterScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

  const { data: activityData, isLoading, refetch } = useActivityNotificationsQuery();
  const markReadMutation = useMarkActivityReadMutation();
  const markAllReadMutation = useMarkAllActivitiesReadMutation();

  const { data: preferences } = useNotificationPreferencesQuery();
  const updatePrefsMutation = useUpdateNotificationPreferencesMutation();

  const activities = activityData?.data || [];
  const unreadCount = activityData?.unreadCount || 0;

  // Filter activities
  const filteredActivities = activities.filter((act: any) => {
    if (activeFilter === 'unread') return !act.isRead;
    if (activeFilter === 'milestones') {
      return (
        act.eventType === 'FUNDING_MILESTONE_REACHED' ||
        act.eventType === 'FUNDING_GOAL_REACHED' ||
        act.eventType === 'PROMOTION_STARTED' ||
        act.eventType === 'CAMPAIGN_COMPLETED'
      );
    }
    if (activeFilter === 'pledges') {
      return (
        act.eventType === 'CONTRIBUTION_RECEIVED' ||
        act.eventType === 'CONTRIBUTION_FAILED'
      );
    }
    if (activeFilter === 'system') {
      return (
        act.eventType === 'CAMPAIGN_APPROVED' ||
        act.eventType === 'CAMPAIGN_SUBMITTED' ||
        act.eventType === 'CAMPAIGN_CHANGES_REQUESTED' ||
        act.eventType === 'CAMPAIGN_REJECTED'
      );
    }
    return true;
  });

  // Group by time periods: Today, Yesterday, Earlier This Week, Past Activity
  const groupedPeriods: { [period: string]: any[] } = {};
  filteredActivities.forEach((act: any) => {
    const period = act.period || 'Earlier';
    if (!groupedPeriods[period]) {
      groupedPeriods[period] = [];
    }
    groupedPeriods[period].push(act);
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'CONTRIBUTION_RECEIVED':
        return { name: 'wallet' as const, color: colors.primary, bg: colors.primarySurface };
      case 'FUNDING_MILESTONE_REACHED':
      case 'FUNDING_GOAL_REACHED':
        return { name: 'trophy' as const, color: colors.accentDark, bg: colors.accentSubtle };
      case 'CAMPAIGN_APPROVED':
        return { name: 'shield-checkmark' as const, color: colors.success, bg: colors.successSurface };
      case 'CAMPAIGN_SUBMITTED':
        return { name: 'paper-plane' as const, color: colors.primary, bg: colors.surfaceSubtle };
      case 'CAMPAIGN_CHANGES_REQUESTED':
        return { name: 'alert-circle' as const, color: colors.warning, bg: colors.warningSurface };
      case 'CAMPAIGN_REJECTED':
      case 'CONTRIBUTION_FAILED':
        return { name: 'close-circle' as const, color: colors.error, bg: colors.errorSurface };
      case 'PROMOTION_STARTED':
        return { name: 'megaphone' as const, color: colors.primary, bg: colors.primarySurface };
      case 'CAMPAIGN_COMPLETED':
        return { name: 'checkmark-circle' as const, color: colors.success, bg: colors.successSurface };
      default:
        return { name: 'notifications' as const, color: colors.primary, bg: colors.surfaceSubtle };
    }
  };

  const formatEventTitle = (eventType: string, metadata?: any) => {
    switch (eventType) {
      case 'CONTRIBUTION_RECEIVED':
        return 'Escrow Contribution Received';
      case 'FUNDING_MILESTONE_REACHED':
        return metadata?.title || `${metadata?.percentage || 50}% Funding Milestone Reached!`;
      case 'FUNDING_GOAL_REACHED':
        return 'Funding Goal Reached!';
      case 'CAMPAIGN_APPROVED':
        return 'Universal Trust Standard Approved';
      case 'CAMPAIGN_SUBMITTED':
        return 'Campaign Submitted for Review';
      case 'CAMPAIGN_CHANGES_REQUESTED':
        return 'Reviewer Feedback: Changes Requested';
      case 'CAMPAIGN_REJECTED':
        return 'Campaign Disqualified / Rejected';
      case 'CONTRIBUTION_FAILED':
        return 'Payment Simulation Failed';
      case 'PROMOTION_STARTED':
        return 'Advertising Distribution Live';
      case 'CAMPAIGN_COMPLETED':
        return 'Amplification Goal Completed';
      default:
        return eventType.replace(/_/g, ' ');
    }
  };

  const handleActivityPress = (act: any) => {
    // Mark as read
    if (!act.isRead) {
      markReadMutation.mutate(act.id);
    }

    // Deep link based on campaign and event type
    if (act.campaignId) {
      if (act.eventType === 'CAMPAIGN_COMPLETED') {
        router.push(`/campaign/${act.campaignId}/report`);
      } else if (act.eventType === 'PROMOTION_STARTED' || act.eventType === 'FUNDING_MILESTONE_REACHED') {
        router.push(`/campaign/${act.campaignId}/analytics`);
      } else {
        router.push(`/campaign/${act.campaignId}`);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with Title, Unread Count & Action Controls */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.headerTitle}>Activity Center</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadPillText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllBtn}
                  onPress={handleMarkAllRead}
                  disabled={markAllReadMutation.isPending}
                >
                  <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                  <Text style={styles.markAllBtnText}>Mark all read</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.settingsIconBtn}
                onPress={() => setPreferencesModalVisible(true)}
              >
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.headerSubtitle}>
            Real-time notifications for campaign approvals, escrow contributions, milestone thresholds, and distribution launches.
          </Text>
        </View>

        {/* Filter Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              All ({activities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'unread' && styles.filterChipActive]}
            onPress={() => setActiveFilter('unread')}
          >
            <Text style={[styles.filterText, activeFilter === 'unread' && styles.filterTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'milestones' && styles.filterChipActive]}
            onPress={() => setActiveFilter('milestones')}
          >
            <Text style={[styles.filterText, activeFilter === 'milestones' && styles.filterTextActive]}>
              Milestones
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'pledges' && styles.filterChipActive]}
            onPress={() => setActiveFilter('pledges')}
          >
            <Text style={[styles.filterText, activeFilter === 'pledges' && styles.filterTextActive]}>
              Contributions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'system' && styles.filterChipActive]}
            onPress={() => setActiveFilter('system')}
          >
            <Text style={[styles.filterText, activeFilter === 'system' && styles.filterTextActive]}>
              Review & Certs
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Activity Feed Grouped by Periods */}
        <View style={styles.feedContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Fetching activity stream...</Text>
            </View>
          ) : filteredActivities.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title="No notifications in this view"
              description="When campaigns receive escrow backing, reach funding milestones, or deploy ad flights, events appear here."
              actionTitle="Explore Active Campaigns"
              onActionPress={() => router.push('/(tabs)/explore')}
            />
          ) : (
            Object.entries(groupedPeriods).map(([period, items]) => (
              <View key={period} style={styles.periodGroup}>
                <Text style={styles.periodHeading}>{period.toUpperCase()}</Text>
                <View style={styles.activityList}>
                  {items.map((act: any) => {
                    const iconConfig = getEventIcon(act.eventType);
                    return (
                      <TouchableOpacity
                        key={act.id}
                        onPress={() => handleActivityPress(act)}
                        style={[styles.activityItem, !act.isRead && styles.activityItemUnread]}
                        activeOpacity={0.7}
                      >
                        {/* Unread indicator dot */}
                        {!act.isRead && <View style={styles.unreadDot} />}

                        <View style={[styles.activityIconBox, { backgroundColor: iconConfig.bg }]}>
                          <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
                        </View>

                        <View style={styles.activityContent}>
                          <Text style={styles.activityTitle}>
                            {formatEventTitle(act.eventType, act.metadata)}
                          </Text>

                          {act.metadata?.backerName && (
                            <Text style={styles.activitySub}>
                              Backer: {act.metadata.backerName} • Amount:{' '}
                              ${act.metadata.amount ? (act.metadata.amount / 100).toLocaleString('en-US') : ''}
                            </Text>
                          )}

                          {act.metadata?.totalRaised && (
                            <Text style={styles.activitySub}>
                              Total Raised: ${(act.metadata.totalRaised / 100).toLocaleString('en-US')}
                            </Text>
                          )}


                          {act.metadata?.feedback && (
                            <Text style={[styles.activitySub, { color: colors.textSecondary }]}>
                              "{act.metadata.feedback}"
                            </Text>
                          )}

                          {act.metadata?.reason && (
                            <Text style={[styles.activitySub, { color: colors.error }]}>
                              {act.metadata.reason}
                            </Text>
                          )}

                          <Text style={styles.activityTimestamp}>
                            {new Date(act.createdAt).toLocaleDateString()} at{' '}
                            {new Date(act.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>

                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Trust Proof Banner */}
        <View style={styles.proofCard}>
          <View style={styles.proofHeader}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.proofTitle}>Audited Public Interest Ad Distribution</Text>
          </View>
          <Text style={styles.proofBody}>
            Notifications represent immutable state events. When milestones are certified, verified impression telemetry is published to the public record.
          </Text>
        </View>
      </ScrollView>

      {/* Notification Preferences Modal */}
      <Modal
        visible={preferencesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPreferencesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderInfo}>
                <Ionicons name="notifications" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Notification Preferences</Text>
              </View>
              <TouchableOpacity onPress={() => setPreferencesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Customize which campaign events and community milestones notify you in real-time.
            </Text>

            <View style={styles.prefOptionRow}>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Funding Milestone Thresholds</Text>
                <Text style={styles.prefDesc}>Alert when campaigns reach 25%, 50%, 75%, and 100% of goal.</Text>
              </View>
              <Switch
                value={preferences?.milestoneAlerts !== false}
                onValueChange={val => updatePrefsMutation.mutate({ milestoneAlerts: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            <View style={styles.prefOptionRow}>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Contribution & Escrow Receipts</Text>
                <Text style={styles.prefDesc}>Notify when your simulated pledge is verified into escrow.</Text>
              </View>
              <Switch
                value={preferences?.contributionAlerts !== false}
                onValueChange={val => updatePrefsMutation.mutate({ contributionAlerts: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            <View style={styles.prefOptionRow}>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Moderation & Review Notices</Text>
                <Text style={styles.prefDesc}>Receive fact-checker approval and review feedback alerts.</Text>
              </View>
              <Switch
                value={preferences?.moderationAlerts !== false}
                onValueChange={val => updatePrefsMutation.mutate({ moderationAlerts: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            <View style={styles.prefOptionRow}>
              <View style={styles.prefTextContainer}>
                <Text style={styles.prefTitle}>Weekly Distribution Digest</Text>
                <Text style={styles.prefDesc}>Summary of total impressions delivered across followed campaigns.</Text>
              </View>
              <Switch
                value={preferences?.weeklyDigest === true}
                onValueChange={val => updatePrefsMutation.mutate({ weeklyDigest: val })}
                trackColor={{ false: colors.borderSubtle, true: colors.primary }}
              />
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setPreferencesModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  topHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.displayMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  unreadPill: {
    backgroundColor: colors.accentSubtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accentDark,
  },
  unreadPillText: {
    ...typography.labelSmall,
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  markAllBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  settingsIconBtn: {
    padding: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
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
  filterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.textInverse,
  },
  feedContainer: {
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
  periodGroup: {
    marginBottom: spacing.lg,
  },
  periodHeading: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: spacing.xs,
    marginLeft: 2,
  },
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    position: 'relative',
  },
  activityItemUnread: {
    backgroundColor: colors.primarySurface,
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activitySub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTimestamp: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 4,
    fontSize: 11,
  },
  proofCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  proofTitle: {
    ...typography.labelMedium,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  proofBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.cardHover,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  prefOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  prefTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  prefTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  prefDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
  },
  modalDoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  modalDoneBtnText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
