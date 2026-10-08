"use client";

import { useSyncExternalStore } from "react";
import { matchesMediaQuery } from "@/features/device/mediaQueries";

type MediaQueryStore = { subscribe: (onChange: () => void) => () => void; snapshot: () => boolean };

// One stable store per query, so `useSyncExternalStore` does not resubscribe on every render.
const stores = new Map<string, MediaQueryStore>();

const storeFor = (query: string): MediaQueryStore => {
  let store = stores.get(query);
  if (!store) {
    store = {
      subscribe: (onChange) => {
        const mql = window.matchMedia(query);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      },
      snapshot: () => matchesMediaQuery(query),
    };
    stores.set(query, store);
  }
  return store;
};

/** `serverValue` is what the server render and hydration assume before the browser answers. */
export const useMediaQuery = (query: string, serverValue: boolean): boolean => {
  const { subscribe, snapshot } = storeFor(query);
  return useSyncExternalStore(subscribe, snapshot, () => serverValue);
};
