"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store";
import { registerWebPushSubscription } from "@/features/push/api";
import { navigateToPushPath } from "@/features/push/navigateToPushPath";
import {
  ensureWebPushRegistration,
  getWebPushRegistration,
  isWebPushSupported,
  readWebPushVapidPublicKey,
  subscribeWebPush,
  toSubscriptionJson,
} from "@/features/push/webPushBrowser";

type PushNavigateMessage = { type: "voxer:push-navigate"; path: string };

const isPushNavigateMessage = (data: unknown): data is PushNavigateMessage =>
  typeof data === "object" &&
  data !== null &&
  (data as { type?: unknown }).type === "voxer:push-navigate" &&
  typeof (data as { path?: unknown }).path === "string";

/**
 * Desktop counterpart of `useNativePushRegistration`. It never creates a subscription (the bell button
 * does, on the user's request); it only re-registers the existing one so it survives logout/login and
 * renews `lastSeenAt` before stale devices are purged.
 */
export const useWebPushBridge = () => {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!isWebPushSupported()) return;
    const onMessage = (e: MessageEvent) => {
      if (!isPushNavigateMessage(e.data)) return;
      navigateToPushPath(e.data.path, router.push);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker.startMessages();
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  useEffect(() => {
    if (!userId || !isWebPushSupported()) return;
    if (Notification.permission !== "granted") return;
    const vapidKey = readWebPushVapidPublicKey();
    if (!vapidKey) return;

    let cancelled = false;
    void (async () => {
      const existing = await getWebPushRegistration();
      if (!existing || !(await existing.pushManager.getSubscription())) return;
      // Re-registering the worker checks whether `push-sw.js` changed since the last visit.
      const reg = await ensureWebPushRegistration();
      const json = toSubscriptionJson(await subscribeWebPush(reg, vapidKey));
      if (cancelled || !json) return;
      await registerWebPushSubscription(json);
    })().catch(() => {
      /* registration retries on the next load */
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);
};
