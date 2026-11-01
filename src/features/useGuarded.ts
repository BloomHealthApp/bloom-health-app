import { useCallback, useState } from 'react';

/** Runs an action and keeps its error message for a banner. */
export function useGuarded() {
  const [err, setErr] = useState<string | null>(null);
  const guarded = useCallback(async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }, []);
  return { err, guarded };
}
