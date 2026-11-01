import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, TextInput, View } from 'react-native';
import { AppText, Button, Row } from '@/components/ui';
import { AppIcon } from '@/icons/AppIcon';
import { useAlarmPreview } from '@/features/useAlarmPreview';
import { parseHHmm } from '@/lib/dates';
import { REMINDER_LABELS } from '@/lib/defaults';
import { clampAlarmVolume, MIN_ALARM_VOLUME, type ReminderMode } from '@/notifications/scheduler';
import { fonts, MIN_TOUCH, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { Reminder } from '@/types/api';

const MODES: { mode: ReminderMode; label: string; icon: 'notification' | 'bell' | 'alarm-clock' }[] = [
  { mode: 'notification', label: 'Notification', icon: 'notification' },
  { mode: 'alarm', label: 'Alarm', icon: 'bell' },
  { mode: 'loudAlarm', label: 'Loud alarm', icon: 'alarm-clock' },
];

// Fixed colours: they copy the native ringing screen, which does not follow the app theme.
const ALARM_SCREEN = { bg: '#FFF9F5', text: '#2B2024', button: '#D65B98', onButton: '#FFFFFF' };

export function showsVolumeSlider(mode: ReminderMode, platform: string): boolean {
  return mode === 'loudAlarm' && platform === 'android';
}

export function ReminderRow(props: {
  reminder: Reminder;
  mode: ReminderMode;
  volume: number;
  previewing: boolean;
  onChange: (p: Partial<Reminder>) => void;
  onChooseMode: (m: ReminderMode) => void;
  onVolumeChange: (v: number) => void;
}) {
  const { reminder, mode, volume, previewing, onChange, onChooseMode, onVolumeChange } = props;
  const { theme } = useTheme();
  const [time, setTime] = useState(reminder.time);
  useEffect(() => setTime(reminder.time), [reminder.time]);
  const valid = !!parseHHmm(time);
  const label = REMINDER_LABELS[reminder.key].title;
  return (
    <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
      <Row style={{ gap: spacing.sm }}>
        <View style={{ flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center' }}>
          <AppText variant="bodyStrong">{label}</AppText>
          {!valid ? <AppText variant="caption" style={{ color: theme.colors.danger }}>Use HH:mm, e.g. 21:30</AppText> : null}
        </View>
        <TextInput
          value={time}
          onChangeText={setTime}
          onEndEditing={() => {
            const p = parseHHmm(time);
            if (p) onChange({ time: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` });
            else setTime(reminder.time);
          }}
          accessibilityLabel={`${label} time`}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          style={{ width: 68, minHeight: MIN_TOUCH, textAlign: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: valid ? theme.colors.border : theme.colors.danger, fontFamily: fonts.semibold, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.bg }}
        />
        <Pressable
          onPress={() => onChange({ enabled: !reminder.enabled })}
          accessibilityRole="switch"
          accessibilityState={{ checked: reminder.enabled }}
          accessibilityLabel={`${label} reminder`}
          style={({ pressed }) => ({ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: reminder.enabled ? 2 : 1, borderColor: reminder.enabled ? theme.colors.accent : theme.colors.border, backgroundColor: reminder.enabled ? theme.colors.tint : theme.colors.surface, opacity: pressed ? 0.75 : 1 })}
        >
          <AppIcon name={reminder.enabled ? 'check' : 'close'} size={24} />
        </Pressable>
      </Row>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`${label} alert type`}
        style={{ flexDirection: 'row', gap: spacing.xs, opacity: reminder.enabled ? 1 : 0.55 }}
      >
        {MODES.map((m) => {
          const on = m.mode === mode;
          return (
            <Pressable
              key={m.mode}
              onPress={() => onChooseMode(m.mode)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, expanded: on && previewing }}
              accessibilityLabel={`${label}: ${m.label}`}
              accessibilityHint={on ? 'Tap again to show or hide the preview' : 'Select this alert type'}
              style={{ flex: 1, minHeight: MIN_TOUCH + 12, paddingVertical: spacing.xs, gap: 2, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 2 : 1, borderColor: on ? theme.colors.accent : theme.colors.border, backgroundColor: on ? theme.colors.tint : theme.colors.surface }}
            >
              <AppIcon name={m.icon} size={24} />
              <AppText variant="caption" numberOfLines={1} adjustsFontSizeToFit style={{ color: theme.colors.text }}>{m.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      {previewing ? <ModePreview reminder={reminder} mode={mode} volume={volume} onVolumeChange={onVolumeChange} /> : null}
    </View>
  );
}

function ModePreview({ reminder, mode, volume, onVolumeChange }: { reminder: Reminder; mode: ReminderMode; volume: number; onVolumeChange: (v: number) => void }) {
  const { theme } = useTheme();
  const [draft, setDraft] = useState(volume);
  useEffect(() => setDraft(volume), [volume]);
  const slider = showsVolumeSlider(mode, Platform.OS);
  const { playing, play, stop } = useAlarmPreview(slider ? draft : 1);
  useEffect(() => stop, [mode, stop]);
  const { title, body } = REMINDER_LABELS[reminder.key];
  return (
    <View testID="reminder-preview" style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: theme.colors.bg }}>
      <AppText variant="caption" muted>{mode === 'notification' ? 'How it appears' : mode === 'alarm' ? 'How it appears, with the alarm tone' : 'How it appears when it rings'}</AppText>
      {mode === 'loudAlarm' ? <AlarmScreenMock time={reminder.time} title={title} body={body} /> : <NotificationMock mode={mode} title={title} body={body} />}
      {mode === 'notification' ? (
        <AppText variant="caption" muted>A quiet banner. It uses your phone&apos;s notification settings.</AppText>
      ) : (
        <>
          {slider ? (
            <View>
              <Row style={{ justifyContent: 'space-between' }}>
                <AppText variant="label">Alarm volume</AppText>
                <AppText variant="label" muted>{Math.round(draft * 100)}%</AppText>
              </Row>
              <Slider
                accessibilityLabel={`${REMINDER_LABELS[reminder.key].title} alarm volume`}
                style={{ height: MIN_TOUCH }}
                minimumValue={MIN_ALARM_VOLUME}
                maximumValue={1}
                step={0.05}
                value={volume}
                onValueChange={(v) => setDraft(clampAlarmVolume(v))}
                onSlidingComplete={(v) => onVolumeChange(clampAlarmVolume(v))}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
                thumbTintColor={theme.colors.primary}
              />
            </View>
          ) : null}
          <Button title={playing ? 'Stop sound' : 'Play sound'} accessibilityLabel={playing ? 'Stop alarm sound' : 'Play alarm sound'} variant="secondary" onPress={() => (playing ? stop() : void play())} />
          <AppText variant="caption" muted>{modeNote(mode, Platform.OS)}</AppText>
        </>
      )}
    </View>
  );
}

function modeNote(mode: ReminderMode, platform: string): string {
  if (mode === 'alarm') return 'Plays once at your phone\'s notification volume. Silent mode can mute it. For a set volume, choose Loud alarm.';
  if (platform === 'android') return 'Rings until you stop it, even on silent. The preview plays at your media volume, so the real alarm may sound different.';
  return 'Rings until you stop it, even on silent, using the iPhone\'s own alarm sound and volume. It needs iOS 26 or later.';
}

function NotificationMock({ mode, title, body }: { mode: ReminderMode; title: string; body: string }) {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${mode === 'alarm' ? 'Alarm' : 'Notification'} preview: Bloom Health, ${title}. ${body}`}
      style={{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
    >
      <Image source={require('../../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: radius.sm }} accessibilityIgnoresInvertColors />
      <View style={{ flex: 1 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <AppText variant="caption" muted>Bloom Health</AppText>
          <AppText variant="caption" muted>now</AppText>
        </Row>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" muted>{body}</AppText>
      </View>
    </View>
  );
}

function AlarmScreenMock({ time, title, body }: { time: string; title: string; body: string }) {
  const ios = Platform.OS === 'ios';
  return (
    <View
      accessible
      accessibilityLabel={`Alarm screen preview: ${time}, ${title}. ${ios ? 'Button: Stop.' : `${body} Buttons: Dismiss, Snooze 10 minutes.`}`}
      style={{ alignItems: 'center', gap: spacing.xs, padding: spacing.xl, borderRadius: radius.md, backgroundColor: ALARM_SCREEN.bg, borderWidth: 1, borderColor: '#F1D3E2' }}
    >
      <AppText variant="big" style={{ color: ALARM_SCREEN.text }}>{time}</AppText>
      <AppText variant="heading" style={{ color: ALARM_SCREEN.text, textAlign: 'center' }}>{title}</AppText>
      {ios ? null : <AppText variant="caption" style={{ color: ALARM_SCREEN.text, textAlign: 'center' }}>{body}</AppText>}
      <View style={{ alignSelf: 'stretch', marginTop: spacing.md, minHeight: MIN_TOUCH, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: ALARM_SCREEN.button }}>
        <AppText variant="label" style={{ color: ALARM_SCREEN.onButton }}>{ios ? 'Stop' : 'Dismiss'}</AppText>
      </View>
      {ios ? null : <AppText variant="label" style={{ color: ALARM_SCREEN.text, marginTop: spacing.sm }}>Snooze 10 min</AppText>}
    </View>
  );
}
