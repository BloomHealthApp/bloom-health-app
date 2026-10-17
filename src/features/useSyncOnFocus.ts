import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useData } from '@/providers/DataProvider';

/** Pull on tab focus; optionally keep polling while focused (viewer freshness: 30 s on Home). */
export function useSyncOnFocus(pollMs?: number) {
  const { engine } = useData();
  useFocusEffect(
    useCallback(() => {
      void engine.sync();
      if (!pollMs) return;
      const iv = setInterval(() => void engine.sync(), pollMs);
      return () => clearInterval(iv);
    }, [engine, pollMs]),
  );
}
