import React from 'react';
import Svg from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { iconArt, type IconName } from './iconArt';

interface Props {
  name: IconName;
  size?: number;
  /** for an icon that means something on its own; without it, the icon is hidden from screen readers */
  accessibilityLabel?: string;
}

export function AppIcon({ name, size = 24, accessibilityLabel }: Props) {
  const { theme } = useTheme();
  const a11y = accessibilityLabel ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel } : { accessibilityElementsHidden: true, importantForAccessibility: 'no' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" {...a11y}>
      {iconArt(name, theme.colors.primary)}
    </Svg>
  );
}
