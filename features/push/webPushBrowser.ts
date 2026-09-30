import { readAndroidBridge } from "@/features/native/androidBridge";

const WEB_PUSH_SW_URL = "/push-sw.js";
/** Own scope: the worker controls no pages and does not clash with MSW's (scope `/`). */
const WEB_PUSH_SW_SCOPE = "/push-sw/";

export const readWebPushVapidPublicKey = (): string | null =>
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || null;

/** The VAPID key arrives as base64url; `pushManager.subscribe` wants bytes. */
const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const sameBytes = (a: ArrayBuffer | null | undefined, b: Uint8Array): boolean => {
  if (!a || a.byteLength !== b.byteLength) return false;
  const view = new Uint8Array(a);
  return view.every((v, i) => v === b[i]);
};

/** Inside the Android app push is native FCM (the WebView has no Push API); iOS outside an installed web app has no `PushManager`. */
export const isWebPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  readAndroidBridge(window) === null &&
  readWebPushVapidPublicKey() !== null &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const getWebPushRegistration = async (): Promise<ServiceWorkerRegistration | null> =>
  (await navigator.serviceWorker.getRegistration(WEB_PUSH_SW_SCOPE)) ?? null;

/** `navigator.serviceWorker.ready` waits for the worker controlling the page, which is not this one (other scope). */
const waitUntilActive = (reg: ServiceWorkerRegistration): Promise<void> => {
  if (reg.active) return Promise.resolve();
  const worker = reg.installing ?? reg.waiting;
  if (!worker) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", onChange);
        resolve();
      }
    };
    worker.addEventListener("statechange", onChange);
  });
};

export const ensureWebPushRegistration = async (): Promise<ServiceWorkerRegistration> => {
  const reg = await navigator.serviceWorker.register(WEB_PUSH_SW_URL, {
    scope: WEB_PUSH_SW_SCOPE,
    updateViaCache: "none",
  });
  await waitUntilActive(reg);
  return reg;
};

/** Returns the live subscription for the current VAPID key; after a key rotation the old one is replaced. */
export const subscribeWebPush = async (
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> => {
  const key = base64UrlToBytes(vapidPublicKey);
  const existing = await reg.pushManager.getSubscription();
  if (existing && sameBytes(existing.options.applicationServerKey, key)) return existing;
  if (existing) await existing.unsubscribe().catch(() => false);
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
};

export type WebPushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export const toSubscriptionJson = (sub: PushSubscription): WebPushSubscriptionJson | null => {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
};
