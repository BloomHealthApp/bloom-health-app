import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAutoSteps } from '../useAutoSteps';

const TODAY = '2026-11-01';
const habit = { id: 'default-steps', trackingType: 'quantity', target: 7000, targetComparison: 'atLeast' } as never;
const mock = {
  log: null as { value: number; status: string; source?: string } | null,
  totals: [] as { date: string; steps: number }[],
  allowed: true,
  setSteps: jest.fn(async () => {}),
  setPref: jest.fn(async () => {}),
};
jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u', timezone: 'UTC' }, isOwner: true }) }));
jest.mock('@/providers/DataProvider', () => {
  const store = { get: async () => mock.log };
  return { useData: () => ({ store }) };
});
jest.mock('../actions', () => {
  const actions = { setSteps: (...a: unknown[]) => (mock.setSteps as (...x: unknown[]) => Promise<void>)(...a) };
  return { useActions: () => actions };
});
jest.mock('../derived', () => ({ useToday: () => ({ today: '2026-11-01', timezone: 'UTC' }) }));
jest.mock('../autoSteps', () => ({
  deviceStepsAvailable: async () => true,
  getAutoStepsPref: async () => false,
  readDeviceSteps: async () => mock.totals,
  requestDeviceSteps: async () => mock.allowed,
  setAutoStepsPref: (...a: unknown[]) => (mock.setPref as (...x: unknown[]) => Promise<void>)(...a),
}));

async function hook() {
  let api!: ReturnType<typeof useAutoSteps>;
  function Probe() {
    api = useAutoSteps(habit);
    return null;
  }
  await act(async () => {
    renderer.create(<Probe />);
  });
  return () => api;
}

beforeEach(() => {
  mock.log = null;
  mock.totals = [];
  mock.allowed = true;
  mock.setSteps.mockClear();
  mock.setPref.mockClear();
});

describe('useAutoSteps setMode', () => {
  it('replaces a manual total with the phone total when choosing Auto', async () => {
    mock.log = { value: 9000, status: 'complete', source: 'manual' };
    mock.totals = [{ date: TODAY, steps: 4000 }];
    const api = await hook();
    await act(async () => {
      expect(await api().setMode('auto')).toBe(true);
    });
    expect(mock.setPref).toHaveBeenCalledWith('u', true);
    expect(mock.setSteps).toHaveBeenCalledWith(habit, TODAY, 4000, 'device');
  });
  it('keeps the number when the phone has none yet', async () => {
    mock.log = { value: 300, status: 'partial', source: 'manual' };
    const api = await hook();
    await act(async () => {
      await api().setMode('auto');
    });
    expect(mock.setSteps).toHaveBeenCalledWith(habit, TODAY, 300, 'device');
  });
  it('writes nothing with no phone total and no log', async () => {
    const api = await hook();
    await act(async () => {
      await api().setMode('auto');
    });
    expect(mock.setSteps).not.toHaveBeenCalled();
  });
  it('stays in Manual when permission is refused', async () => {
    mock.allowed = false;
    const api = await hook();
    await act(async () => {
      expect(await api().setMode('auto')).toBe(false);
    });
    expect(mock.setPref).not.toHaveBeenCalled();
    expect(api().enabled).toBe(false);
  });
  it('turns Auto off without writing', async () => {
    const api = await hook();
    await act(async () => {
      await api().setMode('manual');
    });
    expect(mock.setPref).toHaveBeenCalledWith('u', false);
    expect(mock.setSteps).not.toHaveBeenCalled();
  });
});
