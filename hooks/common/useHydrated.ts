import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** `false` in the server HTML and the first client render, `true` after: for UI that depends on `localStorage`. */
export const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
