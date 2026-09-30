import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPresenceClientId } from "./presenceClientId";

describe("getPresenceClientId", () => {
  const stored = new Map<string, string>();

  beforeEach(() => {
    stored.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => stored.get(k) ?? null,
        setItem: (k: string, v: string) => stored.set(k, v),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null without window", () => {
    vi.unstubAllGlobals();
    expect(getPresenceClientId()).toBeNull();
  });

  it("creates an id when missing and stores it in localStorage", () => {
    const id1 = getPresenceClientId();
    expect(id1).toBeTruthy();
    expect(typeof id1).toBe("string");
    expect(id1?.length).toBeGreaterThan(8);

    const id2 = getPresenceClientId();
    expect(id2).toBe(id1);
  });
});
