"use client";

import { useCallback, useEffect, useState } from "react";
import { registerWebPushSubscription, unregisterPushDevice } from "@/features/push/api";
import {
  ensureWebPushRegistration,
  getWebPushRegistration,
  isWebPushSupported,
  readWebPushVapidPublicKey,
  subscribeWebPush,
  toSubscriptionJson,
} from "@/features/push/webPushBrowser";

export type WebPushStatus = "unsupported" | "loading" | "denied" | "off" | "on";

const readCurrentStatus = async (): Promise<WebPushStatus> => {
  if (!isWebPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await getWebPushRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
};

/** State and actions of the desktop notifications button (this browser, not the account). */
export const useWebPushSubscription = (enabled: boolean) => {
  const [status, setStatus] = useState<WebPushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void readCurrentStatus()
      .catch((): WebPushStatus => "unsupported")
      .then((s) => {
        if (!cancelled) setStatus(s);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const enable = useCallback(async () => {
    const vapidKey = readWebPushVapidPublicKey();
    if (!vapidKey) return;
    setBusy(true);
    setError(null);
    try {
      // First and without any await before it: Safari only shows the prompt inside the click gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await ensureWebPushRegistration();
      const json = toSubscriptionJson(await subscribeWebPush(reg, vapidKey));
      if (!json) throw new Error("subscription");
      await registerWebPushSubscription(json);
      setStatus("on");
    } catch {
      setError("No se pudieron activar las notificaciones en este navegador.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const reg = await getWebPushRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unregisterPushDevice(endpoint).catch(() => {});
      }
      setStatus("off");
    } catch {
      setError("No se pudieron desactivar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, error, enable, disable };
};
