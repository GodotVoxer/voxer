"use client";

import { useSyncExternalStore } from "react";
import { isTwoColumnLayout, TWO_COLUMN_MEDIA_QUERY } from "@/features/device/twoColumnLayout";

const subscribeTwoColumn = (onStoreChange: () => void) => {
  const mql = window.matchMedia(TWO_COLUMN_MEDIA_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
};

export const useTwoColumnLayout = () =>
  useSyncExternalStore(subscribeTwoColumn, isTwoColumnLayout, () => true);
