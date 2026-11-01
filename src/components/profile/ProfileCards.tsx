import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText, Card, Row } from '@/components/ui';
import { useDerived } from '@/features/derived';
import { AppIcon } from '@/icons/AppIcon';
import { HabitIcon } from '@/icons/HabitIcon';
import type { IconName } from '@/icons/iconArt';
import { milestoneProgress } from '@/lib/profileActivity';
import { effectiveStatus, isScheduledOn, MILESTONES } from '@/lib/scoring';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const CARD_WIDTH = 184;
const HABIT_SIZE = 36;

function SectionCard({ icon, title, status, children }: { icon: IconName; title: string; status: string; children?: React.ReactNode }) {
  return (
    <Card testID="profile-card" style={{ width: CARD_WIDTH, padding: spacing.md, gap: spacing.md }}>
      <Row style={{ gap: spacing.sm }}>
        <AppIcon name={icon} size={24} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" accessibilityRole="header" numberOfLines={1}>{title}</AppText>
          <AppText variant="caption" muted numberOfLines={1}>{status}</AppText>
        </View>
      </Row>
      {children}
    </Card>
  );
}

function Achievements() {
  const d = useDerived();
  const earned = MILESTONES.filter((m) => d.longestStreak >= m).length;
  return (
    <SectionCard icon="flame" title="Achievements" status={`${earned} of ${MILESTONES.length} earned`}>
      <Row style={{ justifyContent: 'space-between' }}>
        {MILESTONES.map((m) => {
          const on = d.longestStreak >= m;
          return (
            <View key={m} accessible accessibilityLabel={`${m} day streak, ${on ? 'earned' : 'not earned yet'}`} style={{ alignItems: 'center', gap: 2, opacity: on ? 1 : 0.35 }}>
              <AppIcon name="flame" size={22} />
              <AppText variant="caption" muted={!on}>{m}</AppText>
            </View>
          );
        })}
      </Row>
    </SectionCard>
  );
}

function TodaysHabits() {
  const d = useDerived();
  const router = useRouter();
  const { theme } = useTheme();
  const habits = d.activeHabits.filter((h) => isScheduledOn(h, d.today));
  const isDone = (id: string, h: (typeof habits)[number]) => effectiveStatus(h, d.logIndex.get(`${id}:${d.today}`)) === 'complete';
  const done = habits.filter((h) => isDone(h.id, h)).length;
  return (
    <SectionCard icon="check" title="Today's habits" status={habits.length ? `${done} of ${habits.length} done` : 'Nothing scheduled'}>
      {habits.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {habits.map((h) => {
            const on = isDone(h.id, h);
            return (
              <Pressable
                key={h.id}
                onPress={() => router.push(`/habit/${h.id}`)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${h.title}, ${on ? 'done' : 'not done yet'}`}
                style={{ width: HABIT_SIZE, height: HABIT_SIZE, borderRadius: HABIT_SIZE / 2, borderWidth: 2, borderColor: on ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.colors.tint : 'transparent' }}
              >
                <HabitIcon icon={h.icon} size={20} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </SectionCard>
  );
}

function NextMilestone() {
  const d = useDerived();
  const { theme } = useTheme();
  const p = milestoneProgress(d.currentStreak);
  if (p.next === null) return <SectionCard icon="sparkles" title="Next milestone" status="All reached" />;
  const days = `${p.remaining} ${p.remaining === 1 ? 'day' : 'days'}`;
  return (
    <SectionCard icon="sparkles" title="Next milestone" status={`${days} to go`}>
      <View style={{ gap: spacing.xs }} accessible accessibilityLabel={`${days} to your ${p.next}-day badge`}>
        <AppText variant="caption">{p.next}-day badge</AppText>
        <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.colors.tint }}>
          <View style={{ width: `${p.percent}%`, height: '100%', backgroundColor: theme.colors.accent }} />
        </View>
        <AppText variant="caption" muted>Streak: {d.currentStreak} {d.currentStreak === 1 ? 'day' : 'days'}</AppText>
      </View>
    </SectionCard>
  );
}

function Discover() {
  return (
    <SectionCard icon="eyes" title="Discover people" status="Coming soon">
      <AppText variant="caption" muted>You&apos;ll be able to find and follow people here.</AppText>
    </SectionCard>
  );
}

/** The owner's own sections, as a sideways row of cards. They use private progress data, so don't reuse them for other people's profiles as they are. */
export function ProfileCards() {
  return (
    // The side and vertical padding stop the cards' shadows being clipped by the scroll view.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, marginVertical: -spacing.md }} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
      <Achievements />
      <TodaysHabits />
      <NextMilestone />
      <Discover />
    </ScrollView>
  );
}
