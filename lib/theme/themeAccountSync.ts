import type { CustomThemeDto } from "@/lib/theme/customTheme";
import type {
  BuiltinThemePreference,
  ThemePreference,
  ThemeSelection,
} from "@/lib/theme/themePreference";

/** Theme preference stored on the account (`/api/auth/me` and `PUT /api/theme/preference`). */
export type AccountThemePreference = {
  mode: ThemePreference;
  /** null when the account never chose a theme. */
  updatedAt: string | null;
  /** Active theme document when `mode === "custom"`. */
  customTheme: CustomThemeDto | null;
};

type LocalThemeState = {
  preference: ThemePreference;
  customTheme: CustomThemeDto | null;
  /** Cached custom theme id while its document has not arrived (first paint). */
  cachedCustomThemeId: string | null;
};

export type ThemeAccountSyncInput = {
  /** null without a session. */
  accountTheme: AccountThemePreference | null;
  wasLoggedIn: boolean;
  local: LocalThemeState;
  pendingServerSync: ThemeSelection | null;
};

export type ThemeAccountSyncAction =
  | { kind: "none" }
  | { kind: "push"; selection: ThemeSelection }
  | { kind: "adopt"; mode: ThemePreference; customTheme: CustomThemeDto | null }
  | { kind: "restoreDevice" };

const localSelectionForFirstPush = (local: LocalThemeState): ThemeSelection => {
  if (local.preference !== "custom") return { mode: local.preference };
  const id = local.customTheme?.id ?? local.cachedCustomThemeId;
  return id ? { mode: "custom", themeId: id } : { mode: "dark" satisfies BuiltinThemePreference };
};

/**
 * The account is the source of truth: its theme is adopted unless the account never chose one (the
 * device's is uploaded once) or a local change is unconfirmed (retried). An active custom theme edited
 * on another device (other id or version) is adopted too. On logout the device's theme returns.
 */
export const decideThemeAccountSync = ({
  accountTheme,
  wasLoggedIn,
  local,
  pendingServerSync,
}: ThemeAccountSyncInput): ThemeAccountSyncAction => {
  if (!accountTheme) return wasLoggedIn ? { kind: "restoreDevice" } : { kind: "none" };
  if (pendingServerSync) return { kind: "push", selection: pendingServerSync };
  if (accountTheme.updatedAt === null) {
    return { kind: "push", selection: localSelectionForFirstPush(local) };
  }
  const adopt: ThemeAccountSyncAction = {
    kind: "adopt",
    mode: accountTheme.mode,
    customTheme: accountTheme.customTheme,
  };
  if (accountTheme.mode !== local.preference) return adopt;
  if (accountTheme.mode === "custom") {
    const remote = accountTheme.customTheme;
    const localTheme = local.customTheme;
    if (!remote) return adopt;
    if (!localTheme || localTheme.id !== remote.id || localTheme.version !== remote.version) {
      return adopt;
    }
  }
  return { kind: "none" };
};
