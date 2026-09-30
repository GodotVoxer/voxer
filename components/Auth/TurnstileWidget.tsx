"use client";
import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileRenderOptions = {
  sitekey: string;
  action: string;
  appearance: "always" | "execute" | "interaction-only";
  theme: "light" | "dark";
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": (code: string) => boolean | void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

const loadTurnstile = (): Promise<TurnstileApi> => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_missing"));
    script.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(script);
  }).catch((e: unknown) => {
    scriptPromise = null;
    throw e;
  });
  return scriptPromise;
};

type Props = {
  siteKey: string;
  action: string;
  /** Changing it requests a new token: each token is single-use. */
  resetSignal: number;
  onToken: (token: string | null) => void;
  /** `code` is Cloudflare's error code (e.g. "110200"), or null when the script did not load. */
  onError: (code: string | null) => void;
};

/** Invisible for almost everyone: a checkbox only appears when Cloudflare needs interaction. */
export const TurnstileWidget = ({ siteKey, action, resetSignal, onToken, onError }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onToken, onError });
  useEffect(() => {
    callbacksRef.current = { onToken, onError };
  }, [onToken, onError]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        widgetIdRef.current = turnstile.render(container, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          language: "es",
          callback: (token) => callbacksRef.current.onToken(token),
          "expired-callback": () => callbacksRef.current.onToken(null),
          "error-callback": (code) => {
            console.warn("[turnstile] error", code);
            callbacksRef.current.onToken(null);
            callbacksRef.current.onError(code || null);
            return true;
          },
        });
      })
      .catch((e: unknown) => {
        console.warn("[turnstile] script failed to load", e);
        if (!cancelled) callbacksRef.current.onError(null);
      });
    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey, action]);

  useEffect(() => {
    if (resetSignal === 0) return;
    const id = widgetIdRef.current;
    if (!id) return;
    callbacksRef.current.onToken(null);
    window.turnstile?.reset(id);
  }, [resetSignal]);

  return <div ref={containerRef} className="flex justify-center empty:hidden" />;
};
