import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DESKTOP_MEDIA_QUERY,
  FINE_POINTER_MEDIA_QUERY,
  MOBILE_MEDIA_QUERY,
  TWO_COLUMN_MEDIA_QUERY,
} from "@/features/device/mediaQueries";
import { useCanHover } from "@/hooks/device/useCanHover";
import { useIsDesktop } from "@/hooks/device/useIsDesktop";
import { useMediaQuery } from "@/hooks/device/useMediaQuery";
import { useIsMobile } from "@/hooks/device/useMobile";
import { useTwoColumnLayout } from "@/hooks/device/useTwoColumnLayout";

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

describe("useMediaQuery", () => {
  it("answers with the browser's match and the given server value", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("window", { matchMedia });
    expect(useMediaQuery("(min-width: 1px)", false)).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(min-width: 1px)");
    expect(store.serverSnapshot!()).toBe(false);
  });

  it("keeps the same subscription across renders", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    useMediaQuery("(min-width: 2px)", false);
    const first = store.subscribe;
    useMediaQuery("(min-width: 2px)", false);
    expect(store.subscribe).toBe(first);
  });

  it("follows media changes and removes the listener on unmount", () => {
    const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal("window", { matchMedia: () => media });
    useMediaQuery("(min-width: 3px)", false);
    const notify = vi.fn();
    const unsubscribe = store.subscribe!(notify);
    expect(media.addEventListener).toHaveBeenCalledWith("change", notify);
    media.matches = false;
    expect(store.snapshot!()).toBe(false);
    unsubscribe();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", notify);
  });
});

describe("device hooks", () => {
  it.each([
    ["useCanHover", useCanHover, FINE_POINTER_MEDIA_QUERY, false],
    ["useIsMobile", useIsMobile, MOBILE_MEDIA_QUERY, false],
    ["useTwoColumnLayout", useTwoColumnLayout, TWO_COLUMN_MEDIA_QUERY, true],
    ["useIsDesktop", useIsDesktop, DESKTOP_MEDIA_QUERY, true],
  ] as const)("%s asks for its query", (_name, hook, query, serverValue) => {
    const matchMedia = vi.fn(() => ({ matches: false }));
    vi.stubGlobal("window", { matchMedia });
    expect(hook()).toBe(false);
    expect(matchMedia).toHaveBeenCalledWith(query);
    expect(store.serverSnapshot!()).toBe(serverValue);
  });

  it("desktop needs both the md width and a fine pointer", () => {
    expect(DESKTOP_MEDIA_QUERY).toBe("(min-width: 768px) and (hover: hover) and (pointer: fine)");
  });
});
