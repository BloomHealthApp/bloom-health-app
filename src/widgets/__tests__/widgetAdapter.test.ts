import { Platform } from 'react-native';
import { unopenedSnapshot } from '../widgetData';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: async () => {} }));

function load(): typeof import('../widgetAdapter') {
  let m!: typeof import('../widgetAdapter');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    m = require('../widgetAdapter');
  });
  return m;
}

describe('widgetAdapter without the native widget module (Expo Go / Jest / iOS)', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.resetModules();
  });

  it('is a silent no-op off Android', async () => {
    Platform.OS = 'ios';
    const a = load();
    await expect(a.requestWidgetRefresh(unopenedSnapshot())).resolves.toBeUndefined();
    expect(() => a.registerWidgetTask()).not.toThrow();
  });

  it('survives the native module being missing on Android', async () => {
    Platform.OS = 'android';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const a = load();
    await expect(a.requestWidgetRefresh(unopenedSnapshot())).resolves.toBeUndefined();
    expect(() => a.registerWidgetTask()).not.toThrow();
    warn.mockRestore();
  });
});
