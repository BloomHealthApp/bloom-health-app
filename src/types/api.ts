// Types + zod schemas mirroring docs/api-contract.md (v1). Keep in sync with the contract.
import { z } from 'zod';

export const ThemeNameSchema = z.enum(['cottonCandy', 'lavenderDream', 'mintPeach']);
export type ThemeName = z.infer<typeof ThemeNameSchema>;
export const RoleSchema = z.enum(['owner', 'viewer']);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatar: z.string().nullable().optional(),
  timezone: z.string(),
  theme: ThemeNameSchema,
  role: RoleSchema,
  sharedSpaceId: z.string(),
  ownerDisplayName: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const ReminderKeySchema = z.enum(['wakeUp', 'hydration', 'workout', 'eveningCheckIn', 'bedtime']);
export type ReminderKey = z.infer<typeof ReminderKeySchema>;
export const ReminderSchema = z.object({
  key: ReminderKeySchema,
  enabled: z.boolean(),
  time: z.string(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

export const SettingsSchema = z.object({
  id: z.string(),
  dailyThreshold: z.number(),
  restDays: z.array(z.number()),
  restDayMode: z.enum(['neutral', 'counts']),
  reminders: z.array(ReminderSchema),
  version: z.number(),
  updatedAt: z.string(),
  createdAt: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const TrackingTypeSchema = z.enum(['boolean', 'quantity', 'duration', 'timeOfDay']);
export type TrackingType = z.infer<typeof TrackingTypeSchema>;
export const HabitCategorySchema = z.enum(['morning', 'nutrition', 'fitness', 'hydration', 'sleep', 'custom']);
export type HabitCategory = z.infer<typeof HabitCategorySchema>;
export const ComparisonSchema = z.enum(['atLeast', 'atMost', 'between', 'by']);
export type Comparison = z.infer<typeof ComparisonSchema>;

export const HabitSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  category: HabitCategorySchema,
  trackingType: TrackingTypeSchema,
  target: z.number(),
  targetMax: z.number().nullable(),
  targetComparison: ComparisonSchema,
  unit: z.string().nullable(),
  schedule: z.object({ days: z.array(z.number()) }),
  reminder: z.object({ enabled: z.boolean(), time: z.string() }).nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  isDefault: z.boolean(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Habit = z.infer<typeof HabitSchema>;

export const LogStatusSchema = z.enum(['complete', 'incomplete', 'skipped', 'partial']);
export type LogStatus = z.infer<typeof LogStatusSchema>;
export const DailyLogSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  localDate: z.string(),
  value: z.number().nullable(),
  status: LogStatusSchema,
  note: z.string().nullable(),
  version: z.number(),
  updatedAt: z.string(),
  createdAt: z.string().optional(),
  deletedAt: z.string().nullable(),
});
export type DailyLog = z.infer<typeof DailyLogSchema>;

export const WorkoutTypeSchema = z.enum(['strength', 'cardio', 'yoga', 'walking', 'badminton', 'other']);
export type WorkoutType = z.infer<typeof WorkoutTypeSchema>;
export const WorkoutSchema = z.object({
  id: z.string(),
  type: WorkoutTypeSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationSeconds: z.number(),
  pausedSeconds: z.number(),
  notes: z.string().nullable(),
  localDate: z.string(),
  version: z.number(),
  createdAt: z.string().optional(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const StatsSummarySchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
  days: z.array(
    z.object({
      localDate: z.string(),
      completionPercent: z.number(),
      successful: z.boolean(),
      restDay: z.boolean(),
    }),
  ),
  workoutCount: z.number(),
  workoutSeconds: z.number(),
  milestones: z.array(z.number()),
});
export type StatsSummary = z.infer<typeof StatsSummarySchema>;

// ---- Sync ----
export type EntityType = 'habit' | 'dailyLog' | 'workout' | 'settings';
export type SyncEntity = Habit | DailyLog | Workout | Settings;

export interface PushOperation {
  operationId: string;
  entityType: EntityType;
  entityId: string;
  op: 'upsert' | 'delete';
  baseVersion: number;
  payload: Record<string, unknown>;
  clientTimestamp: string;
}

export const PushResultSchema = z.object({
  operationId: z.string(),
  status: z.enum(['applied', 'duplicate', 'conflict', 'rejected']),
  entity: z.record(z.string(), z.unknown()).optional().nullable(),
  reason: z.string().optional().nullable(),
  resolved: z.string().optional().nullable(),
});
export type PushResult = z.infer<typeof PushResultSchema>;
export const PushResponseSchema = z.object({ results: z.array(PushResultSchema) });

export const PullResponseSchema = z.object({
  cursor: z.string(),
  hasMore: z.boolean(),
  changes: z.object({
    habits: z.array(HabitSchema).default([]),
    dailyLogs: z.array(DailyLogSchema).default([]),
    workouts: z.array(WorkoutSchema).default([]),
    settings: z.array(SettingsSchema).default([]),
  }),
});
export type PullResponse = z.infer<typeof PullResponseSchema>;

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> };
}
