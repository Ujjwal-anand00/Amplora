import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { draftStore, useDraftStore } from '../../services/draftStore';
import { CampaignDraft, DraftStep } from '../../types/draft';
import { CreationStepLayout } from '../../components/create/CreationStepLayout';
import { Step1Basics } from '../../components/create/Step1Basics';
import { Step2Story } from '../../components/create/Step2Story';
import { Step3Visuals } from '../../components/create/Step3Visuals';
import { Step4Reach } from '../../components/create/Step4Reach';
import { Step5Submit } from '../../components/create/Step5Submit';
import { SubmissionSuccessModal } from '../../components/create/SubmissionSuccessModal';
import { colors } from '../../theme';

export default function ManualCreationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string; mode?: 'manual' | 'voice' }>();
  const store = useDraftStore();

  const [draft, setDraft] = useState<CampaignDraft>(() =>
    store.startOrResumeDraft(params.draftId, params.mode || 'manual')
  );
  const [currentStep, setCurrentStep] = useState<DraftStep>(draft.currentStep || 1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Sync draft from store if active draft changes externally
  useEffect(() => {
    const active = store.getActiveDraft();
    if (active && active.id === draft.id) {
      setDraft(active);
    }
  }, [store]);

  const autosaveStatus = store.getAutosaveStatus();

  // Field change handler with autosave
  const handleDraftChange = (fields: Partial<CampaignDraft>) => {
    const updated = { ...draft, ...fields };
    setDraft(updated);
    store.updateActiveDraft(fields);

    // Clear related errors
    if (errors && Object.keys(errors).length > 0) {
      const nextErrors = { ...errors };
      Object.keys(fields).forEach(k => delete nextErrors[k]);
      setErrors(nextErrors);
    }
  };

  // Step Validation
  const validateStep = (step: DraftStep): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!draft.title || draft.title.trim().length < 5) {
        stepErrors.title = 'Title must be at least 5 characters.';
      }
      if (!draft.creatorName || draft.creatorName.trim().length < 2) {
        stepErrors.creatorName = 'Creator or organization name is required.';
      }
      if (!draft.category) {
        stepErrors.category = 'Please select a campaign category.';
      }
      if (!draft.summary || draft.summary.trim().length < 10) {
        stepErrors.summary = 'Summary must be at least 10 characters.';
      }
    } else if (step === 2) {
      if (!draft.storyIntro || draft.storyIntro.trim().length < 15) {
        stepErrors.storyIntro = 'Please provide an introduction paragraph of at least 15 characters.';
      }
      if (!draft.storyHeadline && !draft.title) {
        stepErrors.storyHeadline = 'Article headline is required.';
      }
    } else if (step === 3) {
      if (!draft.adHeadline && !draft.title) {
        stepErrors.adHeadline = 'Advertising headline is required.';
      }
      if (!draft.adDescription && !draft.summary) {
        stepErrors.adDescription = 'Advertising description is required.';
      }
    } else if (step === 4) {
      if (!draft.targetLocations || draft.targetLocations.length === 0) {
        stepErrors.targetLocations = 'Please select at least one target location.';
      }
      if (!draft.distributionChannels || draft.distributionChannels.length === 0) {
        stepErrors.distributionChannels = 'Please select at least one distribution channel.';
      }
    } else if (step === 5) {
      if (!draft.fundingGoal || draft.fundingGoal < 500) {
        stepErrors.fundingGoal = 'Please enter a valid funding goal of at least $500.';
      }
      if (!draft.policyAcknowledged) {
        stepErrors.policy = 'You must confirm and certify the UUTS submission policy.';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Continue to Next Step
  const handleContinue = () => {
    if (!validateStep(currentStep)) {
      Alert.alert(
        'Required Fields',
        'Please complete all required fields on this step before continuing.'
      );
      return;
    }

    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as DraftStep;
      setCurrentStep(nextStep);
      handleDraftChange({ currentStep: nextStep });
      store.saveImmediately();
    } else {
      // Step 5: Submit for review
      handleSubmitForReview();
    }
  };

  // Back Navigation
  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = (currentStep - 1) as DraftStep;
      setCurrentStep(prevStep);
      handleDraftChange({ currentStep: prevStep });
      store.saveImmediately();
    } else {
      store.saveImmediately().then(() => {
        router.back();
      });
    }
  };

  // Jump to specific step (from progress indicator or edit links)
  const handleSelectStep = (targetStep: DraftStep) => {
    // Only allow jumping backward or to current step without validation
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      handleDraftChange({ currentStep: targetStep });
      store.saveImmediately();
    } else {
      // If jumping forward, validate current step
      if (validateStep(currentStep)) {
        setCurrentStep(targetStep);
        handleDraftChange({ currentStep: targetStep });
        store.saveImmediately();
      }
    }
  };

  // Submit Draft
  const handleSubmitForReview = async () => {
    if (!validateStep(5)) {
      Alert.alert('Incomplete Submission', 'Please review and certify the required checklist.');
      return;
    }

    if (submitting) return; // Prevent duplicate taps
    setSubmitting(true);

    try {
      const submitted = await store.submitDraftForReview(draft.id);
      if (submitted) {
        setDraft(submitted);
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', 'Unable to submit campaign draft. Please try again.');
      }
    } catch (err) {
      console.warn('[Submit] error:', err);
      Alert.alert('Submission Error', 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step Titles
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Basics & Narrative Intent';
      case 2:
        return 'The Story & Verifiable Evidence';
      case 3:
        return 'Campaign & Advertising Visuals';
      case 4:
        return 'Target Audience & Candidate Channels';
      case 5:
        return 'Review, Funding Goal & Certification';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return 'Define title, advocacy category, message summary, and creator identity.';
      case 2:
        return 'Structure your investigative article with ordered sections, primary sources, and stats.';
      case 3:
        return 'Configure advertising headline, creative assets, and inspect dual placement previews.';
      case 4:
        return 'Plan geographic boundaries, audience themes, duration, and projected impressions.';
      case 5:
        return 'Set your target funding goal, review pre-flight checklist, and submit for fact-checking.';
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <CreationStepLayout
          currentStep={currentStep}
          title={getStepTitle()}
          subtitle={getStepSubtitle()}
          autosaveStatus={autosaveStatus}
          onContinue={handleContinue}
          onBack={handleBack}
          onSaveDraft={() => store.saveImmediately()}
          onSelectStep={handleSelectStep}
          continueLoading={submitting}
        >
          {currentStep === 1 && (
            <Step1Basics draft={draft} onChange={handleDraftChange} errors={errors} />
          )}
          {currentStep === 2 && (
            <Step2Story draft={draft} onChange={handleDraftChange} errors={errors} />
          )}
          {currentStep === 3 && (
            <Step3Visuals draft={draft} onChange={handleDraftChange} errors={errors} />
          )}
          {currentStep === 4 && (
            <Step4Reach draft={draft} onChange={handleDraftChange} errors={errors} />
          )}
          {currentStep === 5 && (
            <Step5Submit
              draft={draft}
              onChange={handleDraftChange}
              onNavigateToStep={handleSelectStep}
              onSubmitForReview={handleSubmitForReview}
              submitting={submitting}
              errors={errors}
            />
          )}
        </CreationStepLayout>

        {/* Submission Success & Timeline Modal */}
        <SubmissionSuccessModal
          visible={showSuccessModal}
          draft={draft}
          onDone={() => {
            setShowSuccessModal(false);
            router.push('/(tabs)/create');
          }}
          onExplore={() => {
            setShowSuccessModal(false);
            router.push('/(tabs)/explore');
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
