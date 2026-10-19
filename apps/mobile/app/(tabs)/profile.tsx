import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Avatar } from '../../components/ui/Avatar';
import { AmploraLogo } from '../../components/brand/AmploraLogo';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { useRouter } from 'expo-router';
import { useCampaignStore } from '../../services/campaignStore';
import { formatCurrency, formatMetricNumber } from '../../lib/reachCalculator';
import {
  useFollowedCampaignsQuery,
  useMyContributionsQuery,
  useCreatorDashboardQuery,
  useMyCampaignsQuery,
} from '../../services/apiClient';
import { useAuth, AuthUser } from '../../services/authContext';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
  destructive?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  destructive,
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={styles.settingsRow}
  >
    <View style={[styles.settingsIconBox, destructive && { backgroundColor: '#FEE2E2' }]}>
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.error : colors.primary}
      />
    </View>
    <View style={styles.settingsTextContainer}>
      <Text style={[styles.settingsTitle, destructive && { color: colors.error }]}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.settingsSubtitle}>{subtitle}</Text> : null}
    </View>
    {badge ? (
      <View style={styles.settingsBadge}>
        <Text style={styles.settingsBadgeText}>{badge}</Text>
      </View>
    ) : null}
    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
  </TouchableOpacity>
);

function formatStatusLabel(status: string): string {
  if (!status) return 'Active';
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED_FOR_REVIEW: 'Under Review',
    CHANGES_REQUESTED: 'Changes Requested',
    APPROVED: 'Approved',
    AVAILABLE_FOR_FUNDING: 'Available for Funding',
    FUNDING_GOAL_REACHED: 'Goal Reached',
    DISTRIBUTION_PREPARATION: 'In Preparation',
    PROMOTING: 'Promoting',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getStatusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'AVAILABLE_FOR_FUNDING':
    case 'FUNDING_GOAL_REACHED':
      return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
    case 'PROMOTING':
    case 'APPROVED':
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
    case 'SUBMITTED_FOR_REVIEW':
    case 'DISTRIBUTION_PREPARATION':
      return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    case 'CHANGES_REQUESTED':
      return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    case 'REJECTED':
    case 'CANCELLED':
      return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
    default:
      return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const store = useCampaignStore();
  const {
    user,
    isAuthenticated,
    isAdmin,
    isCreator,
    login,
    register,
    logout,
    updateProfile,
  } = useAuth();

  // Profile Edit Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditProfileModal = () => {
    if (!user) return;
    setEditName(user.name || '');
    setEditAvatarUrl(user.avatarUrl || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your display name.');
      return;
    }
    setIsSavingProfile(true);
    try {
      const res = await updateProfile({
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim() ? editAvatarUrl.trim() : null,
      });
      if (res.success) {
        setShowEditProfileModal(false);
        Alert.alert('Profile Updated', 'Your profile and avatar have been updated across all screens.');
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update profile.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Auth Form State (when logged out)
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const savedIds = store.getSavedCampaignIds();
  const allCampaigns = store.getAllCampaigns();
  const savedCampaigns = allCampaigns.filter(c => savedIds.includes(c.id));

  const { data: followedCampaigns = [] } = useFollowedCampaignsQuery();
  const { data: myContributions = [] } = useMyContributionsQuery();
  const { data: creatorDashboard } = useCreatorDashboardQuery(user?.id);
  const {
    data: myCampaigns = [],
    isLoading: isMyCampaignsLoading,
    error: myCampaignsError,
    refetch: refetchMyCampaigns,
  } = useMyCampaignsQuery(user?.id);

  const overview = creatorDashboard?.overview;

  const totalFundedMinor = myContributions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalReachFunded = myContributions.reduce((acc, curr) => acc + (curr.reachFunded || 0), 0);

  const handleFeatureAlert = (title: string, info: string) => {
    Alert.alert(title, info, [{ text: 'OK' }]);
  };

  const handleViewReceipt = (receipt: any) => {
    Alert.alert(
      'Contribution Receipt',
      `Reference: ${receipt.receiptReference}\nAmount: $${(receipt.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}\nStatus: ${receipt.paymentStatus}\nNet Ad Spend: $${(receipt.netMediaAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}\nEstimated Views: ${receipt.reachFunded?.toLocaleString('en-US') || 'N/A'}\nDate: ${new Date(receipt.createdAt).toLocaleDateString()}\n\nSimulated payment — no real money charged.`,
      [{ text: 'Close' }]
    );
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required.');
      return;
    }
    if (authMode === 'REGISTER' && !name.trim()) {
      setAuthError('Your full name or organization is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'LOGIN') {
        const res = await login(email, password);
        if (!res.success) {
          setAuthError(res.error || 'Invalid email or password.');
        }
      } else {
        const res = await register({ email, password, name });
        if (!res.success) {
          setAuthError(res.error || 'Registration failed. Please try a different email.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScreenContainer padded={true}>
      {/* 1. Logged Out Auth State */}
      {!isAuthenticated || !user ? (
        <View style={styles.authContainer}>
          <View style={styles.authHero}>
            <AmploraLogo variant="stacked" size="lg" showTagline={true} />
            <Text style={styles.authSubtitle}>
              Sign in to manage your campaigns, track live media distribution telemetry, and access verified contribution receipts.
            </Text>
          </View>



          {/* Auth Card */}
          <View style={styles.authCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'LOGIN' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('LOGIN');
                  setAuthError(null);
                }}
              >
                <Text style={[styles.authTabText, authMode === 'LOGIN' && styles.authTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, authMode === 'REGISTER' && styles.authTabActive]}
                onPress={() => {
                  setAuthMode('REGISTER');
                  setAuthError(null);
                }}
              >
                <Text style={[styles.authTabText, authMode === 'REGISTER' && styles.authTabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {authError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            {authMode === 'REGISTER' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name or Organization</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Elena Vance or Cascadia Coalition"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="name@organization.org"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimum 8 characters"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>



            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAuthSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'LOGIN' ? 'Sign In to Account' : 'Create Verified Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* 2. Authenticated Profile Experience */
        <View>
          {/* 1. Profile Header Card */}
          <View style={styles.profileHeader}>
            <View style={styles.profileTopRow}>
              <TouchableOpacity
                onPress={openEditProfileModal}
                activeOpacity={0.8}
                style={styles.avatarEditContainer}
                accessibilityLabel="Edit profile avatar"
              >
                <Avatar
                  name={user.name || 'User'}
                  source={user.avatarUrl}
                  size={68}
                  style={styles.avatarBorder}
                />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                    {user.name}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  </View>
                </View>

                <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
                  {user.email}
                </Text>

                <View style={styles.roleBadgeRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      user.role === 'ADMIN' && { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
                      user.role === 'CREATOR' && { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
                    ]}
                  >
                    <Ionicons
                      name={user.role === 'ADMIN' ? 'key' : 'megaphone'}
                      size={11}
                      color={user.role === 'ADMIN' ? '#92400E' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.roleBadgeText,
                        user.role === 'ADMIN' && { color: '#92400E' },
                        user.role === 'CREATOR' && { color: colors.primary },
                      ]}
                    >
                      {user.role} ACCOUNT
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Dedicated Action Button Row - Fits within card boundaries */}
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                onPress={openEditProfileModal}
                style={styles.editProfileBtn}
                activeOpacity={0.7}
                accessibilityLabel="Edit Profile"
              >
                <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutHeaderBtn}
                activeOpacity={0.7}
                accessibilityLabel="Log Out"
              >
                <Ionicons name="log-out-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.logoutHeaderBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Privileged Administrator Pipeline Banner */}
          {isAdmin ? (
            <TouchableOpacity
              style={styles.reviewerCard}
              onPress={() => router.push('/review/queue' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.reviewerHeader}>
                <View style={styles.reviewerPill}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
                  <Text style={styles.reviewerPillText}>ADMIN REVIEW CONSOLE</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#6D28D9" />
              </View>
              <Text style={styles.reviewerTitle}>Campaign Review & Factual Audit Queue</Text>
              <Text style={styles.reviewerSubtitle}>
                Inspect submitted civic campaigns awaiting factual citation verification and administrator approval.
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Creator Hub Action Card */}
          {isCreator ? (
            <TouchableOpacity
              style={styles.creatorBannerCard}
              onPress={() => router.push('/creator/dashboard')}
              activeOpacity={0.8}
            >
              <View style={styles.creatorBannerHeader}>
                <View style={styles.creatorBadge}>
                  <Ionicons name="megaphone" size={12} color={colors.textInverse} />
                  <Text style={styles.creatorBadgeText}>CREATOR HUB</Text>
                </View>
                <View style={styles.creatorBannerHeaderRight}>
                  <Text style={styles.creatorBannerLinkText}>Open Dashboard</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </View>

              <Text style={styles.creatorBannerTitle}>Creator Dashboard & Telemetry</Text>
              <Text style={styles.creatorBannerSubtitle}>
                {overview?.totalCreated
                  ? `Manage ${overview.totalCreated} campaigns (${overview.underReviewCount} in review, ${overview.availableForFundingCount} funding, ${overview.promotingCount} promoting)`
                  : 'Track review status, ad distribution metrics, and moderation feedback.'}
              </Text>

              <View style={styles.creatorBannerStatsRow}>
                <View style={styles.creatorBannerStat}>
                  <Text style={styles.creatorBannerStatVal}>{overview?.draftsCount || 0}</Text>
                  <Text style={styles.creatorBannerStatLab} numberOfLines={1}>Drafts</Text>
                </View>
                <View style={styles.statColDivider} />
                <View style={styles.creatorBannerStat}>
                  <Text style={[styles.creatorBannerStatVal, { color: colors.success }]}>
                    {overview?.availableForFundingCount || 0}
                  </Text>
                  <Text style={styles.creatorBannerStatLab} numberOfLines={1}>Funding</Text>
                </View>
                <View style={styles.statColDivider} />
                <View style={styles.creatorBannerStat}>
                  <Text style={[styles.creatorBannerStatVal, { color: colors.primary }]}>
                    {overview?.promotingCount || 0}
                  </Text>
                  <Text style={styles.creatorBannerStatLab} numberOfLines={1}>Promoting</Text>
                </View>
                <View style={styles.statColDivider} />
                <View style={styles.creatorBannerStat}>
                  <Text
                    style={[
                      styles.creatorBannerStatVal,
                      { color: (overview?.requiresActionCount || 0) > 0 ? colors.error : colors.textPrimary },
                    ]}
                  >
                    {overview?.requiresActionCount || 0}
                  </Text>
                  <Text style={styles.creatorBannerStatLab} numberOfLines={1}>Action</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Scoped My Campaigns (when authenticated) */}
          {isAuthenticated ? (
            <View style={styles.section}>
              <View style={styles.savedSectionHeader}>
                <Text style={styles.sectionTitle}>
                  My Authored Campaigns {isMyCampaignsLoading ? '' : `(${myCampaigns.length})`}
                </Text>
                {myCampaigns.length > 0 ? (
                  <TouchableOpacity onPress={() => router.push('/creator/dashboard')}>
                    <Text style={styles.exploreLink}>View all</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* 1. Loading State */}
              {isMyCampaignsLoading ? (
                <View style={styles.stateCard}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.stateText}>Loading your authored campaigns...</Text>
                </View>
              ) : myCampaignsError ? (
                /* 2. Error State */
                <View style={[styles.stateCard, styles.errorStateCard]}>
                  <Ionicons name="alert-circle-outline" size={28} color={colors.error} />
                  <Text style={styles.errorStateTitle}>Unable to load campaigns</Text>
                  <Text style={styles.errorStateSubtitle}>
                    {myCampaignsError instanceof Error ? myCampaignsError.message : 'A network error occurred while loading your campaigns.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => refetchMyCampaigns()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : myCampaigns.length === 0 ? (
                /* 3. Empty State */
                <View style={styles.emptyAuthoredCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="megaphone-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.emptyAuthoredTitle}>You haven't created any campaigns yet.</Text>
                  <Text style={styles.emptyAuthoredSubtitle}>
                    Launch your first civic amplification campaign to rally community backing and distribute verified public awareness ads.
                  </Text>
                  <TouchableOpacity
                    style={styles.createCampaignBtn}
                    onPress={() => router.push('/(tabs)/create')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.createCampaignBtnText}>Create Campaign</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* 4. Populated List */
                <View style={styles.savedCardsContainer}>
                  {myCampaigns.slice(0, 5).map((camp: any, idx: number) => {
                    const statusStyle = getStatusBadgeStyle(camp.status);
                    return (
                      <TouchableOpacity
                        key={camp.id}
                        onPress={() => router.push(`/campaign/${camp.id}`)}
                        style={[
                          styles.savedCampaignRow,
                          idx === Math.min(myCampaigns.length, 5) - 1 && styles.savedCampaignRowLast,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={styles.savedIconCircle}>
                          <Ionicons name="document-text" size={17} color={colors.primary} />
                        </View>
                        <View style={styles.savedInfo}>
                          <Text style={styles.savedTitle} numberOfLines={2}>
                            {camp.title}
                          </Text>
                          <View style={styles.savedMetaRow}>
                            <Text style={styles.savedMetaCategory} numberOfLines={1}>
                              {camp.category}
                            </Text>
                            <Text style={styles.savedMetaDot}>•</Text>
                            <View
                              style={[
                                styles.statusPill,
                                { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                              ]}
                            >
                              <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                                {formatStatusLabel(camp.status)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* Impact Stats Card */}
          <View style={styles.impactCard}>
            <Text style={styles.impactCardTitle}>YOUR AMPLIFICATION IMPACT</Text>
            <View style={styles.impactStatsRow}>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>
                  {totalFundedMinor > 0 ? formatCurrency(totalFundedMinor / 100) : '$0'}
                </Text>
                <Text style={styles.impactLabel} numberOfLines={1}>Funded Ad Spend</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>
                  {totalReachFunded > 0 ? formatMetricNumber(totalReachFunded) : '0'}
                </Text>
                <Text style={styles.impactLabel} numberOfLines={1}>Estimated Reach</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>{myContributions.length}</Text>
                <Text style={styles.impactLabel} numberOfLines={1}>Pledges</Text>
              </View>
            </View>
          </View>

          {/* Tracked & Followed Campaigns Section */}
          <View style={styles.section}>
            <View style={styles.savedSectionHeader}>
              <Text style={styles.sectionTitle}>
                Followed & Tracked Campaigns ({followedCampaigns.length})
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.exploreLink}>Discover</Text>
              </TouchableOpacity>
            </View>

            {followedCampaigns.length > 0 ? (
              <View style={styles.savedCardsContainer}>
                {followedCampaigns.map((camp: any, idx: number) => {
                  const statusStyle = getStatusBadgeStyle(camp.status);
                  return (
                    <TouchableOpacity
                      key={camp.id}
                      onPress={() => router.push(`/campaign/${camp.id}`)}
                      style={[
                        styles.savedCampaignRow,
                        idx === followedCampaigns.length - 1 && styles.savedCampaignRowLast,
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={styles.savedIconCircle}>
                        <Ionicons name="notifications" size={17} color={colors.primary} />
                      </View>
                      <View style={styles.savedInfo}>
                        <Text style={styles.savedTitle} numberOfLines={2}>
                          {camp.title}
                        </Text>
                        <View style={styles.savedMetaRow}>
                          <Text style={styles.savedMetaCategory} numberOfLines={1}>
                            {camp.category}
                          </Text>
                          <Text style={styles.savedMetaDot}>•</Text>
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                            ]}
                          >
                            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
                              {formatStatusLabel(camp.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptySavedBox}>
                <Text style={styles.emptySavedText}>
                  You are not tracking any campaigns yet. Follow campaigns while browsing to receive verified impression reports.
                </Text>
              </View>
            )}
          </View>

          {/* Contribution Receipts & History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              My Contribution Receipts ({myContributions.length})
            </Text>
            {myContributions.length > 0 ? (
              <View style={styles.savedCardsContainer}>
                {myContributions.map((c: any, idx: number) => (
                  <TouchableOpacity
                    key={c.id || c.receiptReference}
                    onPress={() => handleViewReceipt(c)}
                    style={[
                      styles.savedCampaignRow,
                      idx === myContributions.length - 1 && styles.savedCampaignRowLast,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.savedIconCircle, { backgroundColor: colors.primarySurface }]}>
                      <Ionicons name="receipt-outline" size={17} color={colors.primary} />
                    </View>
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedTitle} numberOfLines={1}>
                        {c.receiptReference} • {formatCurrency(c.amount / 100)}
                      </Text>
                      <Text style={styles.savedMeta} numberOfLines={1}>
                        Status: {formatStatusLabel(c.paymentStatus)} • {c.reachFunded ? `${c.reachFunded.toLocaleString('en-US')} views` : 'Pending'}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptySavedBox}>
                <Text style={styles.emptySavedText}>
                  No contributions recorded yet. Back an active campaign to receive an itemized proof receipt.
                </Text>
              </View>
            )}
          </View>

          {/* Saved Campaigns Section */}
          <View style={styles.section}>
            <View style={styles.savedSectionHeader}>
              <Text style={styles.sectionTitle}>Saved Campaigns ({savedCampaigns.length})</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.exploreLink}>Browse more</Text>
              </TouchableOpacity>
            </View>

            {savedCampaigns.length > 0 ? (
              <View style={styles.savedCardsContainer}>
                {savedCampaigns.map((camp, idx: number) => (
                  <TouchableOpacity
                    key={camp.id}
                    onPress={() => router.push(`/campaign/${camp.id}`)}
                    style={[
                      styles.savedCampaignRow,
                      idx === savedCampaigns.length - 1 && styles.savedCampaignRowLast,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.savedIconCircle}>
                      <Ionicons name="bookmark" size={17} color={colors.primary} />
                    </View>
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedTitle} numberOfLines={2}>
                        {camp.title}
                      </Text>
                      <Text style={styles.savedMeta} numberOfLines={1}>
                        {camp.category} • {formatCurrency(camp.raisedAmount)} of {formatCurrency(camp.targetAmount)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptySavedBox}>
                <Text style={styles.emptySavedText}>
                  No saved campaigns yet. Bookmark campaigns while exploring to keep track of their progress.
                </Text>
              </View>
            )}
          </View>

          {/* Account Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign & Trust Controls</Text>
            <View style={styles.settingsGroup}>
              {isAdmin ? (
                <>
                  <SettingsRow
                    icon="shield-outline"
                    title="Admin Review Console"
                    subtitle="Protected administrator queue to inspect, approve, request changes, or reject"
                    badge="Admin"
                    onPress={() => router.push('/review/queue' as any)}
                  />
                  <View style={styles.rowDivider} />
                </>
              ) : null}
              <SettingsRow
                icon="receipt-outline"
                title="Proof of Ad Spend Receipts"
                subtitle="View itemized platform invoices and ad placement proofs"
                onPress={() =>
                  handleFeatureAlert(
                    'Ad Spend Proofs',
                    'Itemized Google & Meta ad server delivery receipts are cryptographically anchored and accessible here.'
                  )
                }
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="shield-checkmark-outline"
                title="Universal Trust Standard (UUTS)"
                subtitle="Fact-checking criteria, methodologies & guidelines"
                onPress={() =>
                  handleFeatureAlert(
                    'UUTS Fact-Checking',
                    'Campaign claims require primary public source documentation and pass tripartite consensus before ad funds deploy.'
                  )
                }
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="notifications-outline"
                title="Notification Preferences"
                subtitle="Manage live distribution milestone and review alerts"
                onPress={() =>
                  handleFeatureAlert(
                    'Notifications',
                    'Real-time alerts for campaign approvals, milestones, and distribution updates are active.'
                  )
                }
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="log-out-outline"
                title="Sign Out"
                subtitle="Safely clear session credentials from this device"
                destructive={true}
                onPress={handleLogout}
              />
            </View>
          </View>
        </View>
      )}

      {/* Platform Manifesto Footer */}
      <View style={styles.manifestoFooter}>
        <Text style={styles.manifestoText}>
          "Campaigns exists because direct donations fund internal overhead, whereas message amplification
          breaks through feed algorithms to reach minds that matter."
        </Text>
      </View>

      {/* Profile & Avatar Edit Modal */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile & Avatar</Text>
              <TouchableOpacity
                onPress={() => setShowEditProfileModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Live Avatar Preview */}
              <View style={styles.previewContainer}>
                <Avatar
                  name={editName || 'User'}
                  source={editAvatarUrl.trim() ? editAvatarUrl.trim() : null}
                  size={84}
                  style={styles.previewAvatar}
                />
                <Text style={styles.previewHint}>
                  {editAvatarUrl.trim() ? 'Custom Photo Preview' : 'Initials Fallback Active'}
                </Text>
              </View>

              {/* Display Name Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.inputLabel}>Full Name or Organization</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Elena Vance"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Photo URL Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.inputLabel}>Profile Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={editAvatarUrl}
                  onChangeText={setEditAvatarUrl}
                  placeholder="https://... (Leave empty for initials)"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                />
              </View>

              {/* Quick Preset Avatars */}
              <Text style={styles.presetLabel}>Quick Presets:</Text>
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={[styles.presetChip, editAvatarUrl === '' && styles.presetChipActive]}
                  onPress={() => setEditAvatarUrl('')}
                >
                  <Text style={[styles.presetChipText, editAvatarUrl === '' && styles.presetChipTextActive]}>
                    Initials Only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    setEditAvatarUrl(
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                    )
                  }
                >
                  <Text style={styles.presetChipText}>Photo 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    setEditAvatarUrl(
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
                    )
                  }
                >
                  <Text style={styles.presetChipText}>Photo 2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() =>
                    setEditAvatarUrl(
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
                    )
                  }
                >
                  <Text style={styles.presetChipText}>Photo 3</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowEditProfileModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveText}>Save Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}


const styles = StyleSheet.create({
  // Auth Form Styles
  authContainer: {
    paddingVertical: spacing.md,
  },
  authHero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  authIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  authTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  authSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  authTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  authTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  authTabActive: {
    borderBottomColor: colors.primary,
  },
  authTabText: {
    ...typography.labelLarge,
    color: colors.textSecondary,
  },
  authTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  roleSelectRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleSelectBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleSelectBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  roleSelectBtnText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  roleSelectBtnTextActive: {
    color: colors.primary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 46,
    justifyContent: 'center',
  },
  submitBtnText: {
    ...typography.labelLarge,
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Authenticated Profile Styles
  // Authenticated Profile Styles
  profileHeader: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.primarySurface,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  userName: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: colors.primarySurface,
    borderRadius: radii.full,
    padding: 2,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  roleBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  // Reviewer Card
  reviewerCard: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#C084FC',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  reviewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reviewerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  reviewerPillText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  reviewerTitle: {
    ...typography.headingSmall,
    color: '#581C87',
    fontSize: 16,
    marginBottom: 4,
  },
  reviewerSubtitle: {
    ...typography.bodySmall,
    color: '#6B21A8',
    lineHeight: 18,
  },

  // Creator Banner
  creatorBannerCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  creatorBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  creatorBannerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorBannerLinkText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  creatorBadgeText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 10,
  },
  creatorBannerTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  creatorBannerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  creatorBannerStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  creatorBannerStat: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  statColDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'center',
  },
  creatorBannerStatVal: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 16,
  },
  creatorBannerStatLab: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Impact Card
  impactCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  impactCardTitle: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  impactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactStat: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },
  impactNumber: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  impactLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    marginBottom: spacing.md,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 4,
  },
  sectionTitle: {
    ...typography.headingSmall,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs + 4,
  },
  exploreLink: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  savedCardsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  savedCampaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  savedCampaignRowLast: {
    borderBottomWidth: 0,
  },
  savedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  savedInfo: {
    flex: 1,
    marginRight: spacing.xs,
    minWidth: 0,
  },
  savedTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  savedMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  savedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  savedMetaCategory: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  savedMetaDot: {
    color: colors.textTertiary,
    fontSize: 10,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emptySavedBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    alignItems: 'center',
  },
  emptySavedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Settings
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    minHeight: 52,
  },
  settingsIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingsSubtitle: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsBadge: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accentDark,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginRight: spacing.xs,
  },
  settingsBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 52,
  },

  // Manifesto Footer
  manifestoFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  manifestoText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },

  // Avatar Edit Triggers & Badges
  avatarEditContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 40,
  },
  editProfileBtnText: {
    ...typography.labelMedium,
    fontWeight: '700',
    color: colors.primary,
  },
  logoutHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 40,
  },
  logoutHeaderBtnText: {
    ...typography.labelMedium,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Profile & Avatar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.md,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewAvatar: {
    marginBottom: 6,
  },
  previewHint: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  modalInputGroup: {
    marginBottom: spacing.sm + 4,
  },
  presetLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  presetChipText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  modalCancelText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    ...typography.labelMedium,
    color: colors.textInverse,
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  errorStateCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  errorStateTitle: {
    ...typography.headingSmall,
    color: colors.error,
    fontWeight: '700',
  },
  errorStateSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
    marginTop: spacing.xs,
  },
  retryButtonText: {
    ...typography.labelSmall,
    color: colors.textInverse,
    fontWeight: '700',
  },
  emptyAuthoredCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyAuthoredTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyAuthoredSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  createCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  createCampaignBtnText: {
    ...typography.labelMedium,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

