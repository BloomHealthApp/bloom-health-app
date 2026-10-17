import * as SecureStore from 'expo-secure-store';
import type { TokenProvider, TokenState } from '@/api/client';

const K = { access: 'bubu.accessToken', refresh: 'bubu.refreshToken', exp: 'bubu.expiresAt' };
const EMPTY: TokenState = { accessToken: null, refreshToken: null, expiresAt: null };

/** Tokens live only in SecureStore (Keychain / Keystore) with an in-memory cache. */
export function createTokenProvider(onAuthLost: () => void): TokenProvider {
  let cache: TokenState | null = null;
  return {
    async get() {
      if (cache) return cache;
      try {
        const [accessToken, refreshToken, exp] = await Promise.all([
          SecureStore.getItemAsync(K.access),
          SecureStore.getItemAsync(K.refresh),
          SecureStore.getItemAsync(K.exp),
        ]);
        cache = { accessToken, refreshToken, expiresAt: exp ? Number(exp) : null };
      } catch {
        cache = EMPTY;
      }
      return cache;
    },
    async set(t) {
      cache = t ?? EMPTY;
      try {
        if (!t) {
          await Promise.all(Object.values(K).map((k) => SecureStore.deleteItemAsync(k)));
        } else {
          await Promise.all([
            SecureStore.setItemAsync(K.access, t.accessToken ?? ''),
            SecureStore.setItemAsync(K.refresh, t.refreshToken ?? ''),
            SecureStore.setItemAsync(K.exp, String(t.expiresAt ?? 0)),
          ]);
        }
      } catch {
        /* secure store unavailable (e.g. web); memory cache still works for this session */
      }
    },
    onAuthLost,
  };
}
