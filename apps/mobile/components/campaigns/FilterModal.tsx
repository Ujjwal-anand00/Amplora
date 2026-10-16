import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, touchTargets, shadows } from '../../theme';
import { Button } from '../ui/Button';

export interface FilterState {
  status: 'all' | 'active' | 'nearly_funded' | 'fully_amplified';
  progressRange: 'all' | 'under_50' | '50_99' | 'fully_funded';
  category: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (newFilters: FilterState) => void;
  categories: string[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  categories,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // Sync when opened
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const handleReset = () => {
    const defaultState: FilterState = {
      status: 'all',
      progressRange: 'all',
      category: 'All',
    };
    setLocalFilters(defaultState);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const statusOptions: Array<{ id: FilterState['status']; label: string }> = [
    { id: 'all', label: 'All Statuses' },
    { id: 'active', label: 'Active Funding' },
    { id: 'nearly_funded', label: 'Nearly Funded (75%+)' },
    { id: 'fully_amplified', label: 'Fully Amplified' },
  ];

  const progressOptions: Array<{ id: FilterState['progressRange']; label: string }> = [
    { id: 'all', label: 'Any Progress' },
    { id: 'under_50', label: 'Under 50%' },
    { id: '50_99', label: '50% to 99%' },
    { id: 'fully_funded', label: '100% Funded' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Filter Campaigns</Text>
              <Text style={styles.headerSubtitle}>Refine by status, progress, and topic</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Category Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CATEGORY</Text>
              <View style={styles.chipsWrap}>
                {categories.map(cat => {
                  const isSelected = localFilters.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setLocalFilters({ ...localFilters, category: cat })}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Campaign Lifecycle Status */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CAMPAIGN STATUS</Text>
              <View style={styles.optionsList}>
                {statusOptions.map(opt => {
                  const isSelected = localFilters.status === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setLocalFilters({ ...localFilters, status: opt.id })}
                      style={[styles.optionRow, isSelected && styles.optionRowActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? colors.primary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Funding Progress Range */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>FUNDING PROGRESS</Text>
              <View style={styles.optionsList}>
                {progressOptions.map(opt => {
                  const isSelected = localFilters.progressRange === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setLocalFilters({ ...localFilters, progressRange: opt.id })}
                      style={[styles.optionRow, isSelected && styles.optionRowActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={isSelected ? colors.primary : colors.textTertiary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button
              title="Reset All"
              onPress={handleReset}
              variant="secondary"
              size="md"
              style={styles.footerBtn}
            />
            <Button
              title="Apply Filters"
              onPress={handleApply}
              variant="primary"
              size="md"
              style={styles.footerBtnPrimary}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 35, 31, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    maxHeight: '85%',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: touchTargets.minTouchTarget,
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  optionText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  footerBtn: {
    flex: 1,
  },
  footerBtnPrimary: {
    flex: 2,
  },
});
