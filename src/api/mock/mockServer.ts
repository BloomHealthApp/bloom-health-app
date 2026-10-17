// In-memory implementation of docs/api-contract.md used when EXPO_PUBLIC_USE_MOCK_API=true.
// Exposes a fetch-compatible function so the real ApiClient (refresh-on-401, zod parsing) is exercised too.
// Demo accounts: anu@example.com / +919876543210 (owner), aman@example.com / +919876543211 (viewer). OTP is always 123456.
// Users get an `ownerAvatar` on every response (the space owner's avatar); avatars are validated against the allowlist.
// Sign-up creates a new owner with their own empty space (default habits/settings, no history).
import { DEFAULT_HABIT_DEFS, defaultSettings } from '@/lib/defaults';
import { addDays, localDateInTz, weekdayOf } from '@/lib/dates';
import { evaluateStatus, summarize, type HabitRule } from '@/lib/scoring';
import { uuid } from '@/lib/ids';
import { isAvatarId } from '@/avatars/avatarCatalog';
import type { DailyLog, Habit, Settings, ThemeName, User, Workout } from '@/types/api';

export const MOCK_OTP = '123456';
const MAX_OTP_ATTEMPTS = 5;
const DEFAULT_COUNTRY_CODE = '+91';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the service: +<country><number> or a bare 10-digit number (default country code); 8-15 digits. */
export function normalizeMockPhone(raw: string): string | null {
  const t = raw.trim();
  if (!/^\+?[\d\s-]+$/.test(t)) return null;
  const digits = t.replace(/\D/g, '');
  const full = t.startsWith('+') ? digits : digits.length === 10 ? DEFAULT_COUNTRY_CODE.slice(1) + digits : digits;
  return full.length >= 8 && full.length <= 15 ? `+${full}` : null;
}

interface Challenge {
  /** undefined user + no pending => decoy that can never verify */
  userId?: string;
  pending?: { name: string; phone: string; email: string; avatar?: string | null };
  attempts: number;
}
const ACCESS_TTL_S = 900;

type MockUser = User;
const SPACE = 'space-1';

type Rec = { id: string; version: number; createdAt: string; updatedAt: string; deletedAt: string | null } & Record<string, unknown>;

class MockDb {
  users: MockUser[] = [
    { id: 'u-anu', email: 'anu@example.com', phone: '+919876543210', displayName: 'Anu', avatar: 'bubu-02', timezone: 'Asia/Kolkata', theme: 'cottonCandy', role: 'owner', sharedSpaceId: SPACE, ownerDisplayName: 'Anu' },
    { id: 'u-aman', email: 'aman@example.com', phone: '+919876543211', displayName: 'Aman', avatar: 'bubu-04', timezone: 'Asia/Kolkata', theme: 'lavenderDream', role: 'viewer', sharedSpaceId: SPACE, ownerDisplayName: 'Anu' },
  ];
  seq = 0;
  /** Entities are scoped per shared space; `space` is the space of the request being handled. */
  spaces = new Map<string, Map<string, { type: string; seq: number; rec: Rec }>>();
  space = SPACE;
  get entities() {
    let m = this.spaces.get(this.space);
    if (!m) {
      m = new Map();
      this.spaces.set(this.space, m);
    }
    return m;
  }
  ops = new Map<string, unknown>();
  refreshTokens = new Set<string>();
  challenges = new Map<string, Challenge>();

  constructor() {
    this.space = SPACE;
    this.seedDefaults();
    this.seedHistory();
  }

  /** Creates a fresh owner account with its own empty space. */
  createOwner(p: { name: string; phone: string; email: string; avatar?: string | null }): MockUser {
    const id = `u-${uuid()}`;
    const user: MockUser = { id, email: p.email, phone: p.phone, displayName: p.name, avatar: p.avatar ?? null, timezone: 'Asia/Kolkata', theme: 'cottonCandy', role: 'owner', sharedSpaceId: `space-${id}`, ownerDisplayName: p.name };
    this.users.push(user);
    this.space = user.sharedSpaceId;
    this.seedDefaults();
    return user;
  }

  key(type: string, id: string) {
    return `${type}:${id}`;
  }
  get(type: string, id: string): Rec | undefined {
    return this.entities.get(this.key(type, id))?.rec;
  }
  save(type: string, rec: Rec) {
    this.entities.set(this.key(type, rec.id), { type, seq: ++this.seq, rec });
  }
  all<T>(type: string): T[] {
    return [...this.entities.values()].filter((e) => e.type === type).map((e) => e.rec as unknown as T);
  }

  private seedDefaults() {
    const now = new Date();
    const created = addDays(localDateInTz(now, 'Asia/Kolkata'), -40) + 'T00:00:00Z';
    DEFAULT_HABIT_DEFS.forEach((d, i) => {
      this.save('habit', {
        ...d,
        schedule: { days: [] },
        reminder: null,
        isActive: true,
        sortOrder: i,
        isDefault: true,
        version: 1,
        createdAt: created,
        updatedAt: created,
        deletedAt: null,
      } as unknown as Rec);
    });
    const s = defaultSettings(created);
    this.save('settings', { ...s, createdAt: created, deletedAt: null } as unknown as Rec);
  }

  private seedHistory() {
    const now = new Date();
    // Demo history for the last 28 days (deterministic pseudo-random).
    const today = localDateInTz(now, 'Asia/Kolkata');
    for (let back = 28; back >= 1; back--) {
      const date = addDays(today, -back);
      const dayIdx = 28 - back;
      const goodDay = (dayIdx * 7 + 3) % 10 > 2; // ~70% good days, a few streaks
      const habits = this.all<Habit>('habit');
      habits.forEach((h, hi) => {
        const roll = ((dayIdx + 1) * (hi + 3) * 37) % 100;
        const ok = goodDay ? roll > 8 : roll > 75;
        let value: number | null;
        switch (h.trackingType) {
          case 'boolean':
            value = ok ? 1 : 0;
            break;
          case 'timeOfDay':
            value = ok ? h.target - (roll % 20) : h.target + 10 + (roll % 60);
            break;
          case 'duration':
            value = ok ? h.target + (roll % 30) : 20 + (roll % 40);
            break;
          default:
            value = ok ? h.target + (roll % 1500) : Math.round(h.target * 0.4);
        }
        const status = statusFor(h, value);
        const id = `${h.id}:${date}`;
        const ts = `${date}T12:00:00Z`;
        this.save('dailyLog', { id, habitId: h.id, localDate: date, value, status, note: null, version: 1, createdAt: ts, updatedAt: ts, deletedAt: null } as unknown as Rec);
      });
      if (goodDay && dayIdx % 2 === 0) {
        const id = `w-seed-${date}`;
        const start = `${date}T11:30:00Z`;
        const dur = 2400 + (dayIdx % 5) * 600;
        this.save('workout', {
          id,
          type: (['strength', 'cardio', 'yoga', 'walking', 'badminton'] as const)[dayIdx % 5],
          startedAt: start,
          endedAt: new Date(Date.parse(start) + dur * 1000).toISOString(),
          durationSeconds: dur,
          pausedSeconds: 0,
          notes: null,
          localDate: date,
          version: 1,
          createdAt: start,
          updatedAt: start,
          deletedAt: null,
        } as unknown as Rec);
      }
    }
  }
}

function statusFor(h: Habit, value: number | null): DailyLog['status'] {
  return evaluateStatus(h as HabitRule, value);
}

let db = new MockDb();
export function resetMockServer() {
  db = new MockDb();
}

// ---------------- helpers ----------------
function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
function err(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return json(status, { error: { code, message, ...(details ? { details } : {}) } });
}

/** The user as the API returns it: stored fields plus `ownerAvatar` (the space owner's avatar; own avatar for owners). */
function view(user: MockUser): User {
  const owner = user.role === 'owner' ? user : db.users.find((x) => x.sharedSpaceId === user.sharedSpaceId && x.role === 'owner');
  return { ...user, ownerAvatar: owner?.avatar ?? null };
}

function issueTokens(user: MockUser) {
  const refreshToken = `mr.${user.id}.${uuid()}`;
  db.refreshTokens.add(refreshToken);
  return {
    accessToken: `ma.${user.id}.${Date.now() + ACCESS_TTL_S * 1000}`,
    refreshToken,
    expiresIn: ACCESS_TTL_S,
    user: view(user),
  };
}

function authUser(req: { headers: Headers }): MockUser | Response {
  const h = req.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return err(401, 'unauthorized', 'missing token');
  const [, uid, exp] = h.slice(7).split('.');
  if (!uid || !exp) return err(401, 'unauthorized', 'bad token');
  if (Number(exp) < Date.now()) return err(401, 'token_expired', 'access token expired');
  const u = db.users.find((x) => x.id === uid);
  return u ?? err(401, 'unauthorized', 'unknown user');
}

const HABIT_FIELDS = new Set(['title', 'icon', 'category', 'trackingType', 'target', 'targetMax', 'targetComparison', 'unit', 'schedule', 'reminder', 'isActive', 'sortOrder', 'isDefault']);
const LOG_FIELDS = new Set(['value', 'status', 'note']);
const WORKOUT_FIELDS = new Set(['type', 'startedAt', 'endedAt', 'durationSeconds', 'pausedSeconds', 'notes', 'localDate']);
const SETTINGS_FIELDS = new Set(['dailyThreshold', 'restDays', 'reminders', 'stepGoal']);

function unknownKeys(payload: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(payload).filter((k) => !allowed.has(k));
}

interface PushOp {
  operationId: string;
  entityType: 'habit' | 'dailyLog' | 'workout' | 'settings';
  entityId: string;
  op: 'upsert' | 'delete';
  baseVersion: number;
  payload: Record<string, unknown>;
  clientTimestamp: string;
}

function applyOp(user: MockUser, op: PushOp): Record<string, unknown> {
  const stored = db.ops.get(op.operationId);
  if (stored) return { ...(stored as object), status: 'duplicate' };

  const result = applyOpInner(user, op);
  db.ops.set(op.operationId, result);
  return result;
}

function applyOpInner(user: MockUser, op: PushOp): Record<string, unknown> {
  const base = { operationId: op.operationId };
  const allowed = { habit: HABIT_FIELDS, dailyLog: LOG_FIELDS, workout: WORKOUT_FIELDS, settings: SETTINGS_FIELDS }[op.entityType];
  if (!allowed) return { ...base, status: 'rejected', reason: 'validation_failed' };
  const bad = unknownKeys(op.payload ?? {}, allowed);
  if (bad.length) return { ...base, status: 'rejected', reason: `validation_failed:unknown_fields:${bad.join(',')}` };

  const nowIso = new Date().toISOString();
  const existing = db.get(op.entityType, op.entityId);
  let resolved: string | undefined;

  if (op.entityType === 'dailyLog') {
    const m = /^(.+):(\d{4}-\d{2}-\d{2})$/.exec(op.entityId);
    if (!m) return { ...base, status: 'rejected', reason: 'validation_failed' };
    const [, habitId, localDate] = m;
    if (localDate > addDays(localDateInTz(new Date(), user.timezone), 1)) return { ...base, status: 'rejected', reason: 'future_date' };
    if (!db.get('habit', habitId)) return { ...base, status: 'rejected', reason: 'not_found' };
  }

  if (existing && op.baseVersion !== existing.version) {
    const lww = op.entityType === 'dailyLog' && op.op === 'upsert' && Date.parse(op.clientTimestamp) > Date.parse(existing.updatedAt);
    if (!lww) return { ...base, status: 'conflict', entity: existing, reason: 'stale_version' };
    resolved = 'lww';
  }
  if (!existing && op.baseVersion !== 0) {
    if (op.op === 'delete') return { ...base, status: 'rejected', reason: 'not_found' };
  }
  if (!existing && op.op === 'delete') return { ...base, status: 'rejected', reason: 'not_found' };

  let rec: Rec;
  if (op.op === 'delete') {
    if (op.entityType === 'habit') rec = { ...existing!, isActive: false, version: existing!.version + 1, updatedAt: nowIso };
    else rec = { ...existing!, deletedAt: nowIso, version: existing!.version + 1, updatedAt: nowIso };
  } else if (existing) {
    rec = { ...existing, ...op.payload, version: existing.version + 1, updatedAt: nowIso } as Rec;
    rec.deletedAt = null; // upsert revives tombstones
  } else {
    const common = { id: op.entityId, version: 1, createdAt: nowIso, updatedAt: nowIso, deletedAt: null };
    if (op.entityType === 'dailyLog') {
      const [habitId, localDate] = [op.entityId.slice(0, op.entityId.lastIndexOf(':')), op.entityId.slice(-10)];
      rec = { ...common, habitId, localDate, value: null, status: 'incomplete', note: null, ...op.payload } as Rec;
    } else if (op.entityType === 'habit') {
      rec = { ...common, schedule: { days: [] }, reminder: null, isActive: true, sortOrder: 99, isDefault: false, targetMax: null, unit: null, ...op.payload } as Rec;
    } else if (op.entityType === 'workout') {
      rec = { ...common, endedAt: null, durationSeconds: 0, pausedSeconds: 0, notes: null, ...op.payload } as Rec;
    } else {
      rec = { ...defaultSettings(nowIso), ...op.payload, ...common } as unknown as Rec;
    }
  }
  db.save(op.entityType, rec);
  return { ...base, status: 'applied', entity: rec, ...(resolved ? { resolved } : {}) };
}

function inRange(date: string, from: string | null, to: string | null) {
  return (!from || date >= from) && (!to || date <= to);
}

function route(method: string, path: string, query: URLSearchParams, body: Record<string, unknown>, req: { headers: Headers }): Response {
  // ---- public ----
  if (method === 'GET' && path === '/health') return json(200, { status: 'ok', time: new Date().toISOString(), version: 'mock' });
  if (method === 'POST' && path === '/auth/signup/request') {
    const bad = Object.keys(body).filter((k) => !['name', 'phone', 'email', 'avatar'].includes(k));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? normalizeMockPhone(body.phone) : null;
    if (bad.length) return err(400, 'validation_failed', `unknown fields: ${bad.join(',')}`);
    if (body.avatar !== undefined && body.avatar !== null && !isAvatarId(body.avatar)) return err(400, 'validation_failed', 'avatar must be null or one of bubu-01..bubu-09');
    if (name.length < 1 || name.length > 40) return err(400, 'validation_failed', 'name must be 1-40 characters');
    if (!phone) return err(400, 'validation_failed', 'phone must have 8-15 digits');
    if (email.length > 254 || !EMAIL_RE.test(email)) return err(400, 'validation_failed', 'email is not valid');
    if (db.users.some((u) => u.email === email || u.phone === phone)) return err(409, 'already_registered', 'an account with this email or phone already exists');
    const challengeId = uuid();
    db.challenges.set(challengeId, { pending: { name, phone, email, avatar: (body.avatar as string | null | undefined) ?? null }, attempts: 0 });
    return json(202, { status: 'sent', challengeId });
  }
  if (method === 'POST' && path === '/auth/signin/request') {
    const bad = Object.keys(body).filter((k) => k !== 'identifier');
    const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
    if (bad.length || !identifier) return err(400, 'validation_failed', 'identifier is required');
    const phone = identifier.includes('@') ? null : normalizeMockPhone(identifier);
    const user = identifier.includes('@')
      ? db.users.find((u) => u.email === identifier.toLowerCase())
      : phone
        ? db.users.find((u) => u.phone === phone)
        : undefined;
    const challengeId = uuid();
    // Unknown identifiers get a decoy challenge (same 202 shape) that can never verify.
    db.challenges.set(challengeId, { userId: user?.id, attempts: 0 });
    return json(202, { status: 'sent', challengeId });
  }
  if (method === 'POST' && path === '/auth/otp/verify') {
    const challengeId = String(body.challengeId ?? '');
    const ch = db.challenges.get(challengeId);
    if (!ch) return err(401, 'unauthorized', 'invalid code');
    ch.attempts += 1;
    if (ch.attempts > MAX_OTP_ATTEMPTS) {
      db.challenges.delete(challengeId);
      return err(429, 'rate_limited', 'too many attempts');
    }
    if (body.code !== MOCK_OTP || (!ch.userId && !ch.pending)) return err(401, 'unauthorized', 'invalid code');
    db.challenges.delete(challengeId); // single use
    if (ch.pending) {
      if (db.users.some((u) => u.email === ch.pending!.email || u.phone === ch.pending!.phone)) return err(409, 'already_registered', 'an account with this email or phone already exists');
      return json(200, issueTokens(db.createOwner(ch.pending)));
    }
    const user = db.users.find((u) => u.id === ch.userId);
    return user ? json(200, issueTokens(user)) : err(401, 'unauthorized', 'invalid code');
  }
  if (method === 'POST' && path === '/auth/refresh') {
    const rt = String(body.refreshToken ?? '');
    if (!db.refreshTokens.has(rt)) return err(401, 'unauthorized', 'invalid refresh token');
    db.refreshTokens.delete(rt);
    const user = db.users.find((u) => u.id === rt.split('.')[1]);
    return user ? json(200, issueTokens(user)) : err(401, 'unauthorized', 'invalid refresh token');
  }
  if (method === 'POST' && path === '/auth/logout') {
    db.refreshTokens.delete(String(body.refreshToken ?? ''));
    return json(204, null);
  }

  // ---- authenticated ----
  const u = authUser(req);
  if (u instanceof Response) return u;
  const user = u;
  db.space = user.sharedSpaceId;

  if (path === '/me' && method === 'GET') return json(200, view(user));
  if (path === '/me' && method === 'PATCH') {
    const bad = Object.keys(body).filter((k) => !['displayName', 'avatar', 'timezone', 'theme'].includes(k));
    if (bad.length) return err(400, 'validation_failed', `unknown fields: ${bad.join(',')}`);
    if (body.avatar !== undefined && body.avatar !== null && !isAvatarId(body.avatar)) return err(400, 'validation_failed', 'avatar must be null or one of bubu-01..bubu-09');
    if (body.displayName !== undefined) user.displayName = String(body.displayName);
    if (body.timezone !== undefined) user.timezone = String(body.timezone);
    if (body.avatar !== undefined) user.avatar = body.avatar as string | null;
    if (body.theme !== undefined) user.theme = body.theme as ThemeName;
    return json(200, view(user));
  }
  if (path === '/settings' && method === 'GET') {
    const s = db.all<Settings>('settings')[0];
    return json(200, s);
  }
  if (path === '/habits' && method === 'GET') {
    const inc = query.get('includeInactive') === 'true';
    return json(200, { items: db.all<Habit>('habit').filter((h) => inc || h.isActive) });
  }
  if (path === '/logs' && method === 'GET') {
    const from = query.get('from');
    const to = query.get('to');
    return json(200, { items: db.all<DailyLog>('dailyLog').filter((l) => inRange(l.localDate, from, to)) });
  }
  if (path === '/workouts' && method === 'GET') {
    const from = query.get('from');
    const to = query.get('to');
    return json(200, { items: db.all<Workout>('workout').filter((w) => inRange(w.localDate, from, to)) });
  }
  if (path === '/stats/summary' && method === 'GET') {
    const from = query.get('from') ?? '';
    const to = query.get('to') ?? '';
    const today = localDateInTz(new Date(), user.timezone);
    const s = db.all<Settings>('settings')[0];
    const sum = summarize(from, to, today, {
      habits: db.all<Habit>('habit'),
      logs: db.all<DailyLog>('dailyLog'),
      threshold: s.dailyThreshold,
      restDays: s.restDays,
      restDayMode: s.restDayMode,
      timezone: user.timezone,
    });
    const ws = db.all<Workout>('workout').filter((w) => !w.deletedAt && inRange(w.localDate, from, to));
    return json(200, { ...sum, workoutCount: ws.length, workoutSeconds: ws.reduce((a, w) => a + w.durationSeconds, 0) });
  }
  if (path === '/sync/pull' && method === 'GET') {
    const cursor = Number(query.get('cursor') || 0);
    const limit = Math.min(500, Number(query.get('limit') || 500));
    const newer = [...db.entities.values()].filter((e) => e.seq > cursor).sort((a, b) => a.seq - b.seq);
    const page = newer.slice(0, limit);
    const changes = { habits: [] as unknown[], dailyLogs: [] as unknown[], workouts: [] as unknown[], settings: [] as unknown[] };
    for (const e of page) {
      const k = { habit: 'habits', dailyLog: 'dailyLogs', workout: 'workouts', settings: 'settings' }[e.type] as keyof typeof changes;
      changes[k].push(e.rec);
    }
    const last = page.length ? page[page.length - 1].seq : cursor;
    return json(200, { cursor: String(last), hasMore: newer.length > page.length, changes });
  }
  if (path === '/sync/push' && method === 'POST') {
    if (user.role !== 'owner') return err(403, 'forbidden', 'viewers are read-only');
    const ops = body.operations as PushOp[] | undefined;
    const bad = Object.keys(body).filter((k) => !['deviceId', 'operations'].includes(k));
    if (!Array.isArray(ops) || typeof body.deviceId !== 'string' || bad.length) return err(400, 'validation_failed', 'bad push body');
    if (ops.length > 100) return err(400, 'validation_failed', 'max 100 operations');
    return json(200, { results: ops.map((op) => applyOp(user, op)) });
  }
  return err(404, 'not_found', `no route ${method} ${path}`);
}

/** fetch-compatible entry point. */
export async function mockFetch(url: string, init: RequestInit = {}): Promise<Response> {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network
  const u = new URL(url);
  const path = u.pathname.replace(/^\/v1/, '');
  const method = (init.method ?? 'GET').toUpperCase();
  let body: Record<string, unknown> = {};
  if (typeof init.body === 'string' && init.body) {
    try {
      body = JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return err(400, 'validation_failed', 'invalid JSON');
    }
  }
  const headers = new Headers(init.headers as Record<string, string> | undefined);
  return route(method, path, u.searchParams, body, { headers });
}

// Exported for tests.
export const __test = { weekdayOf };
