import { useRouter } from 'expo-router';
import { HabitIcon } from '@/icons/HabitIcon';
import React from 'react';
import { Pressable, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AppText, Button, Card, Row, Screen } from '@/components/ui';
import { useActions } from '@/features/actions';
import { describeTarget } from '@/lib/format';
import { useHabits } from '@/providers/DataProvider';
import { MIN_TOUCH, spacing } from '@/theme/tokens';

export default function ManageHabits() {
  const router = useRouter();
  const { habits } = useHabits();
  const { isOwner } = useActions();
  return (
    <Screen header={<ScreenHeader title="Habits" />}>
      {isOwner ? <Button title="Add custom habit" onPress={() => router.push('/habit/form')} /> : <AppText muted>Only the owner can change habits.</AppText>}
      {habits.length === 0 ? <EmptyState title="No habits yet" mood="thinking" /> : null}
      <View style={{ gap: spacing.sm }}>
        {habits.map((h) => (
          <Card key={h.id} style={{ padding: 0, opacity: h.isActive ? 1 : 0.6 }}>
            <Pressable
              disabled={!isOwner}
              onPress={() => router.push({ pathname: '/habit/form', params: { id: h.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${h.title}, ${describeTarget(h)}${h.isActive ? '' : ', archived'}`}
              accessibilityHint={isOwner ? 'Edit habit' : undefined}
              style={{ minHeight: MIN_TOUCH + 4, padding: spacing.md }}
            >
              <Row style={{ gap: spacing.md }}>
                <HabitIcon icon={h.icon} size={30} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{h.title}</AppText>
                  <AppText variant="caption" muted>{describeTarget(h)}{h.isActive ? '' : ' · archived'}{h.isDefault ? ' · default' : ''}</AppText>
                </View>
              </Row>
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
