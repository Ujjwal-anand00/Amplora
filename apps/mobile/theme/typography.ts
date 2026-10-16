import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  // Editorial display & headers
  displayLarge: {
    fontFamily,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.6,
  },
  displayMedium: {
    fontFamily,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.4,
  },
  headingLarge: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
  headingMedium: {
    fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  headingSmall: {
    fontFamily,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },

  // Body text
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodyMedium: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  bodySmall: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
  },

  // Labels & Actions
  labelLarge: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },

  // Numerical metrics
  metricLarge: {
    fontFamily,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  metricMedium: {
    fontFamily,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
};

export type Typography = typeof typography;
