import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, typography, spacing } from '../../theme';

interface CampaignImageProps {
  source: string;
  category?: string;
  style?: ViewStyle | ImageStyle;
  borderRadius?: number;
  aspectRatio?: number;
}

export const CampaignImage: React.FC<CampaignImageProps> = ({
  source,
  category = 'Advocacy',
  style,
  borderRadius = radii.lg,
  aspectRatio,
}) => {
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <View
      style={[
        styles.container,
        { borderRadius },
        aspectRatio ? { aspectRatio } : undefined,
        style,
      ]}
    >
      {!hasError && source ? (
        <>
          <Image
            source={{ uri: source }}
            style={[styles.image, { borderRadius }]}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
          {loading && (
            <View style={[styles.loadingOverlay, { borderRadius }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </>
      ) : (
        /* Polished Fallback with Category Badge & Icon */
        <View style={[styles.fallbackContainer, { borderRadius }]}>
          <View style={styles.fallbackIconCircle}>
            <Ionicons name="megaphone-outline" size={26} color={colors.primary} />
          </View>
          <Text style={styles.fallbackCategory}>{category.toUpperCase()}</Text>
          <Text style={styles.fallbackSub}>Public Interest Campaign</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EAE7DF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  fallbackIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fallbackCategory: {
    ...typography.labelSmall,
    color: colors.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  fallbackSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
