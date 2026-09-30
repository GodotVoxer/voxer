import { describe, expect, it } from "vitest";
import { FCM_TOKEN_MAX, isPlausibleFcmToken, normalizeFcmToken } from "@/server/push/deviceToken";

/** Real FCM token shape: an instance part, `:` and a long base64url body. */
const REAL_TOKEN = `cXy9Zv3RQk2t1abcdefghi:APA91bH${"Kj7_xQ2ZmP4vTnR8sLdWc-0fGyBu5iAoE3hN".repeat(4)}`;

describe("isPlausibleFcmToken", () => {
  it("accepts a token with a real shape", () => {
    expect(REAL_TOKEN.length).toBeGreaterThanOrEqual(64);
    expect(isPlausibleFcmToken(REAL_TOKEN)).toBe(true);
  });

  it("rejects empty and blank input", () => {
    expect(isPlausibleFcmToken("")).toBe(false);
    expect(isPlausibleFcmToken("   ")).toBe(false);
  });

  it("rejects tokens that are too short", () => {
    expect(isPlausibleFcmToken("a".repeat(63))).toBe(false);
    expect(isPlausibleFcmToken("a".repeat(64))).toBe(true);
  });

  it("rejects tokens longer than the column", () => {
    expect(isPlausibleFcmToken("a".repeat(FCM_TOKEN_MAX))).toBe(true);
    expect(isPlausibleFcmToken("a".repeat(FCM_TOKEN_MAX + 1))).toBe(false);
  });

  it("rejects characters outside the FCM alphabet", () => {
    const base = "a".repeat(80);
    expect(isPlausibleFcmToken(`${base}/../etc`)).toBe(false);
    expect(isPlausibleFcmToken(`${base} con espacio`)).toBe(false);
    expect(isPlausibleFcmToken(`${base}\nsegunda`)).toBe(false);
    expect(isPlausibleFcmToken(`${base}<script>`)).toBe(false);
  });
});

describe("normalizeFcmToken", () => {
  it("trims and returns the token", () => {
    expect(normalizeFcmToken(`  ${REAL_TOKEN}\n`)).toBe(REAL_TOKEN);
  });

  it("returns null when implausible", () => {
    expect(normalizeFcmToken("corto")).toBeNull();
  });
});
