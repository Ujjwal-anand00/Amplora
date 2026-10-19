import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { SearchInput } from '../../components/ui/SearchInput';
import { CampaignCard } from '../../components/campaigns/CampaignCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { FilterModal, FilterState } from '../../components/campaigns/FilterModal';
import { colors, typography, spacing, radii, touchTargets } from '../../theme';
import { useCampaignStore } from '../../services/campaignStore';
import { CampaignCategory } from '../../types/campaign';

const CATEGORIES: Array<'All' | CampaignCategory> = [
  'All',
  'Environment',
  'Health',
  'Science',
  'Education',
  'Public Policy',
  'Economic Policy',
  'Community',
  'Arts & Culture',
  'Business',
  'Other',
];

const SORT_OPTIONS: Array<{ id: 'recommended' | 'most_funded' | 'ending_soon' | 'newest'; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'most_funded', label: 'Most Funded' },
  { id: 'ending_soon', label: 'Ending Soon' },
  { id: 'newest', label: 'Recently Added' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const store = useCampaignStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<'recommended' | 'most_funded' | 'ending_soon' | 'newest'>('recommended');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    progressRange: 'all',
    category: 'All',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync category chip with filter modal
  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setFilters(prev => ({ ...prev, category: cat }));
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setSelectedCategory(newFilters.category);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.progressRange !== 'all') count++;
    if (filters.category !== 'All') count++;
    return count;
  }, [filters]);

  const filteredCampaigns = useMemo(() => {
    return store.filterAndSort({
      category: selectedCategory,
      search: searchQuery,
      sort: selectedSort,
      status: filters.status,
      progressRange: filters.progressRange,
    });
  }, [store, selectedCategory, searchQuery, selectedSort, filters]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setFilters({
      status: 'all',
      progressRange: 'all',
      category: 'All',
    });
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  return (
    <ScreenContainer refreshing={isRefreshing} onRefresh={onRefresh} padded={true}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Campaigns</Text>
        <Text style={styles.subtitle}>
          Discover community-backed advocacy campaigns seeking advertising distribution.
        </Text>
      </View>

      {/* 2. Controlled Search Bar */}
      <SearchInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search topics, creators, keywords, or locations..."
        onClear={() => setSearchQuery('')}
        style={styles.searchBar}
      />

      {/* 3. Horizontally Scrollable Category Chips */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                activeOpacity={0.7}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Sorting & Filter Controls Row */}
      <View style={styles.controlsRow}>
        {/* Filter Modal Trigger Button with Count Badge */}
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={[styles.filterTriggerBtn, activeFilterCount > 0 && styles.filterTriggerBtnActive]}
          activeOpacity={0.7}
          accessibilityLabel="Open campaign filters"
        >
          <Ionicons
            name="filter-outline"
            size={16}
            color={activeFilterCount > 0 ? colors.textInverse : colors.primary}
          />
          <Text
            style={[
              styles.filterTriggerText,
              activeFilterCount > 0 && styles.filterTriggerTextActive,
            ]}
          >
            Filters
          </Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Horizontal Sort Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScrollView}
          contentContainerStyle={styles.sortScroll}
        >
          {SORT_OPTIONS.map(opt => {
            const isActive = selectedSort === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setSelectedSort(opt.id)}
                activeOpacity={0.7}
                style={[styles.sortPill, isActive && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Results Counter & Active Filter Dismissals */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCount}>
          {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} found
        </Text>
        {(searchQuery.length > 0 || activeFilterCount > 0) && (
          <TouchableOpacity onPress={resetAllFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.resetFiltersLink}>Reset all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 6. Campaign Feed & Required States */}
      {filteredCampaigns.length === 0 ? (
        searchQuery.trim().length > 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matches found"
            description={`We couldn't find any amplification campaigns matching "${searchQuery}". Check for typos or try broader keywords.`}
            actionTitle="Clear Search"
            onActionPress={() => setSearchQuery('')}
          />
        ) : (
          <EmptyState
            icon="filter-outline"
            title="No campaigns match these filters"
            description="Try loosening your status or funding progress criteria to view more available campaigns."
            actionTitle="Reset All Filters"
            onActionPress={resetAllFilters}
          />
        )
      ) : (
        filteredCampaigns.map(camp => (
          <CampaignCard
            key={camp.id}
            campaign={camp}
            onPress={() => router.push(`/campaign/${camp.id}`)}
          />
        ))
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
        categories={CATEGORIES}
      />
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
  searchBar: {
    marginBottom: spacing.sm,
  },
  categoriesContainer: {
    marginHorizontal: -spacing.md,
    marginBottom: spacing.sm,
  },
  categoriesScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingVertical: 2,
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
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: 4,
    minHeight: 34,
  },
  filterTriggerBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTriggerText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  filterTriggerTextActive: {
    color: colors.textInverse,
  },
  filterCountBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  sortScrollView: {
    flex: 1,
  },
  sortScroll: {
    gap: spacing.xs,
    paddingRight: spacing.sm,
    paddingVertical: 2,
  },
  sortPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sortPillActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  sortPillText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  sortPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Results info
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  resultsCount: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  resetFiltersLink: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
});
