import { useSyncExternalStore } from "react";
import { isThemeSafeMode } from "@/lib/theme/themePreference";

const subscribeToNothing = () => () => {};

/** `?tema=seguro` in the current URL (false on the server so hydration matches). */
export const useThemeSafeMode = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    () => isThemeSafeMode(window.location.search),
    () => false,
  );
