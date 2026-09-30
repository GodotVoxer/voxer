"use client";
import { useEffect, type RefObject } from "react";
import { chainedWheelDelta } from "@/features/vox/detail/scrollChain";
import { wheelDeltaPixels } from "@/features/device/wheelDeltaPixels";

/** Below `lg` there is a single document scroll and nothing to chain. */
const TWO_COLUMN_MEDIA_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Share of the pending distance applied per frame: a short ease-out, like a native wheel notch. */
const EASE_PER_FRAME = 0.3;

type Args = {
  /** Row holding both columns: listening here, not on the vox column, covers the empty space below a short column. */
  rowRef: RefObject<HTMLElement | null>;
  /** The vox column: its own scroll wins while it has room. */
  sourceRef: RefObject<HTMLElement | null>;
  /** The comments scroll: receives the excess. */
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
};

/**
 * Native `wheel` listener, not `onWheel`: React registers it as passive and `preventDefault` would not
 * work. Chained distance is animated from a pending pixel count rather than with `behavior: "smooth"`:
 * a smooth scroll restarted mid-animation loses or repeats distance, this never does.
 */
export const useVoxDetailScrollChain = ({ rowRef, sourceRef, targetRef, enabled }: Args): void => {
  useEffect(() => {
    const row = rowRef.current;
    if (!enabled || !row) return;
    const twoColumns = window.matchMedia(TWO_COLUMN_MEDIA_QUERY);

    let pending = 0;
    let frame = 0;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pending = 0;
    };

    const step = () => {
      const target = targetRef.current;
      if (!target || pending === 0) return stop();
      const eased = Math.trunc(pending * EASE_PER_FRAME);
      const move = eased !== 0 ? eased : Math.sign(pending);
      const before = target.scrollTop;
      target.scrollTop = before + move;
      const moved = Math.round(target.scrollTop - before);
      // At an edge the rest of the distance has nowhere to go.
      if (moved === 0) return stop();
      pending -= moved;
      frame = pending === 0 ? 0 : requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      // With Ctrl the wheel zooms the browser.
      if (e.ctrlKey || !twoColumns.matches) return;
      const source = sourceRef.current;
      const target = targetRef.current;
      if (!source || !target) return;

      // Over the comments the wheel is already theirs: chaining there would scroll them twice.
      if (typeof Node !== "undefined" && e.target instanceof Node && target.contains(e.target)) {
        stop();
        return;
      }

      const delta = chainedWheelDelta(wheelDeltaPixels(e, target.clientHeight), source, {
        scrollTop: target.scrollTop + pending,
        scrollHeight: target.scrollHeight,
        clientHeight: target.clientHeight,
      });
      if (delta === null) return;
      e.preventDefault();

      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        stop();
        target.scrollTop += delta;
        return;
      }
      pending = Math.round(pending + delta);
      if (!frame && pending !== 0) frame = requestAnimationFrame(step);
    };

    row.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      row.removeEventListener("wheel", onWheel);
      stop();
    };
  }, [enabled, rowRef, sourceRef, targetRef]);
};
