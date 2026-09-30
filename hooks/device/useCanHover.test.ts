import { afterEach, describe, expect, it, vi } from "vitest";

import { useCanHover } from "@/hooks/device/useCanHover";

const store = vi.hoisted(() => ({
  subscribe: undefined as undefined | ((notify: () => void) => () => void),
  snapshot: undefined as undefined | (() => boolean),
  serverSnapshot: undefined as undefined | (() => boolean),
}));

vi.mock("react", () => ({
  useSyncExternalStore: (
    subscribe: typeof store.subscribe,
    snapshot: () => boolean,
    serverSnapshot: () => boolean,
  ) => {
    Object.assign(store, { subscribe, snapshot, serverSnapshot });
    return snapshot();
  },
}));

afterEach(() => vi.unstubAllGlobals());

describe("useCanHover", () => {
  it.each([390, 844, 1280])("does not enable touch hover at width %i", (innerWidth) => {
    const matchMedia = vi.fn(() => ({ matches: false }));
    vi.stubGlobal("window", { innerWidth, matchMedia });
    expect(useCanHover()).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith("(hover: hover) and (pointer: fine)");
  });

  it("enables hover with a fine pointer even in a narrow window", () => {
    vi.stubGlobal("window", { innerWidth: 600, matchMedia: () => ({ matches: true }) });
    expect(useCanHover()).toBe(true);
    expect(store.serverSnapshot!()).toBe(false);
  });

  it("follows capability changes and removes the listener on unmount", () => {
    const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal("window", { matchMedia: () => media });
    useCanHover();
    const notify = vi.fn();
    const unsubscribe = store.subscribe!(notify);
    expect(media.addEventListener).toHaveBeenCalledWith("change", notify);
    media.matches = false;
    expect(store.snapshot!()).toBe(false);
    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", notify);
  });
});
