import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPushDevice } from "@/features/push/api";
import { useNativePushRegistration } from "@/hooks/device/useNativePushRegistration";

vi.mock("react", () => ({ useEffect: (effect: () => void) => effect() }));
vi.mock("@/features/auth/store", () => ({
  useAuthStore: (select: (s: { user: { id: string } }) => unknown) =>
    select({ user: { id: "u1" } }),
}));
vi.mock("@/features/push/api", () => ({
  registerPushDevice: vi.fn(() => Promise.resolve()),
  unregisterPushDevice: vi.fn(() => Promise.resolve()),
}));

const SUBSCRIPTION = '{"endpoint":"https://ntfy.sh/up1","p256dh":"k","auth":"a"}';

const installBridge = (pushProvider: string, cachedToken: string | null) => {
  const bridge = {
    appInfo: () =>
      JSON.stringify({
        platform: "android",
        versionName: "1.1.0",
        versionCode: 11,
        sdkInt: 35,
        pushProvider,
      }),
    getPushToken: vi.fn(() => cachedToken),
    requestPushToken: vi.fn(),
    notificationPermissionState: () => "granted",
    openAppNotificationSettings: () => undefined,
    setBadgeCount: () => undefined,
    setThemeColors: () => undefined,
    setGestureLock: () => undefined,
    setPushVapidKey: vi.fn(),
  };
  vi.stubGlobal("window", { VoxerAndroid: bridge });
  return bridge;
};

describe("useNativePushRegistration", () => {
  beforeEach(() => vi.mocked(registerPushDevice).mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it("registers a cached UnifiedPush subscription as such", () => {
    installBridge("unifiedpush", SUBSCRIPTION);
    useNativePushRegistration();
    expect(registerPushDevice).toHaveBeenCalledWith({
      platform: "unifiedpush",
      subscription: { endpoint: "https://ntfy.sh/up1", keys: { p256dh: "k", auth: "a" } },
      appVersion: "1.1.0",
    });
  });

  it("asks for a new registration when the cached token belongs to another transport", () => {
    const bridge = installBridge("unifiedpush", "fcm-token:APA91b");
    useNativePushRegistration();
    expect(registerPushDevice).not.toHaveBeenCalled();
    expect(bridge.requestPushToken).toHaveBeenCalledOnce();
  });

  it("registers a cached FCM token directly", () => {
    const bridge = installBridge("fcm", "fcm-token:APA91b");
    useNativePushRegistration();
    expect(registerPushDevice).toHaveBeenCalledWith({
      token: "fcm-token:APA91b",
      platform: "android",
      appVersion: "1.1.0",
    });
    expect(bridge.requestPushToken).not.toHaveBeenCalled();
  });
});
