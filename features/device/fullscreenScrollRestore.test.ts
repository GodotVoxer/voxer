import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FULLSCREEN_SCROLL_RESTORE_WINDOW_MS,
  installFullscreenScrollRestore,
} from "./fullscreenScrollRestore";

/** Minimal window: document scroll, rAF with fake timers and simulated fullscreen. */
const fakeWindow = () => {
  const win = new EventTarget() as EventTarget & Record<string, unknown>;
  const doc = new EventTarget() as EventTarget & { fullscreenElement: Element | null };
  doc.fullscreenElement = null;
  const state = { scrollY: 0 };
  Object.assign(win, {
    document: doc,
    scrollX: 0,
    scrollTo: vi.fn(({ top }: { top: number }) => {
      state.scrollY = top;
    }),
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb: () => void) => setTimeout(cb, 16) as unknown as number,
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    getComputedStyle: () => ({ overflowY: "visible" }),
  });
  // `Object.assign` would copy the getter's value, not the getter.
  Object.defineProperty(win, "scrollY", { get: () => state.scrollY });
  const video = { parentElement: null } as unknown as Element;
  return {
    win: win as unknown as Window,
    userScrolls(y: number) {
      state.scrollY = y;
      win.dispatchEvent(new Event("scroll"));
    },
    /** The document reflow during fullscreen, as in the WebView. */
    layoutClampsTo(y: number) {
      state.scrollY = y;
      win.dispatchEvent(new Event("scroll"));
    },
    enterFullscreen() {
      doc.fullscreenElement = video;
      doc.dispatchEvent(new Event("fullscreenchange"));
    },
    exitFullscreen() {
      doc.fullscreenElement = null;
      doc.dispatchEvent(new Event("fullscreenchange"));
    },
    get scrollY() {
      return state.scrollY;
    },
    touch() {
      win.dispatchEvent(new Event("touchstart"));
    },
  };
};

describe("installFullscreenScrollRestore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns to the previous position even after the document jumped to the top", async () => {
    const w = fakeWindow();
    const uninstall = installFullscreenScrollRestore(w.win);
    w.userScrolls(2_400);
    w.enterFullscreen();
    w.layoutClampsTo(0);
    w.exitFullscreen();
    expect(w.scrollY).toBe(2_400);

    // The rotation back arrives later and moves the document again: reapply.
    w.layoutClampsTo(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(w.scrollY).toBe(2_400);
    uninstall();
  });

  it("stops forcing the position once the user touches the screen or the window passes", async () => {
    const w = fakeWindow();
    const uninstall = installFullscreenScrollRestore(w.win);
    w.userScrolls(900);
    w.enterFullscreen();
    w.exitFullscreen();
    w.touch();
    w.userScrolls(300);
    await vi.advanceTimersByTimeAsync(200);
    expect(w.scrollY).toBe(300);

    w.enterFullscreen();
    w.exitFullscreen();
    await vi.advanceTimersByTimeAsync(FULLSCREEN_SCROLL_RESTORE_WINDOW_MS + 100);
    w.userScrolls(50);
    await vi.advanceTimersByTimeAsync(200);
    expect(w.scrollY).toBe(50);
    uninstall();
  });
});
