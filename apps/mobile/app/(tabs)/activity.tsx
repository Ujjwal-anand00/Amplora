import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors, typography, spacing, radii, shadows } from '../../theme';

export default function ActivityScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<'all' | 'ad_deployments' | 'receipts'>('all');

  return (
    <ScreenContainer padded={true}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Amplification Activity</Text>
        <Text style={styles.subtitle}>
          Track real-time ad placements, impression verification receipts, and campaign updates.
        </Text>
      </View>

      {/* Network Live Pulse Bar */}
      <View style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>NETWORK DISPATCH LIVE</Text>
          </View>
          <Text style={styles.pulseTime}>Updated 2m ago</Text>
        </View>
        <View style={styles.pulseStatsRow}>
          <View style={styles.pulseStat}>
            <Text style={styles.pulseNumber}>1,180,320</Text>
            <Text style={styles.pulseLabel}>Verified Impressions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.pulseStat}>
            <Text style={styles.pulseNumber}>94.2%</Text>
            <Text style={styles.pulseLabel}>Target Audience Match</Text>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setActiveFilter('all')}
          style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
            All Updates
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveFilter('ad_deployments')}
          style={[styles.filterChip, activeFilter === 'ad_deployments' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, activeFilter === 'ad_deployments' && styles.filterTextActive]}>
            Ad Deployments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveFilter('receipts')}
          style={[styles.filterChip, activeFilter === 'receipts' && styles.filterChipActive]}
        >
          <Text style={[styles.filterText, activeFilter === 'receipts' && styles.filterTextActive]}>
            Escrow Receipts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Empty State Notification Center */}
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="notifications-outline"
          title="No notification updates yet"
          description="When you back an amplification campaign, you'll receive audited receipts and screenshots of your funded ads running in live corridors."
          actionTitle="Explore Active Campaigns"
          onActionPress={() => router.push('/(tabs)/explore')}
        />
      </View>

      {/* Trust & Transparency Feature Info Card */}
      <View style={styles.proofCard}>
        <View style={styles.proofHeader}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          <Text style={styles.proofTitle}>Audited Proof of Ad Spend</Text>
        </View>
        <Text style={styles.proofBody}>
          Unlike traditional non-profits where operational funds vanish into administrative budgets,
          every cent backed on Campaigns is paired with third-party ad server impressions and billing receipts.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.displayLarge,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    lineHeight: 20,
  },

  // Live Pulse Card
  pulseCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  pulseTime: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  pulseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
  },
  pulseStat: {
    alignItems: 'center',
  },
  pulseNumber: {
    ...typography.metricMedium,
    color: colors.primary,
  },
  pulseLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  filterTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  emptyContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },

  // Proof Card
  proofCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.xl,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  proofTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  proofBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
