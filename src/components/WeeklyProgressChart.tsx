import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export interface BarDatum {
  label: string;
  percent: number;
  successful: boolean;
  /** neutral (rest/no-data) days draw a faint stub */
  muted?: boolean;
  /** rest day (Sunday, chosen weekday or any other neutral day): drawn as a soft cell, never with a reason */
  rest?: boolean;
}

/** Bar chart of daily completion %. Used for the week (7 bars) and month (28-31 thin bars) views. */
export function WeeklyProgressChart({ data, threshold, height = 180, summaryLabel, showLabels = true }: { data: BarDatum[]; threshold: number; height?: number; summaryLabel: string; showLabels?: boolean }) {
  const { theme } = useTheme();
  const [w, setW] = useState(300);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const padBottom = showLabels ? 22 : 6;
  const padTop = 8;
  const chartH = height - padBottom - padTop;
  const n = Math.max(1, data.length);
  const slot = w / n;
  const barW = Math.max(3, Math.min(34, slot * 0.62));
  const y = (p: number) => padTop + chartH * (1 - Math.max(0, Math.min(100, p)) / 100);
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={summaryLabel}>
      <Svg width={w} height={height}>
        <Line x1={0} x2={w} y1={y(100)} y2={y(100)} stroke={theme.colors.border} strokeWidth={1} />
        <Line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={theme.colors.border} strokeWidth={1} />
        {data.map((d, i) =>
          d.rest ? <Rect key={`r${i}`} x={i * slot + 1} y={padTop} width={Math.max(2, slot - 2)} height={chartH} rx={Math.min(8, slot / 2)} fill={theme.colors.secondary} opacity={0.45} /> : null,
        )}
        {data.map((d, i) => {
          const x = i * slot + (slot - barW) / 2;
          const top = y(d.percent);
          const h = Math.max(d.percent > 0 ? 3 : 2, y(0) - top);
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y(0) - h} width={barW} height={h} rx={Math.min(8, barW / 2)} fill={d.muted ? theme.colors.border : d.successful ? theme.colors.primary : theme.colors.secondary} />
              {showLabels ? (
                <SvgText x={x + barW / 2} y={height - 6} fontSize={12} fontFamily={fonts.semibold} fill={theme.colors.textMuted} textAnchor="middle">
                  {d.label}
                </SvgText>
              ) : null}
            </React.Fragment>
          );
        })}
        <Line x1={0} x2={w} y1={y(threshold)} y2={y(threshold)} stroke={theme.colors.accent} strokeWidth={1.5} strokeDasharray="6 5" />
        <SvgText x={w - 2} y={y(threshold) - 4} fontSize={11} fontFamily={fonts.bold} fill={theme.colors.accent} textAnchor="end">
          goal {threshold}%
        </SvgText>
      </Svg>
    </View>
  );
}
