import { useEffect, useRef, useState } from 'react';

/**
 * Ensures a loader is visible for at least `minVisibleMs` once `loading` becomes true.
 * Optionally delays its first appearance with `showDelayMs` to avoid brief flashes for ultra-fast ops.
 * Returns `showLoader` which you should use instead of raw `loading` when deciding to render a spinner.
 */
export function useMinimumLoader(loading: boolean, options?: { minVisibleMs?: number; showDelayMs?: number }) {
  const { minVisibleMs = 700, showDelayMs = 120 } = options || {};
  const [showLoader, setShowLoader] = useState(false);
  const activationTimeRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) {
      // If already showing, nothing to do
      if (showLoader) return;
      // schedule appearance after delay
      delayTimerRef.current && clearTimeout(delayTimerRef.current);
      delayTimerRef.current = setTimeout(() => {
        activationTimeRef.current = Date.now();
        setShowLoader(true);
      }, showDelayMs);
    } else {
      // loading finished: ensure minimum visibility
      delayTimerRef.current && clearTimeout(delayTimerRef.current);
      if (!showLoader || activationTimeRef.current == null) {
        // Loader never actually appeared
        setShowLoader(false);
        return;
      }
      const elapsed = Date.now() - activationTimeRef.current;
      const remaining = minVisibleMs - elapsed;
      if (remaining <= 0) {
        setShowLoader(false);
      } else {
        hideTimerRef.current && clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowLoader(false), remaining);
      }
    }
    return () => {
      // cleanup timers when dep changes
      delayTimerRef.current && clearTimeout(delayTimerRef.current);
      hideTimerRef.current && clearTimeout(hideTimerRef.current);
    };
  }, [loading, minVisibleMs, showDelayMs]);

  return showLoader;
}

export default useMinimumLoader;
