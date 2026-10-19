import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '../../theme';

interface GeminiButtonProps {
  onPress: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export const GeminiButton: React.FC<GeminiButtonProps> = ({
  onPress,
  label = 'Create campaign with AI',
  loading = false,
  disabled = false,
  variant = 'subtle',
  size = 'md',
  style,
}) => {
  const isOutline = variant === 'outline';
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonBase,
        size === 'sm' ? styles.btnSm : styles.btnMd,
        isPrimary && styles.btnPrimary,
        isOutline && styles.btnOutline,
        variant === 'subtle' && styles.btnSubtle,
        (disabled || loading) && styles.btnDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isPrimary ? colors.textInverse : colors.primary}
            style={styles.spinner}
          />
        ) : (
          <View style={[styles.sparkleBox, isPrimary && styles.sparkleBoxPrimary]}>
            <Ionicons
              name="sparkles"
              size={size === 'sm' ? 14 : 16}
              color={isPrimary ? colors.accent : colors.primary}
            />
          </View>
        )}
        <Text
          style={[
            styles.label,
            size === 'sm' ? styles.labelSm : styles.labelMd,
            isPrimary && styles.labelPrimary,
            isOutline && styles.labelOutline,
            variant === 'subtle' && styles.labelSubtle,
          ]}
        >
          {loading ? 'Generating with AI...' : label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnSm: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minHeight: 36,
  },
  btnMd: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    minHeight: 46,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  btnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  btnSubtle: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBox: {
    marginRight: 6,
  },
  sparkleBoxPrimary: {
    marginRight: 6,
  },
  spinner: {
    marginRight: 6,
  },
  label: {
    fontWeight: '700',
  },
  labelSm: {
    ...typography.labelSmall,
    fontSize: 12,
  },
  labelMd: {
    ...typography.labelMedium,
    fontSize: 13,
  },
  labelPrimary: {
    color: colors.textInverse,
  },
  labelOutline: {
    color: colors.primary,
  },
  labelSubtle: {
    color: colors.primary,
  },
});
