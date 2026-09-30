import { useSyncExternalStore } from "react";

const subscribeHash = (onStoreChange: () => void) => {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
};

const getHashSnapshot = () => window.location.hash.slice(1);

export const useWindowHashFragment = () =>
  useSyncExternalStore(subscribeHash, getHashSnapshot, () => "");
