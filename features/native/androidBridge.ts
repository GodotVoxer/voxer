/** Interface the Android app injects as `window.VoxerAndroid` (see `VoxerJsBridge.kt`). */
export type AndroidBridge = {
  appInfo(): string;
  getPushToken(): string | null;
  requestPushToken(): void;
  notificationPermissionState(): string;
  openAppNotificationSettings(): void;
  setBadgeCount(total: number): void;
  setThemeColors(resolvedMode: string, surfaceHex: string): void;
  setGestureLock(locked: boolean): void;
};

type NativePushProvider = "fcm" | "unifiedpush";

export type NativeAppInfo = {
  platform: "android";
  versionName: string;
  versionCode: number;
  sdkInt: number;
  /** Null in apps released before the package rename, which did not report it. */
  packageName: string | null;
  pushProvider: NativePushProvider;
  /** False when push cannot work on the device, e.g. no UnifiedPush distributor installed. */
  pushAvailable: boolean;
};

/** Callbacks the native side invokes through `evaluateJavascript`. */
export type NativeCallbacks = {
  onPushToken?: (token: string | null) => void;
  navigate?: (path: string) => void;
};

type NativeWindow = {
  VoxerAndroid?: unknown;
  __voxerNative?: NativeCallbacks;
};

const isFn = (v: unknown): v is (...args: never[]) => unknown => typeof v === "function";

/** Returns the bridge only with every method present: an older app is never half-used. */
export const readAndroidBridge = (win: unknown): AndroidBridge | null => {
  if (typeof win !== "object" || win === null) return null;
  const candidate = (win as NativeWindow).VoxerAndroid;
  if (typeof candidate !== "object" || candidate === null) return null;
  const required: Array<keyof AndroidBridge> = [
    "appInfo",
    "getPushToken",
    "requestPushToken",
    "notificationPermissionState",
    "openAppNotificationSettings",
    "setBadgeCount",
    "setThemeColors",
    "setGestureLock",
  ];
  for (const key of required) {
    if (!isFn((candidate as Record<string, unknown>)[key])) return null;
  }
  return candidate as AndroidBridge;
};

export const isRunningInVoxerAndroid = (win: unknown): boolean => readAndroidBridge(win) !== null;

/** Share through the system sheet; the app receives a relative path and checks it against its host. */
export type AndroidShareBridge = {
  share(path: string, title: string): void;
};

/** Read separately on purpose: `share` came after the first release, and requiring it would break older installs. */
export const readAndroidShareBridge = (win: unknown): AndroidShareBridge | null => {
  if (typeof win !== "object" || win === null) return null;
  const candidate = (win as NativeWindow).VoxerAndroid;
  if (typeof candidate !== "object" || candidate === null) return null;
  if (!isFn((candidate as Record<string, unknown>).share)) return null;
  return candidate as AndroidShareBridge;
};

/** Optional: apps without UnifiedPush support do not have it. */
export type AndroidPushVapidBridge = {
  setPushVapidKey(key: string): void;
};

export const readAndroidPushVapidBridge = (win: unknown): AndroidPushVapidBridge | null => {
  if (typeof win !== "object" || win === null) return null;
  const candidate = (win as NativeWindow).VoxerAndroid;
  if (typeof candidate !== "object" || candidate === null) return null;
  if (!isFn((candidate as Record<string, unknown>).setPushVapidKey)) return null;
  return candidate as AndroidPushVapidBridge;
};

/** Optional: apps before 1.1.1 do not clear a vox's system notifications. */
export type AndroidVoxNotificationsBridge = {
  clearVoxNotifications(voxId: string): void;
};

export const readAndroidVoxNotificationsBridge = (
  win: unknown,
): AndroidVoxNotificationsBridge | null => {
  if (typeof win !== "object" || win === null) return null;
  const candidate = (win as NativeWindow).VoxerAndroid;
  if (typeof candidate !== "object" || candidate === null) return null;
  if (!isFn((candidate as Record<string, unknown>).clearVoxNotifications)) return null;
  return candidate as AndroidVoxNotificationsBridge;
};

/** The bridge returns JSON as a string: never trust its shape. */
export const parseNativeAppInfo = (raw: string): NativeAppInfo | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (o.platform !== "android") return null;
    if (typeof o.versionName !== "string" || o.versionName.length === 0) return null;
    if (typeof o.versionCode !== "number" || !Number.isInteger(o.versionCode)) return null;
    if (typeof o.sdkInt !== "number" || !Number.isInteger(o.sdkInt)) return null;
    return {
      platform: "android",
      versionName: o.versionName,
      versionCode: o.versionCode,
      sdkInt: o.sdkInt,
      packageName: typeof o.packageName === "string" && o.packageName ? o.packageName : null,
      pushProvider: o.pushProvider === "unifiedpush" ? "unifiedpush" : "fcm",
      pushAvailable: o.pushAvailable !== false,
    };
  } catch {
    return null;
  }
};

export const readNativeAppInfo = (bridge: AndroidBridge): NativeAppInfo | null => {
  try {
    return parseNativeAppInfo(bridge.appInfo());
  } catch {
    return null;
  }
};

export type UnifiedPushRegistration = { endpoint: string; p256dh: string; auth: string };

/** With UnifiedPush, `getPushToken()` returns the Web Push subscription as JSON. */
export const parseUnifiedPushRegistration = (raw: string): UnifiedPushRegistration | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { endpoint, p256dh, auth } = parsed as Record<string, unknown>;
    if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
      return null;
    }
    return { endpoint, p256dh, auth };
  } catch {
    return null;
  }
};
