import { useEffect, useState } from "react";

const SAFARI_FALLBACK_MS = 1500;

/**
 * True once the browser is idle after the first render. Lazily loaded dialogs mount then, closed, so
 * their code downloads off the critical path but is ready by the time someone opens them.
 */
export const useIdleReady = (): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(() => setReady(true), SAFARI_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return ready;
};
