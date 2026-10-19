import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, radii } from '../../theme';
import {
  useReviewQueueQuery,
} from '../../services/apiClient';
import { useAuth } from '../../services/authContext';
import { Ionicons } from '@expo/vector-icons';

const FILTER_TABS = [
  { key: 'ALL', label: 'All Reviews' },
  { key: 'PENDING', label: 'Pending Review' },
  { key: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

export default function ReviewQueueScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const {
    data: campaigns,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useReviewQueueQuery({
    status: selectedFilter,
    search: searchQuery,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return colors.success;
      case 'SUBMITTED_FOR_REVIEW':
        return colors.primary;
      case 'CHANGES_REQUESTED':
        return colors.warning;
      case 'REJECTED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'SUBMITTED_FOR_REVIEW':
        return 'Pending Review';
      case 'CHANGES_REQUESTED':
        return 'Changes Requested';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status.replace(/_/g, ' ');
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
            The Campaign Review Console is restricted exclusively to authenticated administrators. Please log in with your administrator account to access the review queue.
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Administrator Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Admin Review Dashboard</Text>
            <View style={styles.reviewerRoleBadge}>
              <View style={styles.reviewerRoleDot} />
              <Text style={styles.reviewerRoleText}>ADMIN</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Authoritative certification gate for community-funded amplification.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns or creators..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
          style={styles.filterScroll}
        >
          {FILTER_TABS.map(tab => {
            const isActive = selectedFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setSelectedFilter(tab.key)}
              >
                <Text
                  style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Campaign List */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading review pipeline...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load review queue.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !campaigns || campaigns.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>Queue Clean</Text>
            <Text style={styles.emptySubtitle}>
              No campaigns matching the selected filter currently require attention.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
          >
            {campaigns.map(item => {
              const statusColor = getStatusColor(item.status);
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusColor}20`, borderColor: statusColor },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {formatStatus(item.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.campaignTitle}>{item.title}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Creator:</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {item.creatorName} ({item.creatorType || 'Advocate'})
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Age:</Text>
                    <Text style={styles.metaValue}>
                      {item.ageDays > 0 ? `${item.ageDays}d ago` : `${item.ageHours || 0}h ago`} •{' '}
                      {item.sourceCount} primary source{item.sourceCount === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Funding Target:</Text>
                    <Text style={styles.metaValue}>
                      ${(item.targetAmount / 100).toLocaleString('en-US')}
                    </Text>

                  </View>

                  {/* Outstanding Requirements */}
                  {item.outstandingRequirements && item.outstandingRequirements.length > 0 ? (
                    <View style={styles.requirementsBox}>
                      <Text style={styles.requirementsHeader}>Outstanding Checks:</Text>
                      {item.outstandingRequirements.map((req: string, idx: number) => (
                        <View key={idx} style={styles.requirementRow}>
                          <Text style={styles.requirementBullet}>•</Text>
                          <Text style={styles.requirementText}>{req}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Action */}
                  <TouchableOpacity
                    style={styles.inspectBtn}
                    onPress={() => router.push(`/review/${item.id}` as any)}
                  >
                    <Text style={styles.inspectBtnText}>Inspect Campaign Dossier →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  reviewerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
  },
  reviewerRoleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    marginRight: 6,
  },
  reviewerRoleText: {
    ...typography.labelSmall,
    color: '#38bdf8',
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...typography.bodyMedium,
  },
  searchClearBtn: {
    position: 'absolute',
    right: spacing.xl,
    top: 10,
    padding: 4,
  },
  searchClearText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  filterScroll: {
    maxHeight: 46,
    marginBottom: spacing.xs,
  },
  filterPillsContainer: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  campaignTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 100,
  },
  metaValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  requirementsBox: {
    backgroundColor: colors.warningSurface,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  requirementsHeader: {
    ...typography.labelSmall,
    color: colors.warning,
    fontWeight: '700',
    marginBottom: 2,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  requirementBullet: {
    color: colors.warning,
    fontSize: 12,
    marginRight: 6,
  },
  requirementText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  inspectBtn: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  inspectBtnText: {
    ...typography.labelLarge,
    color: colors.primaryDark,
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
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  retryBtnText: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  emptyTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
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
