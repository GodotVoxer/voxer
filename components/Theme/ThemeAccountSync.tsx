"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { updateThemePreferenceRequest } from "@/features/theme/api";
import { useThemeStore } from "@/features/theme/store";
import { decideThemeAccountSync } from "@/lib/theme/themeAccountSync";
import {
  DEFAULT_THEME_PREFERENCE,
  readStoredDeviceThemePreference,
} from "@/lib/theme/themePreference";
import { apiErrorStatus } from "@/features/http/responseErrors";

/** Keeps the theme in line with the account: on sign-in/out, on `/auth/me` refresh and after each choice. */
export const ThemeAccountSync = () => {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const hydrated = useThemeStore((s) => s.hydrated);
  const pendingServerSync = useThemeStore((s) => s.pendingServerSync);
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    if (authLoading || !hydrated) return;
    const theme = useThemeStore.getState();
    theme.setAccountBound(Boolean(user));
    const current = useThemeStore.getState();
    const action = decideThemeAccountSync({
      accountTheme: user?.theme ?? null,
      wasLoggedIn: wasLoggedIn.current,
      local: {
        preference: current.preference,
        customTheme: current.customTheme,
        cachedCustomThemeId: current.cachedCustom?.id ?? null,
      },
      pendingServerSync: current.pendingServerSync,
    });
    wasLoggedIn.current = Boolean(user);

    if (action.kind === "restoreDevice") {
      current.adoptSelection(readStoredDeviceThemePreference() ?? DEFAULT_THEME_PREFERENCE, null);
      return;
    }
    if (action.kind === "adopt") {
      current.adoptSelection(action.mode, action.customTheme);
      return;
    }
    if (action.kind !== "push" || !user) return;

    let cancelled = false;
    const { selection } = action;
    updateThemePreferenceRequest(selection)
      .then((saved) => {
        if (cancelled) return;
        const store = useThemeStore.getState();
        store.markServerSynced(selection);
        if (saved.mode === "custom" && store.preference === "custom" && saved.customTheme) {
          store.adoptSelection("custom", saved.customTheme);
        }
        const auth = useAuthStore.getState();
        if (auth.user?.id === user.id) auth.setUser({ ...auth.user, theme: saved });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // The custom theme no longer exists (deleted elsewhere): do not retry, fall back to dark.
        if (selection.mode === "custom" && apiErrorStatus(error) === 404) {
          const store = useThemeStore.getState();
          store.markServerSynced(selection);
          store.adoptSelection(DEFAULT_THEME_PREFERENCE, null);
        }
        /* other errors: stays pending and retries on the next session refresh or change */
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, hydrated, pendingServerSync]);

  return null;
};
