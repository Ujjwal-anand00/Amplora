import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme';
import { Button } from '../ui/Button';
import {
  SAMPLE_VOICE_TRANSCRIPTS,
  parseVoiceTranscriptToDraft,
} from '../../services/voiceRecognition';
import { CampaignDraft } from '../../types/draft';

interface VoiceAssistedModalProps {
  visible: boolean;
  onClose: () => void;
  onDraftCreated: (draft: CampaignDraft) => void;
}

export function VoiceAssistedModal({
  visible,
  onClose,
  onDraftCreated,
}: VoiceAssistedModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  const handleStartSimulatedListening = (sampleText: string) => {
    setIsListening(true);
    setTranscript('Listening for creator outline...');

    setTimeout(() => {
      setTranscript(sampleText);
      setIsListening(false);
    }, 1500);
  };

  const handleSelectScenario = (sample: typeof SAMPLE_VOICE_TRANSCRIPTS[0]) => {
    handleStartSimulatedListening(sample.transcript);
  };

  const handleConvertAndOpen = () => {
    if (!transcript.trim()) return;
    const newDraft = parseVoiceTranscriptToDraft(transcript, 'voice');
    onDraftCreated(newDraft);
    onClose();
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
                <Text style={styles.title}>Voice-Assisted Creation</Text>
                <Text style={styles.subtitle}>Speech-to-draft narrative structuring</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Transparent Speech Standard Notice */}
            <View style={styles.noticeBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Speak naturally for up to 60 seconds about your community issue. Voice input structures your initial draft. You will review and edit every claim in the 5-step editor before review.
              </Text>
            </View>

            {/* Mic Pulse Button */}
            <View style={styles.micSection}>
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <TouchableOpacity
                onPress={() => {
                  if (isListening) {
                    setIsListening(false);
                  } else {
                    handleStartSimulatedListening(
                      SAMPLE_VOICE_TRANSCRIPTS[0].transcript
                    );
                  }
                }}
                style={[styles.micBigButton, isListening && styles.micBigButtonActive]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isListening ? 'radio' : 'mic'}
                  size={32}
                  color={colors.textInverse}
                />
              </TouchableOpacity>
              <Text style={styles.micStatusText}>
                {isListening ? 'Listening to speech memo...' : 'Tap to Record Voice Outline'}
              </Text>
            </View>

            {/* Editable Transcript Area */}
            <View style={styles.transcriptBox}>
              <View style={styles.transcriptHeader}>
                <Text style={styles.transcriptLabel}>RECOGNIZED TRANSCRIPTION</Text>
                {transcript ? (
                  <TouchableOpacity onPress={() => setTranscript('')}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextInput
                style={styles.transcriptInput}
                placeholder="Spoken words will appear here. You can also type or edit directly..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                value={transcript}
                onChangeText={setTranscript}
              />
            </View>

            {/* Demo Audio Topics */}
            <Text style={styles.sampleHeader}>Or test with simulated audio memos:</Text>
            <View style={styles.scenarioList}>
              {SAMPLE_VOICE_TRANSCRIPTS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => handleSelectScenario(s)}
                  style={styles.scenarioItem}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scenarioTitle}>{s.topic}</Text>
                    <Text style={styles.scenarioSub} numberOfLines={1}>{s.extractedTitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Bottom Convert Action */}
            <Button
              title="Populate Draft & Open Step 1 (Basics)"
              variant="primary"
              size="lg"
              disabled={!transcript.trim() || isListening}
              onPress={handleConvertAndOpen}
              style={{ marginTop: spacing.md }}
              fullWidth
            />
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
    maxHeight: '90%',
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
  },
  micCircle: {
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
  },
  noticeText: {
    ...typography.bodySmall,
    color: colors.primaryLight,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  // Mic section
  micSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySurface,
  },
  micBigButton: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  micBigButtonActive: {
    backgroundColor: colors.error,
  },
  micStatusText: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },

  // Transcript
  transcriptBox: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  transcriptLabel: {
    ...typography.labelSmall,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  clearText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
  transcriptInput: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  sampleHeader: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scenarioList: {
    gap: 6,
  },
  scenarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  scenarioTitle: {
    ...typography.labelMedium,
    color: colors.textPrimary,
    fontSize: 13,
  },
  scenarioSub: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontSize: 11,
  },
});
