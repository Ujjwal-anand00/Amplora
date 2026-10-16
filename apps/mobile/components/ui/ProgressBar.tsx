import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0 to 1 (or 0 to 100)
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 6,
  trackColor = colors.surfaceSubtle,
  fillColor = colors.primary,
  style,
}) => {
  // Normalize value between 0 and 1
  const normalized = Math.min(Math.max(progress > 1 ? progress / 100 : progress, 0), 1);
  const percentage = `${Math.round(normalized * 100)}%` as const;

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: radii.pill },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: percentage,
            height,
            backgroundColor: fillColor,
            borderRadius: radii.pill,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
