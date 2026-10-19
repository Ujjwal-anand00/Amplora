import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, typography } from '../../theme';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  isGuest?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 40,
  style,
  isGuest = false,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [source]);

  const cleanName = (name || '').trim();
  const initials = cleanName
    ? cleanName
        .split(/\s+/)
        .map(p => p[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const borderRadius = size / 2;
  const fontSize = Math.max(12, Math.floor(size * 0.38));

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      {source && !imageError ? (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      ) : isGuest || !cleanName ? (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius, backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Ionicons name="person" size={Math.floor(size * 0.5)} color={colors.textSecondary} />
        </View>
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius, backgroundColor: colors.primarySurface },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              styles.initialsText,
              { fontSize, color: colors.primary },
            ]}
          >
            {initials}
          </Text>
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
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

