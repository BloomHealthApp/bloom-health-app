import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CalendarDayCell } from '@/components/CalendarDayCell';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusChip } from '@/components/SyncStatusChip';
import { ViewerBanner } from '@/components/ViewerBanner';
import { AppText, Button, Card, Loading, PageHeader, Row, Screen } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { useSyncOnFocus } from '@/features/useSyncOnFocus';
import { chunkWeeks, monthBounds, monthName, prettyDate, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates';
import { useData, useSyncStatus } from '@/providers/DataProvider';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function CalendarTab() {
  const d = useDerived();
  const router = useRouter();
  const { theme } = useTheme();
  const { syncNow } = useData();
  const sync = useSyncStatus();
  useSyncOnFocus();
  const [offset, setOffset] = useState(0);

  const { year, month, weeks } = useMemo(() => {
    const [y, m] = d.today.split('-').map(Number);
    const idx = y * 12 + (m - 1) + offset;
    const yy = Math.floor(idx / 12);
    const mm = (idx % 12) + 1;
    const { from, to } = monthBounds(yy, mm);
    const lead = weekdayOf(from); // Sunday-first grid
    const count = Number(to.slice(8));
    const out: ({ date: string; day: number } | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= count; i++) out.push({ date: `${yy}-${String(mm).padStart(2, '0')}-${String(i).padStart(2, '0')}`, day: i });
    return { year: yy, month: mm, weeks: chunkWeeks(out) };
  }, [d.today, offset]);

  return (
    <Screen onRefresh={() => void syncNow()} refreshing={sync.state === 'syncing'}>
      <PageHeader title="Calendar" subtitle="Your month, at a glance" right={<SyncStatusChip onPress={() => router.push('/sync-issues')} />} />
      <ViewerBanner />
      <Row style={{ justifyContent: 'space-between' }}>
        <Button title="‹" variant="secondary" onPress={() => setOffset((o) => o - 1)} accessibilityLabel="Previous month" style={{ paddingHorizontal: spacing.lg }} />
        <AppText variant="heading" accessibilityLiveRegion="polite">{monthName(month)} {year}</AppText>
        <Button title="›" variant="secondary" disabled={offset >= 0} onPress={() => setOffset((o) => o + 1)} accessibilityLabel="Next month" style={{ paddingHorizontal: spacing.lg }} />
      </Row>
      {d.loading ? (
        <Loading />
      ) : d.logs.length === 0 && d.activeHabits.length === 0 ? (
        <EmptyState mood="thinking" title="Nothing here yet" message="Your heatmap will fill in as days are logged." />
      ) : (
        <Card>
          <Row>
            {WEEKDAY_SHORT.map((w, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingBottom: 6 }} accessibilityElementsHidden importantForAccessibility="no">
                <AppText variant="caption" muted>{w}</AppText>
              </View>
            ))}
          </Row>
          {weeks.map((week, w) => (
            <Row key={w}>
              {week.map((c, i) => {
                if (!c) return <View key={`e${i}`} style={{ flex: 1 }} />;
                const s = d.scoreFor(c.date);
                return (
                  <CalendarDayCell
                    key={c.date}
                    date={c.date}
                    day={c.day}
                    percent={s.neutral && !s.restDay ? null : s.completionPercent}
                    threshold={d.threshold}
                    isToday={c.date === d.today}
                    isFuture={c.date > d.today}
                    restDay={s.restDay}
                    label={prettyDate(c.date)}
                    onPress={() => router.push({ pathname: '/day/[date]', params: { date: c.date } })}
                  />
                );
              })}
            </Row>
          ))}
        </Card>
      )}
      <Row style={{ gap: spacing.sm, justifyContent: 'center' }} accessibilityLabel="Legend: darker means more habits completed" accessible>
        <AppText variant="caption" muted>Less</AppText>
        {[0, 1, 2, 3, 4].map((l) => (
          <View key={l} style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: theme.colors.heat[l] }} />
        ))}
        <AppText variant="caption" muted>More</AppText>
      </Row>
      <AppText variant="caption" muted style={{ textAlign: 'center' }}>Soft dashed cell = rest day · goal {d.threshold}%</AppText>
    </Screen>
  );
}
