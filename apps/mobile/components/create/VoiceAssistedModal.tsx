import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { colors, typography, spacing, radii, shadows } from '../../theme';
import { Button } from '../ui/Button';
import {
  AiVoiceDraftResult,
  buildCampaignDraftFromAiResult,
  parseVoiceTranscriptToDraft,
} from '../../services/voiceRecognition';
import { apiClient } from '../../services/apiClient';
import { CampaignDraft } from '../../types/draft';
import { CampaignCategory } from '../../types/campaign';

interface VoiceAssistedModalProps {
  visible: boolean;
  onClose: () => void;
  onDraftCreated: (draft: CampaignDraft) => void;
}

type ModalStage =
  | 'PERMISSIONS'
  | 'IDLE'
  | 'RECORDING'
  | 'PAUSED'
  | 'REVIEW_AUDIO'
  | 'TRANSCRIBING'
  | 'EDITING_TRANSCRIPT'
  | 'GENERATING_DRAFT'
  | 'PREVIEW_DRAFT'
  | 'ERROR';

const CATEGORIES: CampaignCategory[] = [
  'Environment',
  'Health',
  'Science',
  'Education',
  'Public Policy',
  'Economic Policy',
  'Community',
  'Arts & Culture',
];

const MAX_RECORDING_SECONDS = 60;

export function VoiceAssistedModal({
  visible,
  onClose,
  onDraftCreated,
}: VoiceAssistedModalProps) {
  // Modal State
  const [stage, setStage] = useState<ModalStage>('IDLE');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Audio Recording State
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcription & Generation State
  const [transcript, setTranscript] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CampaignCategory>('Environment');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [aiDraftResult, setAiDraftResult] = useState<AiVoiceDraftResult | null>(null);

  // Initialize expo-audio recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Initialize expo-audio player for playback preview
  const player = useAudioPlayer(recordedUri || undefined);
  const playerStatus = useAudioPlayerStatus(player);

  // Reset state when modal is opened or closed
  useEffect(() => {
    if (visible) {
      checkPermissions();
    } else {
      cleanupAudioSession();
    }
  }, [visible]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cleanupAudioSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      if (player.playing) {
        player.pause();
      }
    } catch {
      // safe cleanup
    }
    setRecordingSeconds(0);
    setRecordedUri(null);
    setTranscript('');
    setAiDraftResult(null);
    setStage('IDLE');
  };

  const checkPermissions = async () => {
    try {
      const { status } = await getRecordingPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
        setStage('IDLE');
      } else {
        setPermissionGranted(false);
        setStage('PERMISSIONS');
      }
    } catch {
      setPermissionGranted(false);
      setStage('PERMISSIONS');
    }
  };

  const handleRequestPermission = async () => {
    try {
      const response = await requestRecordingPermissionsAsync();
      if (response.granted) {
        setPermissionGranted(true);
        setStage('IDLE');
      } else {
        setPermissionGranted(false);
        Alert.alert(
          'Microphone Permission Required',
          'Please grant microphone access in device settings to record campaign ideas with your voice, or use manual text entry below.'
        );
      }
    } catch (err: any) {
      Alert.alert('Permission Error', err?.message || 'Could not request microphone access.');
    }
  };

  // 1. Audio Recording Controls
  const handleStartRecording = async () => {
    try {
      setErrorMessage('');
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setRecordedUri(null);
      setRecordingSeconds(0);
      setStage('RECORDING');

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not start audio recording.');
      setStage('ERROR');
    }
  };

  const handlePauseRecording = () => {
    try {
      recorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('PAUSED');
    } catch (err: any) {
      console.warn('Error pausing recorder:', err);
    }
  };

  const handleResumeRecording = () => {
    try {
      recorder.record();
      setStage('RECORDING');
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            handleStopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Error resuming recorder:', err);
    }
  };

  const handleStopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setRecordedUri(uri);
        setStage('REVIEW_AUDIO');
      } else {
        setErrorMessage('No audio data was captured. Please try recording again.');
        setStage('ERROR');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not finalize recording.');
      setStage('ERROR');
    }
  };

  const handleDiscardRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recorder.isRecording) recorder.stop();
      if (player.playing) player.pause();
    } catch {
      // safe cleanup
    }
    setRecordedUri(null);
    setRecordingSeconds(0);
    setStage('IDLE');
  };

  // 2. Audio Playback Preview
  const handleTogglePlayAudio = () => {
    if (playerStatus.playing) {
      player.pause();
    } else {
      if (playerStatus.currentTime >= (playerStatus.duration || 1) - 0.2) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  // 3. Audio Transcription with Real Backend Service
  const handleTranscribeAudio = async () => {
    if (!recordedUri) {
      Alert.alert('No Recording', 'Please record your voice memo first.');
      return;
    }

    setStage('TRANSCRIBING');
    setErrorMessage('');

    try {
      let audioBase64 = '';
      let fileSize = 0;

      // Validate audio file exists and read base64 using supported Expo FileSystem API
      try {
        const audioFile = new File(recordedUri);
        if (!audioFile.exists) {
          throw new Error('Recorded audio file not found on local device.');
        }
        fileSize = audioFile.size ?? (typeof audioFile.info === 'function' ? audioFile.info().size : 0);
        audioBase64 = await audioFile.base64();
      } catch {
        // Safe fallback to legacy filesystem module if File class is unavailable
        const legacyInfo = await FileSystemLegacy.getInfoAsync(recordedUri);
        if (!legacyInfo.exists) {
          throw new Error('Recorded audio file not found on local device.');
        }
        fileSize = (legacyInfo as any).size || 0;
        audioBase64 = await FileSystemLegacy.readAsStringAsync(recordedUri, {
          encoding: FileSystemLegacy.EncodingType.Base64,
        });
      }

      if (!audioBase64 || audioBase64.length < 50 || (fileSize > 0 && fileSize < 100)) {
        throw new Error('Audio recording is empty or too short. Please record again.');
      }

      const res = await apiClient.transcribeAudio({
        audioBase64,
        mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        durationSeconds: recordingSeconds,
      });

      if (res.success && res.data?.transcript) {
        setTranscript(res.data.transcript);
        setStage('EDITING_TRANSCRIPT');
      } else {
        throw new Error(res.error || 'Speech-to-text service could not transcribe audio.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Transcription failed. Please retry or enter your ideas manually.');
      setStage('ERROR');
    }
  };

  // 4. Generate Campaign Draft with Real AI
  const handleGenerateCampaignWithAi = async () => {
    if (!transcript.trim()) {
      Alert.alert('Empty Transcript', 'Please provide a spoken or typed transcript first.');
      return;
    }

    setStage('GENERATING_DRAFT');
    setErrorMessage('');

    try {
      const res = await apiClient.generateAiVoiceDraft({
        transcript: transcript.trim(),
        category: selectedCategory,
        additionalNotes: additionalNotes.trim() || undefined,
      });

      if (res.success && res.data) {
        setAiDraftResult(res.data);
        setStage('PREVIEW_DRAFT');
      } else {
        throw new Error(res.error || 'Could not synthesize campaign draft from transcript.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'AI campaign generation failed.');
      setStage('ERROR');
    }
  };

  // 5. Populate Draft and Open in 5-Step Workflow
  const handlePopulateDraftAndOpen = () => {
    if (aiDraftResult) {
      const newDraft = buildCampaignDraftFromAiResult(aiDraftResult, transcript);
      onDraftCreated(newDraft);
      onClose();
    } else if (transcript.trim()) {
      const fallbackDraft = parseVoiceTranscriptToDraft(transcript.trim(), 'voice');
      fallbackDraft.category = selectedCategory;
      onDraftCreated(fallbackDraft);
      onClose();
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.micCircle}>
                <Ionicons name="mic" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Voice-to-Campaign Creation</Text>
                <Text style={styles.subtitle}>Speech-to-draft narrative structuring with AI</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Explanatory Banner */}
            <View style={styles.noticeBox}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Speak naturally for up to 60 seconds about your civic concern. Your actual voice is transcribed and structured by AI into an editable 5-step campaign draft.
              </Text>
            </View>

            {/* STAGE 1: Permissions Required */}
            {stage === 'PERMISSIONS' ? (
              <View style={styles.cardContainer}>
                <View style={styles.permissionIconCircle}>
                  <Ionicons name="mic-off-outline" size={32} color={colors.error} />
                </View>
                <Text style={styles.permissionTitle}>Microphone Access Required</Text>
                <Text style={styles.permissionDesc}>
                  Amplora needs microphone access to record your spoken outline on this device before sending it for factual AI structuring.
                </Text>
                <Button
                  title="Grant Microphone Permission"
                  variant="primary"
                  onPress={handleRequestPermission}
                  style={{ marginBottom: spacing.sm }}
                />
                <TouchableOpacity
                  onPress={() => setStage('EDITING_TRANSCRIPT')}
                  style={styles.textFallbackBtn}
                >
                  <Text style={styles.textFallbackBtnText}>Or enter transcript manually with keyboard</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STAGE 2: Idle & Ready to Record */}
            {stage === 'IDLE' ? (
              <View style={styles.recordSection}>
                <TouchableOpacity
                  onPress={handleStartRecording}
                  style={styles.micRecordBtn}
                  activeOpacity={0.8}
                  accessibilityLabel="Start voice recording"
                >
                  <Ionicons name="mic" size={40} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.micPromptTitle}>Tap to Start Recording</Text>
                <Text style={styles.micPromptSub}>
                  Explain who is impacted, the local issue, and why community advertising is needed. (Max {MAX_RECORDING_SECONDS}s)
                </Text>

                <TouchableOpacity
                  onPress={() => setStage('EDITING_TRANSCRIPT')}
                  style={styles.manualTextLink}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={styles.manualTextLinkText}>Type your outline manually instead</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STAGE 3: Recording Active or Paused */}
            {stage === 'RECORDING' || stage === 'PAUSED' ? (
              <View style={styles.recordingActiveCard}>
                <View style={styles.recordingTimerRow}>
                  <View style={[styles.recordingDot, stage === 'PAUSED' && styles.recordingDotPaused]} />
                  <Text style={styles.recordingTimerText}>
                    {formatSeconds(recordingSeconds)} / {formatSeconds(MAX_RECORDING_SECONDS)}
                  </Text>
                </View>

                <Text style={styles.recordingStatusLabel}>
                  {stage === 'RECORDING' ? 'Listening and capturing audio...' : 'Recording Paused'}
                </Text>

                <View style={styles.recordingControlsRow}>
                  {stage === 'RECORDING' ? (
                    <TouchableOpacity
                      onPress={handlePauseRecording}
                      style={styles.controlIconBtn}
                      accessibilityLabel="Pause recording"
                    >
                      <Ionicons name="pause" size={20} color={colors.textPrimary} />
                      <Text style={styles.controlBtnLabel}>Pause</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResumeRecording}
                      style={styles.controlIconBtn}
                      accessibilityLabel="Resume recording"
                    >
                      <Ionicons name="play" size={20} color={colors.primary} />
                      <Text style={styles.controlBtnLabel}>Resume</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleStopRecording}
                    style={styles.controlStopBtn}
                    accessibilityLabel="Stop and review recording"
                  >
                    <Ionicons name="stop" size={22} color="#FFFFFF" />
                    <Text style={styles.controlStopBtnText}>Stop & Review</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDiscardRecording}
                    style={styles.controlIconBtn}
                    accessibilityLabel="Cancel recording"
                  >
                    <Ionicons name="close" size={20} color={colors.error} />
                    <Text style={[styles.controlBtnLabel, { color: colors.error }]}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* STAGE 4: Review Recorded Audio */}
            {stage === 'REVIEW_AUDIO' ? (
              <View style={styles.reviewAudioCard}>
                <View style={styles.reviewAudioHeader}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.reviewAudioTitle}>
                    Audio Memo Captured ({formatSeconds(recordingSeconds)})
                  </Text>
                </View>

                <Text style={styles.reviewAudioHint}>
                  Listen to your recording before transcribing, or re-record if needed.
                </Text>

                {/* Audio Player Preview */}
                <View style={styles.playbackRow}>
                  <TouchableOpacity
                    onPress={handleTogglePlayAudio}
                    style={styles.playbackPlayBtn}
                    accessibilityLabel={playerStatus.playing ? 'Pause audio' : 'Play audio'}
                  >
                    <Ionicons
                      name={playerStatus.playing ? 'pause' : 'play'}
                      size={20}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  <View style={styles.playbackProgressContainer}>
                    <Text style={styles.playbackProgressText}>
                      {playerStatus.playing
                        ? `Playing ${Math.round(playerStatus.currentTime)}s / ${Math.round(playerStatus.duration || recordingSeconds)}s`
                        : `Ready to play (${Math.round(playerStatus.duration || recordingSeconds)}s total)`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleDiscardRecording}
                    style={styles.retryBtn}
                    accessibilityLabel="Re-record audio"
                  >
                    <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                    <Text style={styles.retryBtnText}>Re-record</Text>
                  </TouchableOpacity>
                </View>

                {/* Transcribe Action */}
                <TouchableOpacity
                  onPress={handleTranscribeAudio}
                  style={styles.primaryActionBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Transcribe & Create Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStage('EDITING_TRANSCRIPT')}
                  style={styles.textFallbackBtn}
                >
                  <Text style={styles.textFallbackBtnText}>Or skip to manual text editing</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STAGE 5: Transcribing Progress */}
            {stage === 'TRANSCRIBING' ? (
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.processingTitle}>Transcribing Spoken Audio with AI</Text>
                <Text style={styles.processingSub}>
                  Converting your actual recording into verbatim text using multimodal speech processing.
                </Text>
              </View>
            ) : null}

            {/* STAGE 6: Editable Transcript & Category Selection */}
            {stage === 'EDITING_TRANSCRIPT' ? (
              <View style={styles.transcriptCard}>
                <View style={styles.transcriptHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>VERIFIED TRANSCRIPT</Text>
                  {transcript ? (
                    <TouchableOpacity onPress={() => setTranscript('')}>
                      <Text style={styles.clearLinkText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.transcriptInstruction}>
                  Review and edit your spoken transcript below. You can correct any names, numbers, or specific terms before AI draft generation:
                </Text>

                <TextInput
                  style={styles.transcriptInput}
                  multiline
                  numberOfLines={5}
                  value={transcript}
                  onChangeText={setTranscript}
                  placeholder="Spoken words will appear here. You can also type or paste your campaign brief directly..."
                  placeholderTextColor={colors.textTertiary}
                  textAlignVertical="top"
                />

                {/* Category Selection */}
                <Text style={[styles.sectionHeaderTitle, { marginTop: spacing.md }]}>
                  CIVIC CAMPAIGN CATEGORY
                </Text>
                <View style={styles.categoryPillsWrap}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setSelectedCategory(cat)}
                      style={[
                        styles.categoryPill,
                        selectedCategory === cat && styles.categoryPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillText,
                          selectedCategory === cat && styles.categoryPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Additional Notes */}
                <Text style={[styles.sectionHeaderTitle, { marginTop: spacing.md }]}>
                  ADDITIONAL CONTEXT (OPTIONAL)
                </Text>
                <TextInput
                  style={styles.notesInput}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  placeholder="e.g. Specific town, meeting date, or municipal contact..."
                  placeholderTextColor={colors.textTertiary}
                />

                {/* Action: Generate with AI */}
                <TouchableOpacity
                  onPress={handleGenerateCampaignWithAi}
                  disabled={!transcript.trim()}
                  style={[
                    styles.primaryActionBtn,
                    !transcript.trim() && styles.primaryActionBtnDisabled,
                    { marginTop: spacing.md },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>Generate Campaign Draft with AI</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePopulateDraftAndOpen}
                  disabled={!transcript.trim()}
                  style={styles.secondaryActionBtn}
                >
                  <Text style={styles.secondaryActionBtnText}>
                    Skip AI Synthesis & Populate Draft Directly
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STAGE 7: Generating Draft Progress */}
            {stage === 'GENERATING_DRAFT' ? (
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={styles.processingTitle}>Generating Campaign Draft with AI</Text>
                <Text style={styles.processingSub}>
                  Structuring problem statements, public-interest objectives, ad creative, and reach plans strictly derived from your voice outline.
                </Text>
              </View>
            ) : null}

            {/* STAGE 8: AI Draft Preview */}
            {stage === 'PREVIEW_DRAFT' && aiDraftResult ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeaderRow}>
                  <View style={styles.aiBadge}>
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                    <Text style={styles.aiBadgeText}>AI-GENERATED DRAFT PREVIEW</Text>
                  </View>
                  <Text style={styles.modelTag}>{aiDraftResult.modelUsed || 'Gemini AI'}</Text>
                </View>

                {/* Campaign Title */}
                <Text style={styles.previewTitle}>{aiDraftResult.title}</Text>
                <View style={styles.categoryBadgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{aiDraftResult.category}</Text>
                  </View>
                  <Text style={styles.previewBudgetEstimate}>
                    Est. Media Pool: ${aiDraftResult.suggestedBudgetUSD?.toLocaleString('en-US') || '1,500'}
                  </Text>
                </View>

                {/* Summary */}
                <Text style={styles.previewFieldLabel}>CAMPAIGN SUMMARY</Text>
                <Text style={styles.previewFieldBody}>{aiDraftResult.summary}</Text>

                {/* Objective */}
                <Text style={styles.previewFieldLabel}>PUBLIC-INTEREST OBJECTIVE</Text>
                <Text style={styles.previewFieldBody}>{aiDraftResult.publicInterestObjective}</Text>

                {/* Ad Creative Preview */}
                <Text style={styles.previewFieldLabel}>ADVERTISING CREATIVE PREVIEW</Text>
                <View style={styles.adCreativeBox}>
                  <Text style={styles.adCreativeHeadline}>{aiDraftResult.adHeadline}</Text>
                  <Text style={styles.adCreativeCopy}>{aiDraftResult.adCopy}</Text>
                  <View style={styles.adCtaPill}>
                    <Text style={styles.adCtaText}>Amplify This Message</Text>
                  </View>
                </View>

                {/* Missing Info / Creator Action Required */}
                {aiDraftResult.missingInformation && aiDraftResult.missingInformation.length > 0 ? (
                  <View style={styles.missingInfoBox}>
                    <View style={styles.missingInfoHeader}>
                      <Ionicons name="alert-circle" size={16} color="#B45309" />
                      <Text style={styles.missingInfoTitle}>CREATOR ACTION REQUIRED (NOT FABRICATED):</Text>
                    </View>
                    <Text style={styles.missingInfoSub}>
                      The AI verified these details were not mentioned in your voice outline. You can enter them in the 5-step editor:
                    </Text>
                    {aiDraftResult.missingInformation.map((item, idx) => (
                      <View key={idx} style={styles.missingInfoItemRow}>
                        <Text style={styles.missingInfoBullet}>•</Text>
                        <Text style={styles.missingInfoItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Populate and Open Step 1 Action */}
                <TouchableOpacity
                  onPress={handlePopulateDraftAndOpen}
                  style={styles.primaryActionBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    Populate Draft & Open Step 1 (Basics)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setStage('EDITING_TRANSCRIPT')}
                  style={styles.secondaryActionBtn}
                >
                  <Text style={styles.secondaryActionBtnText}>Edit Transcript & Regenerate</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* STAGE 9: Error State */}
            {stage === 'ERROR' ? (
              <View style={styles.errorCard}>
                <Ionicons name="warning-outline" size={32} color={colors.error} />
                <Text style={styles.errorTitle}>Action Could Not Complete</Text>
                <Text style={styles.errorBody}>
                  {errorMessage || 'An error occurred during audio processing or AI generation.'}
                </Text>

                <View style={styles.errorActionsRow}>
                  <Button
                    title="Retry Recording"
                    variant="primary"
                    onPress={handleDiscardRecording}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Enter Text Manually"
                    variant="outline"
                    onPress={() => setStage('EDITING_TRANSCRIPT')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '92%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  micCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 16,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: spacing.md,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: colors.primarySurface,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  noticeText: {
    ...typography.bodySmall,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 18,
    fontSize: 12,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  permissionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  permissionDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  micRecordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.modal,
  },
  micPromptTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: 4,
  },
  micPromptSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  manualTextLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  manualTextLinkText: {
    ...typography.labelMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  recordingActiveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  recordingTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  recordingDotPaused: {
    backgroundColor: colors.warning,
  },
  recordingTimerText: {
    ...typography.headingMedium,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordingStatusLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  recordingControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    gap: spacing.sm,
  },
  controlIconBtn: {
    alignItems: 'center',
    padding: spacing.sm,
    minWidth: 64,
  },
  controlBtnLabel: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  controlStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  controlStopBtnText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reviewAudioCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  reviewAudioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reviewAudioTitle: {
    ...typography.headingSmall,
    fontSize: 15,
    color: colors.textPrimary,
  },
  reviewAudioHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  playbackPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playbackProgressContainer: {
    flex: 1,
  },
  playbackProgressText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  retryBtnText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radii.md,
    minHeight: 48,
    ...shadows.card,
  },
  primaryActionBtnDisabled: {
    opacity: 0.5,
  },
  primaryActionBtnText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: spacing.xs,
  },
  secondaryActionBtnText: {
    ...typography.labelMedium,
    color: colors.textSecondary,
  },
  textFallbackBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  textFallbackBtnText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  processingCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  processingTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontSize: 16,
    textAlign: 'center',
  },
  processingSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  transcriptHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    ...typography.labelSmall,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.8,
  },
  clearLinkText: {
    ...typography.labelSmall,
    color: colors.error,
    fontWeight: '600',
  },
  transcriptInstruction: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  transcriptInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: 110,
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  categoryPillActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.labelSmall,
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginTop: spacing.xs,
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aiBadgeText: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  modelTag: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.textTertiary,
  },
  previewTitle: {
    ...typography.headingSmall,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  previewBudgetEstimate: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  previewFieldLabel: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  previewFieldBody: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  adCreativeBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  adCreativeHeadline: {
    ...typography.headingSmall,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  adCreativeCopy: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  adCtaPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  adCtaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  missingInfoBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginVertical: spacing.md,
  },
  missingInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  missingInfoTitle: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  missingInfoSub: {
    ...typography.bodySmall,
    fontSize: 11,
    color: '#92400E',
    marginBottom: 6,
    lineHeight: 16,
  },
  missingInfoItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 2,
  },
  missingInfoBullet: {
    color: '#B45309',
    fontSize: 12,
    lineHeight: 16,
  },
  missingInfoItemText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorTitle: {
    ...typography.headingSmall,
    color: colors.error,
    fontSize: 16,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  errorBody: {
    ...typography.bodySmall,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
});
