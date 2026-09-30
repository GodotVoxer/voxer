import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMissingPushDistributor } from "@/hooks/device/useMissingPushDistributor";

const ref = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("react", () => ({
  useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => boolean) => getSnapshot(),
  useRef: (initial: unknown) => {
    if (ref.current === undefined) ref.current = { current: initial };
    return ref.current;
  },
  useEffect: (effect: () => void) => effect(),
}));

const installApp = (appInfo: Record<string, unknown>) => {
  const bridge = {
    appInfo: () =>
      JSON.stringify({
        platform: "android",
        versionName: "1.1.0",
        versionCode: 11,
        sdkInt: 35,
        ...appInfo,
      }),
    getPushToken: () => null,
    requestPushToken: vi.fn(),
    notificationPermissionState: () => "granted",
    openAppNotificationSettings: () => undefined,
    setBadgeCount: () => undefined,
    setThemeColors: () => undefined,
    setGestureLock: () => undefined,
  };
  vi.stubGlobal("window", { VoxerAndroid: bridge });
  return bridge;
};

describe("useMissingPushDistributor", () => {
  beforeEach(() => {
    ref.current = undefined;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is true only in the UnifiedPush build without a distributor", () => {
    installApp({ pushProvider: "unifiedpush", pushAvailable: false });
    expect(useMissingPushDistributor()).toBe(true);
    ref.current = undefined;
    installApp({ pushProvider: "fcm", pushAvailable: true });
    expect(useMissingPushDistributor()).toBe(false);
    ref.current = undefined;
    vi.stubGlobal("window", {});
    expect(useMissingPushDistributor()).toBe(false);
  });

  it("registers as soon as a distributor appears", () => {
    installApp({ pushProvider: "unifiedpush", pushAvailable: false });
    useMissingPushDistributor();
    const bridge = installApp({ pushProvider: "unifiedpush", pushAvailable: true });
    expect(useMissingPushDistributor()).toBe(false);
    expect(bridge.requestPushToken).toHaveBeenCalledOnce();
  });
});
