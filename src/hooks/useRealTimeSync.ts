import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook that polls for data changes and triggers a refresh callback.
 * Uses a 30-second interval to keep data in sync across users.
 */
export function useRealTimeSync(refreshFn: () => Promise<void>, intervalMs = 30000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  const safeRefresh = useCallback(async () => {
    if (isMounted.current) {
      await refreshFn();
    }
  }, [refreshFn]);

  useEffect(() => {
    isMounted.current = true;
    intervalRef.current = setInterval(safeRefresh, intervalMs);

    // Also refresh on window focus (user returns to tab)
    const handleFocus = () => {
      safeRefresh();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [safeRefresh, intervalMs]);
}
