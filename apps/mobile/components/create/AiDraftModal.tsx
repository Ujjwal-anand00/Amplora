import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { Button } from '../ui/Button';
import { generateAiDraftSuggestion, AiDraftSuggestion } from '../../services/aiAssistance';

interface AiDraftModalProps {
  visible: boolean;
  onClose: () => void;
  onApplySuggestion: (suggestion: AiDraftSuggestion) => void;
}

export function AiDraftModal({ visible, onClose, onApplySuggestion }: AiDraftModalProps) {
  const [topicPrompt, setTopicPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AiDraftSuggestion | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateAiDraftSuggestion(topicPrompt);
      setSuggestion(res.suggestion);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      setSuggestion(null);
      setTopicPrompt('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>AI Drafting Assistant</Text>
                <Text style={styles.subtitle}>Deterministic civic suggestion model</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Disclaimer pill */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.disclaimerText}>
                Generates verifiable civic outline suggestions. All claims require primary sources before submission. Existing fields will not be overwritten without your confirmation.
              </Text>
            </View>

            {/* Prompt Input */}
            <Text style={styles.inputLabel}>What community issue do you want to amplify?</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Hospital billing surcharges, School solar panels..."
              placeholderTextColor={colors.textTertiary}
              value={topicPrompt}
              onChangeText={setTopicPrompt}
            />

            <Button
              title="Generate Structured Outline"
              variant="secondary"
              size="md"
              loading={loading}
              onPress={handleGenerate}
              style={styles.generateButton}
            />

            {/* Suggestion Result Box */}
            {suggestion && (
              <View style={styles.suggestionBox}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionTitleLabel}>SUGGESTED OUTLINE</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{suggestion.category}</Text>
                  </View>
                </View>

                <Text style={styles.suggestedHeadline}>{suggestion.title}</Text>
                <Text style={styles.suggestedSummary}>{suggestion.summary}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Target Audience:</Text>
                  <Text style={styles.detailValue}>{suggestion.whoToReach}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Evidence Baseline:</Text>
                  <Text style={styles.detailValue}>{suggestion.evidenceSummary}</Text>
                </View>

                <Button
                  title="Apply to Campaign Draft"
                  variant="primary"
                  size="md"
                  onPress={handleApply}
                  style={styles.applyButton}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  closeButton: {
    padding: 6,
  },
  body: {
    padding: spacing.md,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  generateButton: {
    marginBottom: spacing.md,
  },
  suggestionBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  suggestionTitleLabel: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  categoryBadge: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  suggestedHeadline: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  suggestedSummary: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  detailRow: {
    marginBottom: spacing.xs,
  },
  detailLabel: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontSize: 13,
  },
  applyButton: {
    marginTop: spacing.sm,
  },
});
