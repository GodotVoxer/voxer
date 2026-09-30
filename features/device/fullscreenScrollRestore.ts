/**
 * Leaving fullscreen (comment video, vox video or YouTube) resets the scroll in the Android WebView,
 * whose custom view changes size and orientation. The position is saved before entering and reapplied
 * for a while after leaving, until the viewport settles or the user touches the screen.
 */
export const FULLSCREEN_SCROLL_RESTORE_WINDOW_MS = 1_500;

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };

type Saved = { y: number; scroller: HTMLElement | null; scrollerTop: number };

const USER_INPUT_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

const fullscreenElementOf = (doc: FullscreenDocument): Element | null =>
  doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

/** Container with its own scroll (e.g. desktop comments), besides the document. */
const scrollableAncestor = (el: Element, win: Window): HTMLElement | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = win.getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return null;
};

export const installFullscreenScrollRestore = (win: Window): (() => void) => {
  const doc = win.document as FullscreenDocument;
  let lastY = win.scrollY;
  let saved: Saved | null = null;
  let stopRestoring: (() => void) | null = null;

  const onScroll = () => {
    // During fullscreen the document reflows: those positions are not the user's.
    if (!stopRestoring && !fullscreenElementOf(doc)) lastY = win.scrollY;
  };

  const restore = (target: Saved) => {
    const deadline = win.performance.now() + FULLSCREEN_SCROLL_RESTORE_WINDOW_MS;
    let frame = 0;
    const apply = () => {
      if (Math.abs(win.scrollY - target.y) > 1) {
        win.scrollTo({ top: target.y, left: win.scrollX, behavior: "instant" as ScrollBehavior });
      }
      const { scroller } = target;
      if (scroller && Math.abs(scroller.scrollTop - target.scrollerTop) > 1) {
        scroller.scrollTop = target.scrollerTop;
      }
    };
    const stop = () => {
      win.cancelAnimationFrame(frame);
      win.removeEventListener("resize", apply);
      for (const type of USER_INPUT_EVENTS) win.removeEventListener(type, stop, true);
      stopRestoring = null;
      lastY = win.scrollY;
    };
    const tick = () => {
      apply();
      if (win.performance.now() >= deadline) stop();
      else frame = win.requestAnimationFrame(tick);
    };
    stopRestoring = stop;
    win.addEventListener("resize", apply);
    for (const type of USER_INPUT_EVENTS) win.addEventListener(type, stop, true);
    tick();
  };

  const onFullscreenChange = () => {
    const el = fullscreenElementOf(doc);
    if (el) {
      stopRestoring?.();
      const scroller = scrollableAncestor(el, win);
      saved = { y: lastY, scroller, scrollerTop: scroller?.scrollTop ?? 0 };
      return;
    }
    if (!saved) return;
    const target = saved;
    saved = null;
    restore(target);
  };

  win.addEventListener("scroll", onScroll, { passive: true });
  doc.addEventListener("fullscreenchange", onFullscreenChange);
  doc.addEventListener("webkitfullscreenchange", onFullscreenChange);
  return () => {
    stopRestoring?.();
    win.removeEventListener("scroll", onScroll);
    doc.removeEventListener("fullscreenchange", onFullscreenChange);
    doc.removeEventListener("webkitfullscreenchange", onFullscreenChange);
  };
};
