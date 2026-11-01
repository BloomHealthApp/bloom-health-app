import React from 'react';
import { TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { parseStepAmount, StepsCard } from '../StepsCard';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

async function mount(props: Partial<React.ComponentProps<typeof StepsCard>>) {
  const onAdd = jest.fn();
  let t!: renderer.ReactTestRenderer;
  await act(async () => {
    t = renderer.create(<ThemeProvider><StepsCard steps={1000} goal={7000} onAdd={onAdd} autoAvailable {...props} /></ThemeProvider>);
  });
  const pressable = (label: string) => t.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  return { t, onAdd, pressable };
}

describe('parseStepAmount', () => {
  it('accepts whole numbers in range', () => {
    expect(parseStepAmount('1,500')).toBe(1500);
    expect(parseStepAmount('200000')).toBe(200000);
  });
  it.each(['', '0', '-5', '1.5', 'abc', '200001'])('rejects %p', (text) => {
    expect(parseStepAmount(text)).toBeNull();
  });
});

describe('StepsCard', () => {
  it('adds with a quick button and undoes that amount once', async () => {
    const { onAdd, pressable } = await mount({ mode: 'manual' });
    await act(async () => pressable('Add 100 steps')[0].props.onPress());
    expect(onAdd).toHaveBeenLastCalledWith(100);
    await act(async () => pressable('Remove 100 steps')[0].props.onPress());
    expect(onAdd).toHaveBeenLastCalledWith(-100);
    expect(pressable('Remove 100 steps')).toHaveLength(0);
  });
  it('adds a typed amount and clears the field', async () => {
    const { t, onAdd, pressable } = await mount({ mode: 'manual' });
    await act(async () => t.root.findByType(TextInput).props.onChangeText('750'));
    await act(async () => pressable('Add typed steps')[0].props.onPress());
    expect(onAdd).toHaveBeenCalledWith(750);
    expect(t.root.findByType(TextInput).props.value).toBe('');
  });
  it('hides add controls in Auto', async () => {
    const { t, pressable } = await mount({ mode: 'auto', source: 'device' });
    expect(pressable('Add 100 steps')).toHaveLength(0);
    expect(t.root.findAllByType(TextInput)).toHaveLength(0);
  });
  it('gives viewers no controls', async () => {
    const { t, pressable } = await mount({ readOnly: true, mode: 'manual', source: 'device' });
    expect(pressable('Add 100 steps')).toHaveLength(0);
    expect(t.root.findAllByType(TextInput)).toHaveLength(0);
    expect(JSON.stringify(t.toJSON())).toContain('From your phone');
  });
  it('explains when Auto is unavailable', async () => {
    const { t } = await mount({ autoAvailable: false, mode: 'manual' });
    expect(JSON.stringify(t.toJSON())).toContain('available');
  });
});
