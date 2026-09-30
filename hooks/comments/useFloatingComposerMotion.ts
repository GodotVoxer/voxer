"use client";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import { isRectOnScreen, transformCoveringRect } from "@/features/comments/floatingComposer";
import { prefersReducedMotion } from "@/features/device/reducedMotion";
import type { FloatingPhase } from "@/hooks/comments/useFloatingCommentComposer";

const OPEN_MS = 280;
const CLOSE_MS = 220;
const OPEN_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLOSE_EASING = "cubic-bezier(0.55, 0, 0.75, 0.2)";
const FALLBACK_TRANSFORM = "scale(0.96)";

type Args = {
  panelRef: RefObject<HTMLElement | null>;
  phase: FloatingPhase;
  originRef: RefObject<HTMLElement | null>;
  onClosed: () => void;
};

const originTransform = (panel: HTMLElement, origin: HTMLElement | null): string => {
  if (!origin?.isConnected) return FALLBACK_TRANSFORM;
  const from = origin.getBoundingClientRect();
  if (!isRectOnScreen(from, { width: window.innerWidth, height: window.innerHeight })) {
    return FALLBACK_TRANSFORM;
  }
  return transformCoveringRect(from, panel.getBoundingClientRect());
};

export const useFloatingComposerMotion = ({ panelRef, phase, originRef, onClosed }: Args) => {
  const onClosedRef = useRef(onClosed);
  useLayoutEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    // Read before cancelling: a reversal mid-animation starts from where the panel is now.
    const current = getComputedStyle(panel);
    const interrupted = panel.getAnimations().length > 0;
    const start = { transform: current.transform, opacity: current.opacity };
    panel.getAnimations().forEach((animation) => animation.cancel());
    if (phase === "docked") return;

    const reduced = prefersReducedMotion();
    if (phase === "open") {
      if (reduced) return;
      const from = interrupted
        ? start
        : { transform: originTransform(panel, originRef.current), opacity: 0 };
      panel.animate([from, { opacity: 1, offset: 0.35 }, { transform: "none", opacity: 1 }], {
        duration: OPEN_MS,
        easing: OPEN_EASING,
      });
      return;
    }

    if (reduced) {
      onClosedRef.current();
      return;
    }
    const animation = panel.animate(
      [
        interrupted ? start : { transform: "none", opacity: 1 },
        { opacity: 1, offset: 0.65 },
        { transform: originTransform(panel, originRef.current), opacity: 0 },
      ],
      { duration: CLOSE_MS, easing: CLOSE_EASING, fill: "forwards" },
    );
    // Docking and dropping the held last frame in the same task, or the panel flashes in between.
    animation.onfinish = () => {
      flushSync(() => onClosedRef.current());
      animation.cancel();
    };
  }, [phase, panelRef, originRef]);
};
