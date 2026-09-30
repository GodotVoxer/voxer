import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNoProdMocksInBuild } from "./assertNoProdMocks";

describe("assertNoProdMocksInBuild", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does nothing outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    expect(() => assertNoProdMocksInBuild()).not.toThrow();
  });

  it("throws in production with mocks enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    expect(() => assertNoProdMocksInBuild()).toThrow(/NEXT_PUBLIC_USE_MOCKS/);
  });
});
