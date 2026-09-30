"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
import { registerPushDevice, unregisterPushDevice } from "@/features/push/api";
import {
  parseUnifiedPushRegistration,
  readAndroidBridge,
  readAndroidPushVapidBridge,
  readNativeAppInfo,
  type NativeCallbacks,
} from "@/features/native/androidBridge";

type NativeWindow = Window & { __voxerNative?: NativeCallbacks };

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";

const registerUnifiedPush = (token: string, appVersion?: string): Promise<void> | null => {
  const sub = parseUnifiedPushRegistration(token);
  if (!sub) return null;
  return registerPushDevice({
    platform: "unifiedpush",
    subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    appVersion,
  });
};

/**
 * The token is registered from the page, not from Kotlin, on purpose: the request leaves the WebView
 * with its own `Origin`/`Referer` and passes `proxy.ts` without the native client forging the header,
 * and the `httpOnly` session cookie never leaves the WebView. A no-op in regular browsers.
 */
export const useNativePushRegistration = () => {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    const bridge = readAndroidBridge(window);
    if (!bridge) return;

    let cancelled = false;
    const appInfo = readNativeAppInfo(bridge);
    const appVersion = appInfo?.versionName;
    const unifiedPush = appInfo?.pushProvider === "unifiedpush";

    // With UnifiedPush the "token" is a subscription, identified by its endpoint.
    const deviceKey = (token: string): string | null =>
      unifiedPush ? (parseUnifiedPushRegistration(token)?.endpoint ?? null) : token;

    const send = (token: string | null) => {
      if (cancelled || !token) return;
      // Registration retries on the next load or when the bridge delivers another token.
      const request = unifiedPush
        ? registerUnifiedPush(token, appVersion)
        : registerPushDevice({ token, platform: "android", appVersion });
      void request?.catch(() => {});
    };

    const w = window as NativeWindow;
    const previous = w.__voxerNative;
    w.__voxerNative = { ...previous, onPushToken: send };

    try {
      if (unifiedPush && VAPID_PUBLIC_KEY) {
        readAndroidPushVapidBridge(window)?.setPushVapidKey(VAPID_PUBLIC_KEY);
      }

      const permission = bridge.notificationPermissionState();

      // With the permission blocked nothing can be shown: unregister any leftover token instead of
      // letting the server push into the void.
      if (permission === "blocked") {
        const stale = bridge.getPushToken();
        const key = stale ? deviceKey(stale) : null;
        if (key) void unregisterPushDevice(key).catch(() => {});
        return;
      }

      // The cached token is only a shortcut when permission is granted and it belongs to the current
      // transport (a build switched from FCM to UnifiedPush keeps the old one); otherwise ask anyway,
      // or a device left with a token but no permission would never ask again.
      const cached = bridge.getPushToken();
      if (permission === "granted" && cached && deviceKey(cached)) {
        send(cached);
        return;
      }

      // Requests the permission if needed, then the token; the result comes back through `onPushToken`.
      bridge.requestPushToken();
    } catch {
      /* an older bridge may fail: do not break the page */
    }

    return () => {
      cancelled = true;
    };
  }, [userId]);
};
