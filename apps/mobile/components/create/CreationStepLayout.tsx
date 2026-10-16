import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { DraftStep, AutosaveStatus } from '../../types/draft';
import { Button } from '../ui/Button';

interface StepInfo {
  step: DraftStep;
  label: string;
}

const STEPS: StepInfo[] = [
  { step: 1, label: 'Basics' },
  { step: 2, label: 'Story' },
  { step: 3, label: 'Visuals' },
  { step: 4, label: 'Reach' },
  { step: 5, label: 'Submit' },
];

interface CreationStepLayoutProps {
  currentStep: DraftStep;
  title: string;
  subtitle?: string;
  autosaveStatus: AutosaveStatus;
  canContinue?: boolean;
  continueLoading?: boolean;
  continueLabel?: string;
  onContinue: () => void;
  onBack?: () => void;
  onSaveDraft?: () => void;
  onSelectStep?: (step: DraftStep) => void;
  children: React.ReactNode;
}

export function CreationStepLayout({
  currentStep,
  title,
  subtitle,
  autosaveStatus,
  canContinue = true,
  continueLoading = false,
  continueLabel,
  onContinue,
  onBack,
  onSaveDraft,
  onSelectStep,
  children,
}: CreationStepLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const getStepButtonLabel = () => {
    if (continueLabel) return continueLabel;
    if (currentStep === 5) return 'Submit for Review';
    const nextStep = STEPS.find(s => s.step === currentStep + 1);
    return nextStep ? `Continue to ${nextStep.label}` : 'Continue';
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            <Text style={styles.backButtonText}>
              {currentStep > 1 ? 'Back' : 'Drafts'}
            </Text>
          </TouchableOpacity>

          {/* Autosave Status Indicator */}
          <View style={styles.autosaveBadge}>
            {autosaveStatus === 'saving' && (
              <>
                <ActivityIndicator size="small" color={colors.primary} style={{ transform: [{ scale: 0.7 }] }} />
                <Text style={styles.autosaveText}>Saving...</Text>
              </>
            )}
            {autosaveStatus === 'saved' && (
              <>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[styles.autosaveText, { color: colors.primary }]}>Saved</Text>
              </>
            )}
            {autosaveStatus === 'error' && (
              <>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[styles.autosaveText, { color: colors.error }]}>Failed</Text>
              </>
            )}
            {autosaveStatus === 'idle' && (
              <Text style={styles.autosaveText}>Draft</Text>
            )}
          </View>

          {/* Quick Save Action */}
          {onSaveDraft && (
            <TouchableOpacity
              onPress={onSaveDraft}
              style={styles.quickSaveButton}
              activeOpacity={0.7}
            >
              <Text style={styles.quickSaveText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 5-Step Progress Indicator */}
        <View style={styles.stepIndicatorContainer}>
          {STEPS.map((stepItem, idx) => {
            const isCurrent = stepItem.step === currentStep;
            const isCompleted = stepItem.step < currentStep;
            const isUpcoming = stepItem.step > currentStep;

            return (
              <React.Fragment key={stepItem.step}>
                <TouchableOpacity
                  onPress={() => {
                    // Allow navigating backward to completed steps
                    if (onSelectStep && (isCompleted || isCurrent)) {
                      onSelectStep(stepItem.step);
                    }
                  }}
                  disabled={!isCompleted && !isCurrent}
                  activeOpacity={0.7}
                  style={styles.stepItem}
                >
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleCompleted,
                      isCurrent && styles.stepCircleCurrent,
                      isUpcoming && styles.stepCircleUpcoming,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          isCurrent && styles.stepNumberCurrent,
                          isUpcoming && styles.stepNumberUpcoming,
                        ]}
                      >
                        {stepItem.step}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelCurrent,
                      isCompleted && styles.stepLabelCompleted,
                      isUpcoming && styles.stepLabelUpcoming,
                    ]}
                    numberOfLines={1}
                  >
                    {stepItem.label}
                  </Text>
                </TouchableOpacity>

                {/* Connecting Line between steps */}
                {idx < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      stepItem.step < currentStep && styles.stepLineCompleted,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Step Title Header */}
        <View style={styles.titleHeader}>
          <Text style={styles.stepTag}>STEP {currentStep} OF 5</Text>
          <Text style={styles.stepTitle}>{title}</Text>
          {subtitle && <Text style={styles.stepSubtitle}>{subtitle}</Text>}
        </View>
      </View>

      {/* Main Scrollable Form Body */}
      <View style={styles.content}>{children}</View>

      {/* Persistent Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.bottomBarRow}>
          {onSaveDraft && (
            <Button
              title="Save Draft"
              variant="secondary"
              size="md"
              onPress={onSaveDraft}
              style={styles.bottomSaveButton}
            />
          )}
          <Button
            title={getStepButtonLabel()}
            variant="primary"
            size="md"
            disabled={!canContinue || continueLoading}
            loading={continueLoading}
            onPress={onContinue}
            style={styles.bottomContinueButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  backButtonText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  autosaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
    gap: 4,
  },
  autosaveText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  quickSaveButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  quickSaveText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },

  // 5-Step Indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginTop: 2,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  stepCircleUpcoming: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stepNumber: {
    ...typography.labelSmall,
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumberCurrent: {
    color: colors.textInverse,
  },
  stepNumberUpcoming: {
    color: colors.textTertiary,
  },
  stepLabel: {
    ...typography.labelSmall,
    fontSize: 11,
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stepLabelUpcoming: {
    color: colors.textTertiary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLineCompleted: {
    backgroundColor: colors.primary,
  },

  // Title Header
  titleHeader: {
    marginTop: spacing.xs,
    paddingBottom: 4,
  },
  stepTag: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  stepTitle: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  stepSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Content
  content: {
    flex: 1,
  },

  // Persistent Bottom Bar
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    ...shadows.card,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomSaveButton: {
    flex: 1,
  },
  bottomContinueButton: {
    flex: 2,
  },
});
