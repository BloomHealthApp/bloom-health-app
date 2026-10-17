import React from 'react';
import { Pressable, View } from 'react-native';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from './ui';

export function heatLevel(percent: number | null, threshold: number): 0 | 1 | 2 | 3 | 4 {
  if (percent === null || percent <= 0) return 0;
  if (percent >= 100) return 4;
  if (percent >= threshold) return 3;
  if (percent >= threshold / 2) return 2;
  return 1;
}

interface Props {
  date: string;
  day: number;
  percent: number | null; // null = no eligible habits / no data
  threshold: number;
  isToday: boolean;
  isFuture: boolean;
  restDay: boolean;
  label: string;
  onPress: () => void;
}

export function CalendarDayCell({ day, percent, threshold, isToday, isFuture, restDay, label, onPress }: Props) {
  const { theme } = useTheme();
  const lvl = isFuture ? 0 : heatLevel(percent, threshold);
  const strong = lvl >= 3;
  const a11y = isFuture ? `${label}, upcoming` : `${label}, ${percent === null ? 'no data' : Math.round(percent) + ' percent'}${restDay ? ', rest day' : ''}${percent !== null && percent >= threshold ? ', goal met' : ''}`;
  return (
    <View style={{ width: `${100 / 7}%`, padding: 2 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={{
          minHeight: 44,
          aspectRatio: 1,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFuture ? 'transparent' : theme.colors.heat[lvl],
          borderWidth: isToday ? 2 : restDay ? 1 : 0,
          borderStyle: restDay && !isToday ? 'dashed' : 'solid',
          borderColor: isToday ? theme.colors.accent : theme.colors.border,
        }}
      >
        <AppText variant="label" style={{ fontFamily: strong ? fonts.heavy : fonts.semibold, color: strong ? '#FFFFFF' : isFuture ? theme.colors.textMuted : theme.colors.text }}>{day}</AppText>
      </Pressable>
    </View>
  );
}
