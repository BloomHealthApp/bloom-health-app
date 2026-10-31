import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { THEME_LIST } from '@/theme/themes';
import { MascotStatic } from '../MascotStatic';
import { CalendarDayCell, heatLevel } from '../CalendarDayCell';
import { HabitCard } from '../HabitCard';
import { ProgressRing } from '../ProgressRing';
import { WeeklyProgressChart } from '../WeeklyProgressChart';
import { DEFAULT_HABIT_DEFS } from '@/lib/defaults';
import type { Habit } from '@/types/api';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }));

const habit = { ...DEFAULT_HABIT_DEFS[2], schedule: { days: [] }, reminder: null, isActive: true, sortOrder: 0, isDefault: true, version: 1, createdAt: '', updatedAt: '', deletedAt: null } as Habit;

function render(el: React.ReactElement) {
  let t!: renderer.ReactTestRenderer;
  act(() => {
    t = renderer.create(<ThemeProvider>{el}</ThemeProvider>);
  });
  return t;
}

describe('component smoke renders', () => {
  it('renders all mascot moods', () => {
    for (const mood of ['happy', 'sleepy', 'cheer', 'sad'] as const) expect(render(<MascotStatic mood={mood} />).toJSON()).toBeTruthy();
  });
  it('renders ring, chart, cell and habit card; touch targets and labels present', () => {
    const t = render(
      <>
        <ProgressRing percent={64} />
        <WeeklyProgressChart data={[{ label: 'M', percent: 80, successful: true }, { label: 'T', percent: 20, successful: false }]} threshold={80} summaryLabel="chart" />
        <CalendarDayCell date="2026-10-17" day={17} percent={90} threshold={80} isToday isFuture={false} restDay={false} label="Sat, Oct 17" onPress={() => {}} />
        <HabitCard habit={habit} value={1} status="complete" onToggle={() => {}} onPress={() => {}} />
      </>,
    );
    const json = JSON.stringify(t.toJSON());
    expect(json).toContain('Today\'s completion 64 percent');
    expect(json).toContain('Mark No added sugar not done');
    expect(json).toContain('"minHeight":44');
  });
  it('heat levels', () => {
    expect(heatLevel(null, 80)).toBe(0);
    expect(heatLevel(100, 80)).toBe(4);
    expect(heatLevel(85, 80)).toBe(3);
    expect(heatLevel(45, 80)).toBe(2);
    expect(heatLevel(10, 80)).toBe(1);
  });
  it('themes expose the spec palettes', () => {
    const by = Object.fromEntries(THEME_LIST.map((t) => [t.name, t.colors]));
    expect(by.cottonCandy).toMatchObject({ tint: '#F8D7E8', primary: '#D65B98', bg: '#FFF9F5' });
    expect(by.lavenderDream).toMatchObject({ tint: '#E9E2FF', primary: '#B9A7E8', text: '#51436B' });
    expect(by.mintPeach).toMatchObject({ tint: '#DDF3E7', secondary: '#FFE3D6', primary: '#6E9D88' });
    expect(by.forestTrail).toMatchObject({ tint: '#DCE8D6', primary: '#2F6B4F', bg: '#F6F8F2' });
    expect(by.midnightNavy).toMatchObject({ tint: '#D9E2F0', primary: '#1F3A5F', bg: '#F4F6FA' });
  });
});
