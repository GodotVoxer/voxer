import { describe, expect, it } from "vitest";
import { fcmPushEnabled, pushEnabled, webPushEnabled } from "@/server/push/pushMode";

const FULL = {
  PUSH_ENABLED: "true",
  FIREBASE_PROJECT_ID: "voxer",
  FIREBASE_CLIENT_EMAIL: "push@example-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n",
} as const;

describe("pushEnabled", () => {
  it("is true only with the switch and all three credentials", () => {
    expect(pushEnabled(FULL)).toBe(true);
  });

  it("is false without the switch", () => {
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: undefined })).toBe(false);
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: "1" })).toBe(false);
  });

  it("is false when any credential is missing", () => {
    for (const key of [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_PRIVATE_KEY",
    ] as const) {
      expect(pushEnabled({ ...FULL, [key]: undefined })).toBe(false);
      expect(pushEnabled({ ...FULL, [key]: "   " })).toBe(false);
    }
  });

  it("is false with an empty environment", () => {
    expect(pushEnabled({})).toBe(false);
  });
});

const WEB = {
  PUSH_ENABLED: "true",
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: "BPublicKey",
  WEB_PUSH_VAPID_PRIVATE_KEY: "privateKey",
  WEB_PUSH_VAPID_SUBJECT: "mailto:push@voxer.pro",
} as const;

describe("webPushEnabled", () => {
  it("does not depend on the Firebase credentials", () => {
    expect(webPushEnabled(WEB)).toBe(true);
    expect(fcmPushEnabled(WEB)).toBe(false);
    expect(pushEnabled(WEB)).toBe(true);
    expect(webPushEnabled(FULL)).toBe(false);
    expect(fcmPushEnabled(FULL)).toBe(true);
  });

  it("is false without the switch or with any key missing", () => {
    expect(webPushEnabled({ ...WEB, PUSH_ENABLED: undefined })).toBe(false);
    for (const key of [
      "NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY",
      "WEB_PUSH_VAPID_PRIVATE_KEY",
      "WEB_PUSH_VAPID_SUBJECT",
    ] as const) {
      expect(webPushEnabled({ ...WEB, [key]: " " })).toBe(false);
    }
  });
});

describe("tolerates whitespace", () => {
  it("accepts the switch with whitespace or a trailing newline", () => {
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: " true " })).toBe(true);
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: "true\n" })).toBe(true);
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: "TRUE" })).toBe(true);
  });

  it("still rejects any other value", () => {
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: "yes" })).toBe(false);
    expect(pushEnabled({ ...FULL, PUSH_ENABLED: "" })).toBe(false);
  });
});
