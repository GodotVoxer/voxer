import { describe, expect, it } from "vitest";
import { pushDeviceRegisterSchema } from "./deviceSchemas";

const keys = { p256dh: "B".repeat(87), auth: "A".repeat(22) };

describe("pushDeviceRegisterSchema", () => {
  it("accepts a UnifiedPush subscription on a self-hosted distributor", () => {
    const parsed = pushDeviceRegisterSchema.parse({
      platform: "unifiedpush",
      subscription: { endpoint: "https://push.example.org/up/abc", keys },
      appVersion: "1.1.0",
    });
    expect(parsed.platform).toBe("unifiedpush");
  });

  it("rejects UnifiedPush endpoints on internal addresses", () => {
    const result = pushDeviceRegisterSchema.safeParse({
      platform: "unifiedpush",
      subscription: { endpoint: "https://10.0.0.2/up", keys },
    });
    expect(result.success).toBe(false);
  });

  it("keeps browser subscriptions limited to known push services", () => {
    const result = pushDeviceRegisterSchema.safeParse({
      platform: "web",
      subscription: { endpoint: "https://push.example.org/up/abc", keys },
    });
    expect(result.success).toBe(false);
  });
});
