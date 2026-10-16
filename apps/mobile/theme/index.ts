import { colors } from './colors';
import { typography } from './typography';
import { spacing, touchTargets } from './spacing';
import { radii } from './radii';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  touchTargets,
  radii,
  shadows,
};

export type Theme = typeof theme;

export { colors, typography, spacing, touchTargets, radii, shadows };
