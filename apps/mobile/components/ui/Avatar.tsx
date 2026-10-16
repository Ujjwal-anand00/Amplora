import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, typography } from '../../theme';

interface AvatarProps {
  source?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 40,
  style,
}) => {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: radii.pill },
        style,
      ]}
    >
      {source ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: size, height: size, borderRadius: radii.pill }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: radii.pill },
          ]}
        >
          <Text style={[typography.labelMedium, styles.initialsText]}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
