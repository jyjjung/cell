/**
 * Run work after the browser is idle (or after a short timeout).
 * Used to keep Firestore listeners off the LCP critical path.
 */
export function scheduleIdle(callback: () => void, timeoutMs = 2000): () => void {
  if (typeof window === 'undefined') {
    callback();
    return () => {};
  }

  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;

  if (typeof ric === 'function') {
    const id = ric(callback, { timeout: timeoutMs });
    return () => {
      (
        window as Window & { cancelIdleCallback?: (id: number) => void }
      ).cancelIdleCallback?.(id);
    };
  }

  const timer = window.setTimeout(callback, Math.min(timeoutMs, 1500));
  return () => window.clearTimeout(timer);
}
