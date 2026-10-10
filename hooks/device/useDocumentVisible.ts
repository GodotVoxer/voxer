"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

const snapshot = () => document.visibilityState === "visible";

/** False in a background tab and in the Android app while it is not in the foreground. */
export const useDocumentVisible = (): boolean =>
  useSyncExternalStore(subscribe, snapshot, () => true);
