"use client";
import { useEffect, type RefObject } from "react";

/** Fits the textarea height to its content; a CSS `max-height` caps it, and then it scrolls internally. */
export const useAutoGrowTextarea = (
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
): void => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const fit = () => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ref, value]);
};
