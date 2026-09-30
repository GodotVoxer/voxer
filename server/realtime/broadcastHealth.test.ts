import { describe, expect, it } from "vitest";
import {
  BROADCAST_DEFAULT_TARGET,
  broadcastConfigReport,
  type BroadcastEnv,
} from "./broadcastHealth";

const env = (over: BroadcastEnv): BroadcastEnv => ({
  REALTIME_BROADCAST_ENABLED: "true",
  SOCKET_SERVER_URL: "https://realtime.example.com",
  SOCKET_BROADCAST_SECRET: "x".repeat(40),
  ...over,
});

describe("broadcastConfigReport", () => {
  it("reports no problem for a complete configuration", () => {
    const r = broadcastConfigReport(env({}));
    expect(r.configProblem).toBeNull();
    expect(r.targetHost).toBe("realtime.example.com");
  });

  it("reports the disabled switch first", () => {
    const r = broadcastConfigReport(env({ REALTIME_BROADCAST_ENABLED: undefined }));
    expect(r.broadcastEnabled).toBe(false);
    expect(r.configProblem).toContain("REALTIME_BROADCAST_ENABLED");
  });

  it("flags the local fallback when SOCKET_SERVER_URL is missing", () => {
    const r = broadcastConfigReport(env({ SOCKET_SERVER_URL: undefined }));
    expect(r.targetIsLocalDefault).toBe(true);
    expect(r.configProblem).toContain(BROADCAST_DEFAULT_TARGET);
  });

  it("tells a missing secret from a short one", () => {
    expect(broadcastConfigReport(env({ SOCKET_BROADCAST_SECRET: undefined })).configProblem).toBe(
      "SOCKET_BROADCAST_SECRET is missing.",
    );
    expect(
      broadcastConfigReport(env({ SOCKET_BROADCAST_SECRET: "short" })).configProblem,
    ).toContain("shorter");
  });

  it("never returns the secret", () => {
    const r = broadcastConfigReport(
      env({ SOCKET_BROADCAST_SECRET: "very-long-secret-value".repeat(3) }),
    );
    expect(JSON.stringify(r)).not.toContain("very-long-secret-value");
  });
});
