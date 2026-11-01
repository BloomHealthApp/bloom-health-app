import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MemoryStore } from '@/db/memoryStore';
import type { DailyLog } from '@/types/api';
import { useActions } from '../actions';

const mockStore = new MemoryStore();
const mockEngine = { mutate: async (m: { entityType: 'dailyLog'; entityId: string; entity: never }) => mockStore.put(m.entityType, m.entityId, m.entity) };
jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ isOwner: true }) }));
jest.mock('@/providers/DataProvider', () => ({ useData: () => ({ store: mockStore, engine: mockEngine, scheduleSync: () => {} }) }));

const habit = { id: 'default-steps', trackingType: 'quantity', target: 500, targetComparison: 'atLeast' } as never;
const read = () => mockStore.get<DailyLog>('dailyLog', 'default-steps:2026-11-01');

it('keeps every quick tap, marks the day manual and updates the status', async () => {
  let actions!: ReturnType<typeof useActions>;
  function Probe() {
    actions = useActions();
    return null;
  }
  await act(async () => {
    renderer.create(<Probe />);
  });
  await Promise.all([actions.addSteps(habit, '2026-11-01', 100), actions.addSteps(habit, '2026-11-01', 200), actions.addSteps(habit, '2026-11-01', 200)]);
  let log = await read();
  expect(log?.value).toBe(500);
  expect(log?.status).toBe('complete');
  expect(log?.source).toBe('manual');
  await actions.addSteps(habit, '2026-11-01', -200);
  log = await read();
  expect(log?.value).toBe(300);
  expect(log?.status).toBe('partial');
});
