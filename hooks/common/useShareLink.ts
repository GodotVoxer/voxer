"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { absoluteUrl } from "@/lib/vox/paths";
import { readShareEnv, shareLink } from "@/features/device/shareLink";

/** `idle` also covers the native sheet, where the system gives the feedback. */
export type ShareFeedback = "idle" | "copied" | "failed";

const FEEDBACK_MS = 2000;

export const useShareLink = () => {
  const [feedback, setFeedback] = useState<ShareFeedback>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const share = useCallback(async (input: { path: string; title: string }) => {
    const url = absoluteUrl(window.location.origin, input.path);
    const outcome = await shareLink({ ...input, url }, readShareEnv(window));
    const next: ShareFeedback =
      outcome === "copied" ? "copied" : outcome === "failed" ? "failed" : "idle";
    setFeedback(next);
    if (timer.current) clearTimeout(timer.current);
    if (next !== "idle") timer.current = setTimeout(() => setFeedback("idle"), FEEDBACK_MS);
  }, []);

  return { share, feedback };
};
