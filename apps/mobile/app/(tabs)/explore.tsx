import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SearchInput } from '../../components/ui/SearchInput';
import { CampaignCard } from '../../components/campaigns/CampaignCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { colors, typography, spacing, radii } from '../../theme';
import { api } from '../../services/api';
import { Campaign } from '../../types/campaign';

const CATEGORIES = [
  'All',
  'Civic',
  'Environment',
  'Health',
  'Consumer',
  'Economic Policy',
  'Education',
  'Community',
];

const SORT_OPTIONS = [
  { id: 'trending', label: 'Trending' },
  { id: 'nearly_funded', label: 'Nearly Funded' },
  { id: 'trust_score', label: 'Highest Trust (UUTS)' },
  { id: 'newest', label: 'Newest' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      setError(null);
      const items = await api.getCampaigns({
        category: selectedCategory,
        search: searchQuery,
        sort: selectedSort,
      });
      setCampaigns(items);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [selectedCategory, selectedSort]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      loadCampaigns();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaigns();
  };

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh} padded={true}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Campaigns</Text>
        <Text style={styles.subtitle}>
          Discover fact-checked advocacy campaigns seeking advertising amplification.
        </Text>
      </View>

      {/* Search Input */}
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search keywords, topics, or organizations..."
        style={styles.searchInput}
      />

      {/* Horizontal Category Chips */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map(category => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.7}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sorting & Filter Pill Row */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>SORT BY:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
          {SORT_OPTIONS.map(opt => {
            const isActive = selectedSort === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelectedSort(opt.id)}
                activeOpacity={0.7}
                style={[styles.sortPill, isActive && styles.sortPillActive]}
              >
                <Text style={[styles.sortText, isActive && styles.sortTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCount}>
          {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'} available
        </Text>
        <View style={styles.cpmBadge}>
          <Text style={styles.cpmBadgeText}>Avg $37 CPM benchmark</Text>
        </View>
      </View>

      {/* Feed Content */}
      {loading && !refreshing ? (
        <LoadingState message="Filtering verified campaigns..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCampaigns} />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No campaigns found"
          description={`We couldn't find any amplification campaigns matching "${searchQuery || selectedCategory}". Try adjusting your filters.`}
          actionTitle="Reset Filters"
          onActionPress={() => {
            setSelectedCategory('All');
            setSearchQuery('');
          }}
        />
      ) : (
        campaigns.map(campaign => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onPress={() => router.push(`/campaign/${campaign.id}`)}
          />
        ))
      )}
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
  searchInput: {
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  categoryTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Sort row
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sortLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  sortScroll: {
    gap: spacing.xs,
  },
  sortPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sortPillActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  sortText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  sortTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultsCount: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  cpmBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  cpmBadgeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
