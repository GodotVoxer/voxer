import { describe, expect, it } from "vitest";
import {
  isAllowedWebPushEndpoint,
  normalizeWebPushSubscription,
} from "@/server/push/webPushSubscription";
import { pushDeviceRegisterSchema } from "./deviceSchemas";

const P256DH = `B${"a".repeat(86)}`;
const AUTH = "b".repeat(22);
const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123:APA91bXyz";

describe("isAllowedWebPushEndpoint", () => {
  it("accepts the push services of desktop browsers", () => {
    for (const endpoint of [
      FCM_ENDPOINT,
      "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
      "https://web.push.apple.com/QGuQyavXutnMei",
      "https://wns2-par02p.notify.windows.com/w/?token=BQYAAA",
    ]) {
      expect(isAllowedWebPushEndpoint(endpoint)).toBe(true);
    }
  });

  it("rejects any other host, since the server would POST to it (SSRF)", () => {
    for (const endpoint of [
      "https://evil.example/fcm/send/x",
      "https://fcm.googleapis.com.evil.example/x",
      "https://notify.windows.com.evil.example/x",
      "https://169.254.169.254/latest/meta-data",
      "http://fcm.googleapis.com/fcm/send/x",
      "https://user:pass@fcm.googleapis.com/fcm/send/x",
      "https://fcm.googleapis.com:8443/fcm/send/x",
      "javascript:alert(1)",
      "",
    ]) {
      expect(isAllowedWebPushEndpoint(endpoint)).toBe(false);
    }
  });

  it("rejects endpoints longer than the column", () => {
    expect(isAllowedWebPushEndpoint(`${FCM_ENDPOINT}${"x".repeat(600)}`)).toBe(false);
  });
});

describe("normalizeWebPushSubscription", () => {
  it("strips base64 padding and checks key lengths", () => {
    expect(
      normalizeWebPushSubscription({
        endpoint: FCM_ENDPOINT,
        p256dh: `${P256DH}=`,
        auth: `${AUTH}==`,
      }),
    ).toEqual({ endpoint: FCM_ENDPOINT, p256dh: P256DH, auth: AUTH });
    expect(
      normalizeWebPushSubscription({ endpoint: FCM_ENDPOINT, p256dh: "corta", auth: AUTH }),
    ).toBeNull();
    expect(
      normalizeWebPushSubscription({ endpoint: FCM_ENDPOINT, p256dh: P256DH, auth: "a+b/" }),
    ).toBeNull();
  });
});

describe("pushDeviceRegisterSchema", () => {
  it("accepts the Android token as before", () => {
    const parsed = pushDeviceRegisterSchema.parse({ token: "a".repeat(140), appVersion: "1.2" });
    expect(parsed.platform).toBe("android");
  });

  it("accepts a browser subscription", () => {
    const parsed = pushDeviceRegisterSchema.parse({
      platform: "web",
      subscription: { endpoint: FCM_ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } },
    });
    expect(parsed.platform).toBe("web");
  });

  it("rejects web without a valid subscription", () => {
    expect(
      pushDeviceRegisterSchema.safeParse({ platform: "web", token: "a".repeat(140) }).success,
    ).toBe(false);
    expect(
      pushDeviceRegisterSchema.safeParse({
        platform: "web",
        subscription: { endpoint: "https://evil.example/x", keys: { p256dh: P256DH, auth: AUTH } },
      }).success,
    ).toBe(false);
  });
});
