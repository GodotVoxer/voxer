"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { isComposerSlotVisible } from "@/features/comments/floatingComposer";

export type FloatingPhase = "docked" | "open" | "closing";

type Args = {
  enabled: boolean;
  slotRef: RefObject<HTMLElement | null>;
  scrollRootRef: RefObject<HTMLElement | null>;
};

export type FloatingCommentComposer = ReturnType<typeof useFloatingCommentComposer>;

export const useFloatingCommentComposer = ({ enabled, slotRef, scrollRootRef }: Args) => {
  const [armed, setArmed] = useState(false);
  const [slotVisible, setSlotVisible] = useState(true);
  const [dockedHeight, setDockedHeight] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const open = enabled && armed && !slotVisible;
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setClosing(!open);
  }
  const phase: FloatingPhase = open ? "open" : closing ? "closing" : "docked";
  const detachedRef = useRef(false);
  const originRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    detachedRef.current = phase !== "docked";
  }, [phase]);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // While detached the slot only holds the placeholder height; measuring it would freeze it.
      if (!detachedRef.current) setDockedHeight(slot.offsetHeight);
    });
    ro.observe(slot);
    return () => ro.disconnect();
  }, [slotRef]);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!enabled || !armed || !root) return;
    const update = () => {
      const slot = slotRef.current;
      if (!slot) return;
      setSlotVisible(
        isComposerSlotVisible(slot.getBoundingClientRect(), root.getBoundingClientRect()),
      );
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      root.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled, armed, slotRef, scrollRootRef]);

  const arm = useCallback((origin?: HTMLElement) => {
    originRef.current = origin ?? null;
    setArmed(true);
  }, []);
  const close = useCallback(() => {
    setArmed(false);
    setSlotVisible(true);
  }, []);
  const onClosed = useCallback(() => setClosing(false), []);

  return {
    phase,
    slotMinHeight: phase !== "docked" && dockedHeight !== null ? dockedHeight : undefined,
    originRef,
    arm,
    close,
    onClosed,
  };
};
