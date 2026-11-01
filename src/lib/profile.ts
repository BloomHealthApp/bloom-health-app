// Pure profile rules for gender and the private period tracker (no React / RN).
import type { Gender, Settings, User } from '@/types/api';

type UserLike = Pick<User, 'role'> & { gender?: Gender | null; periodTrackerEnabled?: boolean };

/** Server-computed flag, falling back to the gender default (on for female) for older servers. */
export function trackerFlag(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  return user.periodTrackerEnabled ?? user.gender === 'female';
}

/** The tracker is for the signed-in owner only; viewers never get the UI or the data. */
export function isPeriodTrackerOn(user: UserLike | null | undefined): boolean {
  return !!user && user.role === 'owner' && trackerFlag(user);
}

/** Profile switch visibility: female (on by default), other / prefer not to say (opt-in); hidden for male, unset and viewers. */
export function showTrackerSwitch(user: UserLike | null | undefined): boolean {
  if (!user || user.role !== 'owner') return false;
  return user.gender === 'female' || user.gender === 'other' || user.gender === 'prefer_not_to_say';
}

/** PATCH /me body for a gender change: male or cleared also resets the tracker to its default so a hidden opt-in cannot linger. */
export function genderPatch(gender: Gender | null): { gender: Gender | null; periodTrackerEnabled?: null } {
  return gender === 'male' || gender === null ? { gender, periodTrackerEnabled: null } : { gender };
}

/** Absent = on (older servers / accounts). */
export const sundayRestOn = (s: Pick<Settings, 'sundayRest'>): boolean => s.sundayRest !== false;

/** Streak card copy. Period wording only for owners with the tracker on; Sundays only when sundayRest is on. */
export function streakRestNote(opts: { sundayRest: boolean; periodTracker: boolean }): string | null {
  if (opts.sundayRest && opts.periodTracker) return "Sundays and period days don't break your streak";
  if (opts.sundayRest) return "Sundays don't break your streak";
  if (opts.periodTracker) return "Period days don't break your streak";
  return null;
}
