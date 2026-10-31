import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient } from '@/api/client';
import { mockFetch } from '@/api/mock/mockServer';
import { createTokenProvider } from '@/auth/tokenStore';
import { API_BASE_URL, USE_MOCK_API } from '@/config';
import type { Gender, OtpChallenge, ThemeName, User } from '@/types/api';

type Status = 'loading' | 'signedOut' | 'signedIn';
const USER_KEY = 'bubu.user';

interface Ctx {
  status: Status;
  user: User | null;
  api: ApiClient;
  isOwner: boolean;
  requestSignUp: (input: { name: string; phone: string; email: string; gender?: Gender | null }) => Promise<OtpChallenge>;
  requestSignIn: (identifier: string) => Promise<OtpChallenge>;
  /** signupTheme: the theme picked before the account existed; a new account starts on the server default otherwise */
  verifyOtp: (challengeId: string, code: string, signupTheme?: ThemeName) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children, onSignedOut }: { children: React.ReactNode; onSignedOut?: () => void }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const lostRef = useRef<() => void>(() => {});

  const api = useMemo(
    () =>
      new ApiClient(API_BASE_URL, USE_MOCK_API ? mockFetch : (fetch as never), createTokenProvider(() => lostRef.current())),
    [],
  );

  const persistUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
    else AsyncStorage.removeItem(USER_KEY).catch(() => {});
  }, []);

  lostRef.current = () => {
    persistUser(null);
    setStatus('signedOut');
    onSignedOut?.();
  };

  // Restore session: cached user + a stored token means signed in (works offline); refresh profile in background.
  useEffect(() => {
    (async () => {
      try {
        const [raw, has] = await Promise.all([AsyncStorage.getItem(USER_KEY), api.hasSession()]);
        if (raw && has) {
          setUser(JSON.parse(raw) as User);
          setStatus('signedIn');
          api.getMe().then(persistUser).catch(() => {});
          return;
        }
      } catch {
        /* fall through */
      }
      setStatus('signedOut');
    })();
  }, [api, persistUser]);

  const value = useMemo<Ctx>(
    () => ({
      status,
      user,
      api,
      isOwner: user?.role === 'owner',
      requestSignUp: ({ name, phone, email, gender }) => api.requestSignUp({ name: name.trim(), phone: phone.trim(), email: email.trim().toLowerCase(), ...(gender ? { gender } : {}) }),
      requestSignIn: (identifier) => api.requestSignIn(identifier.trim().toLowerCase()),
      verifyOtp: async (challengeId, code, signupTheme) => {
        const u = await api.verifyOtp(challengeId, code.trim());
        const wantsTheme = signupTheme && signupTheme !== u.theme;
        persistUser(wantsTheme ? await api.patchMe({ theme: signupTheme }).catch(() => u) : u);
        setStatus('signedIn');
      },
      signOut: async () => {
        await api.logout();
        persistUser(null);
        setStatus('signedOut');
        onSignedOut?.();
      },
      updateUser: persistUser,
    }),
    [status, user, api, persistUser, onSignedOut],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
