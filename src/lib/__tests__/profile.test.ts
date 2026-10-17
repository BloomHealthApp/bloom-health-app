import { genderPatch, isPeriodTrackerOn, showTrackerSwitch, streakRestNote, sundayRestOn, trackerFlag } from '../profile';
import type { Gender } from '@/types/api';

const u = (gender: Gender | null, over: { periodTrackerEnabled?: boolean; role?: 'owner' | 'viewer' } = {}) => ({ role: over.role ?? 'owner', gender, periodTrackerEnabled: over.periodTrackerEnabled });

describe('period tracker visibility', () => {
  it('flag follows the server value, else defaults on for female only', () => {
    expect(trackerFlag(u('female'))).toBe(true);
    expect(trackerFlag(u('other'))).toBe(false);
    expect(trackerFlag(u('female', { periodTrackerEnabled: false }))).toBe(false);
    expect(trackerFlag(u('other', { periodTrackerEnabled: true }))).toBe(true);
    expect(trackerFlag(null)).toBe(false);
  });
  it('is only ever on for owners (viewers never see the tracker)', () => {
    expect(isPeriodTrackerOn(u('female'))).toBe(true);
    expect(isPeriodTrackerOn(u('female', { role: 'viewer' }))).toBe(false);
    expect(isPeriodTrackerOn(u('other', { periodTrackerEnabled: true, role: 'viewer' }))).toBe(false);
    expect(isPeriodTrackerOn(null)).toBe(false);
  });
  it('settings switch: shown for female, other and prefer-not-to-say owners; hidden for male, unset and viewers', () => {
    expect(showTrackerSwitch(u('female'))).toBe(true);
    expect(showTrackerSwitch(u('other'))).toBe(true);
    expect(showTrackerSwitch(u('prefer_not_to_say'))).toBe(true);
    expect(showTrackerSwitch(u('male'))).toBe(false);
    expect(showTrackerSwitch(u(null))).toBe(false);
    expect(showTrackerSwitch(u('female', { role: 'viewer' }))).toBe(false);
  });
  it('male or cleared gender also resets the tracker to its default', () => {
    expect(genderPatch('male')).toEqual({ gender: 'male', periodTrackerEnabled: null });
    expect(genderPatch(null)).toEqual({ gender: null, periodTrackerEnabled: null });
    expect(genderPatch('female')).toEqual({ gender: 'female' });
    expect(genderPatch('other')).toEqual({ gender: 'other' });
  });
});

describe('streak copy', () => {
  it('mentions Sundays whenever sundayRest is on, period days only for enabled owners', () => {
    expect(streakRestNote({ sundayRest: true, periodTracker: false })).toBe("Sundays don't break your streak");
    expect(streakRestNote({ sundayRest: true, periodTracker: true })).toBe("Sundays and period days don't break your streak");
    expect(streakRestNote({ sundayRest: false, periodTracker: true })).toBe("Period days don't break your streak");
    expect(streakRestNote({ sundayRest: false, periodTracker: false })).toBeNull();
  });
  it('sundayRest absent means on', () => {
    expect(sundayRestOn({})).toBe(true);
    expect(sundayRestOn({ sundayRest: false })).toBe(false);
  });
});
