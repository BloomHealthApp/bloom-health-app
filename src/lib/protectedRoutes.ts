/**
 * Every root-stack route that needs a signed-in user. These screens use the data layer, which only exists while signed
 * in, so a route missing from this list crashes if it's open at sign-out or when a session expires.
 */
export const SIGNED_IN_ROUTES = [
  '(tabs)',
  'choose-avatar',
  'day/[date]',
  'edit-profile/avatar',
  'edit-profile/index',
  'edit-profile/phone',
  'habit/[id]',
  'habit/form',
  'habits',
  'settings/appearance',
  'settings/daily-goal',
  'settings/index',
  'settings/reminders',
  'settings/steps',
  'settings/sync',
  'sync-issues',
  'workout',
] as const;
