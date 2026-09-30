import { describe, expect, it } from "vitest";
import { shouldDeleteToken } from "@/server/push/fcmErrors";
import { classifyWebPushFailure } from "@/server/push/webPushErrors";

describe("classifyWebPushFailure", () => {
  it("deletes the subscription only when the service says it is gone", () => {
    expect(shouldDeleteToken(classifyWebPushFailure(404))).toBe(true);
    expect(shouldDeleteToken(classifyWebPushFailure(410))).toBe(true);
    for (const status of [400, 401, 403, 413, 429, 500, 503]) {
      expect(shouldDeleteToken(classifyWebPushFailure(status))).toBe(false);
    }
  });

  it("a VAPID signature problem is not the browser's fault", () => {
    expect(classifyWebPushFailure(403)).toBe("auth");
  });

  it("retries when the service is saturated or down", () => {
    expect(classifyWebPushFailure(429)).toBe("retryable");
    expect(classifyWebPushFailure(502)).toBe("retryable");
  });
});
