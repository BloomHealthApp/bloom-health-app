import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { Screen, TabBarSpaceContext } from '../ui';
import { FloatingTabBar, tabBarSpace } from '../FloatingTabBar';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }) }));

const routes = ['index', 'progress', 'calendar', 'settings'].map((name) => ({ key: `${name}-k`, name }));
const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: { title: r.name, tabBarAccessibilityLabel: `${r.name} tab` } }]));

async function mount(index: number, prevented = false) {
  const emitter = { emit: jest.fn(() => ({ defaultPrevented: prevented })) };
  const navigateToTab = jest.fn();
  const props = { state: { index, routes }, descriptors, emitter, navigateToTab } as unknown as React.ComponentProps<typeof FloatingTabBar>;
  let t!: renderer.ReactTestRenderer;
  await act(async () => {
    t = renderer.create(<ThemeProvider><FloatingTabBar {...props} /></ThemeProvider>);
  });
  const tabs = t.root.findAll((n) => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function');
  return { navigateToTab, tabs };
}

describe('FloatingTabBar', () => {
  it('labels every tab and marks only the active one', async () => {
    const { tabs } = await mount(2);
    expect(tabs.map((n) => n.props.accessibilityLabel)).toEqual(['index tab', 'progress tab', 'calendar tab', 'settings tab']);
    expect(tabs.map((n) => n.props.accessibilityState.selected)).toEqual([false, false, true, false]);
  });
  it('navigates to another tab but not to the current one', async () => {
    const { tabs, navigateToTab } = await mount(0);
    await act(async () => tabs[0].props.onPress());
    expect(navigateToTab).not.toHaveBeenCalled();
    await act(async () => tabs[1].props.onPress());
    expect(navigateToTab).toHaveBeenCalledWith('progress-k');
  });
  it('respects a prevented tab press', async () => {
    const { tabs, navigateToTab } = await mount(0, true);
    await act(async () => tabs[1].props.onPress());
    expect(navigateToTab).not.toHaveBeenCalled();
  });
  it('reserves the bar and the system inset', () => {
    expect(tabBarSpace(20)).toBe(84);
    expect(tabBarSpace(0)).toBe(72);
  });
  it('makes a tab screen leave room for the bar, and other screens not', async () => {
    const padding = async (space: number) => {
      let t!: renderer.ReactTestRenderer;
      await act(async () => {
        t = renderer.create(<ThemeProvider><TabBarSpaceContext.Provider value={space}><Screen>{null}</Screen></TabBarSpaceContext.Provider></ThemeProvider>);
      });
      return t.root.findAll((n) => n.props.contentContainerStyle?.paddingBottom !== undefined)[0].props.contentContainerStyle.paddingBottom as number;
    };
    expect((await padding(84)) - (await padding(0))).toBe(84);
  });
});
