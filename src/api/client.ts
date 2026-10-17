import { z } from 'zod';
import {
  AuthResponseSchema,
  OtpChallengeSchema,
  HabitSchema,
  DailyLogSchema,
  PullResponseSchema,
  PushResponseSchema,
  SettingsSchema,
  StatsSummarySchema,
  UserSchema,
  WorkoutSchema,
  type AuthResponse,
  type Habit,
  type OtpChallenge,
  type SignUpRequest,
  type PullResponse,
  type PushOperation,
  type PushResult,
  type Settings,
  type StatsSummary,
  type ThemeName,
  type User,
} from '@/types/api';
import { ApiError, NetworkError } from './errors';

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  /** epoch ms */
  expiresAt: number | null;
}

export interface TokenProvider {
  get(): Promise<TokenState>;
  set(t: TokenState | null): Promise<void>;
  /** Called when the session can no longer be refreshed (user must sign in again). */
  onAuthLost(): void;
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface ReqOpts<S extends z.ZodType | undefined> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  schema?: S;
}

const TIMEOUT_MS = 15000;
const HabitItems = z.object({ items: z.array(HabitSchema) });
const LogItems = z.object({ items: z.array(DailyLogSchema) });
const WorkoutItems = z.object({ items: z.array(WorkoutSchema) });

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(
    private baseUrl: string,
    private fetchFn: FetchFn,
    private tokens: TokenProvider,
  ) {}

  // ---------- core ----------
  private async raw(method: string, path: string, opts: ReqOpts<undefined>, accessToken: string | null): Promise<Response> {
    const qs = opts.query
      ? '?' +
        Object.entries(opts.query)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
    try {
      return await this.fetchFn(`${this.baseUrl}/v1${path}${qs}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl?.signal,
      });
    } catch {
      throw new NetworkError();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async toError(res: Response): Promise<ApiError> {
    let code = 'internal';
    let message = `HTTP ${res.status}`;
    let details: Record<string, unknown> | undefined;
    try {
      const j = (await res.json()) as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
      if (j.error) {
        code = j.error.code ?? code;
        message = j.error.message ?? message;
        details = j.error.details;
      }
    } catch {
      /* non-JSON error body */
    }
    const ra = Number(res.headers.get('Retry-After'));
    return new ApiError(res.status, code, message, details, Number.isFinite(ra) && ra > 0 ? ra : undefined);
  }

  async request<S extends z.ZodType | undefined = undefined>(
    method: string,
    path: string,
    opts: ReqOpts<S> = {},
  ): Promise<S extends z.ZodType ? z.infer<S> : void> {
    type R = S extends z.ZodType ? z.infer<S> : void;
    const authed = opts.auth !== false;
    let st = authed ? await this.tokens.get() : null;

    // Proactive refresh shortly before expiry.
    if (authed && st?.refreshToken && st.expiresAt && st.expiresAt - Date.now() < 20_000) {
      await this.refreshOnce();
      st = await this.tokens.get();
    }

    let res = await this.raw(method, path, opts as ReqOpts<undefined>, st?.accessToken ?? null);
    if (res.status === 401 && authed && st?.refreshToken) {
      // Reactive refresh on 401 (token_expired or otherwise), retry once.
      const ok = await this.refreshOnce();
      if (ok) {
        st = await this.tokens.get();
        res = await this.raw(method, path, opts as ReqOpts<undefined>, st?.accessToken ?? null);
      }
    }
    if (!res.ok) {
      const err = await this.toError(res);
      if (res.status === 401 && authed) this.tokens.onAuthLost();
      throw err;
    }
    if (res.status === 204 || !opts.schema) return undefined as R;
    const json = await res.json();
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(502, 'invalid_response', `Unexpected response for ${method} ${path}`);
    }
    return parsed.data as R;
  }

  private refreshOnce(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const st = await this.tokens.get();
    if (!st?.refreshToken) return false;
    try {
      const res = await this.raw('POST', '/auth/refresh', { body: { refreshToken: st.refreshToken }, auth: false }, null);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          await this.tokens.set(null);
          this.tokens.onAuthLost();
        }
        return false;
      }
      const parsed = AuthResponseSchema.safeParse(await res.json());
      if (!parsed.success) return false;
      await this.storeAuth(parsed.data);
      return true;
    } catch {
      return false; // offline: keep the session, try later
    }
  }

  async hasSession(): Promise<boolean> {
    return !!(await this.tokens.get()).refreshToken;
  }

  async storeAuth(a: AuthResponse): Promise<void> {
    await this.tokens.set({
      accessToken: a.accessToken,
      refreshToken: a.refreshToken,
      expiresAt: Date.now() + a.expiresIn * 1000,
    });
  }

  // ---------- auth ----------
  /** Starts sign-up: emails a code to `email`. Throws ApiError 409 `already_registered` if email/phone is taken. */
  requestSignUp(body: SignUpRequest): Promise<OtpChallenge> {
    return this.request('POST', '/auth/signup/request', { body, auth: false, schema: OtpChallengeSchema });
  }
  /** Starts sign-in with an email or phone; always succeeds with a challengeId (no account enumeration). */
  requestSignIn(identifier: string): Promise<OtpChallenge> {
    return this.request('POST', '/auth/signin/request', { body: { identifier }, auth: false, schema: OtpChallengeSchema });
  }
  async verifyOtp(challengeId: string, code: string): Promise<User> {
    const a = await this.request('POST', '/auth/otp/verify', { body: { challengeId, code }, auth: false, schema: AuthResponseSchema });
    await this.storeAuth(a);
    return a.user;
  }
  async logout(): Promise<void> {
    const st = await this.tokens.get();
    try {
      if (st?.refreshToken) await this.request('POST', '/auth/logout', { body: { refreshToken: st.refreshToken }, auth: false });
    } catch {
      /* best effort */
    } finally {
      await this.tokens.set(null);
    }
  }

  // ---------- profile & settings ----------
  getMe(): Promise<User> {
    return this.request('GET', '/me', { schema: UserSchema });
  }
  patchMe(body: { displayName?: string; avatar?: string | null; timezone?: string; theme?: ThemeName }): Promise<User> {
    return this.request('PATCH', '/me', { body, schema: UserSchema });
  }
  getSettings(): Promise<Settings> {
    return this.request('GET', '/settings', { schema: SettingsSchema });
  }

  // ---------- reads (direct REST; the app normally uses sync/pull) ----------
  async listHabits(includeInactive = true): Promise<Habit[]> {
    const r = await this.request('GET', '/habits', { query: { includeInactive }, schema: HabitItems });
    return r.items;
  }
  async listLogs(from: string, to: string) {
    return (await this.request('GET', '/logs', { query: { from, to }, schema: LogItems })).items;
  }
  async listWorkouts(from?: string, to?: string) {
    return (await this.request('GET', '/workouts', { query: { from, to }, schema: WorkoutItems })).items;
  }
  getStats(from: string, to: string): Promise<StatsSummary> {
    return this.request('GET', '/stats/summary', { query: { from, to }, schema: StatsSummarySchema });
  }

  // ---------- sync ----------
  async syncPush(deviceId: string, operations: PushOperation[]): Promise<PushResult[]> {
    const r = await this.request('POST', '/sync/push', { body: { deviceId, operations }, schema: PushResponseSchema });
    return r.results;
  }
  syncPull(cursor: string, limit = 500): Promise<PullResponse> {
    return this.request('GET', '/sync/pull', { query: { cursor, limit }, schema: PullResponseSchema });
  }

  async health(): Promise<boolean> {
    try {
      await this.request('GET', '/health', { auth: false });
      return true;
    } catch {
      return false;
    }
  }
}
