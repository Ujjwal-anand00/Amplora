import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft } from '../../types/draft';
import { calculateUseOfFunds, formatCurrency, formatMetricNumber } from '../../lib/reachCalculator';
import { Button } from '../ui/Button';

const SEEDED_LOCATIONS = [
  'United States (National)',
  'California',
  'Pacific Northwest',
  'New York Tri-State',
  'Texas',
  'Midwest Agricultural Corridors',
  'Florida & Southeast',
];

const SEEDED_INTERESTS = [
  'Environmental Policy',
  'Clean Energy',
  'Civic Accountability',
  'Public Health',
  'Consumer Protection',
  'Education Access',
  'Local Governance',
  'Science Literacy',
  'Independent Journalism',
];

const AVAILABLE_CHANNELS = [
  {
    name: 'Meta Targeted Newsfeeds',
    description: 'High-visibility feed placements targeted by geography and civic interest.',
  },
  {
    name: 'Google Search & Display Ads',
    description: 'Contextual placements when people search for relevant local issues.',
  },
  {
    name: 'Civic Journalism Ad Network',
    description: 'Independent local news sites and non-profit investigative publications.',
  },
  {
    name: 'Independent Audio & Podcast Pre-Rolls',
    description: 'Civic podcast sponsors and geo-fenced public audio distribution.',
  },
];

const DURATION_OPTIONS = [
  { days: 14, label: '14 Days', note: 'Rapid mobilization around urgent hearings or deadlines.' },
  { days: 30, label: '30 Days', note: 'Standard advocacy cycle to build awareness and sustained backing.' },
  { days: 45, label: '45 Days', note: 'Extended campaign for multi-district investigative briefings.' },
  { days: 60, label: '60 Days', note: 'Broad regional coalition building across legislative sessions.' },
  { days: 90, label: '90 Days', note: 'Comprehensive multi-phase initiative for systemic policy change.' },
];

interface Step4ReachProps {
  draft: CampaignDraft;
  onChange: (fields: Partial<CampaignDraft>) => void;
  errors?: Record<string, string>;
}

export function Step4Reach({ draft, onChange, errors = {} }: Step4ReachProps) {
  const [customLocation, setCustomLocation] = useState('');
  const [customInterest, setCustomInterest] = useState('');

  // Location handlers
  const handleToggleLocation = (loc: string) => {
    if (draft.targetLocations.includes(loc)) {
      if (draft.targetLocations.length > 1) {
        onChange({ targetLocations: draft.targetLocations.filter(l => l !== loc) });
      }
    } else {
      onChange({ targetLocations: [...draft.targetLocations, loc] });
    }
  };

  const handleAddCustomLocation = () => {
    const trimmed = customLocation.trim();
    if (trimmed && !draft.targetLocations.includes(trimmed)) {
      onChange({ targetLocations: [...draft.targetLocations, trimmed] });
      setCustomLocation('');
    }
  };

  const handleRemoveLocation = (loc: string) => {
    if (draft.targetLocations.length > 1) {
      onChange({ targetLocations: draft.targetLocations.filter(l => l !== loc) });
    }
  };

  // Interest handlers
  const handleToggleInterest = (interest: string) => {
    if (draft.audienceInterests.includes(interest)) {
      if (draft.audienceInterests.length > 1) {
        onChange({ audienceInterests: draft.audienceInterests.filter(i => i !== interest) });
      }
    } else {
      onChange({ audienceInterests: [...draft.audienceInterests, interest] });
    }
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !draft.audienceInterests.includes(trimmed)) {
      onChange({ audienceInterests: [...draft.audienceInterests, trimmed] });
      setCustomInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    if (draft.audienceInterests.length > 1) {
      onChange({ audienceInterests: draft.audienceInterests.filter(i => i !== interest) });
    }
  };

  // Channel handlers
  const handleToggleChannel = (channel: string) => {
    if (draft.distributionChannels.includes(channel)) {
      if (draft.distributionChannels.length > 1) {
        onChange({ distributionChannels: draft.distributionChannels.filter(c => c !== channel) });
      }
    } else {
      onChange({ distributionChannels: [...draft.distributionChannels, channel] });
    }
  };

  // Duration handler
  const handleSelectDuration = (days: number) => {
    onChange({ durationDays: days });
  };

  // Example Reach Calculation using currently planned goal or default $5,000 illustrative baseline
  const benchmarkAmount = draft.fundingGoal || 5000;
  const fundsBreakdown = calculateUseOfFunds(benchmarkAmount);
  const selectedDuration = DURATION_OPTIONS.find(d => d.days === draft.durationDays) || DURATION_OPTIONS[1];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Geographic Targeting */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Geographic Targeting *</Text>
        <Text style={styles.helperText}>Where should your message be delivered?</Text>

        {/* Selected Location Chips */}
        <View style={styles.chipsWrap}>
          {draft.targetLocations.map(loc => (
            <View key={loc} style={styles.activeChip}>
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={styles.activeChipText}>{loc}</Text>
              {draft.targetLocations.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveLocation(loc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Seeded Quick Select */}
        <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Recommended Location Presets:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {SEEDED_LOCATIONS.map(loc => {
            const isSelected = draft.targetLocations.includes(loc);
            return (
              <TouchableOpacity
                key={loc}
                onPress={() => handleToggleLocation(loc)}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                  {isSelected ? `✓ ${loc}` : `+ ${loc}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom Location Input */}
        <View style={styles.customAddRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add custom city, county, or district..."
            placeholderTextColor={colors.textTertiary}
            value={customLocation}
            onChangeText={setCustomLocation}
          />
          <Button
            title="Add"
            variant="secondary"
            size="md"
            onPress={handleAddCustomLocation}
          />
        </View>
        {errors.targetLocations && <Text style={styles.errorText}>{errors.targetLocations}</Text>}
      </View>

      {/* 2. Audience Interests */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Audience Interests & Focus Areas *</Text>
        <Text style={styles.helperText}>Select characteristics and issues relevant to your intended audience.</Text>

        {/* Selected Interests Chips */}
        <View style={styles.chipsWrap}>
          {draft.audienceInterests.map(interest => (
            <View key={interest} style={styles.activeChip}>
              <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
              <Text style={styles.activeChipText}>{interest}</Text>
              {draft.audienceInterests.length > 1 && (
                <TouchableOpacity onPress={() => handleRemoveInterest(interest)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Seeded Interests */}
        <Text style={[styles.subLabel, { marginTop: spacing.sm }]}>Popular Civic Themes:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {SEEDED_INTERESTS.map(interest => {
            const isSelected = draft.audienceInterests.includes(interest);
            return (
              <TouchableOpacity
                key={interest}
                onPress={() => handleToggleInterest(interest)}
                style={[styles.presetChip, isSelected && styles.presetChipActive]}
              >
                <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                  {isSelected ? `✓ ${interest}` : `+ ${interest}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom Interest Input */}
        <View style={styles.customAddRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add specific interest or keyword..."
            placeholderTextColor={colors.textTertiary}
            value={customInterest}
            onChangeText={setCustomInterest}
          />
          <Button
            title="Add"
            variant="secondary"
            size="md"
            onPress={handleAddCustomInterest}
          />
        </View>
        {errors.audienceInterests && <Text style={styles.errorText}>{errors.audienceInterests}</Text>}
      </View>

      {/* 3. Proposed Distribution Channels */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Proposed Distribution Channels *</Text>
        <Text style={styles.helperText}>
          Where will the community ad pool buy placements? (Prototype candidate channels)
        </Text>

        <View style={styles.channelList}>
          {AVAILABLE_CHANNELS.map(ch => {
            const isSelected = draft.distributionChannels.includes(ch.name);
            return (
              <TouchableOpacity
                key={ch.name}
                onPress={() => handleToggleChannel(ch.name)}
                style={[styles.channelCard, isSelected && styles.channelCardActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isSelected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textTertiary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.channelName, isSelected && styles.channelNameActive]}>
                    {ch.name}
                  </Text>
                  <Text style={styles.channelDesc}>{ch.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Campaign Duration */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Campaign Duration *</Text>
        <Text style={styles.helperText}>How long will this amplification window remain active?</Text>

        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map(opt => {
            const isSelected = draft.durationDays === opt.days;
            return (
              <TouchableOpacity
                key={opt.days}
                onPress={() => handleSelectDuration(opt.days)}
                style={[styles.durationPill, isSelected && styles.durationPillActive]}
              >
                <Text style={[styles.durationText, isSelected && styles.durationTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.durationNote}>{selectedDuration.note}</Text>
      </View>

      {/* 5. Illustrative Reach & Budget Allocation Model */}
      <View style={styles.reachCard}>
        <View style={styles.reachHeader}>
          <Ionicons name="calculator" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reachTitle}>ILLUSTRATIVE AMPLIFICATION REACH</Text>
            <Text style={styles.reachSubtitle}>Based on benchmark $37 CPM ($1 ≈ 27 impressions)</Text>
          </View>
        </View>

        <View style={styles.metricBanner}>
          <View style={styles.metricColumn}>
            <Text style={styles.metricValue}>≈ {formatMetricNumber(fundsBreakdown.impressions)}</Text>
            <Text style={styles.metricLabel}>Projected Targeted Views</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricColumn}>
            <Text style={styles.metricValue}>≈ {formatMetricNumber(fundsBreakdown.uniqueReach)}</Text>
            <Text style={styles.metricLabel}>Estimated Unique Citizens</Text>
          </View>
        </View>

        {/* Use of Funds Breakdown */}
        <View style={styles.fundsBreakdown}>
          <Text style={styles.breakdownTitle}>Transparent Use-of-Funds Protocol:</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Direct Media Ad Placements (95%):</Text>
            <Text style={styles.breakdownVal}>{formatCurrency(fundsBreakdown.netMediaSpend)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Operations & Escrow Fee (5%):</Text>
            <Text style={styles.breakdownVal}>{formatCurrency(fundsBreakdown.platformFee)}</Text>
          </View>
        </View>

        <View style={styles.disclaimerPill}>
          <Ionicons name="information-circle-outline" size={14} color={colors.primaryLight} />
          <Text style={styles.disclaimerText}>
            Estimates are illustrative. Actual delivery varies with auction bids, targeting density, and CTR. Unspent funds are returned or credited in accordance with platform policy.
          </Text>
        </View>
      </View>
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
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },

  // Active Chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 6,
  },
  activeChipText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },

  // Preset Chips
  chipsScroll: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.xs,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  presetChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  customAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  // Channels
  channelList: {
    gap: spacing.xs,
    marginTop: 4,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  channelCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  channelName: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  channelNameActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  channelDesc: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: 4,
  },
  durationPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  durationPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  durationTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  durationNote: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Reach Model Card
  reachCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reachTitle: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  reachSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  metricBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  metricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.displayLarge,
    color: colors.primary,
    fontSize: 24,
  },
  metricLabel: {
    ...typography.labelSmall,
    color: colors.primaryLight,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderSubtle,
  },
  fundsBreakdown: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  breakdownTitle: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  breakdownVal: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  disclaimerPill: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
