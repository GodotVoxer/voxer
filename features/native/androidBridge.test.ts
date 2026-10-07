import { describe, expect, it } from "vitest";
import {
  isRunningInVoxerAndroid,
  parseNativeAppInfo,
  readAndroidBridge,
  parseUnifiedPushRegistration,
  readAndroidPushVapidBridge,
  readAndroidVoxNotificationsBridge,
  readNativeAppInfo,
} from "@/features/native/androidBridge";

const METHODS = [
  "appInfo",
  "getPushToken",
  "requestPushToken",
  "notificationPermissionState",
  "openAppNotificationSettings",
  "setBadgeCount",
  "setThemeColors",
  "setGestureLock",
] as const;

const fullBridge = (over: Record<string, unknown> = {}) => {
  const b: Record<string, unknown> = {};
  for (const m of METHODS) b[m] = () => undefined;
  return { ...b, ...over };
};

describe("readAndroidBridge", () => {
  it("returns null in a regular browser", () => {
    expect(readAndroidBridge({})).toBeNull();
    expect(readAndroidBridge(undefined)).toBeNull();
    expect(readAndroidBridge(null)).toBeNull();
  });

  it("returns the bridge when every method is present", () => {
    expect(readAndroidBridge({ VoxerAndroid: fullBridge() })).not.toBeNull();
    expect(isRunningInVoxerAndroid({ VoxerAndroid: fullBridge() })).toBe(true);
  });

  it("rejects an incomplete bridge instead of half-using it", () => {
    for (const missing of METHODS) {
      const partial = fullBridge();
      delete partial[missing];
      expect(readAndroidBridge({ VoxerAndroid: partial })).toBeNull();
    }
  });

  it("rejects a VoxerAndroid that is not an object of functions", () => {
    expect(readAndroidBridge({ VoxerAndroid: "hello" })).toBeNull();
    expect(
      readAndroidBridge({ VoxerAndroid: fullBridge({ appInfo: "not a function" }) }),
    ).toBeNull();
  });
});

describe("parseNativeAppInfo", () => {
  it("accepts the shape the bridge emits", () => {
    expect(
      parseNativeAppInfo(
        '{"platform":"android","versionName":"1.0.0","versionCode":3,"sdkInt":34}',
      ),
    ).toEqual({
      platform: "android",
      versionName: "1.0.0",
      versionCode: 3,
      sdkInt: 34,
      packageName: null,
      pushProvider: "fcm",
      pushAvailable: true,
    });
  });

  it("reads the package and push transport of newer apps", () => {
    expect(
      parseNativeAppInfo(
        '{"platform":"android","versionName":"1.1.0","versionCode":11,"sdkInt":35,"packageName":"pro.voxer.app","pushProvider":"unifiedpush"}',
      ),
    ).toMatchObject({
      packageName: "pro.voxer.app",
      pushProvider: "unifiedpush",
      pushAvailable: true,
    });
    expect(
      parseNativeAppInfo(
        '{"platform":"android","versionName":"1.1.0","versionCode":11,"sdkInt":35,"pushProvider":"unifiedpush","pushAvailable":false}',
      ),
    ).toMatchObject({ pushAvailable: false });
    expect(
      parseNativeAppInfo(
        '{"platform":"android","versionName":"1.1.0","versionCode":11,"sdkInt":35,"pushProvider":"other"}',
      ),
    ).toMatchObject({ pushProvider: "fcm" });
  });

  it("returns null for invalid JSON or missing fields", () => {
    expect(parseNativeAppInfo("not json")).toBeNull();
    expect(parseNativeAppInfo("null")).toBeNull();
    expect(parseNativeAppInfo('"text"')).toBeNull();
    expect(
      parseNativeAppInfo('{"platform":"ios","versionName":"1","versionCode":1,"sdkInt":1}'),
    ).toBeNull();
    expect(parseNativeAppInfo('{"platform":"android","versionCode":1,"sdkInt":1}')).toBeNull();
    expect(
      parseNativeAppInfo('{"platform":"android","versionName":"1","versionCode":"3","sdkInt":34}'),
    ).toBeNull();
    expect(
      parseNativeAppInfo('{"platform":"android","versionName":"","versionCode":3,"sdkInt":34}'),
    ).toBeNull();
  });
});

describe("readNativeAppInfo", () => {
  it("extracts the app info", () => {
    const bridge = readAndroidBridge({
      VoxerAndroid: fullBridge({
        appInfo: () => '{"platform":"android","versionName":"2.1.0","versionCode":9,"sdkInt":35}',
      }),
    });
    expect(bridge && readNativeAppInfo(bridge)?.versionName).toBe("2.1.0");
  });

  it("does not propagate a bridge exception", () => {
    const bridge = readAndroidBridge({
      VoxerAndroid: fullBridge({
        appInfo: () => {
          throw new Error("broken bridge");
        },
      }),
    });
    expect(bridge && readNativeAppInfo(bridge)).toBeNull();
  });
});

describe("readAndroidPushVapidBridge", () => {
  it("is only available in apps that support UnifiedPush", () => {
    expect(readAndroidPushVapidBridge({ VoxerAndroid: fullBridge() })).toBeNull();
    expect(
      readAndroidPushVapidBridge({
        VoxerAndroid: fullBridge({ setPushVapidKey: () => undefined }),
      }),
    ).not.toBeNull();
  });
});

describe("readAndroidVoxNotificationsBridge", () => {
  it("is only available in apps that can clear a vox's notifications", () => {
    expect(readAndroidVoxNotificationsBridge({ VoxerAndroid: fullBridge() })).toBeNull();
    expect(
      readAndroidVoxNotificationsBridge({
        VoxerAndroid: fullBridge({ clearVoxNotifications: () => undefined }),
      }),
    ).not.toBeNull();
    expect(readAndroidVoxNotificationsBridge({})).toBeNull();
  });
});

describe("parseUnifiedPushRegistration", () => {
  it("reads the subscription the F-Droid app returns as its token", () => {
    expect(
      parseUnifiedPushRegistration('{"endpoint":"https://ntfy.sh/up1","p256dh":"k","auth":"a"}'),
    ).toEqual({ endpoint: "https://ntfy.sh/up1", p256dh: "k", auth: "a" });
  });

  it("rejects an FCM token or an incomplete object", () => {
    expect(parseUnifiedPushRegistration("fcm-token-abc:APA91b")).toBeNull();
    expect(parseUnifiedPushRegistration('{"endpoint":"https://ntfy.sh/up1"}')).toBeNull();
  });
});
