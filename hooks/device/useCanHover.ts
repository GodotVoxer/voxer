"use client";

import { useSyncExternalStore } from "react";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

const subscribeHover = (onStoreChange: () => void) => {
  const mql = window.matchMedia(HOVER_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
};

const getHoverSnapshot = () => window.matchMedia(HOVER_QUERY).matches;

export const useCanHover = () =>
  useSyncExternalStore(subscribeHover, getHoverSnapshot, () => false);
