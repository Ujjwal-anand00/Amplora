import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, touchTargets } from '../../theme';

interface IconButtonProps {
  onPress: () => void;
  icon: React.ReactNode;
  accessibilityLabel: string;
  variant?: 'ghost' | 'surface' | 'primary';
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  icon,
  accessibilityLabel,
  variant = 'ghost',
  size = touchTargets.minTouchTarget,
  style,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radii.pill },
        variant === 'surface' && styles.surface,
        variant === 'primary' && styles.primary,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
});
