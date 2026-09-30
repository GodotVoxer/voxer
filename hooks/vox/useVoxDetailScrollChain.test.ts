import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVoxDetailScrollChain } from "./useVoxDetailScrollChain";

const effectHolder = vi.hoisted(() => ({
  cleanup: undefined as (() => void) | undefined,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  useEffect: (effect: () => void | (() => void)) => {
    if (effectHolder.cleanup) {
      effectHolder.cleanup();
      effectHolder.cleanup = undefined;
    }
    const res = effect();
    if (typeof res === "function") effectHolder.cleanup = res;
  },
}));

type Pane = HTMLElement & { scrollTop: number };

/** A scrollable element that clamps `scrollTop` like the browser does. */
const createPane = (scrollTop: number, scrollHeight: number, clientHeight = 800): Pane => {
  let top = scrollTop;
  return {
    scrollHeight,
    clientHeight,
    contains: () => false,
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      top = Math.max(0, Math.min(scrollHeight - clientHeight, value));
    },
  } as unknown as Pane;
};

const createRow = () => {
  const listeners = new Map<string, EventListener>();
  return {
    addEventListener: (type: string, l: EventListener) => listeners.set(type, l),
    removeEventListener: (type: string) => listeners.delete(type),
    dispatch: (e: Partial<WheelEvent>) => {
      const preventDefault = vi.fn();
      listeners.get("wheel")?.({ deltaMode: 0, ctrlKey: false, preventDefault, ...e } as never);
      return preventDefault;
    },
    listeners,
  };
};

let frames: FrameRequestCallback[] = [];
let reducedMotion = false;

const runFrames = () => {
  for (let i = 0; i < 200 && frames.length > 0; i += 1) {
    const pending = frames;
    frames = [];
    pending.forEach((cb) => cb(0));
  }
};

const useMountedChain = (source: Pane, target: Pane) => {
  const row = createRow();
  useVoxDetailScrollChain({
    rowRef: { current: row as unknown as HTMLElement },
    sourceRef: { current: source },
    targetRef: { current: target },
    enabled: true,
  });
  return row;
};

describe("useVoxDetailScrollChain", () => {
  beforeEach(() => {
    frames = [];
    reducedMotion = false;
    vi.stubGlobal("Node", class Node {});
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches:
          query === "(min-width: 1024px)" ||
          (query === "(prefers-reduced-motion: reduce)" && reducedMotion),
      }),
    });
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    effectHolder.cleanup?.();
    effectHolder.cleanup = undefined;
    vi.unstubAllGlobals();
  });

  it("lets the browser scroll the left column while it has room", () => {
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(0, 2000), target);
    expect(row.dispatch({ deltaY: 100 })).not.toHaveBeenCalled();
    runFrames();
    expect(target.scrollTop).toBe(0);
  });

  it("at the bottom of the left column moves the comments by exactly the wheel distance", () => {
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    expect(row.dispatch({ deltaY: 100 })).toHaveBeenCalled();
    row.dispatch({ deltaY: 100 });
    runFrames();
    expect(target.scrollTop).toBe(200);
  });

  it("a notch arriving mid-animation neither loses nor repeats distance", () => {
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    row.dispatch({ deltaY: 100 });
    frames.shift()?.(0);
    row.dispatch({ deltaY: 100 });
    row.dispatch({ deltaY: -40 });
    runFrames();
    expect(target.scrollTop).toBe(160);
  });

  it("normalizes a macOS wheel notch (tiny deltaY, wheelDelta 120)", () => {
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    row.dispatch({ deltaY: 4, wheelDeltaY: -120 } as Partial<WheelEvent>);
    runFrames();
    expect(target.scrollTop).toBe(100);
  });

  it("scrolling up first returns the comments to their top, then lets the browser take over", () => {
    const target = createPane(150, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    expect(row.dispatch({ deltaY: -100 })).toHaveBeenCalled();
    row.dispatch({ deltaY: -100 });
    runFrames();
    expect(target.scrollTop).toBe(0);
    expect(row.dispatch({ deltaY: -100 })).not.toHaveBeenCalled();
  });

  it("stops at the bottom of the comments", () => {
    const target = createPane(4150, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    row.dispatch({ deltaY: 100 });
    runFrames();
    expect(target.scrollTop).toBe(4200);
    expect(row.dispatch({ deltaY: 100 })).not.toHaveBeenCalled();
  });

  it("jumps without animation with prefers-reduced-motion", () => {
    reducedMotion = true;
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    row.dispatch({ deltaY: 100 });
    expect(target.scrollTop).toBe(100);
    expect(frames).toHaveLength(0);
  });

  it("ignores wheel events with ctrlKey (browser zoom)", () => {
    const target = createPane(0, 5000);
    const row = useMountedChain(createPane(1200, 2000), target);
    expect(row.dispatch({ deltaY: 100, ctrlKey: true })).not.toHaveBeenCalled();
    runFrames();
    expect(target.scrollTop).toBe(0);
  });

  it("removes the row wheel listener on unmount", () => {
    const row = useMountedChain(createPane(0, 2000), createPane(0, 5000));
    expect(row.listeners.has("wheel")).toBe(true);
    effectHolder.cleanup?.();
    effectHolder.cleanup = undefined;
    expect(row.listeners.has("wheel")).toBe(false);
  });
});
