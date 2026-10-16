import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Avatar } from '../../components/ui/Avatar';
import { colors, typography, spacing, radii, shadows } from '../../theme';

import { useRouter } from 'expo-router';
import { useCampaignStore } from '../../services/campaignStore';
import { formatCurrency } from '../../lib/reachCalculator';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  badge,
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={styles.settingsRow}
  >
    <View style={styles.settingsIconBox}>
      <Ionicons name={icon} size={20} color={colors.primary} />
    </View>
    <View style={styles.settingsTextContainer}>
      <Text style={styles.settingsTitle}>{title}</Text>
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

export default function ProfileScreen() {
  const router = useRouter();
  const store = useCampaignStore();

  const savedIds = store.getSavedCampaignIds();
  const allCampaigns = store.getAllCampaigns();
  const savedCampaigns = allCampaigns.filter(c => savedIds.includes(c.id));

  const handleFeatureAlert = (title: string, info: string) => {
    Alert.alert(title, info, [{ text: 'OK' }]);
  };

  return (
    <ScreenContainer padded={true}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar
          name="Community Backer"
          size={72}
          source="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
          style={styles.avatarBorder}
        />
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>Community Backer</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.userRole}>Verified Citizen Advocate</Text>
          <View style={styles.trustScorePill}>
            <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
            <Text style={styles.trustScoreText}>UUTS Level: Gold Standard</Text>
          </View>
        </View>
      </View>

      {/* Impact Stats Card */}
      <View style={styles.impactCard}>
        <Text style={styles.impactCardTitle}>YOUR AMPLIFICATION IMPACT</Text>
        <View style={styles.impactStatsRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactNumber}>$185</Text>
            <Text style={styles.impactLabel}>Funded Ad Spend</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.impactStat}>
            <Text style={styles.impactNumber}>4,995</Text>
            <Text style={styles.impactLabel}>Estimated Reach</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.impactStat}>
            <Text style={styles.impactNumber}>6</Text>
            <Text style={styles.impactLabel}>Campaigns</Text>
          </View>
        </View>
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
            {savedCampaigns.map(camp => (
              <TouchableOpacity
                key={camp.id}
                onPress={() => router.push(`/campaign/${camp.id}`)}
                style={styles.savedCampaignRow}
                activeOpacity={0.7}
              >
                <View style={styles.savedIconCircle}>
                  <Ionicons name="bookmark" size={16} color={colors.primary} />
                </View>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedTitle} numberOfLines={1}>
                    {camp.title}
                  </Text>
                  <Text style={styles.savedMeta}>
                    {camp.category} • {formatCurrency(camp.raisedAmount)} of {formatCurrency(camp.targetAmount)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptySavedBox}>
            <Text style={styles.emptySavedText}>No saved campaigns yet. Bookmark campaigns while exploring to keep track of their progress.</Text>
          </View>
        )}
      </View>

      {/* Account Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Campaign & Trust Controls</Text>
        <View style={styles.settingsGroup}>
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
            icon="card-outline"
            title="Escrow & Payment Methods"
            subtitle="Manage funding sources and anonymous pledge settings"
            onPress={() =>
              handleFeatureAlert(
                'Escrow Settings',
                'Your pledges are held in third-party escrow until ad distribution milestones are certified.'
              )
            }
          />
        </View>
      </View>

      {/* General Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences & Information</Text>
        <View style={styles.settingsGroup}>
          <SettingsRow
            icon="notifications-outline"
            title="Notification Center"
            subtitle="Frequency of live impression alerts"
            onPress={() =>
              handleFeatureAlert('Notifications', 'Customize instant push vs weekly digest of impression delivery.')
            }
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="information-circle-outline"
            title="About Campaign Platform"
            subtitle="Version 1.0.0 (Hackathon Edition)"
            badge="v1.0"
            onPress={() =>
              handleFeatureAlert(
                'About Platform',
                'Campaigns is a public-interest advertising distribution platform designed for high-impact civic advocacy.'
              )
            }
          />
        </View>
      </View>

      {/* Platform Manifesto Footer */}
      <View style={styles.manifestoFooter}>
        <Text style={styles.manifestoText}>
          "Campaigns exists because direct donations fund internal overhead, whereas message amplification
          breaks through feed algorithms to reach minds that matter."
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  verifiedBadge: {
    marginTop: 2,
  },
  userRole: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    gap: 4,
  },
  trustScoreText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },

  // Impact Card
  impactCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  impactCardTitle: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  impactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactNumber: {
    ...typography.metricMedium,
    color: colors.primary,
  },
  impactLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },

  // Settings Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  settingsTextContainer: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  settingsTitle: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
  settingsSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  settingsBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
    marginRight: spacing.xs,
  },
  settingsBadgeText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 10,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 56,
  },
  // Saved Campaigns
  savedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  exploreLink: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  savedCardsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  savedCampaignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    minHeight: 52,
  },
  savedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  savedInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  savedTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  savedMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  emptySavedBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptySavedText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    lineHeight: 18,
  },

  // Manifesto Footer
  manifestoFooter: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  manifestoText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
