import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

const subscribeMobile = (onStoreChange: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
};

const getMobileSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT;

export const useIsMobile = () =>
  useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
