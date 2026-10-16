import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { CampaignDraft, DraftStorySection, DraftSource, DraftStatistic } from '../../types/draft';
import { Button } from '../ui/Button';

interface Step2StoryProps {
  draft: CampaignDraft;
  onChange: (fields: Partial<CampaignDraft>) => void;
  errors?: Record<string, string>;
}

export function Step2Story({ draft, onChange, errors = {} }: Step2StoryProps) {
  const [showLiveArticlePreview, setShowLiveArticlePreview] = useState(false);

  // New source input state
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourcePublisher, setNewSourcePublisher] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceRelevance, setNewSourceRelevance] = useState('');
  const [sourceUrlError, setSourceUrlError] = useState('');

  // New stat input state
  const [newStatNumber, setNewStatNumber] = useState('');
  const [newStatLabel, setNewStatLabel] = useState('');
  const [newStatContext, setNewStatContext] = useState('');

  // Sections management
  const handleAddSection = () => {
    const newSection: DraftStorySection = {
      id: `sec-${Date.now()}`,
      title: 'New Investigation Section',
      body: '',
    };
    onChange({
      storySections: [...draft.storySections, newSection],
    });
  };

  const handleUpdateSection = (id: string, updates: Partial<DraftStorySection>) => {
    onChange({
      storySections: draft.storySections.map(s => (s.id === id ? { ...s, ...updates } : s)),
    });
  };

  const handleDeleteSection = (id: string, sectionTitle: string) => {
    Alert.alert(
      'Delete Section',
      `Are you sure you want to remove "${sectionTitle || 'this section'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onChange({
              storySections: draft.storySections.filter(s => s.id !== id),
            });
          },
        },
      ]
    );
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= draft.storySections.length) return;

    const reordered = [...draft.storySections];
    const item = reordered.splice(index, 1)[0];
    reordered.splice(newIndex, 0, item);
    onChange({ storySections: reordered });
  };

  // Sources management
  const handleAddSource = () => {
    if (!newSourceTitle.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for the supporting source.');
      return;
    }

    const trimmedUrl = newSourceUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setSourceUrlError('URL must start with http:// or https://');
      return;
    }
    setSourceUrlError('');

    const newSource: DraftSource = {
      id: `src-${Date.now()}`,
      title: newSourceTitle.trim(),
      publisher: newSourcePublisher.trim() || undefined,
      url: trimmedUrl,
      relevance: newSourceRelevance.trim(),
    };

    onChange({
      sources: [...draft.sources, newSource],
    });

    // Reset inputs
    setNewSourceTitle('');
    setNewSourcePublisher('');
    setNewSourceUrl('');
    setNewSourceRelevance('');
  };

  const handleDeleteSource = (id: string) => {
    onChange({
      sources: draft.sources.filter(s => s.id !== id),
    });
  };

  // Statistics management
  const handleAddStat = () => {
    if (!newStatNumber.trim() || !newStatLabel.trim()) {
      Alert.alert('Incomplete Statistic', 'Please provide both a metric number (e.g. 78%) and a label.');
      return;
    }
    const newStat: DraftStatistic = {
      id: `stat-${Date.now()}`,
      number: newStatNumber.trim(),
      label: newStatLabel.trim(),
      context: newStatContext.trim(),
    };
    onChange({
      statistics: [...draft.statistics, newStat],
    });
    setNewStatNumber('');
    setNewStatLabel('');
    setNewStatContext('');
  };

  const handleDeleteStat = (id: string) => {
    onChange({
      statistics: draft.statistics.filter(s => s.id !== id),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* 1. Story Headline */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Article Headline *</Text>
        <TextInput
          style={[styles.input, errors.storyHeadline && styles.inputError]}
          placeholder="e.g. How a Quiet Zoning Amendment Threatens Washington's Oldest Public Footpaths"
          placeholderTextColor={colors.textTertiary}
          value={draft.storyHeadline}
          onChangeText={text => onChange({ storyHeadline: text })}
        />
        {errors.storyHeadline && <Text style={styles.errorText}>{errors.storyHeadline}</Text>}
      </View>

      {/* 2. Story Introduction */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Introduction / Lede Paragraph *</Text>
        <TextInput
          style={[styles.textArea, errors.storyIntro && styles.inputError]}
          placeholder="Open your story with the central facts and community impact..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          value={draft.storyIntro}
          onChangeText={text => onChange({ storyIntro: text })}
        />
        {errors.storyIntro && <Text style={styles.errorText}>{errors.storyIntro}</Text>}
      </View>

      {/* 3. Ordered Story Sections */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionGroupTitle}>Story Sections ({draft.storySections.length})</Text>
          <Text style={styles.sectionGroupSub}>Structure your investigation into ordered sub-chapters.</Text>
        </View>
        <Button
          title="+ Add Section"
          variant="secondary"
          size="sm"
          onPress={handleAddSection}
        />
      </View>

      {draft.storySections.map((section, index) => (
        <View key={section.id} style={styles.sectionCard}>
          <View style={styles.sectionCardTop}>
            <View style={styles.sectionNumberBadge}>
              <Text style={styles.sectionNumberText}>§ {index + 1}</Text>
            </View>
            <View style={styles.sectionOrderControls}>
              <TouchableOpacity
                onPress={() => handleMoveSection(index, 'up')}
                disabled={index === 0}
                style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]}
              >
                <Ionicons name="arrow-up" size={16} color={index === 0 ? colors.textTertiary : colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveSection(index, 'down')}
                disabled={index === draft.storySections.length - 1}
                style={[styles.orderButton, index === draft.storySections.length - 1 && styles.orderButtonDisabled]}
              >
                <Ionicons name="arrow-down" size={16} color={index === draft.storySections.length - 1 ? colors.textTertiary : colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteSection(section.id, section.title)}
                style={styles.deleteSectionButton}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section Heading */}
          <Text style={styles.subLabel}>Section Heading</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Historical Easement at Stake"
            placeholderTextColor={colors.textTertiary}
            value={section.title}
            onChangeText={text => handleUpdateSection(section.id, { title: text })}
          />

          {/* Section Body */}
          <Text style={[styles.subLabel, { marginTop: spacing.xs }]}>Body Paragraphs</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Provide context, evidence, quotes, or historical documentation..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            value={section.body}
            onChangeText={text => handleUpdateSection(section.id, { body: text })}
          />

          {/* Optional Inline Image Details */}
          <View style={styles.inlineImageSection}>
            <Text style={styles.inlineImageHeader}>Optional Supporting Image</Text>
            <TextInput
              style={styles.input}
              placeholder="Image URL (e.g. https://images.unsplash.com/...)"
              placeholderTextColor={colors.textTertiary}
              value={section.imageUrl || ''}
              onChangeText={text => handleUpdateSection(section.id, { imageUrl: text })}
            />
            {section.imageUrl ? (
              <View style={styles.imagePreviewRow}>
                <Image source={{ uri: section.imageUrl }} style={styles.inlineThumb} />
                <View style={{ flex: 1, gap: 4 }}>
                  <TextInput
                    style={styles.miniInput}
                    placeholder="Image Caption"
                    placeholderTextColor={colors.textTertiary}
                    value={section.imageCaption || ''}
                    onChangeText={text => handleUpdateSection(section.id, { imageCaption: text })}
                  />
                  <TextInput
                    style={styles.miniInput}
                    placeholder="Photo Credit / Source"
                    placeholderTextColor={colors.textTertiary}
                    value={section.imageCredit || ''}
                    onChangeText={text => handleUpdateSection(section.id, { imageCredit: text })}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      ))}

      {/* 4. Supporting Sources Registry */}
      <View style={styles.sourcesContainer}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionGroupTitle}>Primary Supporting Sources ({draft.sources.length})</Text>
            <Text style={styles.sectionGroupSub}>Verifiable public links reviewed during certification.</Text>
          </View>
        </View>

        {/* Existing sources list */}
        {draft.sources.map(src => (
          <View key={src.id} style={styles.sourceItemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitleText}>{src.title}</Text>
              {src.publisher ? <Text style={styles.sourcePublisherText}>{src.publisher}</Text> : null}
              {src.url ? <Text style={styles.sourceUrlText} numberOfLines={1}>{src.url}</Text> : null}
              {src.relevance ? <Text style={styles.sourceRelevanceText}>{src.relevance}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDeleteSource(src.id)} style={styles.deleteSourceBtn}>
              <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Source Form */}
        <View style={styles.addSourceBox}>
          <Text style={styles.addSourceTitle}>+ Add Verifiable Source</Text>
          <TextInput
            style={styles.input}
            placeholder="Source Document Title *"
            placeholderTextColor={colors.textTertiary}
            value={newSourceTitle}
            onChangeText={setNewSourceTitle}
          />
          <View style={styles.sourceInputsRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Publisher / Agency (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newSourcePublisher}
              onChangeText={setNewSourcePublisher}
            />
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              placeholder="URL (https://...)"
              placeholderTextColor={colors.textTertiary}
              value={newSourceUrl}
              onChangeText={setNewSourceUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          {sourceUrlError ? <Text style={styles.errorText}>{sourceUrlError}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Explanation of Relevance (e.g. Section 4 confirms deed easement)"
            placeholderTextColor={colors.textTertiary}
            value={newSourceRelevance}
            onChangeText={setNewSourceRelevance}
          />
          <Button
            title="Attach Source"
            variant="secondary"
            size="sm"
            onPress={handleAddSource}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        </View>
      </View>

      {/* 5. Statistics Callouts */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionGroupTitle}>Key Statistics ({draft.statistics.length})</Text>
        <Text style={styles.sectionGroupSub}>Highlight numerical evidence with context.</Text>

        {draft.statistics.map(stat => (
          <View key={stat.id} style={styles.statChip}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statNumberText}>{stat.number}</Text>
              <Text style={styles.statLabelText}>{stat.label}</Text>
              {stat.context ? <Text style={styles.statContextText}>{stat.context}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDeleteStat(stat.id)}>
              <Ionicons name="close" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addStatBox}>
          <View style={styles.sourceInputsRow}>
            <TextInput
              style={[styles.input, { flex: 0.8 }]}
              placeholder="Metric (e.g. 78%)"
              placeholderTextColor={colors.textTertiary}
              value={newStatNumber}
              onChangeText={setNewStatNumber}
            />
            <TextInput
              style={[styles.input, { flex: 1.2 }]}
              placeholder="Short Label (e.g. Rural Water Deficit)"
              placeholderTextColor={colors.textTertiary}
              value={newStatLabel}
              onChangeText={setNewStatLabel}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Context (e.g. According to 2025 state water audit)"
            placeholderTextColor={colors.textTertiary}
            value={newStatContext}
            onChangeText={setNewStatContext}
          />
          <Button
            title="Add Statistic"
            variant="secondary"
            size="sm"
            onPress={handleAddStat}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        </View>
      </View>

      {/* Live Article Preview Toggle */}
      <TouchableOpacity
        onPress={() => setShowLiveArticlePreview(!showLiveArticlePreview)}
        style={styles.previewToggle}
        activeOpacity={0.8}
      >
        <Ionicons
          name={showLiveArticlePreview ? 'chevron-up-circle' : 'newspaper-outline'}
          size={20}
          color={colors.primary}
        />
        <Text style={styles.previewToggleText}>
          {showLiveArticlePreview ? 'Hide Article Preview' : 'Preview Editorial Story Layout'}
        </Text>
      </TouchableOpacity>

      {showLiveArticlePreview && (
        <View style={styles.articlePreviewBox}>
          <Text style={styles.articlePreviewHeadline}>{draft.storyHeadline || 'Article Headline'}</Text>
          <Text style={styles.articlePreviewIntro}>{draft.storyIntro || 'Introduction lede paragraph...'}</Text>
          {draft.storySections.map(sec => (
            <View key={sec.id} style={styles.articlePreviewSection}>
              <Text style={styles.articlePreviewSectionTitle}>{sec.title}</Text>
              <Text style={styles.articlePreviewSectionBody}>{sec.body || '(No paragraph content entered yet)'}</Text>
              {sec.imageUrl ? (
                <View style={{ marginTop: 8 }}>
                  <Image source={{ uri: sec.imageUrl }} style={styles.articlePreviewSectionImage} />
                  {sec.imageCaption ? <Text style={styles.articlePreviewCaption}>{sec.imageCaption}</Text> : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
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
    marginBottom: spacing.xs,
  },
  subLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: 4,
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
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: colors.textPrimary,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // Sections
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionGroupTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
  },
  sectionGroupSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionNumberBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  sectionNumberText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionOrderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderButton: {
    padding: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.sm,
  },
  orderButtonDisabled: {
    opacity: 0.35,
  },
  deleteSectionButton: {
    padding: 6,
    marginLeft: 6,
  },

  // Inline Image
  inlineImageSection: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  inlineImageHeader: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  inlineThumb: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },
  miniInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    ...typography.bodySmall,
    color: colors.textPrimary,
  },

  // Sources
  sourcesContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sourceItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  sourceTitleText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sourcePublisherText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 12,
    marginTop: 2,
  },
  sourceUrlText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  sourceRelevanceText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteSourceBtn: {
    padding: 4,
  },
  addSourceBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  addSourceTitle: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  sourceInputsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },

  // Stats
  statsContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  statNumberText: {
    ...typography.headingMedium,
    color: colors.primary,
    lineHeight: 28,
  },
  statLabelText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
  },
  statContextText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  addStatBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  // Preview Toggle
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  previewToggleText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '700',
  },
  articlePreviewBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  articlePreviewHeadline: {
    ...typography.headingLarge,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: 'serif',
  },
  articlePreviewIntro: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  articlePreviewSection: {
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  articlePreviewSectionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  articlePreviewSectionBody: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  articlePreviewSectionImage: {
    width: '100%',
    height: 180,
    borderRadius: radii.md,
  },
  articlePreviewCaption: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
});
