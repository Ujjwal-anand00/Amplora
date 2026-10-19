import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography, spacing } from '../../theme';

export type AmploraLogoVariant = 'primary' | 'compact' | 'stacked' | 'symbol' | 'wordmark';
export type AmploraColorMode = 'blue' | 'white' | 'navy';

interface AmploraLogoProps {
  variant?: AmploraLogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  colorMode?: AmploraColorMode;
  showTagline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AmploraLogo: React.FC<AmploraLogoProps> = ({
  variant = 'primary',
  size = 'md',
  colorMode = 'blue',
  showTagline = false,
  style,
}) => {
  // Determine pixel size based on size prop
  let pixelSize = 36;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm':
        pixelSize = 24;
        break;
      case 'md':
        pixelSize = 32;
        break;
      case 'lg':
        pixelSize = 44;
        break;
      case 'xl':
        pixelSize = 60;
        break;
    }
  }

  const isWhite = colorMode === 'white';
  const isNavy = colorMode === 'navy';

  const primaryColor = isWhite ? '#FFFFFF' : isNavy ? '#172B4D' : '#2563EB';
  const midColor = isWhite ? '#E0EEFF' : isNavy ? '#1E3A8A' : '#3B82F6';
  const accentColor = isWhite ? '#BFDBFE' : isNavy ? '#2563EB' : '#60A5FA';
  const echoColor = isWhite ? 'rgba(255,255,255,0.65)' : isNavy ? 'rgba(23,43,77,0.4)' : '#BFDBFE';
  const textColor = isWhite ? '#FFFFFF' : '#172B4D';
  const taglineColor = isWhite ? 'rgba(255,255,255,0.8)' : '#64748B';

  const renderSymbol = () => {
    return (
      <Svg width={pixelSize} height={pixelSize} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="amploraCoreGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={isWhite ? '#FFFFFF' : '#3B82F6'} />
            <Stop offset="100%" stopColor={primaryColor} />
          </LinearGradient>
        </Defs>

        {/* Central Core Beacon */}
        <Circle cx="36" cy="50" r="10" fill="url(#amploraCoreGrad)" />
        <Circle cx="33" cy="47" r="3.5" fill={isWhite ? 'rgba(255,255,255,0.8)' : '#FFFFFF'} />

        {/* Wave 1: Inner Forward Wave Arc */}
        <Path
          d="M 52 32 A 22 22 0 0 1 52 68"
          stroke={primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Wave 2: Mid Forward Wave Arc */}
        <Path
          d="M 64 21 A 37 37 0 0 1 64 79"
          stroke={midColor}
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Wave 3: Outer Forward Wave Arc */}
        <Path
          d="M 77 10 A 52 52 0 0 1 77 90"
          stroke={accentColor}
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Reverse Echo Harmonic Arc */}
        <Path
          d="M 23 37 A 18 18 0 0 0 23 63"
          stroke={echoColor}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </Svg>
    );
  };

  const wordmarkFontSize = Math.round(pixelSize * 0.72);
  const taglineFontSize = Math.max(10, Math.round(pixelSize * 0.28));

  if (variant === 'compact' || variant === 'symbol') {
    return <View style={[styles.compactContainer, style]}>{renderSymbol()}</View>;
  }

  if (variant === 'wordmark') {
    return (
      <View style={[styles.wordmarkContainer, style]}>
        <Text style={[styles.brandWordmark, { color: textColor, fontSize: wordmarkFontSize }]}>
          Amplora
        </Text>
        {showTagline && (
          <Text style={[styles.brandTagline, { color: taglineColor, fontSize: taglineFontSize }]}>
            Good messages. Greater reach.
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'stacked') {
    return (
      <View style={[styles.stackedContainer, style]}>
        <View style={styles.symbolBox}>{renderSymbol()}</View>
        <Text style={[styles.brandWordmark, { color: textColor, fontSize: wordmarkFontSize, marginTop: 8 }]}>
          Amplora
        </Text>
        {(showTagline || true) && (
          <Text style={[styles.brandTagline, { color: taglineColor, fontSize: taglineFontSize, marginTop: 4 }]}>
            Good messages. Greater reach.
          </Text>
        )}
      </View>
    );
  }

  // Primary: Horizontal row (Symbol + Wordmark + optional Tagline)
  return (
    <View style={[styles.primaryContainer, style]}>
      <View style={styles.symbolBox}>{renderSymbol()}</View>
      <View style={styles.textColumn}>
        <Text style={[styles.brandWordmark, { color: textColor, fontSize: wordmarkFontSize }]}>
          Amplora
        </Text>
        {showTagline && (
          <Text style={[styles.brandTagline, { color: taglineColor, fontSize: taglineFontSize }]}>
            Good messages. Greater reach.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkContainer: {
    alignItems: 'flex-start',
  },
  stackedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  brandWordmark: {
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
