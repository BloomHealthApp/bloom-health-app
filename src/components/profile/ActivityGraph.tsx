import React, { useMemo, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Rect, Svg } from 'react-native-svg';
import { heatLevel } from '@/components/CalendarDayCell';
import { AppText, Card, Row } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { activityWeeks, monthLabels } from '@/lib/profileActivity';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const DAY_LABEL_WIDTH = 28;
const MONTH_ROW = 16;

/** A year of daily progress, GitHub style. It's one SVG rather than ~370 views, because this sits on a main tab. */
export function ActivityGraph() {
  const d = useDerived();
  const { theme } = useTheme();
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const weeks = useMemo(() => activityWeeks(d.today, WEEKS), [d.today]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);
  const heat = theme.colors.heat;
  const width = weeks.length * STEP - GAP;
  const height = 7 * STEP - GAP;
  return (
    <Card style={{ gap: spacing.sm }} accessible accessibilityLabel="Your daily progress over the last year. Darker days had more habits done.">
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ width: DAY_LABEL_WIDTH, marginTop: MONTH_ROW }}>
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
            <View key={i} style={{ height: STEP, justifyContent: 'center' }}>
              <AppText variant="caption" muted style={{ fontSize: 9, lineHeight: 11 }}>{day}</AppText>
            </View>
          ))}
        </View>
        <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
          <View style={{ width }}>
            <View style={{ height: MONTH_ROW }}>
              {months.map((m) => (
                <AppText key={m.week} variant="caption" muted style={{ position: 'absolute', left: m.week * STEP, fontSize: 10, lineHeight: 13 }}>{m.label}</AppText>
              ))}
            </View>
            <Svg width={width} height={height}>
              {weeks.flatMap((week, w) =>
                week.map((date, i) => {
                  if (!date) return null;
                  const s = d.scoreFor(date);
                  const lvl = heatLevel(s.neutral && !s.restDay ? null : s.completionPercent, d.threshold);
                  return <Rect key={date} x={w * STEP} y={i * STEP} width={CELL} height={CELL} rx={2.5} fill={heat[lvl]} />;
                }),
              )}
            </Svg>
          </View>
        </ScrollView>
      </Row>
      <Row style={{ justifyContent: 'flex-end', gap: spacing.xs }}>
        <AppText variant="caption" muted style={{ fontSize: 10, lineHeight: 13 }}>Less</AppText>
        {heat.map((color, i) => <View key={i} style={{ width: CELL, height: CELL, borderRadius: 2.5, backgroundColor: color }} />)}
        <AppText variant="caption" muted style={{ fontSize: 10, lineHeight: 13 }}>More</AppText>
      </Row>
    </Card>
  );
}
