import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, typography, radii, spacing, touchTargets } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (fullWidth) list.push(styles.fullWidth);

    // Size
    switch (size) {
      case 'sm':
        list.push(styles.sizeSm);
        break;
      case 'lg':
        list.push(styles.sizeLg);
        break;
      case 'md':
      default:
        list.push(styles.sizeMd);
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        list.push(styles.secondary);
        break;
      case 'accent':
        list.push(styles.accent);
        break;
      case 'ghost':
        list.push(styles.ghost);
        break;
      case 'outline':
        list.push(styles.outline);
        break;
      case 'primary':
      default:
        list.push(styles.primary);
        break;
    }

    if (disabled) list.push(styles.disabled);
    if (style) list.push(style);

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText];

    switch (size) {
      case 'sm':
        list.push(typography.labelMedium);
        break;
      case 'lg':
        list.push(typography.labelLarge);
        break;
      case 'md':
      default:
        list.push(typography.labelMedium);
        break;
    }

    switch (variant) {
      case 'secondary':
        list.push(styles.secondaryText);
        break;
      case 'accent':
        list.push(styles.accentText);
        break;
      case 'ghost':
        list.push(styles.ghostText);
        break;
      case 'outline':
        list.push(styles.outlineText);
        break;
      case 'primary':
      default:
        list.push(styles.primaryText);
        break;
    }

    if (disabled) list.push(styles.disabledText);
    if (textStyle) list.push(textStyle);

    return list;
  };

  const spinnerColor =
    variant === 'primary' ? colors.textInverse : variant === 'accent' ? colors.primaryDark : colors.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyle()}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTargets.minTouchTarget,
    minWidth: touchTargets.minTouchTarget,
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: touchTargets.minTouchTarget,
  },
  sizeMd: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    minHeight: 46,
  },
  sizeLg: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    minHeight: 52,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  disabled: {
    opacity: 0.45,
  },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },

  // Text
  baseText: {
    textAlign: 'center',
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  accentText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  disabledText: {
    color: colors.textSecondary,
  },
});
