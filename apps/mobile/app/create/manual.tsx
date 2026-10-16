import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { colors, typography, spacing, radii, touchTargets } from '../../theme';
import { Button } from '../../components/ui/Button';

const CATEGORIES = [
  'Civic',
  'Environment',
  'Health',
  'Consumer',
  'Economic Policy',
  'Education',
  'Community',
];

const AVAILABLE_CHANNELS = [
  'Meta Targeted Display',
  'Google Search Ads',
  'Local News Outlets',
  'YouTube Pre-Roll',
  'Geo-Fenced Mobile',
];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  tagLine: z.string().min(10, 'Tagline must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  targetBudget: z.string().min(1, 'Target budget is required'),
  targetAudience: z.string().min(8, 'Please describe who must see this message'),
  narrative: z.string().min(25, 'Please provide the campaign narrative & evidence'),
});

type FormValues = z.infer<typeof formSchema>;

export default function ManualCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string; title?: string }>();

  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'Meta Targeted Display',
    'Google Search Ads',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: params.title || '',
      tagLine: '',
      category: 'Civic',
      targetBudget: '5000',
      targetAudience: '',
      narrative: '',
    },
  });

  const budgetValue = parseFloat(watch('targetBudget') || '0') || 0;
  const projectedReach = Math.round(budgetValue * 27.0);

  const toggleChannel = (channel: string) => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter(c => c !== channel));
      }
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      // Simulate submission & validation pipeline
      setTimeout(() => {
        setSubmitting(false);
        Alert.alert(
          'Campaign Submitted for UUTS Review',
          `"${data.title}" has been created and submitted to fact-checkers. Once certified, community backers can begin pooling ad funds.`,
          [
            {
              text: 'View Explore Feed',
              onPress: () => router.push('/(tabs)/explore'),
            },
          ]
        );
      }, 900);
    } catch {
      setSubmitting(false);
      Alert.alert('Error', 'Unable to create campaign at this moment.');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Create Campaign',
          headerTitleStyle: { ...typography.headingSmall, color: colors.textPrimary },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Amplification Parameters</Text>
            <Text style={styles.headerSubtitle}>
              Target the audiences who need to hear this message most.
            </Text>
          </View>

          {/* Title Field */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Campaign Headline *</Text>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Expose Hospital Facility Surcharges"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, errors.title && styles.inputError]}
                />
              )}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
          </View>

          {/* Tagline */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>One-Sentence Tagline *</Text>
            <Controller
              control={control}
              name="tagLine"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Summarize the message that will appear in advertisements"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, errors.tagLine && styles.inputError]}
                />
              )}
            />
            {errors.tagLine && <Text style={styles.errorText}>{errors.tagLine.message}</Text>}
          </View>

          {/* Category Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Advocacy Category *</Text>
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {CATEGORIES.map(cat => {
                    const active = value === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => onChange(cat)}
                        style={[styles.categoryChip, active && styles.categoryChipActive]}
                      >
                        <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            />
          </View>

          {/* Target Ad Budget & Live Reach Calculator */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Amplification Ad Budget Target ($) *</Text>
            <Controller
              control={control}
              name="targetBudget"
              render={({ field: { onChange, value } }) => (
                <View style={styles.budgetRow}>
                  <Text style={styles.budgetPrefix}>$</Text>
                  <TextInput
                    value={value}
                    onChangeText={val => onChange(val.replace(/[^0-9]/g, ''))}
                    placeholder="5000"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.budgetInput, errors.targetBudget && styles.inputError]}
                  />
                </View>
              )}
            />
            {errors.targetBudget && (
              <Text style={styles.errorText}>{errors.targetBudget.message}</Text>
            )}

            {/* Reach Formula Live Card */}
            <View style={styles.reachFormulaCard}>
              <Ionicons name="calculator-outline" size={20} color={colors.primary} />
              <View style={styles.reachFormulaTextContainer}>
                <Text style={styles.reachFormulaTitle}>
                  ≈ {projectedReach.toLocaleString()} Projected Targeted Viewers
                </Text>
                <Text style={styles.reachFormulaSub}>
                  Calculated based on platform benchmark of 27 verified impressions per $1 ad spend.
                </Text>
              </View>
            </View>
          </View>

          {/* Target Audience */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Target Audience Description *</Text>
            <Controller
              control={control}
              name="targetAudience"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Registered voters aged 25-54 residing in coastal river districts"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.input, errors.targetAudience && styles.inputError]}
                />
              )}
            />
            {errors.targetAudience && (
              <Text style={styles.errorText}>{errors.targetAudience.message}</Text>
            )}
          </View>

          {/* Distribution Channels Multi-Select */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Distribution Ad Channels *</Text>
            <View style={styles.channelsList}>
              {AVAILABLE_CHANNELS.map(ch => {
                const isSelected = selectedChannels.includes(ch);
                return (
                  <TouchableOpacity
                    key={ch}
                    onPress={() => toggleChannel(ch)}
                    style={[styles.channelItem, isSelected && styles.channelItemActive]}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textTertiary}
                    />
                    <Text style={[styles.channelName, isSelected && styles.channelNameActive]}>
                      {ch}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Narrative & Fact-Check Documentation */}
          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Narrative & Primary Sources *</Text>
            <Controller
              control={control}
              name="narrative"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder="Provide background, factual context, and public document references for the UUTS fact-checkers."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  style={[styles.textArea, errors.narrative && styles.inputError]}
                />
              )}
            />
            {errors.narrative && (
              <Text style={styles.errorText}>{errors.narrative.message}</Text>
            )}
          </View>

          {/* Submit Action */}
          <View style={styles.submitContainer}>
            <Button
              title="Submit Campaign for UUTS Review"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.massive,
  },
  headerBox: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.headingLarge,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
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
    minHeight: touchTargets.minTouchTarget,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  budgetPrefix: {
    ...typography.headingMedium,
    color: colors.primary,
    marginRight: spacing.xs,
  },
  budgetInput: {
    flex: 1,
    ...typography.headingMedium,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  reachFormulaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  reachFormulaTextContainer: {
    flex: 1,
  },
  reachFormulaTitle: {
    ...typography.headingSmall,
    color: colors.primary,
  },
  reachFormulaSub: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    marginTop: 2,
    lineHeight: 16,
  },
  channelsList: {
    gap: spacing.xs,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  channelItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  channelName: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  channelNameActive: {
    color: colors.textPrimary,
    fontWeight: '600',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitContainer: {
    marginTop: spacing.md,
  },
});
