import { afterEach, describe, expect, it } from "vitest";
import { realtimeMode, realtimePushEnabled, socketBroadcastsEnabled } from "@/lib/realtime/mode";

const originalClientMode = process.env.NEXT_PUBLIC_REALTIME_MODE;
const originalBroadcasts = process.env.REALTIME_BROADCAST_ENABLED;

afterEach(() => {
  if (originalClientMode === undefined) delete process.env.NEXT_PUBLIC_REALTIME_MODE;
  else process.env.NEXT_PUBLIC_REALTIME_MODE = originalClientMode;
  if (originalBroadcasts === undefined) delete process.env.REALTIME_BROADCAST_ENABLED;
  else process.env.REALTIME_BROADCAST_ENABLED = originalBroadcasts;
});

describe("realtimeMode", () => {
  it("is off by default", () => {
    delete process.env.NEXT_PUBLIC_REALTIME_MODE;
    expect(realtimeMode()).toBe("off");
    expect(realtimePushEnabled()).toBe(false);
  });

  it("enables push only for the explicit value", () => {
    process.env.NEXT_PUBLIC_REALTIME_MODE = "durable";
    expect(realtimeMode()).toBe("durable");
    expect(realtimePushEnabled()).toBe(true);
  });

  it("treats unknown values, including the legacy polling, as off", () => {
    process.env.NEXT_PUBLIC_REALTIME_MODE = "polling";
    expect(realtimePushEnabled()).toBe(false);
  });

  it("tolerates whitespace and casing", () => {
    process.env.NEXT_PUBLIC_REALTIME_MODE = " Durable\n";
    expect(realtimeMode()).toBe("durable");
  });
});

describe("socketBroadcastsEnabled", () => {
  it("requires an explicit true", () => {
    delete process.env.REALTIME_BROADCAST_ENABLED;
    expect(socketBroadcastsEnabled()).toBe(false);
    process.env.REALTIME_BROADCAST_ENABLED = " true\n";
    expect(socketBroadcastsEnabled()).toBe(true);
  });
});
