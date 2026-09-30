import { afterEach, describe, expect, it, vi } from "vitest";
import { isMockDemoMode } from "./initMocks";
describe("isMockDemoMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('is true only with NEXT_PUBLIC_USE_MOCKS === "true"', () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    expect(isMockDemoMode()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    expect(isMockDemoMode()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "");
    expect(isMockDemoMode()).toBe(false);
  });
});
